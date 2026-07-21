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

const formatAdminTrackListItem = (track) => {
    const artistRef = track.artist_artistId;
    const isPopulatedArtist =
        artistRef &&
        typeof artistRef === "object" &&
        artistRef !== null &&
        "name" in artistRef;

    return {
        id: toId(track._id),
        title: track.title,
        duration: track.duration,
        approvalStatus: track.approvalStatus,
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

    return {
        id: toId(track._id),
        title: track.title,
        duration: track.duration,
        avatar: track.avatar || "",
        coverImage: track.coverImage || [],
        lyricsStatic: track.lyricsStatic || "",
        lyricsSyncUrl: track.lyricsSyncUrl || "",
        audioFiles: track.audioFiles || [],
        genres: (track.genreIds || []).map(g => ({
            id: toId(g._id),
            name: g.name || ""
        })),
        stats: track.stats || { totalLike: 0, totalPlay: 0 },
        releaseDate: track.releaseDate || null,
        approvalStatus: track.approvalStatus,
        activeStatus: track.activeStatus,
        rejectReason: track.rejectReason || "",
        hiddenReason: track.hiddenReason || "",
        blockedReason: track.blockedReason || "",
        hiddenAt: track.hiddenAt || null,
        copyright: {
            copyrightOwner: track.copyright?.copyrightOwner || "",
            recordingOwner: track.copyright?.recordingOwner || "",
            composer: track.copyright?.composer || "",
            lyricist: track.copyright?.lyricist || "",
            producer: track.copyright?.producer || "",
            isOriginal: track.copyright?.isOriginal ?? true,
            isCover: track.copyright?.isCover ?? false,
            isRemix: track.copyright?.isRemix ?? false,
            usesSample: track.copyright?.usesSample ?? false,
            usesLicensedBeat: track.copyright?.usesLicensedBeat ?? false,
            originalTrackTitle: track.copyright?.originalTrackTitle || "",
            originalArtistName: track.copyright?.originalArtistName || "",
            licenseDocumentUrls: track.copyright?.licenseDocumentUrls || [],
            copyrightStatus: track.copyright?.copyrightStatus || "pending",
            copyrightNote: track.copyright?.copyrightNote || ""
        },
        moderation: {
            submittedAt: track.moderation?.submittedAt || null,
            reviewedAt: track.moderation?.reviewedAt || null,
            adminNote: track.moderation?.adminNote || "",
            violationFlags: track.moderation?.violationFlags || [],
            reviewedBy: track.moderation?.reviewedBy && typeof track.moderation.reviewedBy === "object" ? {
                id: toId(track.moderation.reviewedBy._id),
                email: track.moderation.reviewedBy.email || ""
            } : null
        },
        createdAt: track.createdAt,
        updatedAt: track.updatedAt,
        artist: artistRef && typeof artistRef === "object" ? {
            id: toId(artistRef._id),
            name: artistRef.name || "",
        } : null,
        album: albumRef && typeof albumRef === "object" ? {
            id: toId(albumRef._id),
            title: albumRef.title || "",
        } : null,
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
            ? `Track "${track.title}" đã được phê duyệt`
            : `Track "${track.title}" đã bị từ chối`;
    const content =
        normalizedStatus === "approved"
            ? "Admin đã phê duyệt track của bạn. Bạn có thể tiếp tục phát hành và quản lý track trong khu vực artist."
            : `Admin đã từ chối track của bạn.${note ? ` Lý do: ${note}` : ""}`;

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
        title = `Track "${track.title}" đã bị ẩn`;
        content = `Admin đã tạm ẩn track của bạn khỏi nền tảng.${reason ? ` Lý do: ${reason}` : ""}`;
    } else if (action === "block") {
        title = `Track "${track.title}" đã bị khóa`;
        content = `Admin đã khóa track của bạn.${reason ? ` Lý do: ${reason}` : ""}`;
    } else if (action === "unhide") {
        title = `Track "${track.title}" đã được hiển thị lại`;
        content = "Admin đã mở lại hiển thị cho track của bạn trên nền tảng.";
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

    const filter = {};

    // 1. XỬ LÝ BỘ LỌC PHÊ DUYỆT (APPROVAL STATUS)
    if (query.approvalStatus) {
        filter.approvalStatus = query.approvalStatus;
    } else {
        // MẶC ĐỊNH CHỐN CŨ: Nếu không chọn gì, lấy cả approved & rejected, loại bỏ hoàn toàn bài 'pending'
        filter.approvalStatus = { $ne: "pending" };
    }

    // 2. XỬ LÝ BỘ LỌC HIỂN THỊ (ACTIVE STATUS)
    if (query.activeStatus) {
        filter.activeStatus = query.activeStatus;
    }

    // 3. Xử lý tìm kiếm từ khóa chuỗi
    if (rawSearch) {
        const titleRegex = new RegExp(escapeRegex(rawSearch), "i");
        const matchingArtists = await Artist.find({ name: titleRegex }).select("_id").lean();
        const artistIds = matchingArtists.map((artist) => artist._id);
        const orClause = [{ title: titleRegex }];
        if (artistIds.length > 0) {
            orClause.push({ artist_artistId: { $in: artistIds } });
        }
        filter.$or = orClause;
    }

    const [tracks, total] = await Promise.all([
        Track.find(filter)
            .sort({ createdAt: -1, _id: 1 }) // Đổi sang sort theo ngày tạo mới nhất lên đầu
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
        .populate({ path: "moderation.reviewedBy", select: "email" })
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

    if (payload.status === "approved") {
        track.approvalStatus = "approved";
        if (track.activeStatus === "draft") {
            track.activeStatus = "active";
        }
        track.rejectReason = "";
        
        if (track.copyright) {
            track.copyright.copyrightStatus = "verified";
        }

        track.moderation = {
            submittedAt: track.moderation?.submittedAt || track.createdAt || new Date(),
            reviewedBy: adminUserId,
            reviewedAt: new Date(),
            adminNote: note,
            violationFlags: []
        };
    } else if (payload.status === "rejected") {
        track.approvalStatus = "rejected";
        track.activeStatus = "draft";
        track.rejectReason = note || "Rejected by administrator.";

        if (track.copyright) {
            track.copyright.copyrightStatus = flags.includes("copyright") ? "disputed" : "rejected";
        }

        track.moderation = {
            submittedAt: track.moderation?.submittedAt || track.createdAt || new Date(),
            reviewedBy: adminUserId,
            reviewedAt: new Date(),
            adminNote: note,
            violationFlags: flags
        };
    } else {
        throw new AppError("Invalid approval status.", 400, { field: "status" });
    }

    await track.save();

    await track.populate({ path: "artist_artistId", select: "name" });

    const artistId = track.artist_artistId?._id || track.artist_artistId;

    const artist = await Artist.findById(artistId)
        .select("_id userId name")
        .lean();

    await createTrackModerationNotification({
        track,
        artist,
        status: payload.status,
        note: payload.status === "approved" ? note : track.rejectReason,
        adminUserId,
        io,
    });

    return {
        ...formatAdminTrackListItem(track.toObject()),
        rejectReason: track.rejectReason,
        moderation: track.moderation
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
