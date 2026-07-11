import mongoose from "mongoose";
import Track from "../../models/Track.js";
import Artist from "../../models/Artist.js";
import Album from "../../models/Album.js";
import ArtistStat from "../../models/ArtistStat.js";
import ArtistRevenueSummary from "../../models/ArtistRevenueSummary.js";
import { normalizePositiveInteger } from "../Playlist/playlist.helper.js";
import { AppError } from "../../utils/AppError.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toId = (value) => {
    if (!value) return null;
    return value.toString();
};

const formatAdminArtistListItem = (artist) => {
    return {
        id: toId(artist._id),
        userId: toId(artist.userId),
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

const formatAdminArtistDetailItem = (artist, trackCount, albumCount, advancedStats, revenueSummary) => {
    const hasActiveTracks = trackCount > 0;
    const isPopular = (artist.stats?.followers || 0) > 100 || (artist.stats?.totalStreams || 0) > 1000;
    const hasLinkedSocials = !!(artist.socialLinks?.facebook || artist.socialLinks?.instagram || artist.socialLinks?.youtube);

    return {
        name: artist.name,
        email: artist.userId?.email || "—",
        bio: artist.bio || "Nghệ sĩ chưa cập nhật tiểu sử.",
        avatar: artist.avatar || "",
        coverImage: artist.coverImage || "",
        verificationStatus: artist.verificationStatus || "pending",
        activeStatus: artist.activeStatus || "active",
        createdAt: artist.createdAt,
        updatedAt: artist.updatedAt,
        blockedReason: artist.blockedReason || "",
        
        metrics: {
            followers: artist.stats?.followers || 0,
            totalStreams: artist.stats?.totalStreams || 0,
            monthlyListeners: advancedStats?.monthlyListeners || 0,
            totalTracks: trackCount,
            totalAlbums: albumCount
        },
        demographics: advancedStats?.demographics?.countries || {},

        finance: revenueSummary ? {
            availableAmount: revenueSummary.availableAmount || 0,
            withdrawnAmount: revenueSummary.withdrawnAmount || 0,
            grossRevenueAmount: revenueSummary.grossRevenueAmount || 0,
            lastCalculatedPeriod: `Tháng ${revenueSummary.month}/${revenueSummary.year}`,
            status: revenueSummary.status
        } : null,

        checklist: {
            hasMusicActivity: hasActiveTracks ? "pass" : "fail",
            isIdentityVerified: artist.verificationStatus === "verified" ? "pass" : "fail",
            isAudienceGrowing: isPopular ? "pass" : "fail",
            hasSocialNodes: hasLinkedSocials ? "pass" : "fail",
            isFinanceActive: revenueSummary ? "pass" : "fail",
            isAccountClean: artist.activeStatus === "active" ? "pass" : "fail"
        },

        socialLinks: artist.socialLinks || { facebook: "", instagram: "", youtube: "" }
    };
};

const getArtistDetailForAdmin = async (artistId) => {
    if (!mongoose.Types.ObjectId.isValid(artistId)) {
        throw new AppError("Artist id is invalid.", 400, { field: "id" });
    }

    const artist = await Artist.findById(artistId)
        .populate({ path: "userId", select: "email" })
        .lean();

    if (!artist) {
        throw new AppError("Artist not found.", 404, { field: "id" });
    }

    const [trackCount, albumCount, advancedStats, revenueSummary] = await Promise.all([
        Track.countDocuments({ artist_artistId: artistId }),
        Album.countDocuments({ artistId: artistId }),
        ArtistStat.findOne({ artistId: artistId }).lean(),
        ArtistRevenueSummary.findOne({ artistId: artistId }).sort({ year: -1, month: -1 }).lean()
    ]);

    return formatAdminArtistDetailItem(artist, trackCount, albumCount, advancedStats, revenueSummary);
};

const listArtistsForAdmin = async (query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    
    const rawSearch = typeof query.q === "string" ? query.q.trim() : "";
    const { verificationStatus, activeStatus } = query;

    // 1. Tạo Match Stage ban đầu cho bảng Artist
    const matchStage = {};
    
    if (verificationStatus) {
        matchStage.verificationStatus = verificationStatus;
    }
    if (activeStatus) {
        matchStage.activeStatus = activeStatus;
    }

    // Nếu tìm kiếm theo tên
    if (rawSearch) {
        matchStage.name = new RegExp(escapeRegex(rawSearch), "i");
    }

    const aggregateQuery = [
        { $match: matchStage },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userContext"
            }
        },
        { $unwind: { path: "$userContext", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "tracks",
                localField: "_id",
                foreignField: "artist_artistId",
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
        // 2. Sau khi đã có trường 'email' từ lookup, nếu có tìm kiếm text, 
        // ta bổ sung lọc OR (hoặc khớp Name từ trước, hoặc khớp Email ở đây)
        ...(rawSearch ? [{
            $match: {
                $or: [
                    { name: new RegExp(escapeRegex(rawSearch), "i") },
                    { email: new RegExp(escapeRegex(rawSearch), "i") }
                ]
            }
        }] : []),
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

const updateArtistStatusForAdmin = async (artistId, { activeStatus, blockedReason }) => {
    if (!mongoose.Types.ObjectId.isValid(artistId)) {
        throw new AppError("Artist id is invalid.", 400, { field: "id" });
    }

    if (!["active", "blocked"].includes(activeStatus)) {
        throw new AppError("Invalid active status. Allowed: active, blocked", 400, { field: "activeStatus" });
    }

    const updateData = { activeStatus };
    
    if (activeStatus === "blocked") {
        updateData.blockedReason = blockedReason || "Vi phạm điều khoản hệ thống.";
    } else {
        updateData.blockedReason = ""; // Xóa lý do khi unblock
    }

    const updatedArtist = await Artist.findByIdAndUpdate(
        artistId,
        { $set: updateData },
        { new: true }
    ).lean();

    if (!updatedArtist) {
        throw new AppError("Artist not found.", 404, { field: "id" });
    }

    return {
        id: updatedArtist._id.toString(),
        activeStatus: updatedArtist.activeStatus,
        blockedReason: updatedArtist.blockedReason
    };
};


export default {
    listArtistsForAdmin,
    getArtistDetailForAdmin,
    updateArtistStatusForAdmin,
};