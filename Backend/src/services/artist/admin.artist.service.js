import mongoose from "mongoose";
import Track from "../../models/Track.js";
import Artist from "../../models/Artist.js";
import Album from "../../models/Album.js";
import Podcast from "../../models/Podcast.js";
import ArtistMonthlyStat from "../../models/ArtistMonthlyStat.js";
import ArtistStat from "../../models/ArtistStat.js";
import ArtistRevenueSummary from "../../models/ArtistRevenueSummary.js";
import Notification from "../../models/Notification.js";
import { normalizePositiveInteger } from "../Playlist/playlist.helper.js";
import { AppError } from "../../utils/AppError.js";
import { recordAuditEvent } from "../audit/auditLog.service.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export const syncArtistContentVisibility = async (artistId, activeStatus, reason) => {
    if (activeStatus === "blocked") {
        await Album.updateMany(
            {
                artistId,
                isDeleted: { $ne: true },
                status: { $ne: "blocked" },
            },
            [{
                $set: {
                    previousStatusBeforeArtistBlock: "$status",
                    status: "blocked",
                    blockedByArtistId: artistId,
                    blockedReason: reason,
                },
            }]
        );

        await Track.updateMany(
            {
                artist_artistId: artistId,
                isDeleted: { $ne: true },
                activeStatus: { $ne: "blocked" },
            },
            [{
                $set: {
                    previousActiveStatusBeforeArtistBlock: "$activeStatus",
                    activeStatus: "blocked",
                    blockedByArtistId: artistId,
                    blockedReason: reason,
                },
            }]
        );

        await Podcast.updateMany(
            {
                creator: artistId,
                isDeleted: { $ne: true },
                blockedByArtistId: { $ne: artistId },
            },
            [{
                $set: {
                    previousVisibilityBeforeArtistBlock: "$visibility",
                    visibility: "hidden",
                    blockedByArtistId: artistId,
                    isBlocked: true,
                    blockedReason: reason || "Nội dung bị khóa do tài khoản nghệ sĩ bị khóa.",
                    blockedAt: "$$NOW",
                    blockedBy: null,
                },
            }]
        );
        return;
    }

    const [blockedAlbums, blockedTracks, blockedPodcasts] = await Promise.all([
        Album.find({ blockedByArtistId: artistId }).select("_id status previousStatusBeforeArtistBlock"),
        Track.find({ blockedByArtistId: artistId }).select("_id activeStatus approvalStatus previousActiveStatusBeforeArtistBlock"),
        Podcast.find({ blockedByArtistId: artistId }).select("_id visibility previousVisibilityBeforeArtistBlock"),
    ]);

    if (blockedAlbums.length > 0) {
        await Album.bulkWrite(blockedAlbums.map((album) => ({
            updateOne: {
                filter: { _id: album._id, blockedByArtistId: artistId },
                update: {
                    $set: {
                        status: album.previousStatusBeforeArtistBlock || "draft",
                        blockedReason: "",
                        blockedByArtistId: null,
                        previousStatusBeforeArtistBlock: null,
                    },
                },
            },
        })));
    }

    if (blockedTracks.length > 0) {
        await Track.bulkWrite(blockedTracks.map((track) => ({
            updateOne: {
                filter: { _id: track._id, blockedByArtistId: artistId },
                update: {
                    $set: {
                        activeStatus: track.previousActiveStatusBeforeArtistBlock ||
                            (track.approvalStatus === "approved" ? "active" : "draft"),
                        blockedReason: "",
                        blockedByArtistId: null,
                        previousActiveStatusBeforeArtistBlock: null,
                    },
                },
            },
        })));
    }

    if (blockedPodcasts.length > 0) {
        await Podcast.bulkWrite(blockedPodcasts.map((podcast) => ({
            updateOne: {
                filter: { _id: podcast._id, blockedByArtistId: artistId },
                update: {
                    $set: {
                        visibility: podcast.previousVisibilityBeforeArtistBlock || "hidden",
                        blockedByArtistId: null,
                        previousVisibilityBeforeArtistBlock: null,
                        isBlocked: false,
                        blockedReason: null,
                        blockedAt: null,
                        blockedBy: null,
                    },
                },
            },
        })));
    }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toId = (value) => {
    if (!value) return null;
    return value.toString();
};

const formatAdminArtistListItem = (artist) => ({
    id: toId(artist._id),
    userId: toId(artist.userId),
    name: artist.name,
    avatar: artist.avatar || "",
    bio: artist.bio || "",
    activeStatus: artist.activeStatus || "active",
    email: artist.email || "-",
    totalTracks: artist.totalTracks || 0,
    stats: artist.stats || { followers: 0, totalStreams: 0 },
    createdAt: artist.createdAt,
});

const formatAdminArtistDetailItem = (
    artist,
    trackCount,
    albumCount,
    latestMonthlyStat,
    artistStat,
    revenueSummary
) => {
    const hasActiveTracks = trackCount > 0;
    const totalFollowers =
        artistStat?.totalFollowers ||
        latestMonthlyStat?.totalFollowers ||
        artist.stats?.followers ||
        0;
    const totalStreams =
        artistStat?.totalStreams ||
        artist.stats?.totalStreams ||
        latestMonthlyStat?.totalStreams ||
        0;
    const isPopular =
        totalFollowers > 100 || totalStreams > 1000;
    const hasLinkedSocials = Boolean(
        artist.socialLinks?.facebook ||
            artist.socialLinks?.instagram ||
            artist.socialLinks?.youtube
    );

    return {
        name: artist.name,
        email: artist.userId?.email || "-",
        bio: artist.bio || "Artist has not updated a bio yet.",
        avatar: artist.avatar || "",
        coverImage: artist.coverImage || "",
        activeStatus: artist.activeStatus || "active",
        createdAt: artist.createdAt,
        updatedAt: artist.updatedAt,
        blockedReason: artist.blockedReason || "",
        metrics: {
            followers: totalFollowers,
            totalStreams,
            monthlyListeners:
                artistStat?.monthlyListeners ||
                artist.stats?.monthlyListeners ||
                0,
            totalTracks: trackCount,
            totalAlbums: albumCount,
        },
        finance: revenueSummary
            ? {
                availableAmount: artist.revenue?.availableAmount || 0,
                withdrawnAmount: artist.revenue?.totalWithdrawnAmount || 0,
                grossRevenueAmount: revenueSummary.grossRevenueAmount || 0,
                lastCalculatedPeriod: `Month ${revenueSummary.month}/${revenueSummary.year}`,
                status: revenueSummary.status,
            }
            : null,
        checklist: {
            hasMusicActivity: hasActiveTracks ? "pass" : "fail",
            isAudienceGrowing: isPopular ? "pass" : "fail",
            hasSocialNodes: hasLinkedSocials ? "pass" : "fail",
            isFinanceActive: revenueSummary ? "pass" : "fail",
            isAccountClean: artist.activeStatus === "active" ? "pass" : "fail",
        },
        socialLinks: artist.socialLinks || {
            facebook: "",
            instagram: "",
            youtube: "",
        },
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

    const [trackCount, albumCount, latestMonthlyStat, artistStat, revenueSummary] =
        await Promise.all([
            Track.countDocuments({ artist_artistId: artistId, isDeleted: { $ne: true } }),
            Album.countDocuments({ artistId, isDeleted: { $ne: true } }),
            ArtistMonthlyStat.findOne({ artistId })
                .sort({ year: -1, month: -1 })
                .lean(),
            ArtistStat.findOne({ artistId }).lean(),
            ArtistRevenueSummary.findOne({ artistId })
                .sort({ year: -1, month: -1 })
                .lean(),
        ]);

    return formatAdminArtistDetailItem(
        artist,
        trackCount,
        albumCount,
        latestMonthlyStat,
        artistStat,
        revenueSummary
    );
};

const listArtistsForAdmin = async (query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const rawSearch = typeof query.q === "string" ? query.q.trim() : "";
    const { activeStatus } = query;

    const matchStage = { isDeleted: { $ne: true } };

    if (activeStatus) {
        matchStage.activeStatus = activeStatus;
    }

    const aggregateQuery = [
        { $match: matchStage },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userContext",
            },
        },
        { $unwind: { path: "$userContext", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "tracks",
                let: { artistId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$artist_artistId", "$$artistId"] },
                                    { $ne: [{ $ifNull: ["$isDeleted", false] }, true] },
                                ],
                            },
                        },
                    },
                ],
                as: "tracksData",
            },
        },
        {
            $addFields: {
                email: "$userContext.email",
                totalTracks: { $size: "$tracksData" },
            },
        },
        {
            $project: {
                tracksData: 0,
                userContext: 0,
            },
        },
        ...(rawSearch
            ? [
                {
                    $match: {
                        $or: [
                            {
                                name: new RegExp(escapeRegex(rawSearch), "i"),
                            },
                            {
                                email: new RegExp(escapeRegex(rawSearch), "i"),
                            },
                        ],
                    },
                },
            ]
            : []),
        { $sort: { createdAt: -1, _id: 1 } },
        {
            $facet: {
                metadata: [{ $count: "total" }],
                data: [{ $skip: skip }, { $limit: limit }],
            },
        },
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

const updateArtistStatusForAdmin = async (
    artistId,
    { activeStatus, blockedReason, adminUserId = null }
) => {
    if (!mongoose.Types.ObjectId.isValid(artistId)) {
        throw new AppError("Artist id is invalid.", 400, { field: "id" });
    }

    if (!["active", "blocked"].includes(activeStatus)) {
        throw new AppError(
            "Invalid active status. Allowed: active, blocked",
            400,
            { field: "activeStatus" }
        );
    }

    const updateData = { activeStatus };

    if (activeStatus === "blocked") {
        updateData.blockedReason =
            blockedReason || "Vi phạm điều khoản hệ thống.";
    } else {
        updateData.blockedReason = "";
    }

    const artist = await Artist.findById(artistId);

    if (!artist) {
        throw new AppError("Artist not found.", 404, { field: "id" });
    }

    if (artist.isDeleted === true) {
        throw new AppError("Deleted artist profiles cannot be restored or blocked.", 409);
    }

    await syncArtistContentVisibility(artist._id, activeStatus, updateData.blockedReason);

    const updatedArtist = await Artist.findByIdAndUpdate(
        artistId,
        { $set: updateData },
        { new: true, runValidators: true }
    ).lean();

    void recordAuditEvent({
        actorUserId: adminUserId,
        action: `admin.artist.${activeStatus === "blocked" ? "block" : "unblock"}`,
        targetType: "artist",
        targetId: artistId,
        metadata: { activeStatus, reason: updateData.blockedReason },
    }).catch(() => null);

    if (!updatedArtist) {
        throw new AppError("Artist not found.", 404, { field: "id" });
    }

    // Send notification to artist user
    if (updatedArtist.userId) {
        try {
            const isUnblocking = activeStatus === "active";
            await Notification.create({
                userId: updatedArtist.userId,
                type: "system",
                title: isUnblocking
                    ? "Thông báo mở khóa tài khoản nghệ sĩ"
                    : "Thông báo khóa tài khoản nghệ sĩ",
                content: isUnblocking
                    ? "Tài khoản nghệ sĩ của bạn đã được quản trị viên mở khóa thành công. Bạn có thể tiếp tục quản lý bài hát và hoạt động bình thường."
                    : `Tài khoản nghệ sĩ của bạn đã bị khóa. Lý do: ${updateData.blockedReason}`,
                targetId: artistId,
                targetType: "artist",
                receiverType: "single",
                targetRoles: ["artist"],
                sourceType: "admin_manual",
            });
        } catch (err) {
            console.error("Error creating artist status notification:", err);
        }
    }

    return {
        id: updatedArtist._id.toString(),
        activeStatus: updatedArtist.activeStatus,
        blockedReason: updatedArtist.blockedReason,
    };
};

export default {
    listArtistsForAdmin,
    getArtistDetailForAdmin,
    updateArtistStatusForAdmin,
};
