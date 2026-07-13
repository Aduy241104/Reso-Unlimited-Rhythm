import { AppError } from "../../utils/AppError.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const VALID_TRANSACTION_STATUSES = ["pending", "success", "failed", "refunded"];
const VALID_PAYMENT_METHODS = ["momo", "vnpay", "stripe", "card"];

const normalizePositiveInteger = (
    value,
    fallbackValue,
    field,
    options = {}
) => {
    if (value === undefined || value === null || value === "") {
        return fallbackValue;
    }

    const normalizedValue = Number(value);

    if (!Number.isInteger(normalizedValue) || normalizedValue < 1) {
        throw new AppError(`Invalid ${field}.`, 400, { field });
    }

    if (options.max && normalizedValue > options.max) {
        throw new AppError(`Invalid ${field}.`, 400, {
            field,
            max: options.max,
        });
    }

    return normalizedValue;
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

const parseDateValue = (value, field) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (typeof value !== "string") {
        throw new AppError(`Invalid ${field}.`, 400, { field });
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        throw new AppError(`Invalid ${field}.`, 400, { field });
    }

    return parsedDate;
};

const buildTransactionDateFilter = (startDateValue, endDateValue) => {
    const startDate = parseDateValue(startDateValue, "startDate");
    const endDate = parseDateValue(endDateValue, "endDate");

    if (!startDate && !endDate) {
        return null;
    }

    const createdAt = {};

    if (startDate) {
        createdAt.$gte = startDate;
    }

    if (endDate) {
        endDate.setUTCHours(23, 59, 59, 999);
        createdAt.$lte = endDate;
    }

    if (startDate && endDate && startDate > endDate) {
        throw new AppError("startDate cannot be greater than endDate.", 400, {
            startDate: startDateValue,
            endDate: endDateValue,
        });
    }

    return { createdAt };
};

const escapeRegex = (value = "") => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const formatTransactionListItem = (transaction) => {
    return {
        id: transaction._id?.toString?.() || "",
        invoiceNumber: transaction.invoiceNumber || "",
        user: transaction.userId?._id
            ? {
                id: transaction.userId._id.toString(),
                email: transaction.userId.email || "",
            }
            : null,
        plan: transaction.planId?._id
            ? {
                id: transaction.planId._id.toString(),
                name: transaction.planId.name || "",
            }
            : null,
        totalAmount: Number(transaction.totalAmount || 0),
        currency: transaction.currency || "VND",
        paymentMethod: transaction.paymentMethod || "",
        status: transaction.status || "",
        transactionDate: transaction.paidAt || transaction.createdAt || null,
    };
};

const buildPagination = (page, limit, total) => {
    return {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
};

export {
    DEFAULT_PAGE,
    DEFAULT_LIMIT,
    MAX_LIMIT,
    VALID_TRANSACTION_STATUSES,
    VALID_PAYMENT_METHODS,
    normalizePositiveInteger,
    normalizeEnumFilter,
    buildTransactionDateFilter,
    escapeRegex,
    formatTransactionListItem,
    buildPagination,
};

export default {
    DEFAULT_PAGE,
    DEFAULT_LIMIT,
    MAX_LIMIT,
    VALID_TRANSACTION_STATUSES,
    VALID_PAYMENT_METHODS,
    normalizePositiveInteger,
    normalizeEnumFilter,
    buildTransactionDateFilter,
    escapeRegex,
    formatTransactionListItem,
    buildPagination,
};
