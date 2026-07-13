import Transaction from "../../models/Transaction.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";
import {
    DEFAULT_LIMIT,
    DEFAULT_PAGE,
    MAX_LIMIT,
    VALID_PAYMENT_METHODS,
    VALID_TRANSACTION_STATUSES,
    buildPagination,
    buildTransactionDateFilter,
    escapeRegex,
    formatTransactionListItem,
    normalizeEnumFilter,
    normalizePositiveInteger,
} from "./transaction.service.helper.js";

const getTransactionList = async (query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE, "page");
    const limit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT, "limit", {
        max: MAX_LIMIT,
    });
    const skip = (page - 1) * limit;
    const filter = {};

    const status = normalizeEnumFilter(
        query.status,
        VALID_TRANSACTION_STATUSES,
        "status"
    );
    const paymentMethod = normalizeEnumFilter(
        query.paymentMethod,
        VALID_PAYMENT_METHODS,
        "paymentMethod"
    );

    if (status) {
        filter.status = status;
    }

    if (paymentMethod) {
        filter.paymentMethod = paymentMethod;
    }

    const dateFilter = buildTransactionDateFilter(
        query.startDate,
        query.endDate
    );

    if (dateFilter) {
        Object.assign(filter, dateFilter);
    }

    if (
        query.search !== undefined &&
        query.search !== null &&
        typeof query.search !== "string"
    ) {
        throw new AppError("Invalid search.", 400, { field: "search" });
    }

    const search = (query.search || "").trim();

    if (search) {
        const escapedSearch = escapeRegex(search);
        const matchedUsers = await User.find({
            email: {
                $regex: escapedSearch,
                $options: "i",
            },
        })
            .select("_id")
            .lean();
        const matchedUserIds = matchedUsers.map((user) => user._id);

        filter.$or = [
            {
                invoiceNumber: {
                    $regex: escapedSearch,
                    $options: "i",
                },
            },
            {
                userId: {
                    $in: matchedUserIds,
                },
            },
        ];
    }

    const [transactions, total] = await Promise.all([
        Transaction.find(filter)
            .select(
                "userId planId invoiceNumber totalAmount currency paymentMethod status paidAt createdAt"
            )
            .populate({
                path: "userId",
                select: "_id email",
            })
            .populate({
                path: "planId",
                select: "_id name",
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Transaction.countDocuments(filter),
    ]);

    return {
        transactions: transactions.map(formatTransactionListItem),
        pagination: buildPagination(page, limit, total),
    };
};

export { getTransactionList };

export default {
    getTransactionList,
};
