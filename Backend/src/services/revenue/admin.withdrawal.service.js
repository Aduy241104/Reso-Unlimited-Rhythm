import mongoose from "mongoose";
import Artist from "../../models/Artist.js";
import User from "../../models/User.js";
import WithdrawalRequest from "../../models/WithdrawalRequest.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const ALLOWED_SORT_FIELDS = new Set([
    "requestedAt",
    "amount",
    "status",
    "method",
    "createdAt",
    "updatedAt",
]);

const normalizePositiveInteger = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed < 1) {
        return fallback;
    }

    return Math.min(parsed, max);
};

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findArtistIdsBySearch = async (rawSearch = "") => {
    const q = String(rawSearch || "").trim();
    if (!q) return [];

    const searchRegex = new RegExp(escapeRegex(q), "i");

    const matchingUsers = await User.find({
        $or: [
            { email: searchRegex },
            { "profile.fullName": searchRegex },
        ],
    })
        .select("_id")
        .lean();

    const userIds = matchingUsers.map((user) => user._id);
    const artistOr = [
        { name: searchRegex },
        { stageName: searchRegex },
        { artistName: searchRegex },
    ];

    if (userIds.length > 0) {
        artistOr.push({ userId: { $in: userIds } });
    }

    const artists = await Artist.find({ $or: artistOr })
        .select("_id")
        .lean();

    return artists.map((artist) => artist._id);
};

const buildWithdrawalFilter = async (query = {}) => {
    const filter = {};

    if (query.status) {
        filter.status = query.status;
    }

    if (query.method) {
        filter.method = query.method;
    }

    if (query.q) {
        const artistIds = await findArtistIdsBySearch(query.q);
        filter.artistId = {
            $in: artistIds.length > 0 ? artistIds : [new mongoose.Types.ObjectId()],
        };
    }

    return filter;
};

const getWithdrawalRequestsForAdmin = async (query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const limit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const sortBy = ALLOWED_SORT_FIELDS.has(query.sortBy) ? query.sortBy : "requestedAt";
    const sortOrder = query.sortOrder === "asc" ? 1 : -1;
    const filter = await buildWithdrawalFilter(query);

    const [withdrawals, total] = await Promise.all([
        WithdrawalRequest.find(filter)
            .sort({ [sortBy]: sortOrder, _id: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "artistId",
                select: "name avatar userId verificationStatus activeStatus revenue",
                populate: {
                    path: "userId",
                    select: "email avatar profile role activeStatus",
                },
            })
            .populate({
                path: "processedBy",
                select: "email avatar profile role activeStatus",
            })
            .lean(),
        WithdrawalRequest.countDocuments(filter),
    ]);

    return {
        withdrawals,
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

export default {
    getWithdrawalRequestsForAdmin,
};
