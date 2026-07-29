import mongoose from "mongoose";
import Transaction from "../../models/Transaction.js";
import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";
import {
    buildPagination,
    escapeRegex,
    formatTransactionDetail,
    formatTransactionListItem,
    validateTransactionListQuery,
} from "./transaction.service.helper.js";

const getTransactionList = async (query = {}) => {
    const {
        page,
        limit,
        search,
        status,
        paymentMethod,
    } = validateTransactionListQuery(query);
    const skip = (page - 1) * limit;
    const filter = {};

    if (status) {
        filter.status = status;
    }

    if (paymentMethod) {
        filter.paymentMethod = paymentMethod;
    }

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

const getTransactionDetail = async (transactionId) => {
    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
        throw new AppError("Transaction id is invalid.", 400);
    }

    const transaction = await Transaction.findById(transactionId)
        .select(
            "userId subscriptionId planId amount tax totalAmount currency paymentMethod paymentGateway gatewayTransactionId status paidAt failedAt failureReason invoiceNumber createdAt updatedAt"
        )
        .populate({
            path: "userId",
            select: "_id email avatar profile.fullName profile.country profile.gender",
        })
        .populate({
            path: "planId",
            select: "_id name price durationDays",
        })
        .populate({
            path: "subscriptionId",
            select: "_id status startDate endDate",
        })
        .lean();

    if (!transaction) {
        throw new AppError("Transaction not found.", 404);
    }

    return formatTransactionDetail(transaction);
};

export { getTransactionList, getTransactionDetail };

export default {
    getTransactionList,
    getTransactionDetail,
};
