import mongoose from "mongoose";
// Register models referenced only through populate(). Keeping these side-effect
// imports local prevents MissingSchemaError when this service is loaded before
// the aggregate models/index.js module.
import "../../../models/Album.js";
import "../../../models/Genre.js";
import Track from "../../../models/Track.js";
import Artist from "../../../models/Artist.js";
import User from "../../../models/User.js";
import Notification from "../../../models/Notification.js";
import AudioFingerprint from "../../../models/AudioFingerprint.js";
import { normalizePositiveInteger } from "../../Playlist/playlist.helper.js";
import { AppError } from "../../../utils/AppError.js";
import { scheduleTrackAudioFingerprint } from "../../fingerprint/audioFingerprint.job.js";
import { activeFingerprintScopeFilter } from "../../fingerprint/fingerprint.lifecycle.service.js";
import { compareFingerprints } from "../../fingerprint/fingerprintSimilarity.service.js";
import { assertReviewCanApprove } from "../../track/moderationReview.service.js";
import { getMusicBrainzResultForTrack } from "../../external/musicbrainz.service.js";
import { getAcoustIdResultForTrack } from "../../external/acoustid.service.js";
import { recordAuditEvent } from "../../audit/auditLog.service.js";
import {
    resolveTrackReleasedAt,
    resolveTrackReleaseStatus,
} from "../../../utils/trackRelease.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const EMPTY_FINGERPRINT_COMPARISON = Object.freeze({
    scope: "internal_catalog",
    externalAudioCompared: false,
    comparedCandidateCount: 0,
    excludedCandidateCount: 0,
    activeExactFileMatchCount: 0,
    historicalExactFileMatchCount: 0,
    highestActiveCandidateSimilarity: 0,
    highestActiveCandidateClassification: "none",
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toId = (value) => {
    if (!value) return null;
    return value.toString();
};

const formatGenreReferences = (genres = []) =>
    genres.map((genre) => ({
        id: toId(genre?._id || genre),
        name:
            genre && typeof genre === "object"
                ? genre.name || ""
                : "",
    }));

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
    const reviewSource = getReviewSource(track);
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
        reviewSource,
        reviewSubmittedAt:
            reviewSource === "pending_update"
                ? track.pendingUpdate?.submittedAt || null
                : track.moderation?.submittedAt || null,
        changedFields:
            reviewSource === "pending_update"
                ? track.pendingUpdate?.changedFields || []
                : [],
        liveTitle:
            reviewSource === "pending_update"
                ? track.title || ""
                : null,
        pendingUpdateStatus: track.pendingUpdate?.status || "none",
        activeStatus: track.activeStatus,
        submissionVersion: Number(track.submissionVersion || 1),
        audioVersion: Number(track.audioVersion || 1),
        copyrightVersion: Number(track.copyrightVersion || 1),
        evidenceVersion: Number(track.evidenceVersion || 1),
        releaseStatus: resolveTrackReleaseStatus(track),
        releasedAt: resolveTrackReleasedAt(track),
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

const buildFingerprintComparisonSummary = async (trackId, fingerprint) => {
    const summary = { ...EMPTY_FINGERPRINT_COMPARISON };
    if (!fingerprint || fingerprint.status !== "completed") return summary;

    const duration = Number(fingerprint.duration || 0);
    const tolerance = Math.max(30, duration * 0.35);
    const maxCandidates = Number.parseInt(process.env.FINGERPRINT_MAX_CANDIDATES, 10) || 500;
    const exactCandidates = fingerprint.sourceAudioHash
        ? await AudioFingerprint.find({
            trackId: { $ne: trackId },
            status: "completed",
            algorithmVersion: "chromaprint-v1",
            ...activeFingerprintScopeFilter(),
            sourceAudioHash: fingerprint.sourceAudioHash,
        })
            .select("trackId sourceAudioHash duration rawFingerprint")
            .sort({ updatedAt: -1 })
            .limit(maxCandidates)
            .lean()
        : [];
    const exactTrackIds = new Set(exactCandidates.map((candidate) => String(candidate.trackId)));
    const similarityCandidates = await AudioFingerprint.find({
        trackId: { $ne: trackId },
        status: "completed",
        algorithmVersion: "chromaprint-v1",
        ...activeFingerprintScopeFilter(),
        ...(fingerprint.sourceAudioHash
            ? { sourceAudioHash: { $ne: fingerprint.sourceAudioHash } }
            : {}),
        duration: {
            $gte: Math.max(0, duration - tolerance),
            $lte: duration + tolerance,
        },
    })
        .select("trackId sourceAudioHash duration rawFingerprint")
        .sort({ updatedAt: -1 })
        .limit(maxCandidates)
        .lean();
    const candidates = [
        ...exactCandidates,
        ...similarityCandidates.filter((candidate) => !exactTrackIds.has(String(candidate.trackId))),
    ];
    if (candidates.length === 0) return summary;

    const activeTracks = await Track.find({
        _id: { $in: candidates.map((candidate) => candidate.trackId) },
        isDeleted: { $ne: true },
    }).select("_id").lean();
    const activeTrackIds = new Set(activeTracks.map((candidate) => String(candidate._id)));

    for (const candidate of candidates) {
        const isActive = activeTrackIds.has(String(candidate.trackId));
        const isExactFile = Boolean(
            fingerprint.sourceAudioHash &&
            candidate.sourceAudioHash === fingerprint.sourceAudioHash
        );
        if (isActive) {
            summary.comparedCandidateCount += 1;
            if (isExactFile) {
                summary.activeExactFileMatchCount += 1;
                summary.highestActiveCandidateSimilarity = 1;
                summary.highestActiveCandidateClassification = "high";
                continue;
            }
            const comparison = compareFingerprints(
                fingerprint.rawFingerprint || [],
                candidate.rawFingerprint || [],
                { durationA: fingerprint.duration, durationB: candidate.duration }
            );
            if (
                comparison &&
                Number(comparison.similarityScore || 0) > summary.highestActiveCandidateSimilarity
            ) {
                summary.highestActiveCandidateSimilarity = Number(comparison.similarityScore || 0);
                summary.highestActiveCandidateClassification = comparison.classification || "none";
            }
        } else {
            summary.excludedCandidateCount += 1;
            if (isExactFile) summary.historicalExactFileMatchCount += 1;
        }
    }

    return summary;
};

const formatAdminTrackDetailItem = (
    track,
    fingerprint = null,
    musicBrainz = null,
    acoustId = null,
    fingerprintComparison = EMPTY_FINGERPRINT_COMPARISON
) => {
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
        genres: formatGenreReferences(displayTrack.genreIds || []),
        stats: track.stats || { totalLike: 0, totalPlay: 0 },
        releaseDate: track.releaseDate || null,
        releaseStatus: resolveTrackReleaseStatus(track),
        releasedAt: resolveTrackReleasedAt(track),
        approvalStatus: track.approvalStatus,
        reviewStatus: getReviewStatus(track),
        reviewSource: getReviewSource(track),
        activeStatus: track.activeStatus,
        submissionVersion: Number(track.submissionVersion || 1),
        audioVersion: Number(track.audioVersion || 1),
        copyrightVersion: Number(track.copyrightVersion || 1),
        evidenceVersion: Number(track.evidenceVersion || 1),
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
            usesThirdPartyBeat: displayTrack.copyright?.usesThirdPartyBeat ?? displayTrack.copyright?.usesLicensedBeat ?? false,
            primaryCopyrightType: ["original", "cover", "remix"].includes(displayTrack.copyright?.primaryCopyrightType)
                ? displayTrack.copyright.primaryCopyrightType
                : (displayTrack.copyright?.isCover ? "cover" : displayTrack.copyright?.isRemix ? "remix" : "original"),
            rightsConfirmed: displayTrack.copyright?.rightsConfirmed === true,
            declarationAccepted: displayTrack.copyright?.declarationAccepted === true,
            originalTrackTitle: displayTrack.copyright?.originalTrackTitle || "",
            originalArtistName: displayTrack.copyright?.originalArtistName || "",
            originalComposer: displayTrack.copyright?.originalComposer || "",
            originalISRC: displayTrack.copyright?.originalISRC || "",
            originalISWC: displayTrack.copyright?.originalISWC || "",
            sampleSourceTitle: displayTrack.copyright?.sampleSourceTitle || "",
            sampleSourceArtist: displayTrack.copyright?.sampleSourceArtist || "",
            sampleSourceISRC: displayTrack.copyright?.sampleSourceISRC || "",
            sampleStartTime: displayTrack.copyright?.sampleStartTime ?? null,
            sampleEndTime: displayTrack.copyright?.sampleEndTime ?? null,
            beatTitle: displayTrack.copyright?.beatTitle || "",
            beatProducer: displayTrack.copyright?.beatProducer || "",
            beatSourceUrl: displayTrack.copyright?.beatSourceUrl || "",
            licenseType: displayTrack.copyright?.licenseType || "",
            licenseDocumentUrls: displayTrack.copyright?.licenseDocumentUrls || [],
            copyrightEvidenceDocuments: displayTrack.copyright?.copyrightEvidenceDocuments || [],
            copyrightStatus: displayTrack.copyright?.copyrightStatus || "pending",
            copyrightNote: displayTrack.copyright?.copyrightNote || "",
            copyrightNotes: displayTrack.copyright?.copyrightNotes || displayTrack.copyright?.copyrightNote || "",
            isrc: displayTrack.copyright?.isrc || "",
            iswc: displayTrack.copyright?.iswc || "",
            proName: displayTrack.copyright?.proName || "",
            workRegistrationNumber: displayTrack.copyright?.workRegistrationNumber || "",
            recordingId: displayTrack.copyright?.recordingId || "",
        },
        fingerprint: fingerprint
            ? {
                algorithm: fingerprint.algorithm || "chromaprint",
                algorithmVersion: fingerprint.algorithmVersion || "chromaprint-v1",
                status: fingerprint.status || "pending",
                duration: Number(fingerprint.duration || 0),
                retryCount: Number(fingerprint.retryCount || 0),
                lastAttemptAt: fingerprint.lastAttemptAt || null,
                generatedAt: fingerprint.generatedAt || null,
                errorCode: fingerprint.errorCode || "",
                error: fingerprint.error || "",
                audioVersion: Number(fingerprint.audioVersion || 1),
                comparison: fingerprintComparison,
            }
            : {
                algorithm: "chromaprint",
                algorithmVersion: "chromaprint-v1",
                status: "not_started",
                duration: 0,
                retryCount: 0,
                lastAttemptAt: null,
                generatedAt: null,
                errorCode: "",
                error: "",
                audioVersion: 1,
                comparison: { ...EMPTY_FINGERPRINT_COMPARISON },
            },
        fingerprintScreening: track.fingerprintScreening || { status: "unknown" },
        musicBrainz: musicBrainz || {
            artistDeclaredData: null,
            externalResult: null,
            externalVerification: null,
            externalSubmissionVersion: null,
        },
        acoustId: acoustId || { result: null, fingerprintHash: "", audioVersion: 1 },
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
        liveVersion: track?.pendingUpdate?.data
            ? {
                ...cloneTrackMutableData(track),
                genres: formatGenreReferences(track.genreIds || []),
            }
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

            ? `Bài hát "${track.title}" đã được phê duyệt`
            : `Bài hát "${track.title}" đã bị từ chối`;
    const content =
        normalizedStatus === "approved"
            ? "Quản trị viên đã phê duyệt bài hát của bạn."
            : `Quản trị viên đã từ chối bài hát của bạn.${note ? ` Lý do: ${note}` : ""}`;

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

        title = `Bài hát "${track.title}" đã bị ẩn`;
        content = `Quản trị viên đã tạm ẩn bài hát của bạn khỏi nền tảng.${reason ? ` Lý do: ${reason}` : ""}`;
    } else if (action === "block") {
        title = `Bài hát "${track.title}" đã bị khóa`;
        content = `Quản trị viên đã khóa bài hát của bạn.${reason ? ` Lý do: ${reason}` : ""}`;
    } else if (action === "unhide") {
        title = `Bài hát "${track.title}" đã được hiển thị lại`;
        content = "Quản trị viên đã hiển thị lại bài hát của bạn trên nền tảng.";
    } else if (action === "unblock") {
        title = `Bài hát "${track.title}" đã được gỡ khóa`;
        content = "Quản trị viên đã gỡ khóa bài hát của bạn trên hệ thống.";
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

    // Drafts stay private until submission. Pending records belong to the
    // dedicated moderation queue, not the system catalog.
    if (query.scope === "catalog") {
        conditions.push({ approvalStatus: { $in: ["approved", "rejected"] } });
    }

    if (query.approvalStatus) {
        if (query.approvalStatus === "pending") {
            if (query.reviewSource === "track_release") {
                conditions.push({
                    approvalStatus: "pending",
                    "pendingUpdate.status": { $ne: "pending" },
                });
            } else if (query.reviewSource === "pending_update") {
                conditions.push({ "pendingUpdate.status": "pending" });
            } else {
                conditions.push({
                    $or: [
                        { approvalStatus: "pending" },
                        { "pendingUpdate.status": "pending" },
                    ],
                });
            }
        } else {
            conditions.push({ approvalStatus: query.approvalStatus });
        }
    } else if (query.reviewSource === "track_release") {
        conditions.push({
            approvalStatus: "pending",
            "pendingUpdate.status": { $ne: "pending" },
        });
    } else if (query.reviewSource === "pending_update") {
        conditions.push({ "pendingUpdate.status": "pending" });
    }

    if (query.activeStatus) {
        conditions.push({ activeStatus: query.activeStatus });
    }

    if (query.releaseStatus) {
        conditions.push({ releaseStatus: query.releaseStatus });
    }

    if (rawSearch) {
        const titleRegex = new RegExp(escapeRegex(rawSearch), "i");
        const matchingArtists = await Artist.find({ name: titleRegex }).select("_id").lean();
        const artistIds = matchingArtists.map((artist) => artist._id);
        const orClause = [
            { title: titleRegex },
            { "pendingUpdate.data.title": titleRegex },
        ];

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

    const [fingerprint, musicBrainz, acoustId] = await Promise.all([
        AudioFingerprint.findOne({
            trackId: track._id,
            algorithm: "chromaprint",
            algorithmVersion: "chromaprint-v1",
        })
            .select("algorithm algorithmVersion status duration rawFingerprint sourceAudioHash retryCount lastAttemptAt generatedAt errorCode error audioVersion")
            .lean(),
        getMusicBrainzResultForTrack(track._id),
        getAcoustIdResultForTrack(track._id),
    ]);
    const fingerprintComparison = await buildFingerprintComparisonSummary(track._id, fingerprint);

    return formatAdminTrackDetailItem(track, fingerprint, musicBrainz, acoustId, fingerprintComparison);
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
    const rejectCategory = String(payload.rejectCategory || "").trim();
    const hasPendingUpdateUnderReview =
        track.pendingUpdate?.status === "pending" && track.pendingUpdate?.data;
    const hasPendingReleaseUnderReview = track.approvalStatus === "pending";
    const pendingSubmittedAt = track.pendingUpdate?.submittedAt || null;

    if (!hasPendingUpdateUnderReview && !hasPendingReleaseUnderReview) {
        throw new AppError(
            "Track does not have a pending moderation request.",
            409,
            { field: "status" }
        );
    }

    if (payload.status === "approved") {
        await assertReviewCanApprove(track, adminUserId, payload);
        if (hasPendingUpdateUnderReview) {
            track.submissionVersion = Number(track.pendingUpdate.submissionVersion || track.submissionVersion || 1);
            track.audioVersion = Number(track.pendingUpdate.audioVersion || track.audioVersion || 1);
            track.copyrightVersion = Number(track.pendingUpdate.copyrightVersion || track.copyrightVersion || 1);
            track.evidenceVersion = Number(track.pendingUpdate.evidenceVersion || track.evidenceVersion || 1);
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

        // Content moderation approval and copyright verification are separate decisions.
        // Keep rights status pending until a claim/registry review explicitly verifies it.
        if (track.copyright && track.copyright.copyrightStatus !== "verified") {
            track.copyright.copyrightStatus = "pending";
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

        try {
            await track.save();
        } catch (error) {
            if (error?.name === "VersionError") {
                throw new AppError("Track đã được cập nhật trong lúc kiểm duyệt. Vui lòng rà soát lại.", 409, {
                    code: "STALE_REVIEW_SESSION",
                });
            }
            throw error;
        }
        void scheduleTrackAudioFingerprint(track._id);
    } else if (payload.status === "rejected") {
        if (!rejectCategory) {
            throw new AppError("Cần chọn nhóm lý do khi từ chối bài hát.", 422, { field: "rejectCategory" });
        }
        if (note.length < 5) {
            throw new AppError("Lý do từ chối phải có ít nhất 5 ký tự.", 422, { field: "rejectReason" });
        }
        if (hasPendingUpdateUnderReview) {
            track.pendingUpdate = {
                ...(track.pendingUpdate || {}),
                status: "rejected",
                reviewedBy: adminUserId,
                reviewedAt: new Date(),
                adminNote: note,
                rejectReason: note || "Bị quản trị viên từ chối.",
            };

            await track.save();
        } else {
            track.approvalStatus = "rejected";
            track.activeStatus = "draft";
            track.rejectReason = note || "Bị quản trị viên từ chối.";

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

    const reviewer = adminUserId
        ? await User.findById(adminUserId).select("email role").lean()
        : null;
    void recordAuditEvent({
        actorUserId: adminUserId,
        actorSnapshot: {
            id: adminUserId,
            email: reviewer?.email || "",
            role: reviewer?.role || "admin",
        },
        action: payload.status === "approved" ? "TRACK_APPROVED" : "TRACK_REJECTED",
        targetType: "track",
        targetId: track._id,
        metadata: {
            source: "admin_manual",
            decision: payload.status,
            rejectCategory,
            reason: note,
            submissionVersion: track.submissionVersion || 1,
            audioVersion: track.audioVersion || 1,
            copyrightVersion: track.copyrightVersion || 1,
            evidenceVersion: track.evidenceVersion || 1,
            copyrightDeclaration: hasPendingUpdateUnderReview
                ? track.pendingUpdate?.data?.copyright || null
                : track.copyright || null,
            fingerprintScreening: track.fingerprintScreening || null,
            violationFlags: flags,
        },
    }).catch((error) => console.error("Track decision audit failed:", error.message));

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

    return getTrackDetailForAdmin(trackId);
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
        track.activeStatus = "hidden";
        track.hiddenReason = (payload.hiddenReason || payload.adminNote || "Bị quản trị viên ẩn.").trim();
        track.blockedReason = "";
        track.hiddenAt = new Date();
    } else if (payload.action === "block") {
        track.blockedByAlbumId = null;
        track.activeStatus = "blocked";
        track.blockedReason = (payload.blockedReason || payload.adminNote || "Bị quản trị viên khóa.").trim();
        track.hiddenReason = "";
        track.hiddenAt = null;
    } else if (payload.action === "unhide") {
        track.blockedByAlbumId = null;
        track.activeStatus = "active";
        track.hiddenReason = "";
        track.blockedReason = "";
        track.hiddenAt = null;
    } else if (payload.action === "unblock") {
        if (track.activeStatus !== "blocked") {
            throw new AppError("Only a blocked track can be unblocked.", 400, { field: "action" });
        }
        track.blockedByAlbumId = null;
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

    return getTrackDetailForAdmin(trackId);
};

export default {
    listTracksForAdmin,
    updateTrackApprovalStatus,
    updateTrackVisibility,
    getTrackDetailForAdmin,
};
