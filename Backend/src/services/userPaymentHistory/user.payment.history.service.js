import { AppError } from "../../utils/AppError.js";
import {
    countPaymentHistoryByUserId,
    findPaymentHistoryByUserId,
} from "./user.payment.history.service.helper.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const ALLOWED_STATUSES = ["pending", "success", "failed", "refunded"];
const ALLOWED_PAYMENT_GATEWAYS = ["momo", "vnpay", "stripe"];
const ALLOWED_PAYMENT_METHODS = ["momo", "vnpay", "stripe", "card"];

const normalizePositiveInteger = (value, fallbackValue) => {
    const normalizedValue = Number(value);

    if (!Number.isFinite(normalizedValue) || normalizedValue < 1) {
        return fallbackValue;
    }

    return Math.floor(normalizedValue);
};

const normalizeEnumFilter = (value, allowedValues, field) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (typeof value !== "string") {
        throw new AppError(`Invalid ${field}.`, 400, { field });
    }

    const normalizedValue = value.trim().toLowerCase();

    if (!allowedValues.includes(normalizedValue)) {
        throw new AppError(`Invalid ${field}.`, 400, {
            field,
            allowedValues,
        });
    }

    return normalizedValue;
};

const buildPaymentHistoryFilter = (userId, query = {}) => {
    const filter = {
        userId,
    };

    const status = normalizeEnumFilter(
        query.status,
        ALLOWED_STATUSES,
        "status"
    );
    const paymentGateway = normalizeEnumFilter(
        query.paymentGateway,
        ALLOWED_PAYMENT_GATEWAYS,
        "paymentGateway"
    );
    const paymentMethod = normalizeEnumFilter(
        query.paymentMethod,
        ALLOWED_PAYMENT_METHODS,
        "paymentMethod"
    );

    if (status) {
        filter.status = status;
    }

    if (paymentGateway) {
        filter.paymentGateway = paymentGateway;
    }

    if (paymentMethod) {
        filter.paymentMethod = paymentMethod;
    }

    return filter;
};

const formatPlan = (plan) => {
    if (!plan) {
        return null;
    }

    return {
        id: plan._id?.toString?.() || "",
        name: plan.name || "",
        price: Number(plan.price || 0),
        durationDays: Number(plan.durationDays || 0),
        status: plan.status || "",
    };
};

const formatSubscription = (subscription) => {
    if (!subscription) {
        return null;
    }

    return {
        id: subscription._id?.toString?.() || "",
        status: subscription.status || "",
        startDate: subscription.startDate || null,
        endDate: subscription.endDate || null,
        autoRenew: Boolean(subscription.autoRenew),
    };
};

const formatTransactionItem = (transaction) => {
    return {
        id: transaction._id?.toString?.() || "",
        amount: Number(transaction.amount || 0),
        tax: Number(transaction.tax || 0),
        totalAmount: Number(transaction.totalAmount || 0),
        currency: transaction.currency || "VND",
        paymentMethod: transaction.paymentMethod || "",
        paymentGateway: transaction.paymentGateway || "",
        gatewayTransactionId: transaction.gatewayTransactionId || "",
        status: transaction.status || "",
        paidAt: transaction.paidAt || null,
        failedAt: transaction.failedAt || null,
        failureReason: transaction.failureReason || "",
        invoiceNumber: transaction.invoiceNumber || "",
        createdAt: transaction.createdAt || null,
        updatedAt: transaction.updatedAt || null,
        planId: formatPlan(transaction.planId),
        subscriptionId: formatSubscription(transaction.subscriptionId),
    };
};

const getMyPaymentHistory = async (userId, query = {}) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const filter = buildPaymentHistoryFilter(userId, query);

    const [transactions, totalItems] = await Promise.all([
        findPaymentHistoryByUserId(filter, { skip, limit }),
        countPaymentHistoryByUserId(filter),
    ]);

    return {
        items: transactions.map(formatTransactionItem),
        pagination: {
            page,
            limit,
            totalItems,
            totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
        },
    };
};

export { getMyPaymentHistory };

export default {
    getMyPaymentHistory,
};
