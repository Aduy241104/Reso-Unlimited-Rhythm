import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Plan from "../models/Plan.js";
import Subscription from "../models/Subscription.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { addDays } from "../utils/date.util.js";
import vnpayService from "./vnpay.service.js";

const PENDING_PAYMENT_TIMEOUT_MINUTES =
    Number(process.env.PAYMENT_PENDING_TIMEOUT_MINUTES || 15) || 15;
const VNPAY_SUCCESS_CODE = "00";
const PREMIUM_TAX_RATE = 0.1;

const roundVndAmount = (value) => Math.round(Number(value) || 0);

const calculateTaxAmount = (baseAmount) =>
    roundVndAmount((Number(baseAmount) || 0) * PREMIUM_TAX_RATE);

const calculateTotalAmount = (baseAmount) =>
    roundVndAmount((Number(baseAmount) || 0) + calculateTaxAmount(baseAmount));

const buildPlanSnapshot = (plan) => {
    if (!plan) {
        return null;
    }

    const originalPlanId = plan.originalPlanId || plan._id || null;
    const durationDays = Number(plan.durationDays);

    if (!originalPlanId || !Number.isFinite(durationDays) || durationDays < 1) {
        return null;
    }

    return {
        originalPlanId,
        name: String(plan.name || "").trim(),
        price: roundVndAmount(plan.price),
        durationDays,
        description: String(plan.description || ""),
        features: Array.isArray(plan.features) ? [...plan.features] : [],
        status: plan.status === "inactive" ? "inactive" : "active",
    };
};

const enrichPlanPricing = (plan) => {
    if (!plan) {
        return plan;
    }

    const price = roundVndAmount(plan.price);
    const taxAmount = calculateTaxAmount(price);

    return {
        ...plan,
        price,
        taxRate: PREMIUM_TAX_RATE,
        taxAmount,
        totalPrice: calculateTotalAmount(price),
    };
};

const buildSubscriptionPlanView = (subscription) => {
    const snapshotPlan = buildPlanSnapshot(subscription?.planSnapshot);

    if (snapshotPlan) {
        return snapshotPlan;
    }

    if (subscription?.planId && typeof subscription.planId === "object") {
        return {
            _id: subscription.planId._id,
            name: subscription.planId.name,
            price: subscription.planId.price,
            durationDays: subscription.planId.durationDays,
        };
    }

    return null;
};

const getRawPlanId = (source) => {
    const rawPlanId =
        source?.planId && typeof source.planId === "object"
            ? source.planId._id || source.planId
            : source?.planId;

    return rawPlanId && mongoose.Types.ObjectId.isValid(rawPlanId) ? rawPlanId : null;
};

const resolvePlanSnapshotFromSource = async (source) => {
    const currentSnapshot = buildPlanSnapshot(source?.planSnapshot);

    if (currentSnapshot) {
        return currentSnapshot;
    }

    const legacyPlanId = getRawPlanId(source);

    if (!legacyPlanId) {
        return null;
    }

    const legacyPlan = await Plan.findById(legacyPlanId).lean();
    return buildPlanSnapshot(legacyPlan);
};

const assertObjectId = (value, fieldName) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new AppError(`${fieldName} is invalid.`, StatusCodes.BAD_REQUEST, {
            field: fieldName,
        });
    }
};

const buildInvoiceNumber = (userId) =>
    `VNPAY_${Date.now()}_${String(userId).slice(-6)}_${Math.floor(Math.random() * 100000)}`;

const buildFailureReason = (paymentResult) => {
    if (!paymentResult?.responseCode) {
        return "VNPAY payment failed.";
    }

    return `VNPAY payment failed with response code ${paymentResult.responseCode}.`;
};

const buildCallbackUrl = (baseUrl, params = {}) => {
    if (!baseUrl) {
        throw new AppError("Missing client payment redirect configuration.", 500);
    }

    const url = new URL(baseUrl);

    Object.entries(params).forEach(([key, value]) => {
        if (typeof value !== "undefined" && value !== null && value !== "") {
            url.searchParams.set(key, String(value));
        }
    });

    return url.toString();
};

const markTransactionFailed = async ({
    transaction,
    subscription,
    reason,
}) => {
    if (!transaction || transaction.status === "success") {
        return transaction;
    }

    const now = new Date();

    if (transaction.status !== "failed") {
        transaction.status = "failed";
        transaction.failedAt = now;
        transaction.failureReason = reason;
        await transaction.save();
    }

    if (subscription && subscription.status === "pending") {
        subscription.status = "cancelled";
        await subscription.save();
    }

    return transaction;
};

const markTransactionSuccessful = async ({
    transaction,
    subscription,
    planSnapshot,
    paymentResult,
}) => {
    const user = await User.findById(transaction.userId);

    if (!user) {
        throw new AppError("User does not exist.", 404);
    }

    const now = new Date();

    if (subscription.status === "active") {
        if (transaction.status !== "success") {
            transaction.status = "success";
            transaction.gatewayTransactionId =
                paymentResult.gatewayTransactionId || transaction.gatewayTransactionId;
            transaction.paidAt = transaction.paidAt || now;
            transaction.failedAt = undefined;
            transaction.failureReason = "";
            await transaction.save();
        }

        return {
            transaction,
            subscription,
            user,
            alreadyApplied: true,
        };
    }

    const currentPremiumEndDate = user.subscription?.premiumEndDate
        ? new Date(user.subscription.premiumEndDate)
        : null;
    const baseDate =
        currentPremiumEndDate && currentPremiumEndDate > now ? currentPremiumEndDate : now;
    const endDate = addDays(baseDate, planSnapshot.durationDays);

    subscription.status = "active";
    subscription.startDate = now;
    subscription.endDate = endDate;
    subscription.planSnapshot = subscription.planSnapshot || planSnapshot;
    await subscription.save();

    user.subscription.isPremium = true;
    user.subscription.currentPlanId =
        subscription.planId || planSnapshot.originalPlanId || user.subscription.currentPlanId;
    user.subscription.premiumEndDate = endDate;
    await user.save();

    transaction.status = "success";
    transaction.gatewayTransactionId =
        paymentResult.gatewayTransactionId || transaction.gatewayTransactionId;
    transaction.paidAt = now;
    transaction.failedAt = undefined;
    transaction.failureReason = "";
    await transaction.save();

    return {
        transaction,
        subscription,
        user,
        alreadyApplied: false,
    };
};

const findPaymentContextByInvoiceNumber = async (invoiceNumber) => {
    const transaction = await Transaction.findOne({ invoiceNumber });

    if (!transaction) {
        return null;
    }

    const subscription = await Subscription.findById(transaction.subscriptionId);
    const legacyTransactionData = await Transaction.collection.findOne({
        _id: transaction._id,
    });
    const planSnapshot =
        (await resolvePlanSnapshotFromSource(subscription)) ||
        (await resolvePlanSnapshotFromSource(legacyTransactionData)) ||
        (await resolvePlanSnapshotFromSource(transaction));

    return {
        transaction,
        subscription,
        planSnapshot,
    };
};

const listActivePlans = async () =>
    Plan.find({ status: "active" })
        .sort({ price: 1, createdAt: 1 })
        .lean()
        .then((plans) => plans.map(enrichPlanPricing));

const getActivePlanDetail = async (planId) => {
    assertObjectId(planId, "planId");

    const plan = await Plan.findOne({
        _id: planId,
        status: "active",
    }).lean();

    if (!plan) {
        throw new AppError("Subscription plan not found or inactive.", 404, {
            field: "planId",
        });
    }

    return enrichPlanPricing(plan);
};

const getMySubscriptionStatus = async (userId) => {
    const now = new Date();
    const [user, activeSubscription] = await Promise.all([
        User.findById(userId)
            .populate("subscription.currentPlanId", "name price durationDays")
            .lean(),
        Subscription.findOne({
            userId,
            status: "active",
            endDate: { $gt: now },
        })
            .populate("planId", "name price durationDays")
            .sort({ endDate: -1, createdAt: -1 })
            .lean(),
    ]);

    if (!user) {
        throw new AppError("User does not exist.", 404);
    }

    const currentPlan =
        user.subscription?.currentPlanId && typeof user.subscription.currentPlanId === "object"
            ? {
                _id: user.subscription.currentPlanId._id,
                name: user.subscription.currentPlanId.name,
                price: user.subscription.currentPlanId.price,
                durationDays: user.subscription.currentPlanId.durationDays,
            }
            : activeSubscription
                ? buildSubscriptionPlanView(activeSubscription)
                : null;

    const pricedCurrentPlan = enrichPlanPricing(currentPlan);

    return {
        isPremium:
            Boolean(user.subscription?.isPremium) &&
            (!user.subscription?.premiumEndDate || new Date(user.subscription.premiumEndDate) > now),
        currentPlan: pricedCurrentPlan,
        premiumEndDate: user.subscription?.premiumEndDate || null,
        activeSubscription: activeSubscription
            ? {
                _id: activeSubscription._id,
                status: activeSubscription.status,
                startDate: activeSubscription.startDate,
                endDate: activeSubscription.endDate,
                planId: activeSubscription.planId?._id || activeSubscription.planId,
                plan: enrichPlanPricing(buildSubscriptionPlanView(activeSubscription)),
            }
            : null,
    };
};

const createVnpayOrder = async ({
    userId,
    planId,
    ipAddr,
}) => {
    assertObjectId(userId, "userId");
    assertObjectId(planId, "planId");

    const vnpayConfig = vnpayService.getVnpayConfig();
    const [user, plan] = await Promise.all([
        User.findById(userId).select("_id role activeStatus"),
        Plan.findOne({ _id: planId, status: "active" }),
    ]);

    if (!user) {
        throw new AppError("User does not exist.", 404);
    }

    if (!plan) {
        throw new AppError("Subscription plan not found or inactive.", 404, {
            field: "planId",
        });
    }

    const amount = roundVndAmount(plan.price);
    const tax = calculateTaxAmount(amount);
    const totalAmount = calculateTotalAmount(amount);
    const invoiceNumber = buildInvoiceNumber(user._id);
    const planSnapshot = buildPlanSnapshot(plan);
    let subscription;
    let transaction;

    if (!planSnapshot) {
        throw new AppError("Could not snapshot the selected subscription plan.", 500);
    }

    try {
        subscription = await Subscription.create({
            userId: user._id,
            planId: plan._id,
            planSnapshot,
            status: "pending",
            autoRenew: false,
        });

        transaction = await Transaction.create({
            userId: user._id,
            subscriptionId: subscription._id,
            planId: plan._id,
            amount,
            tax,
            totalAmount,
            currency: "VND",
            paymentMethod: "vnpay",
            paymentGateway: "vnpay",
            invoiceNumber,
            status: "pending",
        });

        const createDate = new Date();
        const expireDate = new Date(
            createDate.getTime() + vnpayConfig.expiryMinutes * 60 * 1000
        );
        const paymentUrl = vnpayService.buildPaymentUrl({
            amount: transaction.totalAmount,
            invoiceNumber,
            orderInfo: `Thanh toan goi Premium: ${plan.name}`,
            ipAddr,
            createDate,
            expireDate,
        });

        return {
            paymentUrl,
            invoiceNumber,
            transactionId: transaction._id,
            subscriptionId: subscription._id,
            amount: transaction.amount,
            tax: transaction.tax,
            taxRate: PREMIUM_TAX_RATE,
            totalAmount: transaction.totalAmount,
            plan: enrichPlanPricing(planSnapshot),
        };
    } catch (error) {
        if (transaction?.status === "pending") {
            await Transaction.findByIdAndUpdate(transaction._id, {
                status: "failed",
                failedAt: new Date(),
                failureReason: "Could not initialize VNPAY payment order.",
            }).catch(() => null);
        }

        if (subscription?.status === "pending") {
            await Subscription.findByIdAndUpdate(subscription._id, {
                status: "cancelled",
            }).catch(() => null);
        }

        throw error;
    }
};

const settleVnpayPayment = async (paymentResult) => {
    if (!paymentResult.isValid) {
        return {
            code: "97",
            message: "Invalid signature",
        };
    }

    const context = await findPaymentContextByInvoiceNumber(paymentResult.invoiceNumber);

    if (!context || !context.subscription || !context.planSnapshot) {
        return {
            code: "01",
            message: "Order not found",
        };
    }

    const { transaction, subscription, planSnapshot } = context;

    if (transaction.status === "success") {
        return {
            code: "02",
            message: "Order already confirmed",
        };
    }

    if (Number(transaction.totalAmount) !== Number(paymentResult.amount)) {
        return {
            code: "04",
            message: "Invalid amount",
        };
    }

    if (paymentResult.responseCode === VNPAY_SUCCESS_CODE) {
        await markTransactionSuccessful({
            transaction,
            subscription,
            planSnapshot,
            paymentResult,
        });

        return {
            code: "00",
            message: "Confirm success",
        };
    }

    await markTransactionFailed({
        transaction,
        subscription,
        reason: buildFailureReason(paymentResult),
    });

    return {
        code: "00",
        message: "Confirm success",
    };
};

const processVnpayIpn = async (query) => {
    const paymentResult = vnpayService.verifyCallback(query);
    const settlement = await settleVnpayPayment(paymentResult);

    return {
        RspCode: settlement.code,
        Message: settlement.message,
    };
};

const handleVnpayReturn = async (query) => {
    const paymentResult = vnpayService.verifyCallback(query);
    const successBaseUrl = process.env.CLIENT_PAYMENT_SUCCESS_URL;
    const failedBaseUrl = process.env.CLIENT_PAYMENT_FAILED_URL;

    if (!paymentResult.isValid) {
        return buildCallbackUrl(failedBaseUrl, {
            invoiceNumber: paymentResult.invoiceNumber,
            reason: "invalid_signature",
        });
    }

    const settlement = await settleVnpayPayment(paymentResult);

    if (
        (settlement.code === "00" || settlement.code === "02") &&
        paymentResult.responseCode === VNPAY_SUCCESS_CODE
    ) {
        return buildCallbackUrl(successBaseUrl, {
            invoiceNumber: paymentResult.invoiceNumber,
        });
    }

    return buildCallbackUrl(failedBaseUrl, {
        invoiceNumber: paymentResult.invoiceNumber,
        reason: settlement.message,
    });
};

const cancelTimedOutPendingTransactions = async () => {
    const now = new Date();
    const threshold = new Date(
        now.getTime() - PENDING_PAYMENT_TIMEOUT_MINUTES * 60 * 1000
    );

    const timedOutTransactions = await Transaction.find({
        status: "pending",
        createdAt: { $lte: threshold },
        paymentGateway: "vnpay",
    }).select("_id subscriptionId");

    if (timedOutTransactions.length === 0) {
        return {
            updatedTransactions: 0,
            updatedSubscriptions: 0,
        };
    }

    const transactionIds = timedOutTransactions.map((item) => item._id);
    const subscriptionIds = timedOutTransactions
        .map((item) => item.subscriptionId)
        .filter(Boolean);

    const [transactionResult, subscriptionResult] = await Promise.all([
        Transaction.updateMany(
            {
                _id: { $in: transactionIds },
                status: "pending",
            },
            {
                $set: {
                    status: "failed",
                    failedAt: now,
                    failureReason: "Payment timeout",
                },
            }
        ),
        Subscription.updateMany(
            {
                _id: { $in: subscriptionIds },
                status: "pending",
            },
            {
                $set: {
                    status: "cancelled",
                },
            }
        ),
    ]);

    return {
        updatedTransactions: transactionResult.modifiedCount || 0,
        updatedSubscriptions: subscriptionResult.modifiedCount || 0,
    };
};

const expireEndedSubscriptions = async () => {
    const now = new Date();
    const expiredSubscriptions = await Subscription.find({
        status: "active",
        endDate: { $lt: now },
    }).select("_id userId");

    if (expiredSubscriptions.length === 0) {
        return {
            updatedSubscriptions: 0,
            updatedUsers: 0,
        };
    }

    const subscriptionIds = expiredSubscriptions.map((item) => item._id);
    const userIds = expiredSubscriptions.map((item) => item.userId);

    const [subscriptionResult, userResult] = await Promise.all([
        Subscription.updateMany(
            {
                _id: { $in: subscriptionIds },
                status: "active",
            },
            {
                $set: {
                    status: "expired",
                },
            }
        ),
        User.updateMany(
            {
                _id: { $in: userIds },
                "subscription.premiumEndDate": { $lt: now },
            },
            {
                $set: {
                    "subscription.isPremium": false,
                    "subscription.currentPlanId": null,
                },
            }
        ),
    ]);

    return {
        updatedSubscriptions: subscriptionResult.modifiedCount || 0,
        updatedUsers: userResult.modifiedCount || 0,
    };
};

export default {
    listActivePlans,
    getActivePlanDetail,
    getMySubscriptionStatus,
    createVnpayOrder,
    handleVnpayReturn,
    processVnpayIpn,
    cancelTimedOutPendingTransactions,
    expireEndedSubscriptions,
};
