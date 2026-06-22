import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import ArtistRevenueSummary from "../../models/ArtistRevenueSummary.js";
import WithdrawalRequest from "../../models/WithdrawalRequest.js";
import { AppError } from "../../utils/AppError.js";

const DEFAULT_WITHDRAWAL_REQUEST_PAGE = 1;
const DEFAULT_WITHDRAWAL_REQUEST_LIMIT = 10;
const WITHDRAWAL_PASSWORD_SALT_ROUNDS = 10;
const MIN_WITHDRAWAL_AMOUNT = 200000;

const normalizeWithdrawalPagination = (query = {}) => {
    const page = Math.max(
        DEFAULT_WITHDRAWAL_REQUEST_PAGE,
        Number.parseInt(query.page, 10) || DEFAULT_WITHDRAWAL_REQUEST_PAGE
    );
    const limit = Math.min(
        DEFAULT_WITHDRAWAL_REQUEST_LIMIT,
        Math.max(
            1,
            Number.parseInt(query.limit, 10) || DEFAULT_WITHDRAWAL_REQUEST_LIMIT
        )
    );

    return { page, limit };
};

const getArtistByUserId = async (userId, options = {}) => {
    const { lean = true } = options;
    const query = Artist.findOne({ userId }).select(
        "_id name revenue payoutAccounts withdrawalSecurity"
    );

    const artist = lean ? await query.lean() : await query;

    if (!artist) {
        throw new AppError(
            "Không tìm thấy hồ sơ nghệ sĩ cho tài khoản này.",
            StatusCodes.NOT_FOUND
        );
    }

    return artist;
};

const formatPayoutAccount = (account = {}) => ({
    id: String(account._id),
    bankName: account.bankName || "",
    accountNumber: account.accountNumber || "",
    accountHolderName: account.accountHolderName || "",
    isDefault: Boolean(account.isDefault),
});

const formatWithdrawalRequest = (request) => ({
    id: String(request._id),
    amount: Number(request.amount || 0),
    method: request.method || "bank",
    accountInfo: {
        bankName: request.accountInfo?.bankName || "",
        accountNumber: request.accountInfo?.accountNumber || "",
        accountHolderName: request.accountInfo?.accountHolderName || "",
    },
    status: request.status || "pending",
    requestedAt: request.requestedAt || request.createdAt || null,
    processedAt: request.processedAt || null,
    adminNote: request.adminNote || "",
    rejectReason: request.rejectReason || "",
    createdAt: request.createdAt || null,
    updatedAt: request.updatedAt || null,
});

const getRevenueSummaryData = async (artist) => {
    const [revenueSummaries, totalWithdrawalRequests, pendingWithdrawalRows] = await Promise.all([
        ArtistRevenueSummary.find({ artistId: artist._id })
            .sort({ year: -1, month: -1, _id: -1 })
            .select(
                "year month totalEligibleStreams grossRevenueAmount artistRevenueAmount withdrawnAmount availableAmount status calculatedAt updatedAt"
            )
            .lean(),
        WithdrawalRequest.countDocuments({ artistId: artist._id }),
        WithdrawalRequest.aggregate([
            {
                $match: {
                    artistId: artist._id,
                    status: { $in: ["pending", "approved"] },
                },
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" },
                },
            },
        ]),
    ]);

    const latestSummary = revenueSummaries[0] || null;
    const totals = revenueSummaries.reduce(
        (accumulator, summary) => ({
            totalEligibleStreams:
                accumulator.totalEligibleStreams +
                Number(summary?.totalEligibleStreams || 0),
            lifetimeGrossRevenueAmount:
                accumulator.lifetimeGrossRevenueAmount +
                Number(summary?.grossRevenueAmount || 0),
            lifetimeArtistRevenueAmount:
                accumulator.lifetimeArtistRevenueAmount +
                Number(summary?.artistRevenueAmount || 0),
        }),
        {
            totalEligibleStreams: 0,
            lifetimeGrossRevenueAmount: 0,
            lifetimeArtistRevenueAmount: 0,
        }
    );

    const pendingWithdrawalAmount = Number(
        pendingWithdrawalRows[0]?.totalAmount || 0
    );
    const payoutAccounts = Array.isArray(artist.payoutAccounts)
        ? artist.payoutAccounts.map(formatPayoutAccount)
        : [];

    return {
        artist: {
            id: String(artist._id),
            name: artist.name || "Artist",
        },
        balance: {
            currency: "VND",
            availableAmount: Number(latestSummary?.availableAmount || 0),
            withdrawnAmount: Number(latestSummary?.withdrawnAmount || 0),
            totalEligibleStreams: Number(totals.totalEligibleStreams || 0),
            lifetimeGrossRevenueAmount: Number(
                totals.lifetimeGrossRevenueAmount || 0
            ),
            lifetimeArtistRevenueAmount: Number(
                totals.lifetimeArtistRevenueAmount || 0
            ),
            latestStatus: latestSummary?.status || "pending",
            latestPeriod: latestSummary
                ? {
                    year: Number(latestSummary.year),
                    month: Number(latestSummary.month),
                }
                : null,
            calculatedAt: latestSummary?.calculatedAt || null,
            updatedAt: latestSummary?.updatedAt || null,
            summaryCount: revenueSummaries.length,
        },
        withdrawalSummary: {
            pendingAmount: pendingWithdrawalAmount,
            requestCount: totalWithdrawalRequests,
        },
        payoutAccounts,
        hasWithdrawalPassword: Boolean(
            artist.withdrawalSecurity?.passwordHash || ""
        ),
        withdrawalRequests: [],
        monthlySummaries: revenueSummaries.map((summary) => ({
            id: String(summary._id),
            year: Number(summary.year),
            month: Number(summary.month),
            totalEligibleStreams: Number(summary?.totalEligibleStreams || 0),
            grossRevenueAmount: Number(summary?.grossRevenueAmount || 0),
            artistRevenueAmount: Number(summary?.artistRevenueAmount || 0),
            withdrawnAmount: Number(summary?.withdrawnAmount || 0),
            availableAmount: Number(summary?.availableAmount || 0),
            status: summary?.status || "pending",
            calculatedAt: summary?.calculatedAt || null,
            updatedAt: summary?.updatedAt || null,
        })),
    };
};

export const getMyRevenueSummaryByUserId = async (userId) => {
    const artist = await getArtistByUserId(userId);
    return getRevenueSummaryData(artist);
};

export const createPayoutAccountByUserId = async (userId, payload = {}) => {
    const artist = await getArtistByUserId(userId, { lean: false });
    const bankName = String(payload.bankName || "").trim();
    const accountNumber = String(payload.accountNumber || "").trim();
    const accountHolderName = String(payload.accountHolderName || "").trim();
    const withdrawalPassword = String(payload.withdrawalPassword || "").trim();

    const hasExistingWithdrawalPassword = Boolean(
        artist.withdrawalSecurity?.passwordHash || ""
    );

    if (!hasExistingWithdrawalPassword && !withdrawalPassword) {
        throw new AppError(
            "Vui lòng tạo mật khẩu rút tiền trước khi lưu tài khoản nhận tiền đầu tiên.",
            StatusCodes.BAD_REQUEST,
            { field: "withdrawalPassword" }
        );
    }

    const duplicatedAccount = (artist.payoutAccounts || []).some(
        (account) =>
            String(account.bankName || "").trim().toLowerCase() ===
                bankName.toLowerCase() &&
            String(account.accountNumber || "").trim() === accountNumber
    );

    if (duplicatedAccount) {
        throw new AppError(
            "Tài khoản nhận tiền này đã được lưu trước đó.",
            StatusCodes.CONFLICT,
            { field: "accountNumber" }
        );
    }

    if (!hasExistingWithdrawalPassword) {
        artist.withdrawalSecurity = {
            passwordHash: await bcrypt.hash(
                withdrawalPassword,
                WITHDRAWAL_PASSWORD_SALT_ROUNDS
            ),
        };
    }

    const hasDefaultAccount = (artist.payoutAccounts || []).some(
        (account) => account.isDefault
    );

    artist.payoutAccounts.push({
        bankName,
        accountNumber,
        accountHolderName,
        isDefault: !hasDefaultAccount,
    });

    await artist.save();

    const savedAccount =
        artist.payoutAccounts[artist.payoutAccounts.length - 1] || null;

    return {
        payoutAccount: savedAccount ? formatPayoutAccount(savedAccount) : null,
        hasWithdrawalPassword: Boolean(
            artist.withdrawalSecurity?.passwordHash || ""
        ),
    };
};

export const createWithdrawalRequestByUserId = async (userId, payload = {}) => {
    const artist = await getArtistByUserId(userId, { lean: false });
    const latestSummary = await ArtistRevenueSummary.findOne({
        artistId: artist._id,
    }).sort({ year: -1, month: -1, _id: -1 });

    if (!latestSummary) {
        throw new AppError(
            "Hiện chưa có dữ liệu doanh thu để tạo yêu cầu rút tiền.",
            StatusCodes.CONFLICT
        );
    }

    const amount = Math.round(Number(payload.amount || 0));

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new AppError(
            "Số tiền rút phải lớn hơn 0.",
            StatusCodes.BAD_REQUEST,
            { field: "amount" }
        );
    }

    if (amount < MIN_WITHDRAWAL_AMOUNT) {
        throw new AppError(
            "Số tiền rút tối thiểu là 200.000đ.",
            StatusCodes.BAD_REQUEST,
            { field: "amount" }
        );
    }

    if (Number(latestSummary.availableAmount || 0) < amount) {
        throw new AppError(
            "Số dư khả dụng của bạn không đủ để tạo yêu cầu rút tiền này.",
            StatusCodes.CONFLICT,
            { field: "amount" }
        );
    }

    const withdrawalPassword = String(payload.withdrawalPassword || "").trim();
    const passwordHash = artist.withdrawalSecurity?.passwordHash || "";

    if (!passwordHash) {
        throw new AppError(
            "Bạn chưa thiết lập mật khẩu rút tiền.",
            StatusCodes.CONFLICT,
            { field: "withdrawalPassword" }
        );
    }

    const isWithdrawalPasswordMatched = await bcrypt.compare(
        withdrawalPassword,
        passwordHash
    );

    if (!isWithdrawalPasswordMatched) {
        throw new AppError(
            "Mật khẩu rút tiền không chính xác.",
            StatusCodes.BAD_REQUEST,
            { field: "withdrawalPassword" }
        );
    }

    const payoutAccount = (artist.payoutAccounts || []).find(
        (account) => String(account._id) === String(payload.payoutAccountId || "")
    );

    if (!payoutAccount) {
        throw new AppError(
            "Không tìm thấy tài khoản nhận tiền đã chọn.",
            StatusCodes.NOT_FOUND,
            { field: "payoutAccountId" }
        );
    }

    latestSummary.availableAmount = Math.max(
        Number(latestSummary.availableAmount || 0) - amount,
        0
    );
    await latestSummary.save();

    await Artist.updateOne(
        { _id: artist._id },
        {
            $set: {
                "revenue.availableAmount": latestSummary.availableAmount,
            },
            $inc: {
                "revenue.pendingPayoutAmount": amount,
            },
        }
    );

    const withdrawalRequest = await WithdrawalRequest.create({
        artistId: artist._id,
        amount,
        method: "bank",
        accountInfo: {
            bankName: payoutAccount.bankName,
            accountNumber: payoutAccount.accountNumber,
            accountHolderName: payoutAccount.accountHolderName,
        },
        status: "pending",
    });

    return {
        withdrawalRequest: formatWithdrawalRequest(withdrawalRequest),
    };
};

export const getMyWithdrawalRequestsByUserId = async (userId, query = {}) => {
    const artist = await getArtistByUserId(userId);
    const { page, limit } = normalizeWithdrawalPagination(query);
    const skip = (page - 1) * limit;

    const [totalItems, withdrawalRequests] = await Promise.all([
        WithdrawalRequest.countDocuments({ artistId: artist._id }),
        WithdrawalRequest.find({ artistId: artist._id })
            .sort({ requestedAt: -1, createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return {
        withdrawalRequests: withdrawalRequests.map(formatWithdrawalRequest),
        pagination: {
            page,
            limit,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        },
    };
};

export default {
    createPayoutAccountByUserId,
    createWithdrawalRequestByUserId,
    getMyRevenueSummaryByUserId,
    getMyWithdrawalRequestsByUserId,
};
