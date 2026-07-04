import mongoose from "mongoose";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { AppError } from "../../utils/AppError.js";
import {
    countPaymentHistoryByUserId,
    findPaymentDetailByUserId,
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

const formatMoney = (amount, currency = "VND") => {
    return `${new Intl.NumberFormat("vi-VN").format(Number(amount || 0))} ${currency}`;
};

const formatDate = (dateValue) => {
    if (!dateValue) {
        return "--";
    }

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(dateValue));
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

const formatPaymentDetail = (payment) => {
    const plan = payment.planId;
    const subscription = payment.subscriptionId;
    const planName =
        payment.planName ||
        payment.planId?.name ||
        payment.planId?.title ||
        "Premium";

    return {
        id: payment._id?.toString?.() || "",
        invoiceNumber: payment.invoiceNumber || "",
        gatewayTransactionId: payment.gatewayTransactionId || "",
        planName,
        amount: Number(payment.amount || 0),
        tax: Number(payment.tax || 0),
        totalAmount: Number(payment.totalAmount || 0),
        currency: payment.currency || "VND",
        paymentMethod: payment.paymentMethod || "",
        paymentGateway: payment.paymentGateway || "",
        status: payment.status || "",
        failureReason: payment.failureReason || "",
        paidAt: payment.paidAt || null,
        createdAt: payment.createdAt || null,
        updatedAt: payment.updatedAt || null,
        plan: plan
            ? {
                id: plan._id?.toString?.() || "",
                name: plan.name || plan.title || "",
                price: Number(plan.price ?? plan.amount ?? 0),
            }
            : null,
        subscription: subscription
            ? {
                id: subscription._id?.toString?.() || "",
                status: subscription.status || "",
                startDate: subscription.startDate || null,
                endDate: subscription.endDate || null,
                autoRenew: Boolean(subscription.autoRenew),
            }
            : null,
    };
};

const createPaymentReceiptPdf = async (payment) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();

    page.drawText("Reso", {
        x: 50,
        y: height - 60,
        size: 22,
        font: boldFont,
        color: rgb(0, 0, 0),
    });

    page.drawText("Payment Receipt", {
        x: 50,
        y: height - 110,
        size: 30,
        font: boldFont,
        color: rgb(0, 0, 0),
    });

    page.drawText("Invoice number", {
        x: 50,
        y: height - 160,
        size: 10,
        font: boldFont,
        color: rgb(0.35, 0.35, 0.35),
    });

    page.drawText(payment.invoiceNumber || "--", {
        x: 50,
        y: height - 178,
        size: 12,
        font,
        color: rgb(0, 0, 0),
    });

    page.drawText("Date", {
        x: 360,
        y: height - 160,
        size: 10,
        font: boldFont,
        color: rgb(0.35, 0.35, 0.35),
    });

    page.drawText(formatDate(payment.paidAt || payment.createdAt), {
        x: 360,
        y: height - 178,
        size: 12,
        font,
        color: rgb(0, 0, 0),
    });

    page.drawRectangle({
        x: 50,
        y: height - 320,
        width: width - 100,
        height: 95,
        color: rgb(0.94, 0.94, 0.94),
    });

    page.drawText("Item", {
        x: 70,
        y: height - 250,
        size: 10,
        font: boldFont,
        color: rgb(0.35, 0.35, 0.35),
    });

    page.drawText(payment.planName || "Premium", {
        x: 70,
        y: height - 275,
        size: 13,
        font,
        color: rgb(0, 0, 0),
    });

    page.drawText(formatMoney(payment.amount, payment.currency), {
        x: 390,
        y: height - 275,
        size: 13,
        font,
        color: rgb(0, 0, 0),
    });

    page.drawText("Total including tax", {
        x: 70,
        y: height - 350,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0),
    });

    page.drawText(formatMoney(payment.totalAmount || payment.amount, payment.currency), {
        x: 390,
        y: height - 350,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0),
    });

    page.drawRectangle({
        x: 50,
        y: height - 470,
        width: width - 100,
        height: 80,
        color: rgb(0.88, 0.88, 0.88),
    });

    page.drawText("Tax", {
        x: 70,
        y: height - 420,
        size: 11,
        font,
        color: rgb(0, 0, 0),
    });

    page.drawText(formatMoney(payment.tax, payment.currency), {
        x: 390,
        y: height - 420,
        size: 11,
        font,
        color: rgb(0, 0, 0),
    });

    page.drawText("Payment method", {
        x: 70,
        y: height - 445,
        size: 11,
        font,
        color: rgb(0, 0, 0),
    });

    page.drawText(payment.paymentMethod || payment.paymentGateway || "--", {
        x: 390,
        y: height - 445,
        size: 11,
        font,
        color: rgb(0, 0, 0),
    });

    page.drawText("This receipt was generated automatically by the system.", {
        x: 50,
        y: 60,
        size: 10,
        font,
        color: rgb(0.35, 0.35, 0.35),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
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

const getPaymentDetail = async (userId, paymentId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
        throw new AppError("Payment id is invalid.", 400);
    }

    const payment = await findPaymentDetailByUserId(userId, paymentId);

    if (!payment) {
        throw new AppError("Payment not found.", 404);
    }

    return formatPaymentDetail(payment);
};

const getPaymentReceiptPdf = async (userId, paymentId) => {
    if (!userId) {
        throw new AppError("Unauthorized.", 401);
    }

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
        throw new AppError("Payment id is invalid.", 400);
    }

    const payment = await findPaymentDetailByUserId(userId, paymentId);

    if (!payment) {
        throw new AppError("Payment not found.", 404);
    }

    const formattedPayment = formatPaymentDetail(payment);
    return await createPaymentReceiptPdf(formattedPayment);
};

export { getMyPaymentHistory, getPaymentDetail, getPaymentReceiptPdf };

export default {
    getMyPaymentHistory,
    getPaymentDetail,
    getPaymentReceiptPdf,
};
