import Transaction from "../../models/Transaction.js";
import User from "../../models/User.js";
import {
    buildPagination,
    escapeRegex,
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

export { getTransactionList };

export default {
    getTransactionList,
};
