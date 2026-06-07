import Artist from "../../models/Artist.js";
import { normalizePositiveInteger } from "../Playlist/playlist.helper.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toId = (value) => {
    if (!value) return null;
    return value.toString();
};

// Định dạng dữ liệu đầu ra trả về cho Front-End gọn gàng, bảo mật
const formatAdminArtistListItem = (artist) => {
    return {
        id: toId(artist._id),
        name: artist.name,
        avatar: artist.avatar || "",
        bio: artist.bio || "",
        verificationStatus: artist.verificationStatus || "pending",
        activeStatus: artist.activeStatus || "active",
        email: artist.email || "—",
        totalTracks: artist.totalTracks || 0,
        stats: artist.stats || { followers: 0, totalStreams: 0 },
        createdAt: artist.createdAt,
    };
};

const listArtistsForAdmin = async (query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const rawSearch = typeof query.q === "string" ? query.q.trim() : "";

    // Giai đoạn Match (Lọc tìm kiếm theo tên)
    const matchStage = {};
    if (rawSearch) {
        matchStage.name = new RegExp(escapeRegex(rawSearch), "i");
    }

    // Pipeline Aggregate tối ưu hóa hiệu năng kết hợp phân trang
    const aggregateQuery = [
        { $match: matchStage },
        {
            $lookup: {
                from: "users", // Map sang collection User để lấy trường Email
                localField: "userId",
                foreignField: "_id",
                as: "userContext"
            }
        },
        { $unwind: { path: "$userContext", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "tracks", // Map sang collection Track đếm tổng số bài nhạc đang sở hữu
                localField: "_id",
                foreignField: "artist_artistId", // Khớp đúng với foreign key schema Track của bạn
                as: "tracksData"
            }
        },
        {
            $addFields: {
                email: "$userContext.email",
                totalTracks: { $size: "$tracksData" }
            }
        },
        {
            $project: {
                tracksData: 0,
                userContext: 0
            }
        },
        { $sort: { createdAt: -1, _id: 1 } },
        {
            $facet: {
                metadata: [{ $count: "total" }],
                data: [{ $skip: skip }, { $limit: limit }]
            }
        }
    ];

    const result = await Artist.aggregate(aggregateQuery);

    const rawArtists = result[0]?.data ?? [];
    const total = result[0]?.metadata[0]?.total ?? 0;

    return {
        artists: rawArtists.map(formatAdminArtistListItem),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

export default {
    listArtistsForAdmin,
};