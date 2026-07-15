import mongoose from "mongoose";
import Album from "../../models/Album.js";
import Artist from "../../models/Artist.js";
import Notification from "../../models/Notification.js";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";
import { normalizePositiveInteger } from "./album.helper.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toId = (value) => {
    if (!value) {
        return null;
    }

    return value.toString();
};

const getAlbumTrackIds = (album) => {
    const seen = new Set();

    return (album?.trackList || []).reduce((result, item) => {
        const trackId = item?.trackId?._id || item?.trackId;

        if (!trackId) {
            return result;
        }

        const normalizedTrackId = String(trackId);

        if (seen.has(normalizedTrackId)) {
            return result;
        }

        seen.add(normalizedTrackId);
        result.push(normalizedTrackId);

        return result;
    }, []);
};

const formatAdminAlbumListItem = (album) => ({
    id: toId(album._id),
    title: album.title,
    coverImage: album.coverImage || "",
    releaseDate: album.releaseDate || null,
    status: album.status,
    blockedReason: album.blockedReason || "",
    totalDuration: album.totalDuration || 0,
    trackCount:
        typeof album.trackCount === "number"
            ? album.trackCount
            : Array.isArray(album.trackList)
              ? album.trackList.length
              : 0,
    artist: album.artistId
        ? {
            id: toId(album.artistId._id || album.artistId),
            name: album.artistId.name || album.artistName || "",
            avatar: album.artistId.avatar || album.artistAvatar || "",
            activeStatus:
                album.artistId.activeStatus || album.artistActiveStatus || "active",
            email: album.artistEmail || "",
        }
        : album.artistName
          ? {
              id: toId(album.artistObjectId),
              name: album.artistName,
              avatar: album.artistAvatar || "",
              activeStatus: album.artistActiveStatus || "active",
              email: album.artistEmail || "",
          }
          : null,
    createdAt: album.createdAt,
    updatedAt: album.updatedAt,
});

const formatAdminAlbumTrackItem = (track, orderMap) => ({
    order: orderMap.get(String(track._id)) ?? null,
    track: {
        id: toId(track._id),
        title: track.title,
        duration: track.duration,
        avatar: track.avatar || "",
        coverImage: Array.isArray(track.coverImage) ? track.coverImage : [],
        releaseDate: track.releaseDate || null,
        approvalStatus: track.approvalStatus,
        activeStatus: track.activeStatus,
        blockedReason: track.blockedReason || "",
        hiddenReason: track.hiddenReason || "",
        hiddenAt: track.hiddenAt || null,
        artist: track.artist_artistId
            ? {
                id: toId(track.artist_artistId._id || track.artist_artistId),
                name: track.artist_artistId.name || "",
                avatar: track.artist_artistId.avatar || "",
            }
            : null,
        createdAt: track.createdAt,
        updatedAt: track.updatedAt,
    },
});

const formatAdminAlbumDetailItem = (album, tracks) => {
    const orderMap = new Map(
        (album.trackList || []).map((item) => [String(item.trackId), item.order])
    );

    const sortedTracks = [...tracks].sort((firstTrack, secondTrack) => {
        const firstOrder = orderMap.get(String(firstTrack._id));
        const secondOrder = orderMap.get(String(secondTrack._id));

        if (typeof firstOrder === "number" && typeof secondOrder === "number") {
            return firstOrder - secondOrder;
        }

        if (typeof firstOrder === "number") {
            return -1;
        }

        if (typeof secondOrder === "number") {
            return 1;
        }

        return new Date(firstTrack.createdAt).getTime() - new Date(secondTrack.createdAt).getTime();
    });

    return {
        id: toId(album._id),
        title: album.title,
        coverImage: album.coverImage || "",
        releaseDate: album.releaseDate || null,
        status: album.status,
        blockedReason: album.blockedReason || "",
        totalDuration: album.totalDuration || 0,
        trackCount: sortedTracks.length,
        artist: album.artistId
            ? {
                id: toId(album.artistId._id),
                name: album.artistId.name || "",
                email: album.artistId.userId?.email || "",
                bio: album.artistId.bio || "",
                avatar: album.artistId.avatar || "",
                coverImage: album.artistId.coverImage || "",
                activeStatus: album.artistId.activeStatus || "active",
                blockedReason: album.artistId.blockedReason || "",
                stats: album.artistId.stats || {
                    followers: 0,
                    totalStreams: 0,
                    monthlyListeners: 0,
                },
            }
            : null,
        tracks: sortedTracks.map((track) => formatAdminAlbumTrackItem(track, orderMap)),
        createdAt: album.createdAt,
        updatedAt: album.updatedAt,
    };
};

const assertAlbumId = (albumId) => {
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
        throw new AppError("Album id is invalid.", 400, { field: "id" });
    }
};

const createAlbumStatusNotification = async ({
    album,
    artist,
    action,
    reason,
    adminUserId,
    io,
}) => {
    if (!artist?.userId) {
        return null;
    }

    const isBlockAction = action === "block";
    const title = isBlockAction
        ? `Album "${album.title}" da bi khoa`
        : `Album "${album.title}" da duoc mo khoa`;
    const content = isBlockAction
        ? `Admin da khoa album cua ban.${reason ? ` Ly do: ${reason}` : ""}`
        : "Admin da mo khoa album cua ban tren he thong.";

    const notification = await Notification.create({
        userId: artist.userId,
        type: "system",
        title,
        content,
        isRead: false,
        actorId: adminUserId || null,
        actorType: "admin",
        artistId: artist._id,
        targetId: album._id,
        targetType: "album",
        targetName: album.title || "",
        thumbnail: album.coverImage || "",
        sourceType: "admin_manual",
        receiverType: "single",
        isGlobal: false,
        readBy: [],
        deletedBy: [],
        createdBy: adminUserId || null,
    });

    if (io) {
        try {
            io.to(String(artist.userId)).emit("new_notification", notification.toObject());
        } catch (error) {
            console.error("Failed to emit album status notification:", error);
        }
    }

    return notification;
};

const listAlbumsForAdmin = async (query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const rawSearch = typeof query.q === "string" ? query.q.trim() : "";

    const matchStage = {};

    if (query.status) {
        matchStage.status = query.status;
    }

    const pipeline = [
        { $match: matchStage },
        {
            $lookup: {
                from: Artist.collection.name,
                localField: "artistId",
                foreignField: "_id",
                as: "artistContext",
            },
        },
        {
            $unwind: {
                path: "$artistContext",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "artistContext.userId",
                foreignField: "_id",
                as: "artistUserContext",
            },
        },
        {
            $unwind: {
                path: "$artistUserContext",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $addFields: {
                trackCount: {
                    $size: {
                        $ifNull: ["$trackList", []],
                    },
                },
                artistObjectId: "$artistContext._id",
                artistName: "$artistContext.name",
                artistAvatar: "$artistContext.avatar",
                artistActiveStatus: "$artistContext.activeStatus",
                artistEmail: "$artistUserContext.email",
            },
        },
        ...(rawSearch
            ? [
                {
                    $match: {
                        $or: [
                            { title: new RegExp(escapeRegex(rawSearch), "i") },
                            { artistName: new RegExp(escapeRegex(rawSearch), "i") },
                            { artistEmail: new RegExp(escapeRegex(rawSearch), "i") },
                        ],
                    },
                },
            ]
            : []),
        {
            $project: {
                artistContext: 0,
                artistUserContext: 0,
            },
        },
        { $sort: { createdAt: -1, _id: 1 } },
        {
            $facet: {
                metadata: [{ $count: "total" }],
                data: [{ $skip: skip }, { $limit: limit }],
            },
        },
    ];

    const [result] = await Album.aggregate(pipeline);
    const albums = result?.data || [];
    const total = result?.metadata?.[0]?.total || 0;

    return {
        albums: albums.map(formatAdminAlbumListItem),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

const getAlbumDetailForAdmin = async (albumId) => {
    assertAlbumId(albumId);

    const album = await Album.findById(albumId)
        .populate({
            path: "artistId",
            select: "name bio avatar coverImage activeStatus blockedReason stats userId",
            populate: {
                path: "userId",
                select: "email",
            },
        })
        .lean();

    if (!album) {
        throw new AppError("Album not found.", 404, { field: "id" });
    }

    const albumTrackIds = getAlbumTrackIds(album);
    const tracks = albumTrackIds.length === 0
        ? []
        : await Track.find({ _id: { $in: albumTrackIds } })
            .select([
                "title",
                "duration",
                "avatar",
                "coverImage",
                "releaseDate",
                "approvalStatus",
                "activeStatus",
                "blockedReason",
                "hiddenReason",
                "hiddenAt",
                "artist_artistId",
                "createdAt",
                "updatedAt",
            ].join(" "))
            .populate({
                path: "artist_artistId",
                select: "name avatar",
            })
            .lean();

    return formatAdminAlbumDetailItem(album, tracks);
};

const updateAlbumStatusForAdmin = async (
    albumId,
    payload = {},
    adminUserId = null,
    io = null
) => {
    assertAlbumId(albumId);

    const album = await Album.findById(albumId).populate({
        path: "artistId",
        select: "_id userId name",
    });

    if (!album) {
        throw new AppError("Album not found.", 404, { field: "id" });
    }

    if (!["block", "unblock"].includes(payload.action)) {
        throw new AppError("Invalid action.", 400, { field: "action" });
    }

    if (payload.action === "block") {
        const reason = (
            payload.blockedReason ||
            payload.adminNote ||
            "Blocked by administrator."
        ).trim();

        if (album.status !== "blocked") {
            album.previousStatusBeforeAdminBlock = album.status || "active";
        }

        album.status = "blocked";
        album.blockedReason = reason;
        await album.save();

        const albumTrackIds = getAlbumTrackIds(album);
        const tracks = albumTrackIds.length === 0
            ? []
            : await Track.find({ _id: { $in: albumTrackIds } }).select([
                "_id",
                "activeStatus",
                "hiddenReason",
                "hiddenAt",
                "blockedByAlbumId",
            ].join(" "));

        const operations = tracks.reduce((result, track) => {
            const isBlockedByThisAlbum =
                track.blockedByAlbumId &&
                String(track.blockedByAlbumId) === String(album._id);

            if (isBlockedByThisAlbum) {
                result.push({
                    updateOne: {
                        filter: { _id: track._id },
                        update: {
                            $set: {
                                blockedReason: reason,
                            },
                        },
                    },
                });
                return result;
            }

            if (track.activeStatus === "blocked") {
                return result;
            }

            result.push({
                updateOne: {
                    filter: { _id: track._id },
                    update: {
                        $set: {
                            activeStatus: "blocked",
                            blockedReason: reason,
                            hiddenReason: "",
                            hiddenAt: null,
                            blockedByAlbumId: album._id,
                            previousActiveStatusBeforeAlbumBlock:
                                track.activeStatus || "active",
                            previousHiddenReasonBeforeAlbumBlock:
                                track.hiddenReason || "",
                            previousHiddenAtBeforeAlbumBlock:
                                track.hiddenAt || null,
                        },
                    },
                },
            });

            return result;
        }, []);

        if (operations.length > 0) {
            await Track.bulkWrite(operations);
        }

        await createAlbumStatusNotification({
            album,
            artist: album.artistId,
            action: "block",
            reason,
            adminUserId,
            io,
        });
    } else {
        const restoredAlbumStatus = album.previousStatusBeforeAdminBlock || "active";

        album.status = restoredAlbumStatus;
        album.blockedReason = "";
        album.previousStatusBeforeAdminBlock = null;
        await album.save();

        const tracks = await Track.find({
            album_albumId: album._id,
            blockedByAlbumId: album._id,
        }).select([
            "_id",
            "previousActiveStatusBeforeAlbumBlock",
            "previousHiddenReasonBeforeAlbumBlock",
            "previousHiddenAtBeforeAlbumBlock",
        ].join(" "));

        const operations = tracks.map((track) => {
            const restoredTrackStatus =
                track.previousActiveStatusBeforeAlbumBlock || "active";

            return {
                updateOne: {
                    filter: { _id: track._id },
                    update: {
                        $set: {
                            activeStatus: restoredTrackStatus,
                            blockedReason: "",
                            hiddenReason:
                                restoredTrackStatus === "hidden"
                                    ? track.previousHiddenReasonBeforeAlbumBlock || ""
                                    : "",
                            hiddenAt:
                                restoredTrackStatus === "hidden"
                                    ? track.previousHiddenAtBeforeAlbumBlock || new Date()
                                    : null,
                            blockedByAlbumId: null,
                            previousActiveStatusBeforeAlbumBlock: null,
                            previousHiddenReasonBeforeAlbumBlock: "",
                            previousHiddenAtBeforeAlbumBlock: null,
                        },
                    },
                },
            };
        });

        if (operations.length > 0) {
            await Track.bulkWrite(operations);
        }

        await createAlbumStatusNotification({
            album,
            artist: album.artistId,
            action: "unblock",
            reason: "",
            adminUserId,
            io,
        });
    }

    return getAlbumDetailForAdmin(albumId);
};

export default {
    listAlbumsForAdmin,
    getAlbumDetailForAdmin,
    updateAlbumStatusForAdmin,
};
