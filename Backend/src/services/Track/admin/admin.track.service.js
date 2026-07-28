import mongoose from "mongoose";
import Track from "../../../models/Track.js";
import Artist from "../../../models/Artist.js";
import Notification from "../../../models/Notification.js";
import { normalizePositiveInteger } from "../../Playlist/playlist.helper.js";
import { AppError } from "../../../utils/AppError.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toId = (value) => {
    if (!value) return null;
    return value.toString();
};

const cloneTrackMutableData = (source) => ({
    title: source?.title || "",
    versionTitle: source?.versionTitle || "",
    description: source?.description || "",
    tags: Array.isArray(source?.tags) ? [...source.tags] : [],
    genreIds: Array.isArray(source?.genreIds)
        ? source.genreIds.map((genreId) => genreId?._id || genreId)
        : [],
    audioFiles: Array.isArray(source?.audioFiles)
        ? source.audioFiles.map((file) => ({
            url: file?.url || "",
            format: file?.format || "",
            bitrate: Number(file?.bitrate) || 0,
            label: file?.label || "",
            priority: Number(file?.priority) || 0,
        }))
        : [],
    duration: Number(source?.duration) || 0,
    avatar: source?.avatar || "",
    coverImage: Array.isArray(source?.coverImage) ? [...source.coverImage] : [],
    lyricsStatic: source?.lyricsStatic || "",
    lyricsSyncUrl: source?.lyricsSyncUrl || "",
    copyright: source?.copyright
        ? JSON.parse(JSON.stringify(source.copyright?.toObject?.() || source.copyright))
        : null,
});

const getReviewSource = (track) =>
    track?.pendingUpdate?.status === "pending" ? "pending_update" : "track_release";

const getReviewStatus = (track) =>
    track?.pendingUpdate?.status === "pending"
        ? "pending"
        : (track?.approvalStatus || "draft");

const getDisplayTrackVersion = (track) =>
    track?.pendingUpdate?.status === "pending" && track?.pendingUpdate?.data
        ? track.pendingUpdate.data
        : track;

const applyMutableTrackData = (track, data) => {
    track.title = data.title || "";
    track.versionTitle = data.versionTitle || "";
    track.description = data.description || "";
    track.tags = Array.isArray(data.tags) ? data.tags : [];
    track.genreIds = Array.isArray(data.genreIds) ? data.genreIds : [];
    track.audioFiles = Array.isArray(data.audioFiles) ? data.audioFiles : [];
    track.duration = Number(data.duration) || 0;
    track.avatar = data.avatar || "";
    track.coverImage = Array.isArray(data.coverImage) ? data.coverImage : [];
    track.lyricsStatic = data.lyricsStatic || "";
    track.lyricsSyncUrl = data.lyricsSyncUrl || "";
    track.copyright = data.copyright || null;
};

const clearPendingUpdate = (track) => {
    track.pendingUpdate = {
        status: "none",
        data: null,
        changedFields: [],
        submittedAt: null,
        lastSavedAt: null,
        reviewedBy: null,
        reviewedAt: null,
        adminNote: "",
        rejectReason: "",
    };
};

const formatPendingUpdate = (track) => {
    const pendingData = track?.pendingUpdate?.data;

    return {
        status: track?.pendingUpdate?.status || "none",
        changedFields: track?.pendingUpdate?.changedFields || [],
        submittedAt: track?.pendingUpdate?.submittedAt || null,
        lastSavedAt: track?.pendingUpdate?.lastSavedAt || null,
        reviewedAt: track?.pendingUpdate?.reviewedAt || null,
        adminNote: track?.pendingUpdate?.adminNote || "",
        rejectReason: track?.pendingUpdate?.rejectReason || "",
        reviewedBy:
            track?.pendingUpdate?.reviewedBy &&
            typeof track.pendingUpdate.reviewedBy === "object"
                ? {
                    id: toId(track.pendingUpdate.reviewedBy._id),
                    email: track.pendingUpdate.reviewedBy.email || "",
                }
                : null,
        data: pendingData
            ? {
                title: pendingData.title || "",
                versionTitle: pendingData.versionTitle || "",
                description: pendingData.description || "",
                tags: pendingData.tags || [],
                duration: pendingData.duration || 0,
                avatar: pendingData.avatar || "",
                coverImage: pendingData.coverImage || [],
                lyricsStatic: pendingData.lyricsStatic || "",
                lyricsSyncUrl: pendingData.lyricsSyncUrl || "",
                audioFiles: pendingData.audioFiles || [],
                genres: (pendingData.genreIds || []).map((genre) => ({
                    id: toId(genre._id || genre),
                    name: genre?.name || "",
                })),
                copyright: pendingData.copyright || null,
            }
            : null,
    };
};

const formatAdminTrackListItem = (track) => {
    const artistRef = track.artist_artistId;
    const displayTrack = getDisplayTrackVersion(track);
    const isPopulatedArtist =
        artistRef &&
        typeof artistRef === "object" &&
        artistRef !== null &&
        "name" in artistRef;

    return {
        id: toId(track._id),
        title: displayTrack.title,
        duration: displayTrack.duration,
        avatar: displayTrack.avatar || "",
        approvalStatus: track.approvalStatus,
        reviewStatus: getReviewStatus(track),
        reviewSource: getReviewSource(track),
        pendingUpdateStatus: track.pendingUpdate?.status || "none",
        activeStatus: track.activeStatus,
        rejectReason: track.rejectReason || "",
        hiddenReason: track.hiddenReason || "",
        hiddenAt: track.hiddenAt || null,
        moderation: track.moderation || { adminNote: "", violationFlags: [] },
        artist: isPopulatedArtist
            ? {
                id: toId(artistRef._id),
                name: artistRef.name || "",
            }
            : null,
    };
};

const formatAdminTrackDetailItem = (track) => {
    const artistRef = track.artist_artistId;
    const albumRef = track.album_albumId;
    const displayTrack = getDisplayTrackVersion(track);

    return {
        id: toId(track._id),
        title: displayTrack.title,
        versionTitle: displayTrack.versionTitle || "",
        description: displayTrack.description || "",
        tags: displayTrack.tags || [],
        duration: displayTrack.duration,
        avatar: displayTrack.avatar || "",
        coverImage: displayTrack.coverImage || [],
        lyricsStatic: displayTrack.lyricsStatic || "",
        lyricsSyncUrl: displayTrack.lyricsSyncUrl || "",
        audioFiles: displayTrack.audioFiles || [],
        genres: (displayTrack.genreIds || []).map((genre) => ({
            id: toId(genre._id),
            name: genre.name || "",
        })),
        stats: track.stats || { totalLike: 0, totalPlay: 0 },
        releaseDate: track.releaseDate || null,
        approvalStatus: track.approvalStatus,
        reviewStatus: getReviewStatus(track),
        reviewSource: getReviewSource(track),
        activeStatus: track.activeStatus,
        rejectReason: track.rejectReason || "",
        hiddenReason: track.hiddenReason || "",
        blockedReason: track.blockedReason || "",
        hiddenAt: track.hiddenAt || null,
        copyright: {
            copyrightOwner: displayTrack.copyright?.copyrightOwner || "",
            recordingOwner: displayTrack.copyright?.recordingOwner || "",
            composer: displayTrack.copyright?.composer || "",
            lyricist: displayTrack.copyright?.lyricist || "",
            producer: displayTrack.copyright?.producer || "",
            isOriginal: displayTrack.copyright?.isOriginal ?? true,
            isCover: displayTrack.copyright?.isCover ?? false,
            isRemix: displayTrack.copyright?.isRemix ?? false,
            usesSample: displayTrack.copyright?.usesSample ?? false,
            usesLicensedBeat: displayTrack.copyright?.usesLicensedBeat ?? false,
            originalTrackTitle: displayTrack.copyright?.originalTrackTitle || "",
            originalArtistName: displayTrack.copyright?.originalArtistName || "",
            licenseDocumentUrls: displayTrack.copyright?.licenseDocumentUrls || [],
            copyrightStatus: displayTrack.copyright?.copyrightStatus || "pending",
            copyrightNote: displayTrack.copyright?.copyrightNote || "",
        },
        moderation: {
            submittedAt: track.moderation?.submittedAt || null,
            reviewedAt: track.moderation?.reviewedAt || null,
            adminNote: track.moderation?.adminNote || "",
            violationFlags: track.moderation?.violationFlags || [],
            reviewedBy:
                track.moderation?.reviewedBy && typeof track.moderation.reviewedBy === "object"
                    ? {
                        id: toId(track.moderation.reviewedBy._id),
                        email: track.moderation.reviewedBy.email || "",
                    }
                    : null,
        },
        createdAt: track.createdAt,
        updatedAt: track.updatedAt,
        artist: artistRef && typeof artistRef === "object"
            ? {
                id: toId(artistRef._id),
                name: artistRef.name || "",
            }
            : null,
        album: albumRef && typeof albumRef === "object"
            ? {
                id: toId(albumRef._id),
                title: albumRef.title || "",
            }
            : null,
        liveVersion: getReviewSource(track) === "pending_update"
            ? cloneTrackMutableData(track)
            : null,
        pendingUpdate: formatPendingUpdate(track),
    };
};

const assertObjectId = (trackId) => {
    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", 400, { field: "id" });
    }
};

const getTrackThumbnail = (track) => {
    if (Array.isArray(track?.coverImage) && track.coverImage.length > 0) {
        return track.coverImage[0] || "";
    }

    return track?.avatar || "";
};

const createTrackModerationNotification = async ({
    track,
    artist,
    status,
    note,
    adminUserId,
    io,
}) => {
    if (!artist?.userId) {
        return null;
    }

    const normalizedStatus = status === "approved" ? "approved" : "rejected";
    const title =
        normalizedStatus === "approved"
            ? `Track "${track.title}" da duoc phe duyet`
            : `Track "${track.title}" da bi tu choi`;
    const content =
        normalizedStatus === "approved"
            ? "Admin da phe duyet track cua ban."
            : `Admin da tu choi track cua ban.${note ? ` Ly do: ${note}` : ""}`;

    const notification = await Notification.create({
        userId: artist.userId,
        type: "system",
        title,
        content,
        isRead: false,
        actorId: adminUserId || null,
        actorType: "admin",
        artistId: artist._id,
        targetId: track._id,
        targetType: "track",
        targetName: track.title || "",
        thumbnail: getTrackThumbnail(track),
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
            console.error("Failed to emit track moderation notification:", error);
        }
    }

    return notification;
};

const createTrackVisibilityNotification = async ({
    track,
    artist,
    action,
    reason,
    adminUserId,
    io,
}) => {
    if (!artist?.userId) {
        return null;
    }

    let title = "";
    let content = "";

    if (action === "hide") {
        title = `Track "${track.title}" da bi an`;
        content = `Admin da tam an track cua ban khoi nen tang.${reason ? ` Ly do: ${reason}` : ""}`;
    } else if (action === "block") {
        title = `Track "${track.title}" da bi khoa`;
        content = `Admin da khoa track cua ban.${reason ? ` Ly do: ${reason}` : ""}`;
    } else if (action === "unhide") {
        title = `Track "${track.title}" da duoc hien thi lai`;
        content = "Admin da mo lai hien thi cho track cua ban tren nen tang.";
    } else if (action === "unblock") {
        title = `Track "${track.title}" da duoc go khoa`;
        content = "Admin da go khoa track cua ban tren he thong.";
    } else {
        return null;
    }

    const notification = await Notification.create({
        userId: artist.userId,
        type: "system",
        title,
        content,
        isRead: false,
        actorId: adminUserId || null,
        actorType: "admin",
        artistId: artist._id,
        targetId: track._id,
        targetType: "track",
        targetName: track.title || "",
        thumbnail: getTrackThumbnail(track),
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
            console.error("Failed to emit track visibility notification:", error);
        }
    }

    return notification;
};

const listTracksForAdmin = async (query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const rawSearch = typeof query.q === "string" ? query.q.trim() : "";

    const conditions = [];

    if (query.approvalStatus) {
        if (query.approvalStatus === "pending") {
            conditions.push({
                $or: [
                    { approvalStatus: "pending" },
                    { "pendingUpdate.status": "pending" },
                ],
            });
        } else {
            conditions.push({ approvalStatus: query.approvalStatus });
        }
    }

    if (query.activeStatus) {
        conditions.push({ activeStatus: query.activeStatus });
    }

    if (rawSearch) {
        const titleRegex = new RegExp(escapeRegex(rawSearch), "i");
        const matchingArtists = await Artist.find({ name: titleRegex }).select("_id").lean();
        const artistIds = matchingArtists.map((artist) => artist._id);
        const orClause = [{ title: titleRegex }];

        if (artistIds.length > 0) {
            orClause.push({ artist_artistId: { $in: artistIds } });
        }

        conditions.push({ $or: orClause });
    }

    const filter =
        conditions.length === 0
            ? {}
            : conditions.length === 1
                ? conditions[0]
                : { $and: conditions };

    const [tracks, total] = await Promise.all([
        Track.find(filter)
            .sort({ createdAt: -1, _id: 1 })
            .skip(skip)
            .limit(limit)
            .populate({ path: "artist_artistId", select: "name" })
            .lean(),
        Track.countDocuments(filter),
    ]);

    return {
        tracks: tracks.map(formatAdminTrackListItem),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

const getTrackDetailForAdmin = async (trackId) => {
    assertObjectId(trackId);

    const track = await Track.findById(trackId)
        .populate({ path: "artist_artistId", select: "name" })
        .populate({ path: "album_albumId", select: "title" })
        .populate({ path: "genreIds", select: "name" })
        .populate({ path: "pendingUpdate.data.genreIds", select: "name" })
        .populate({ path: "moderation.reviewedBy", select: "email" })
        .populate({ path: "pendingUpdate.reviewedBy", select: "email" })
        .lean();

    if (!track) {
        throw new AppError("Track not found.", 404, { field: "id" });
    }

    return formatAdminTrackDetailItem(track);
};

const updateTrackApprovalStatus = async (
    trackId,
    payload = {},
    adminUserId = null,
    io = null
) => {
    assertObjectId(trackId);

    const track = await Track.findById(trackId);
    if (!track) {
        throw new AppError("Track not found.", 404, { field: "id" });
    }

    const note = (payload.adminNote || payload.rejectReason || "").trim();
    const flags = payload.violationFlags || [];
    const hasPendingUpdateUnderReview =
        track.pendingUpdate?.status === "pending" && track.pendingUpdate?.data;
    const pendingSubmittedAt = track.pendingUpdate?.submittedAt || null;

    if (payload.status === "approved") {
        if (hasPendingUpdateUnderReview) {
            applyMutableTrackData(track, track.pendingUpdate.data);
            clearPendingUpdate(track);
        }

        track.approvalStatus = "approved";
        if (hasPendingUpdateUnderReview) {
            track.activeStatus = track.activeStatus || "active";
        } else {
            track.activeStatus = "hidden";
        }
        track.rejectReason = "";

        if (track.copyright) {
            track.copyright.copyrightStatus = "verified";
        }

        track.moderation = {
            submittedAt: hasPendingUpdateUnderReview
                ? pendingSubmittedAt || track.createdAt || new Date()
                : (track.moderation?.submittedAt || track.createdAt || new Date()),
            reviewedBy: adminUserId,
            reviewedAt: new Date(),
            adminNote: note,
            violationFlags: [],
        };

        await track.save();
    } else if (payload.status === "rejected") {
        if (hasPendingUpdateUnderReview) {
            track.pendingUpdate = {
                ...(track.pendingUpdate || {}),
                status: "rejected",
                reviewedBy: adminUserId,
                reviewedAt: new Date(),
                adminNote: note,
                rejectReason: note || "Rejected by administrator.",
            };

            await track.save();
        } else {
            track.approvalStatus = "rejected";
            track.activeStatus = "draft";
            track.rejectReason = note || "Rejected by administrator.";

            if (track.copyright) {
                track.copyright.copyrightStatus = flags.includes("copyright")
                    ? "disputed"
                    : "rejected";
            }

            track.moderation = {
                submittedAt: track.moderation?.submittedAt || track.createdAt || new Date(),
                reviewedBy: adminUserId,
                reviewedAt: new Date(),
                adminNote: note,
                violationFlags: flags,
            };

            await track.save();
        }
    } else {
        throw new AppError("Invalid approval status.", 400, { field: "status" });
    }

    await track.populate({ path: "artist_artistId", select: "name" });

    const artistId = track.artist_artistId?._id || track.artist_artistId;
    const artist = await Artist.findById(artistId)
        .select("_id userId name")
        .lean();

    await createTrackModerationNotification({
        track,
        artist,
        status: payload.status,
        note: payload.status === "approved"
            ? note
            : (
                hasPendingUpdateUnderReview
                    ? (track.pendingUpdate?.rejectReason || note)
                    : track.rejectReason
            ),
        adminUserId,
        io,
    });

    return {
        ...formatAdminTrackListItem(track.toObject()),
        moderation: track.moderation,
    };
};

const updateTrackVisibility = async (
    trackId,
    payload = {},
    adminUserId = null,
    io = null
) => {
    assertObjectId(trackId);

    const track = await Track.findById(trackId);
    if (!track) {
        throw new AppError("Track not found.", 404, { field: "id" });
    }

    if (payload.action === "hide") {
        track.blockedByAlbumId = null;
        track.previousActiveStatusBeforeAlbumBlock = null;
        track.previousHiddenReasonBeforeAlbumBlock = "";
        track.previousHiddenAtBeforeAlbumBlock = null;
        track.activeStatus = "hidden";
        track.hiddenReason = (payload.hiddenReason || payload.adminNote || "Hidden by administrator.").trim();
        track.blockedReason = "";
        track.hiddenAt = new Date();
    } else if (payload.action === "block") {
        track.blockedByAlbumId = null;
        track.previousActiveStatusBeforeAlbumBlock = null;
        track.previousHiddenReasonBeforeAlbumBlock = "";
        track.previousHiddenAtBeforeAlbumBlock = null;
        track.activeStatus = "blocked";
        track.blockedReason = (payload.blockedReason || payload.adminNote || "Blocked by administrator.").trim();
        track.hiddenReason = "";
        track.hiddenAt = null;
    } else if (payload.action === "unhide") {
        track.blockedByAlbumId = null;
        track.previousActiveStatusBeforeAlbumBlock = null;
        track.previousHiddenReasonBeforeAlbumBlock = "";
        track.previousHiddenAtBeforeAlbumBlock = null;
        track.activeStatus = "active";
        track.hiddenReason = "";
        track.blockedReason = "";
        track.hiddenAt = null;
    } else if (payload.action === "unblock") {
        if (track.activeStatus !== "blocked") {
            throw new AppError("Only a blocked track can be unblocked.", 400, { field: "action" });
        }
        track.blockedByAlbumId = null;
        track.previousActiveStatusBeforeAlbumBlock = null;
        track.previousHiddenReasonBeforeAlbumBlock = "";
        track.previousHiddenAtBeforeAlbumBlock = null;
        track.activeStatus = "active";
        track.hiddenReason = "";
        track.blockedReason = "";
        track.hiddenAt = null;
    } else {
        throw new AppError("Invalid action.", 400, { field: "action" });
    }

    await track.save();
    await track.populate({ path: "artist_artistId", select: "name" });

    const artistId = track.artist_artistId?._id || track.artist_artistId;
    const artist = await Artist.findById(artistId)
        .select("_id userId name")
        .lean();

    await createTrackVisibilityNotification({
        track,
        artist,
        action: payload.action,
        reason:
            payload.action === "hide"
                ? track.hiddenReason
                : payload.action === "block"
                    ? track.blockedReason
                    : "",
        adminUserId,
        io,
    });

    return formatAdminTrackListItem(track.toObject());
};

export default {
    listTracksForAdmin,
    updateTrackApprovalStatus,
    updateTrackVisibility,
    getTrackDetailForAdmin,
};
