import mongoose from "mongoose";
import Track from "../../models/Track.js";
import Artist from "../../models/Artist.js";
import { normalizePositiveInteger } from "../Playlist/playlist.helper.js";
import { AppError } from "../../utils/AppError.js";

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
        artist: isPopulatedArtist
            ? {
                id: toId(artistRef._id),
                name: artistRef.name || "",
            }
            : null,
    };
};

const assertObjectId = (trackId) => {
    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", 400, {
            field: "id",
        });
    }
};

const listTracksForAdmin = async (query = {}) => {
    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const skip = (page - 1) * limit;
    const rawSearch = typeof query.q === "string" ? query.q.trim() : "";

    const filter = {};
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
            .sort({ title: 1, _id: 1 })
            .skip(skip)
            .limit(limit)
            .select(
                "title duration approvalStatus activeStatus rejectReason hiddenReason hiddenAt artist_artistId"
            )
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

const getTrackDetailForAdmin = async (trackId) => {
    assertObjectId(trackId);

    const track = await Track.findById(trackId)
        .populate({ path: "artist_artistId", select: "name" })
        .populate({ path: "album_albumId", select: "title" })
        .populate({ path: "genreIds", select: "name" })
        .populate({ path: "moderation.reviewedBy", select: "email" }) // Thêm dòng này để xem ai đã duyệt bài
        .lean();

    if (!track) {
        throw new AppError("Track not found.", 404, {
            field: "id",
        });
    }

    return formatAdminTrackDetailItem(track);
};

const updateTrackApprovalStatus = async (trackId, payload = {}) => {
    assertObjectId(trackId);

    const track = await Track.findById(trackId);
    if (!track) {
        throw new AppError("Track not found.", 404, {
            field: "id",
        });
    }

    if (payload.status === "approved") {
        track.approvalStatus = "approved";

        if (track.activeStatus === "draft") {
            track.activeStatus = "active";
        }

        // Xóa lý do reject cũ
        track.rejectReason = "";
    } else if (payload.status === "rejected") {
        track.approvalStatus = "rejected";

        // Không public track bị reject
        track.activeStatus = "draft";

        // Lưu lý do reject
        track.rejectReason = payload.rejectReason?.trim() || "";
    } else {
        throw new AppError("Invalid approval status.", 400, {
            field: "status",
        });
    }

    await track.save();
    await track.populate({
        path: "artist_artistId",
        select: "name",
    });

    return formatAdminTrackListItem(track.toObject());
};
const updateTrackVisibility = async (trackId, payload = {}) => {
    assertObjectId(trackId);

    const track = await Track.findById(trackId);
    if (!track) {
        throw new AppError("Track not found.", 404, {
            field: "id",
        });
    }

    if (payload.action === "hide") {
        track.activeStatus = "hidden";
        track.hiddenReason = payload.hiddenReason?.trim() || "";
        track.hiddenAt = new Date();
    } else if (payload.action === "unhide") {
        track.activeStatus = "active";
        track.hiddenReason = "";
        track.hiddenAt = null;
    } else {
        throw new AppError("Invalid action.", 400, {
            field: "action",
        });
    }

    await track.save();
    await track.populate({
        path: "artist_artistId",
        select: "name",
    });

    return formatAdminTrackListItem(track.toObject());
};

export default {
    listTracksForAdmin,
    updateTrackApprovalStatus,
    updateTrackVisibility,
};
