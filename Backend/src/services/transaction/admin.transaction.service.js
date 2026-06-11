import mongoose from "mongoose";
import Transaction from "../../models/Transaction.js"; // Thay đổi đường dẫn cho đúng với dự án của bạn
import User from "../../models/User.js"; // Import model User để hỗ trợ search tên/email nếu cần

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toId = (value) => (value ? value.toString() : null);

// Hàm format dữ liệu trả về giống cách bạn làm ở phần Track
const formatAdminTransactionListItem = (tx) => {
    return {
        id: toId(tx._id),
        invoiceNumber: tx.invoiceNumber,
        amount: tx.amount,
        tax: tx.tax,
        totalAmount: tx.totalAmount,
        currency: tx.currency,
        paymentMethod: tx.paymentMethod,
        paymentGateway: tx.paymentGateway,
        gatewayTransactionId: tx.gatewayTransactionId,
        status: tx.status,
        paidAt: tx.paidAt || null,
        failedAt: tx.failedAt || null,
        failureReason: tx.failureReason || "",
        createdAt: tx.createdAt,
        user: tx.userId && typeof tx.userId === "object" ? {
            id: toId(tx.userId._id),
            name: tx.userId.name || "",
            email: tx.userId.email || ""
        } : null,
        plan: tx.planId && typeof tx.planId === "object" ? {
            id: toId(tx.planId._id),
            name: tx.planId.name || "" 
        } : null
    };
};

const listTransactionsForAdmin = async (query = {}) => {
    const page = parseInt(query.page) || DEFAULT_PAGE;
    const requestedLimit = parseInt(query.limit) || DEFAULT_LIMIT;
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const rawSearch = typeof query.q === "string" ? query.q.trim() : "";

    const filter = {};

    // 1. Lọc theo trạng thái giao dịch
    if (query.status) {
        filter.status = query.status;
    }

    // 2. Lọc theo phương thức / cổng thanh toán
    if (query.paymentMethod) {
        filter.paymentMethod = query.paymentMethod;
    }
    if (query.paymentGateway) {
        filter.paymentGateway = query.paymentGateway;
    }

    // 3. Tìm kiếm nâng cao (Tìm theo mã hóa đơn, mã gateway, hoặc tìm theo User)
    if (rawSearch) {
        const searchRegex = new RegExp(escapeRegex(rawSearch), "i");
        
        // Tìm các user có tên hoặc email khớp với từ khóa để lấy ID
        const matchingUsers = await User.find({
            $or: [
                { name: searchRegex },
                { email: searchRegex }
            ]
        }).select("_id").lean();
        const userIds = matchingUsers.map(u => u._id);

        const orClause = [
            { invoiceNumber: searchRegex },
            { gatewayTransactionId: searchRegex }
        ];

        if (userIds.length > 0) {
            orClause.push({ userId: { $in: userIds } });
        }

        filter.$or = orClause;
    }

    // Thực hiện query song song để tối ưu performance
    const [transactions, total] = await Promise.all([
        Transaction.find(filter)
            .sort({ createdAt: -1 }) // Giao dịch mới nhất lên đầu
            .skip(skip)
            .limit(limit)
            .populate({ path: "userId", select: "name email" })
            .populate({ path: "planId", select: "name" }) // Giả định model Plan có trường name
            .lean(),
        Transaction.countDocuments(filter),
    ]);

    return {
        transactions: transactions.map(formatAdminTransactionListItem),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

export default {
    listTransactionsForAdmin,
};