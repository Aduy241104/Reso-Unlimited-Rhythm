import crypto from "node:crypto";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import {
    assertArtistCanCreateTrack,
    assertPayloadHasNoForbiddenFields,
    LYRICS_STATIC_MAX_LENGTH,
    MAX_COVER_IMAGES,
    resolveArtistIdForCreate,
    sanitizeArtistCopyright,
    validateDraftTitle,
    validateDurationFromAudioAnalysis,
    validateOptionalAudioFiles,
    validateOptionalDescription,
    validateOptionalGenreIds,
    validateOptionalTags,
} from "../track.draft.validation.js";
import {
    assertTrackEditableByArtist,
    assertTrackTitleIsAvailable,
    validateTrackForSubmit,
} from "../track.submit.validation.js";
import {
    assertTrackAudioFingerprintAvailable,
    assertTrackTitleVersionAvailable,
    normalizeTrackSourceAudioHash,
    normalizeTrackVersionTitle,
} from "../track.duplicate.validation.js";
import Artist from "../../../models/Artist.js";
import Album from "../../../models/Album.js";
import ReleaseSchedule from "../../../models/ReleaseSchedule.js";
import Track from "../../../models/Track.js";
import User from "../../../models/User.js";
import { AppError } from "../../../utils/AppError.js";
import { recordAuditEvent } from "../../audit/auditLog.service.js";
import { deleteCloudinaryAssetsByUrls } from "../../../utils/uploadCloud.js";
import { uploadEvidenceBuffer } from "../../cloudinaryService.js";
import {
    COPYRIGHT_EVIDENCE_TYPES,
    MAX_EVIDENCE_DOCUMENTS,
    validateEvidenceUploadFile,
} from "../copyright.validation.service.js";
import {
    processTrackAudioFingerprint,
    scheduleTrackAudioFingerprint,
} from "../../fingerprint/audioFingerprint.job.js";
import { evaluateAutomaticTrackModeration } from "../../fingerprint/automaticTrackModeration.service.js";
import {
    cleanupTrackFingerprintLifecycle,
    invalidateTrackAudioVersionState,
} from "../../fingerprint/fingerprint.lifecycle.service.js";
import { runAcoustIdVerification } from "../../external/acoustid.service.js";
import { runMusicBrainzVerification } from "../../external/musicbrainz.service.js";
import { formatTrackManagementDetail } from "../track.helper.js";
import {
    TRACK_RELEASE_STATUS,
    resolveTrackReleaseStatus,
} from "../../../utils/trackRelease.js";
import {
    getCopyrightChangeFlags,
    getTrackRejectionSnapshot,
    hashTrackMutableData,
} from "../track.rejection.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

const assertTrackVisibilityCanBeChangedByArtist = async (track) => {
    const hasScheduledRelease =
        resolveTrackReleaseStatus(track) === TRACK_RELEASE_STATUS.SCHEDULED ||
        Boolean(await ReleaseSchedule.exists({
            type: "track",
            targetId: track._id,
            artistId: track.artist_artistId?._id || track.artist_artistId,
            status: "scheduled",
        }));

    if (hasScheduledRelease) {
        throw new AppError(
            "Hãy hủy lịch phát hành trước khi thay đổi trạng thái hiển thị của bài hát.",
            StatusCodes.CONFLICT,
            {
                field: "activeStatus",
                code: "RELEASE_SCHEDULE_CANCELLATION_REQUIRED",
            }
        );
    }
};

const resolveArtistTrackStatusAfterUnhide = (track) => {
    if (["active", "draft"].includes(track?.previousActiveStatusBeforeArtistHide)) {
        return track.previousActiveStatusBeforeArtistHide;
    }

    // Hidden tracks created before the previous-status field existed need a safe fallback.
    if (track?.approvalStatus === "approved") {
        return "active";
    }

    return "draft";
};

const normalizePositiveInteger = (value, fallback) => {
    const parsedValue = Number.parseInt(value, 10);

    if (Number.isInteger(parsedValue) && parsedValue > 0) {
        return parsedValue;
    }

    return fallback;
};

const getAudioUrlsFromFiles = (audioFiles = []) =>
    (audioFiles || [])
        .map((item) => item?.url)
        .filter(Boolean);

const getOriginalAudio = (audioFiles = []) => {
    const files = Array.isArray(audioFiles) ? audioFiles : [];
    return files.find((file) => file?.label === "original") || files[0] || null;
};

const getTrackAssetUrls = (track, { includePending = true } = {}) => {
    const sources = includePending
        ? [track, track?.pendingUpdate?.data].filter(Boolean)
        : [track].filter(Boolean);
    const audioUrls = sources.flatMap((source) => getAudioUrlsFromFiles(source.audioFiles || []));
    const coverUrls = sources.flatMap((source) => (source.coverImage || []).filter(Boolean));
    const avatarUrls = sources.map((source) => source.avatar).filter(Boolean);
    const lyricsSyncUrls = sources.map((source) => source.lyricsSyncUrl).filter(Boolean);

    return {
        audioUrls: [...new Set(audioUrls)],
        coverUrls: [...new Set(coverUrls)],
        avatarUrls: [...new Set(avatarUrls)],
        lyricsSyncUrls: [...new Set(lyricsSyncUrls)],
        avatarUrl: track?.avatar || "",
        lyricsSyncUrl: track?.lyricsSyncUrl || "",
    };
};

const collectReplacedAssetUrls = ({ oldAssets, nextAssets }) => {
    const replacedUrls = [];

    if (nextAssets.audioUrls !== undefined) {
        const nextAudioSet = new Set(nextAssets.audioUrls);
        oldAssets.audioUrls.forEach((url) => {
            if (!nextAudioSet.has(url)) {
                replacedUrls.push(url);
            }
        });
    }

    if (nextAssets.coverUrls !== undefined) {
        const nextCoverSet = new Set(nextAssets.coverUrls);
        oldAssets.coverUrls.forEach((url) => {
            if (!nextCoverSet.has(url)) {
                replacedUrls.push(url);
            }
        });
    }

    if (nextAssets.avatarUrl !== undefined) {
        const nextAvatarSet = new Set([...(nextAssets.avatarUrls || []), nextAssets.avatarUrl].filter(Boolean));
        const oldAvatarUrls = oldAssets.avatarUrls || [oldAssets.avatarUrl];
        oldAvatarUrls.forEach((url) => {
            if (url && !nextAvatarSet.has(url)) replacedUrls.push(url);
        });
    }

    if (nextAssets.lyricsSyncUrl !== undefined) {
        const nextLyricsSet = new Set([...(nextAssets.lyricsSyncUrls || []), nextAssets.lyricsSyncUrl].filter(Boolean));
        const oldLyricsUrls = oldAssets.lyricsSyncUrls || [oldAssets.lyricsSyncUrl];
        oldLyricsUrls.forEach((url) => {
            if (url && !nextLyricsSet.has(url)) replacedUrls.push(url);
        });
    }

    return [...new Set(replacedUrls)];
};

const getUnsharedTrackAssetUrls = async (trackId, urls = []) => {
    const normalizedUrls = [...new Set(urls.filter(Boolean))];
    if (!normalizedUrls.length) return [];

    const references = await Track.find({
        _id: { $ne: trackId },
        isDeleted: { $ne: true },
        $or: [
            { "audioFiles.url": { $in: normalizedUrls } },
            { coverImage: { $in: normalizedUrls } },
            { avatar: { $in: normalizedUrls } },
            { lyricsSyncUrl: { $in: normalizedUrls } },
            { "pendingUpdate.data.audioFiles.url": { $in: normalizedUrls } },
            { "pendingUpdate.data.coverImage": { $in: normalizedUrls } },
            { "pendingUpdate.data.avatar": { $in: normalizedUrls } },
            { "pendingUpdate.data.lyricsSyncUrl": { $in: normalizedUrls } },
        ],
    }).select("audioFiles coverImage avatar lyricsSyncUrl pendingUpdate.data.audioFiles pendingUpdate.data.coverImage pendingUpdate.data.avatar pendingUpdate.data.lyricsSyncUrl").lean();

    const referencedUrls = new Set();
    references.forEach((track) => {
        const sources = [track, track.pendingUpdate?.data].filter(Boolean);
        sources.forEach((source) => {
            getAudioUrlsFromFiles(source.audioFiles || []).forEach((url) => referencedUrls.add(url));
            (source.coverImage || []).filter(Boolean).forEach((url) => referencedUrls.add(url));
            if (source.avatar) referencedUrls.add(source.avatar);
            if (source.lyricsSyncUrl) referencedUrls.add(source.lyricsSyncUrl);
        });
    });

    return normalizedUrls.filter((url) => !referencedUrls.has(url));
};

const populateManagementTrack = (trackId) =>
    Track.findById(trackId)
        .populate({
            path: "artist_artistId",
            select: "name avatar coverImage",
        })
        .populate({
            path: "album_albumId",
            select: "title avatar",
        })
        .populate({
            path: "genreIds",
            select: "name",
        })
        .populate({
            path: "pendingUpdate.data.genreIds",
            select: "name",
        })
        .populate({
            path: "pendingUpdate.reviewedBy",
            select: "email",
        });

const stringifyComparableAudioFiles = (audioFiles = []) =>
    JSON.stringify(
        (audioFiles || []).map((file) => ({
            url: file?.url || "",
            format: file?.format || "",
            bitrate: Number(file?.bitrate) || 0,
            label: file?.label || "",
            priority: Number(file?.priority) || 0,
        }))
    );

const stringifyComparableCopyright = (copyright) =>
    JSON.stringify(copyright || null);

const stringifyComparableStringArray = (values = []) =>
    JSON.stringify((values || []).map((value) => String(value || "")));

const stringifyComparableGenreIds = (genreIds = []) =>
    JSON.stringify(
        (genreIds || [])
            .map((genreId) => String(genreId?._id || genreId || ""))
            .sort()
    );

const cloneCopyrightValue = (copyright) => {
    if (!copyright) {
        return null;
    }

    return JSON.parse(JSON.stringify(copyright));
};

const cloneTrackMutableData = (source) => ({
    title: source?.title || "",
    versionTitle: source?.versionTitle || "",
    description: source?.description || "",
    tags: Array.isArray(source?.tags) ? [...source.tags] : [],
    genreIds: Array.isArray(source?.genreIds)
        ? source.genreIds.map((genreId) => (
            genreId?._id ? genreId._id : genreId
        ))
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
    copyright: cloneCopyrightValue(source?.copyright?.toObject?.() || source?.copyright || null),
});

const mergeArtistCopyrightUpdate = (currentCopyright, artistCopyright) => {
    const current = currentCopyright || {};
    const update = artistCopyright || {};
    const merged = { ...current, ...update };

    if (Array.isArray(update.copyrightEvidenceDocuments)) {
        const currentDocuments = Array.isArray(current.copyrightEvidenceDocuments)
            ? current.copyrightEvidenceDocuments
            : [];
        const findExistingDocument = (document) => currentDocuments.find((candidate) => (
            (document.documentId && candidate?.documentId === document.documentId) ||
            (document.url && (candidate?.url === document.url || candidate?.storageUrl === document.url))
        ));
        merged.copyrightEvidenceDocuments = update.copyrightEvidenceDocuments.map((document) => ({
            ...(findExistingDocument(document) || {}),
            ...document,
        }));
    }

    return merged;
};

const getPendingEditableSource = (track) => {
    const pendingStatus = track?.pendingUpdate?.status;
    const pendingData = track?.pendingUpdate?.data;

    if (
        (pendingStatus === "rejected" || pendingStatus === "pending") &&
        pendingData
    ) {
        return pendingData;
    }

    return track;
};

const getChangedTrackFields = (liveData, nextData) => {
    const changedFields = [];

    if ((liveData.title || "") !== (nextData.title || "")) {
        changedFields.push("title");
    }

    if ((liveData.versionTitle || "") !== (nextData.versionTitle || "")) {
        changedFields.push("versionTitle");
    }

    if ((liveData.description || "") !== (nextData.description || "")) {
        changedFields.push("description");
    }

    if (stringifyComparableStringArray(liveData.tags) !== stringifyComparableStringArray(nextData.tags)) {
        changedFields.push("tags");
    }

    if (stringifyComparableGenreIds(liveData.genreIds) !== stringifyComparableGenreIds(nextData.genreIds)) {
        changedFields.push("genreIds");
    }

    if (stringifyComparableAudioFiles(liveData.audioFiles) !== stringifyComparableAudioFiles(nextData.audioFiles)) {
        changedFields.push("audioFiles");
    }

    if ((Number(liveData.duration) || 0) !== (Number(nextData.duration) || 0)) {
        changedFields.push("duration");
    }

    if ((liveData.avatar || "") !== (nextData.avatar || "")) {
        changedFields.push("avatar");
    }

    if (stringifyComparableStringArray(liveData.coverImage) !== stringifyComparableStringArray(nextData.coverImage)) {
        changedFields.push("coverImage");
    }

    if ((liveData.lyricsStatic || "") !== (nextData.lyricsStatic || "")) {
        changedFields.push("lyricsStatic");
    }

    if ((liveData.lyricsSyncUrl || "") !== (nextData.lyricsSyncUrl || "")) {
        changedFields.push("lyricsSyncUrl");
    }

    if (stringifyComparableCopyright(liveData.copyright) !== stringifyComparableCopyright(nextData.copyright)) {
        changedFields.push("copyright");
    }

    return changedFields;
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

const clearTrackModerationForResubmission = (track) => {
    track.approvalStatus = "pending";
    track.activeStatus = "draft";
    track.rejectReason = "";
    track.hiddenReason = "";
    track.hiddenAt = null;
    track.moderation = {
        ...(track.moderation?.toObject?.() || track.moderation || {}),
        submittedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
        adminNote: "",
        violationFlags: [],
        lastRejection: null,
    };
    track.fingerprintScreening = {
        ...(track.fingerprintScreening?.toObject?.() || track.fingerprintScreening || {}),
        status: "pending",
        audioVersion: track.audioVersion || 1,
        matchedTrackId: null,
        enforcementEvidenceId: null,
        exactDuplicate: false,
        riskLevel: "none",
        failureReason: "",
        completedAt: null,
    };
};

export const assertRejectedTrackHasMeaningfulChanges = (track, candidateData) => {
    if (track?.approvalStatus !== "rejected") return;

    const rejection = getTrackRejectionSnapshot(track);
    const candidateHash = hashTrackMutableData(candidateData);

    if (!rejection.mutableSnapshotHash || rejection.mutableSnapshotHash === candidateHash) {
        throw new AppError(
            "Bạn chưa thay đổi nội dung kể từ lần bị từ chối. Hãy chỉnh sửa hồ sơ hoặc gửi phản hồi quyết định nếu bạn cho rằng kết quả xét duyệt chưa phù hợp.",
            StatusCodes.CONFLICT,
            { code: "TRACK_RESUBMIT_REQUIRES_CHANGES" }
        );
    }
};

const resetTrackFingerprintScreeningForAudioVersion = (track, audioVersion) => {
    track.fingerprintScreening = {
        ...(track.fingerprintScreening?.toObject?.() || track.fingerprintScreening || {}),
        status: "pending",
        audioHash: "",
        audioVersion: Number(audioVersion) || 1,
        fingerprintId: null,
        matchedTrackId: null,
        enforcementEvidenceId: null,
        highestSimilarity: 0,
        riskLevel: "none",
        exactDuplicate: false,
        failureReason: "",
        completedAt: null,
    };
};

const createTrack = async (userId, trackData) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("Không tìm thấy người dùng.", StatusCodes.NOT_FOUND);
    }

    if (user.role !== "artist") {
        throw new AppError(
            "Chỉ nghệ sĩ mới có thể tạo bài hát.",
            StatusCodes.FORBIDDEN
        );
    }

    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError(
            "Không tìm thấy hồ sơ nghệ sĩ. Vui lòng hoàn thiện hồ sơ nghệ sĩ trước.",
            StatusCodes.NOT_FOUND
        );
    }

    assertPayloadHasNoForbiddenFields(trackData);
    assertArtistCanCreateTrack(artist);

    const title = validateDraftTitle(trackData.title);
    const versionTitle = normalizeTrackVersionTitle(trackData.versionTitle);
    const artistId = resolveArtistIdForCreate(trackData, artist);
    await assertTrackTitleVersionAvailable({
        artistId,
        title,
        versionTitle,
    });

    const audioFiles = validateOptionalAudioFiles(trackData.audioFiles);
    const sourceAudioHash = normalizeTrackSourceAudioHash(
        trackData.audioAnalysis?.sourceAudioHash
    );
    await assertTrackAudioFingerprintAvailable({
        artistId,
        sourceAudioHash,
    });
    const duration = validateDurationFromAudioAnalysis(
        trackData.audioAnalysis,
        audioFiles.length > 0
    );
    const genreIds = await validateOptionalGenreIds(trackData.genreIds);
    const description = validateOptionalDescription(trackData.description);
    const tags = validateOptionalTags(trackData.tags);

    const coverImage = Array.isArray(trackData.coverImage)
        ? trackData.coverImage.filter(Boolean)
        : [];

    if (coverImage.length > MAX_COVER_IMAGES) {
        throw new AppError(
            `Một bài hát chỉ được có tối đa ${MAX_COVER_IMAGES} ảnh bìa.`,
            StatusCodes.BAD_REQUEST,
            { field: "coverImage" }
        );
    }

    const lyricsStatic =
        typeof trackData.lyricsStatic === "string" ? trackData.lyricsStatic : "";

    if (lyricsStatic.length > LYRICS_STATIC_MAX_LENGTH) {
        throw new AppError(
            `Lời bài hát tĩnh không được vượt quá ${LYRICS_STATIC_MAX_LENGTH} ký tự.`,
            StatusCodes.BAD_REQUEST,
            { field: "lyricsStatic" }
        );
    }

    const sanitizedCopyright = sanitizeArtistCopyright(trackData.copyright);

    const newTrack = new Track({
        title,
        versionTitle,
        description,
        tags,
        artist_artistId: artistId,
        album_albumId: null,
        genreIds,
        audioFiles,
        duration,
        avatar: trackData.avatar || "",
        coverImage,
        lyricsStatic,
        lyricsSyncUrl: trackData.lyricsSyncUrl || "",
        releaseDate: null,
        releaseStatus: TRACK_RELEASE_STATUS.UNRELEASED,
        releasedAt: null,
        activeStatus: "draft",
        approvalStatus: "draft",
        stats: {
            totalLike: 0,
            totalPlay: 0,
        },
        ...(sourceAudioHash
            ? {
                fingerprintScreening: {
                    status: "pending",
                    audioHash: sourceAudioHash,
                    audioVersion: 1,
                },
            }
            : {}),
        ...(sanitizedCopyright !== undefined ? { copyright: sanitizedCopyright } : {}),
    });

    const savedTrack = await newTrack.save();
    void scheduleTrackAudioFingerprint(savedTrack._id, {
        sourceAudioHash: trackData.audioAnalysis?.sourceAudioHash || "",
    }).catch((error) => {
        console.error("Audio fingerprint scheduling after track save failed:", error.message);
    });
    const populatedTrack = await populateManagementTrack(savedTrack._id);

    return formatTrackManagementDetail(populatedTrack);
};

const updateArtistTrack = async (userId, trackId, trackData) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("Không tìm thấy người dùng.", StatusCodes.NOT_FOUND);
    }

    if (user.role !== "artist") {
        throw new AppError(
            "Chỉ nghệ sĩ mới có thể cập nhật bài hát.",
            StatusCodes.FORBIDDEN
        );
    }

    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError("Không tìm thấy hồ sơ nghệ sĩ.", StatusCodes.NOT_FOUND);
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Mã bài hát không hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: "id",
        });
    }

    const track = await Track.findOne({
        _id: trackId,
        artist_artistId: artist._id,
        isDeleted: { $ne: true },
    });

    if (!track) {
        throw new AppError(
            "Không tìm thấy bài hát hoặc bạn không có quyền cập nhật bài hát này.",
            StatusCodes.NOT_FOUND
        );
    }

    assertPayloadHasNoForbiddenFields(trackData);
    assertArtistCanCreateTrack(artist);
    assertTrackEditableByArtist(track);

    const isApprovedTrack = track.approvalStatus === "approved";
    const editableSource = getPendingEditableSource(track);
    const liveSnapshot = cloneTrackMutableData(track);
    const nextTrackData = cloneTrackMutableData(editableSource);
    const nextAssets = {
        audioUrls: undefined,
        coverUrls: undefined,
        avatarUrl: undefined,
        lyricsSyncUrl: undefined,
    };

    if (trackData.title !== undefined) {
        nextTrackData.title = validateDraftTitle(trackData.title);
    }

    if (trackData.versionTitle !== undefined) {
        nextTrackData.versionTitle =
            typeof trackData.versionTitle === "string"
                ? trackData.versionTitle.trim()
                : "";
    }

    if (trackData.description !== undefined) {
        nextTrackData.description = validateOptionalDescription(trackData.description);
    }

    if (trackData.tags !== undefined) {
        nextTrackData.tags = validateOptionalTags(trackData.tags);
    }

    if (trackData.genreIds !== undefined) {
        nextTrackData.genreIds = await validateOptionalGenreIds(trackData.genreIds);
    }

    if (trackData.avatar !== undefined) {
        nextTrackData.avatar = trackData.avatar || "";
        nextAssets.avatarUrl = nextTrackData.avatar;
    }

    if (trackData.coverImage !== undefined) {
        nextTrackData.coverImage = Array.isArray(trackData.coverImage)
            ? trackData.coverImage.filter(Boolean)
            : [];

        if (nextTrackData.coverImage.length > MAX_COVER_IMAGES) {
            throw new AppError(
                `Một bài hát chỉ được có tối đa ${MAX_COVER_IMAGES} ảnh bìa.`,
                StatusCodes.BAD_REQUEST,
                { field: "coverImage" }
            );
        }

        nextAssets.coverUrls = nextTrackData.coverImage;
    }

    if (trackData.audioFiles !== undefined) {
        const nextAudioFiles = validateOptionalAudioFiles(trackData.audioFiles);
        const nextDuration = validateDurationFromAudioAnalysis(
            trackData.audioAnalysis,
            nextAudioFiles.length > 0
        );

        nextTrackData.audioFiles = nextAudioFiles;
        nextTrackData.duration = nextDuration;
        nextAssets.audioUrls = getAudioUrlsFromFiles(nextAudioFiles);
    }

    if (trackData.lyricsStatic !== undefined) {
        const nextLyrics = trackData.lyricsStatic || "";

        if (nextLyrics.length > LYRICS_STATIC_MAX_LENGTH) {
            throw new AppError(
                `Lời bài hát tĩnh không được vượt quá ${LYRICS_STATIC_MAX_LENGTH} ký tự.`,
                StatusCodes.BAD_REQUEST,
                { field: "lyricsStatic" }
            );
        }

        nextTrackData.lyricsStatic = nextLyrics;
    }

    if (trackData.lyricsSyncUrl !== undefined) {
        nextTrackData.lyricsSyncUrl = trackData.lyricsSyncUrl || "";
        nextAssets.lyricsSyncUrl = nextTrackData.lyricsSyncUrl;
    }

    if (trackData.title !== undefined) {
        await assertTrackTitleIsAvailable(nextTrackData.title, artist._id, track._id);
    }

    if (trackData.copyright !== undefined) {
        const sanitizedCopyright = sanitizeArtistCopyright(trackData.copyright);

        if (sanitizedCopyright !== undefined) {
            nextTrackData.copyright = mergeArtistCopyrightUpdate(
                nextTrackData.copyright,
                sanitizedCopyright,
            );
        }
    }

    let urlsToDelete = [];

    const changedFields = getChangedTrackFields(liveSnapshot, nextTrackData);
    const copyrightChanges = getCopyrightChangeFlags(
        liveSnapshot.copyright,
        nextTrackData.copyright,
    );

    if (isApprovedTrack) {
        const nextVersions = {
            submission: Number(track.submissionVersion || 1) + 1,
            audio: changedFields.includes("audioFiles")
                ? Number(track.audioVersion || 1) + 1
                : Number(track.audioVersion || 1),
            copyright: copyrightChanges.declarationChanged
                ? Number(track.copyrightVersion || 1) + 1
                : Number(track.copyrightVersion || 1),
            evidence: copyrightChanges.evidenceChanged
                ? Number(track.evidenceVersion || 1) + 1
                : Number(track.evidenceVersion || 1),
        };
        const liveAssets = getTrackAssetUrls(track, { includePending: false });
        const previousPendingAssets = getTrackAssetUrls(track.pendingUpdate?.data || {}, { includePending: false });

        if (changedFields.length === 0) {
            clearPendingUpdate(track);
            urlsToDelete = collectReplacedAssetUrls({
                oldAssets: previousPendingAssets,
                nextAssets: {
                    audioUrls: [],
                    coverUrls: [],
                    avatarUrl: "",
                    lyricsSyncUrl: "",
                },
            }).filter((url) => !Object.values(liveAssets).flat().includes(url));
        } else {
            const now = new Date();
            track.pendingUpdate = {
                status: "pending",
                data: nextTrackData,
                changedFields,
                submittedAt: now,
                lastSavedAt: now,
                reviewedBy: null,
                reviewedAt: null,
                adminNote: "",
                rejectReason: "",
                submissionVersion: nextVersions.submission,
                audioVersion: nextVersions.audio,
                copyrightVersion: nextVersions.copyright,
                evidenceVersion: nextVersions.evidence,
            };

            urlsToDelete = collectReplacedAssetUrls({
                oldAssets: previousPendingAssets,
                nextAssets: {
                    audioUrls: getAudioUrlsFromFiles(nextTrackData.audioFiles),
                    coverUrls: nextTrackData.coverImage,
                    avatarUrl: nextTrackData.avatar,
                    lyricsSyncUrl: nextTrackData.lyricsSyncUrl,
                },
            }).filter((url) => !Object.values(liveAssets).flat().includes(url));
        }
    } else {
        const oldAssets = getTrackAssetUrls(track);

        applyMutableTrackData(track, nextTrackData);

        if (changedFields.length > 0) {
            track.submissionVersion = Number(track.submissionVersion || 1) + 1;
            if (changedFields.includes("audioFiles")) {
                track.audioVersion = Number(track.audioVersion || 1) + 1;
                resetTrackFingerprintScreeningForAudioVersion(track, track.audioVersion);
            }
            if (copyrightChanges.declarationChanged) {
                track.copyrightVersion = Number(track.copyrightVersion || 1) + 1;
            }
            if (copyrightChanges.evidenceChanged) {
                track.evidenceVersion = Number(track.evidenceVersion || 1) + 1;
            }
        }

        if (track.approvalStatus === "approved") {
            clearTrackModerationForResubmission(track);
        }

        urlsToDelete = collectReplacedAssetUrls({
            oldAssets,
            nextAssets,
        });
    }

    await track.save();

    let audioStateInvalidation = null;
    if (!isApprovedTrack && changedFields.includes("audioFiles")) {
        audioStateInvalidation = invalidateTrackAudioVersionState(track._id, {
            audioVersion: track.audioVersion,
            submissionVersion: track.submissionVersion,
        });
    }

    if (isApprovedTrack && changedFields.length > 0) {
        void runMusicBrainzVerification(track._id).catch((error) => {
            console.error("MusicBrainz pending update verification failed:", error.message);
        });
    }

    if (trackData.audioFiles !== undefined) {
        const fingerprintAudio = isApprovedTrack
            ? getOriginalAudio(nextTrackData.audioFiles)
            : null;
        const fingerprintVersion = isApprovedTrack
            ? track.pendingUpdate?.audioVersion
            : track.audioVersion;
        const scheduleFingerprint = () => scheduleTrackAudioFingerprint(track._id, {
            sourceAudioHash: trackData.audioAnalysis?.sourceAudioHash || "",
            sourceAudio: fingerprintAudio,
            audioVersion: fingerprintVersion,
        }).catch((error) => {
            console.error("Audio fingerprint scheduling after track save failed:", error.message);
        });

        if (audioStateInvalidation) {
            void audioStateInvalidation
                .then(scheduleFingerprint)
                .catch((error) => {
                    console.error("Audio version state invalidation failed after track save:", error.message);
                });
        } else {
            void scheduleFingerprint();
        }
    }

    if (urlsToDelete.length > 0) {
        await deleteCloudinaryAssetsByUrls(await getUnsharedTrackAssetUrls(track._id, urlsToDelete));
    }

    const populatedTrack = await populateManagementTrack(track._id);

    return formatTrackManagementDetail(populatedTrack);
};

const uploadCopyrightEvidence = async (userId, trackId, files = [], metadata = {}) => {
    const user = await User.findById(userId);
    if (!user || user.role !== "artist") {
        throw new AppError("Chỉ nghệ sĩ mới có thể tải tài liệu bản quyền.", StatusCodes.FORBIDDEN);
    }

    const artist = await Artist.findOne({ userId });
    if (!artist) throw new AppError("Không tìm thấy hồ sơ nghệ sĩ.", StatusCodes.NOT_FOUND);
    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Mã bài hát không hợp lệ.", StatusCodes.BAD_REQUEST, { field: "id" });
    }

    const track = await Track.findOne({
        _id: trackId,
        artist_artistId: artist._id,
        isDeleted: { $ne: true },
    });
    if (!track) throw new AppError("Không tìm thấy bài hát hoặc bạn không có quyền cập nhật.", StatusCodes.NOT_FOUND);
    assertArtistCanCreateTrack(artist);
    assertTrackEditableByArtist(track);

    if (!Array.isArray(files) || files.length === 0) {
        throw new AppError("Vui lòng chọn ít nhất một tài liệu bản quyền.", StatusCodes.BAD_REQUEST, { field: "evidence" });
    }

    const editableSource = getPendingEditableSource(track);
    const currentDocuments = Array.isArray(editableSource?.copyright?.copyrightEvidenceDocuments)
        ? editableSource.copyright.copyrightEvidenceDocuments
        : [];
    if (currentDocuments.length + files.length > MAX_EVIDENCE_DOCUMENTS) {
        throw new AppError(`Một bài hát chỉ được có tối đa ${MAX_EVIDENCE_DOCUMENTS} tài liệu.`, StatusCodes.BAD_REQUEST, { field: "evidence" });
    }

    const seenHashes = new Set(currentDocuments.map((document) => document.sha256).filter(Boolean));
    let requestedTypes = metadata?.evidenceTypes || [];
    if (typeof requestedTypes === "string") {
        try {
            requestedTypes = JSON.parse(requestedTypes);
        } catch {
            requestedTypes = requestedTypes.split(",");
        }
    }
    if (!Array.isArray(requestedTypes)) requestedTypes = [];
    const documents = [];
    for (const [index, file] of files.entries()) {
        const fileError = validateEvidenceUploadFile(file);
        if (fileError) throw new AppError(fileError, StatusCodes.BAD_REQUEST, { field: "evidence" });
        const sha256 = crypto.createHash("sha256").update(file.buffer).digest("hex");
        if (seenHashes.has(sha256)) {
            throw new AppError("Không được tải lại cùng một tài liệu bản quyền.", StatusCodes.CONFLICT, { field: "evidence" });
        }
        seenHashes.add(sha256);

        let uploaded;
        try {
            uploaded = await uploadEvidenceBuffer({
                buffer: file.buffer,
                folder: `reso/copyright/tracks/${track._id}`,
                publicId: `${track._id}_${Date.now()}_${index}_${sha256.slice(0, 12)}`,
            });
        } catch {
            throw new AppError("Không thể tải tài liệu bản quyền lên kho lưu trữ.", StatusCodes.BAD_GATEWAY, { field: "evidence" });
        }

        const type = String(requestedTypes[index] || "other").trim().toLowerCase();
        if (!COPYRIGHT_EVIDENCE_TYPES.includes(type)) {
            throw new AppError("Loại tài liệu bản quyền không hợp lệ.", StatusCodes.BAD_REQUEST, { field: "evidenceTypes" });
        }
        documents.push({
            documentId: crypto.randomUUID(),
            type,
            version: 1,
            originalName: String(file.originalname || "").trim().slice(0, 255),
            mimeType: String(file.mimetype || "").trim().slice(0, 120),
            size: Number(file.size),
            storageUrl: uploaded.secure_url || uploaded.url || "",
            url: uploaded.secure_url || uploaded.url || "",
            publicId: uploaded.public_id || "",
            sha256,
            hash: sha256,
            uploadedAt: new Date(),
            uploadStatus: "uploaded",
        });
    }

    const nextCopyright = {
        ...(editableSource?.copyright?.toObject?.() || editableSource?.copyright || {}),
        copyrightEvidenceDocuments: [...currentDocuments, ...documents],
        copyrightStatus: "pending",
    };

    if (track.approvalStatus === "approved") {
        const now = new Date();
        const nextData = cloneTrackMutableData(editableSource);
        nextData.copyright = nextCopyright;
        track.pendingUpdate = {
            status: "pending",
            data: nextData,
            changedFields: ["copyright"],
            submittedAt: now,
            lastSavedAt: now,
            reviewedBy: null,
            reviewedAt: null,
            adminNote: "",
            rejectReason: "",
            submissionVersion: Number(track.submissionVersion || 1) + 1,
            audioVersion: Number(track.audioVersion || 1),
            copyrightVersion: Number(track.copyrightVersion || 1),
            evidenceVersion: Number(track.evidenceVersion || 1) + 1,
        };
    } else {
        track.copyright = nextCopyright;
        track.submissionVersion = Number(track.submissionVersion || 1) + 1;
        track.evidenceVersion = Number(track.evidenceVersion || 1) + 1;
    }

    await track.save();
    if (track.approvalStatus === "approved") {
        void runMusicBrainzVerification(track._id).catch((error) => {
            console.error("MusicBrainz evidence update verification failed:", error.message);
        });
    }
    const populatedTrack = await populateManagementTrack(track._id);
    return formatTrackManagementDetail(populatedTrack);
};

const getArtistTracks = async (userId, query = {}) => {
    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError("Không tìm thấy hồ sơ nghệ sĩ.", StatusCodes.NOT_FOUND);
    }

    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, 100);
    const skip = (page - 1) * limit;

    const filter = {
        artist_artistId: artist._id,
        isDeleted: { $ne: true },
    };

    const unassignedOnly = ["true", "1"].includes(
        String(query.unassignedOnly || "").trim().toLowerCase()
    );

    if (unassignedOnly) {
        const legacyAssignedTrackIds = await Album.distinct("trackList.trackId", {
            artistId: artist._id,
        });

        filter.album_albumId = null;

        if (legacyAssignedTrackIds.length > 0) {
            filter._id = { $nin: legacyAssignedTrackIds };
        }
    }

    const rawSearch = typeof query.q === "string" ? query.q.trim() : "";
    if (rawSearch) {
        const escapedSearch = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.title = {
            $regex: escapedSearch,
            $options: "i",
        };
    }

    if (typeof query.activeStatus === "string" && query.activeStatus.trim() !== "") {
        const allowed = new Set(["draft", "active", "hidden", "blocked"]);
        const value = query.activeStatus.trim();

        if (allowed.has(value)) {
            filter.activeStatus = value;
        }
    }

    if (typeof query.approvalStatus === "string" && query.approvalStatus.trim() !== "") {
        const allowedApproval = new Set(["draft", "pending", "approved", "rejected"]);
        const value = query.approvalStatus.trim();

        if (allowedApproval.has(value)) {
            filter.approvalStatus = value;
        }
    }

    if (typeof query.releaseStatus === "string" && query.releaseStatus.trim() !== "") {
        const allowedReleaseStatuses = new Set(Object.values(TRACK_RELEASE_STATUS));
        const value = query.releaseStatus.trim().toLowerCase();

        if (allowedReleaseStatuses.has(value)) {
            filter.releaseStatus = value;
        }
    }

    const [tracks, total] = await Promise.all([
        Track.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "artist_artistId",
                select: "name avatar coverImage",
            })
            .populate({
                path: "album_albumId",
                select: "title avatar",
            })
            .populate({
                path: "genreIds",
                select: "name",
            })
            .lean(),
        Track.countDocuments(filter),
    ]);

    return {
        tracks: tracks.map(formatTrackManagementDetail),
        pagination: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
    };
};

const getArtistTrackDetail = async (userId, trackId) => {
    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError("Không tìm thấy hồ sơ nghệ sĩ.", StatusCodes.NOT_FOUND);
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Mã bài hát không hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: "id",
        });
    }

    const track = await Track.findOne({
        _id: trackId,
        artist_artistId: artist._id,
        isDeleted: { $ne: true },
    })
        .populate({
            path: "artist_artistId",
            select: "name avatar coverImage",
        })
        .populate({
            path: "album_albumId",
            select: "title avatar",
        })
        .populate({
            path: "genreIds",
            select: "name",
        })
        .lean();

    if (!track) {
        throw new AppError(
            "Không tìm thấy bài hát hoặc bạn không có quyền xem bài hát này.",
            StatusCodes.NOT_FOUND
        );
    }

    return formatTrackManagementDetail(track);
};

const hideArtistTrack = async (userId, trackId) => {
    const artist = await Artist.findOne({ userId });
    assertArtistCanCreateTrack(artist);

    if (!artist) {
        throw new AppError("Không tìm thấy hồ sơ nghệ sĩ.", StatusCodes.NOT_FOUND);
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Mã bài hát không hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: "id",
        });
    }

    const track = await Track.findOne({
        _id: trackId,
        artist_artistId: artist._id,
        isDeleted: { $ne: true },
    });

    if (!track) {
        throw new AppError(
            "Không tìm thấy bài hát hoặc bạn không có quyền cập nhật bài hát này.",
            StatusCodes.NOT_FOUND
        );
    }

    await assertTrackVisibilityCanBeChangedByArtist(track);

    if (track.activeStatus === "blocked") {
        throw new AppError(
            "Không thể ẩn bài hát ở trạng thái hiện tại.",
            StatusCodes.CONFLICT,
            { field: "activeStatus" }
        );
    }

    if (track.activeStatus !== "hidden") {
        track.previousActiveStatusBeforeArtistHide =
            track.activeStatus === "active" ? "active" : "draft";
    }

    track.activeStatus = "hidden";
    track.hiddenReason = "";
    track.hiddenAt = new Date();

    await track.save();

    const populatedTrack = await Track.findById(track._id)
        .populate({
            path: "artist_artistId",
            select: "name avatar coverImage",
        })
        .populate({
            path: "album_albumId",
            select: "title avatar",
        })
        .populate({
            path: "genreIds",
            select: "name",
        })
        .lean();

    return formatTrackManagementDetail(populatedTrack);
};

const unhideArtistTrack = async (userId, trackId) => {
    const artist = await Artist.findOne({ userId });
    assertArtistCanCreateTrack(artist);

    if (!artist) {
        throw new AppError("Không tìm thấy hồ sơ nghệ sĩ.", StatusCodes.NOT_FOUND);
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Mã bài hát không hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: "id",
        });
    }

    const track = await Track.findOne({
        _id: trackId,
        artist_artistId: artist._id,
        isDeleted: { $ne: true },
    });

    if (!track) {
        throw new AppError(
            "Không tìm thấy bài hát hoặc bạn không có quyền cập nhật bài hát này.",
            StatusCodes.NOT_FOUND
        );
    }

    await assertTrackVisibilityCanBeChangedByArtist(track);

    if (track.approvalStatus !== "approved" || track.activeStatus === "blocked") {
        if (track.activeStatus === "blocked") {
            throw new AppError(
                "Không thể chuyển bài hát sang trạng thái hoạt động ở trạng thái hiện tại.",
                StatusCodes.CONFLICT,
                { field: "activeStatus" }
            );
        }
    }

    track.activeStatus = resolveArtistTrackStatusAfterUnhide(track);
    track.hiddenReason = "";
    track.hiddenAt = null;
    track.previousActiveStatusBeforeArtistHide = null;

    await track.save();

    const populatedTrack = await populateManagementTrack(track._id);

    return formatTrackManagementDetail(populatedTrack);
};

const deleteArtistTrack = async (userId, trackId) => {
    const artist = await Artist.findOne({ userId });
    assertArtistCanCreateTrack(artist);

    if (!artist) {
        throw new AppError("Không tìm thấy hồ sơ nghệ sĩ.", StatusCodes.NOT_FOUND);
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Mã bài hát không hợp lệ.", StatusCodes.BAD_REQUEST, {
            field: "id",
        });
    }

    const track = await Track.findOne({
        _id: trackId,
        artist_artistId: artist._id,
    });

    if (!track) {
        throw new AppError(
            "Không tìm thấy bài hát hoặc bạn không có quyền xóa bài hát này.",
            StatusCodes.NOT_FOUND
        );
    }

    const trackAssets = getTrackAssetUrls(track);
    const assetUrlsToDelete = collectReplacedAssetUrls({
        oldAssets: trackAssets,
        nextAssets: {
            audioUrls: [],
            coverUrls: [],
            avatarUrl: "",
            lyricsSyncUrl: "",
        },
    });

    const alreadyDeleted = track.isDeleted === true;
    if (!alreadyDeleted) {
        try {
            await Track.updateOne(
                { _id: track._id, artist_artistId: artist._id, isDeleted: { $ne: true } },
                {
                    $set: {
                        isDeleted: true,
                        deletedAt: new Date(),
                        deletedBy: artist.userId,
                        deleteReason: "Deleted by artist",
                        activeStatus: "hidden",
                    },
                },
            );
        } catch (error) {
            console.error("[deleteArtistTrack] soft-delete: Không thể đánh dấu track đã xóa.", error);
            throw new AppError(
                "Không thể xóa track lúc này, vui lòng thử lại.",
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }

    // Mark the Track deleted before cleaning fingerprint data. A worker that
    // races this request will then stop instead of recreating an orphan record.
    let fingerprintLifecycle = {
        mode: "cleanup_pending",
        reason: "Track was deleted before fingerprint cleanup completed.",
    };
    const cleanupWarnings = [];
    const reportCleanupFailure = (step, message, error) => {
        cleanupWarnings.push({ step, message });
        console.error(`[deleteArtistTrack] ${step}: ${message}`, error);
    };

    try {
        fingerprintLifecycle = await cleanupTrackFingerprintLifecycle(
            { ...track.toObject(), isDeleted: true, deletedAt: new Date() },
            { actorUserId: artist.userId }
        );
    } catch (error) {
        reportCleanupFailure(
            "fingerprint",
            "Track đã được xóa nhưng dữ liệu fingerprint chưa dọn dẹp xong.",
            error
        );
    }

    if (track.album_albumId) {
        try {
            await Album.updateOne(
                { _id: track.album_albumId, "trackList.trackId": track._id },
                { $pull: { trackList: { trackId: track._id } } }
            );
        } catch (error) {
            reportCleanupFailure(
                "album",
                "Track đã được xóa nhưng chưa thể cập nhật album.",
                error
            );
        }
    }

    try {
        await ReleaseSchedule.updateMany(
            { type: "track", targetId: track._id, status: "scheduled" },
            { $set: { status: "cancelled" } }
        );
    } catch (error) {
        reportCleanupFailure(
            "releaseSchedule",
            "Track đã được xóa nhưng chưa thể hủy lịch phát hành.",
            error
        );
    }

    // Only delete assets that are no longer shared with another track.
    const storageUrlsToDelete = fingerprintLifecycle?.mode === "retain_enforcement"
        ? assetUrlsToDelete.filter((url) => !trackAssets.audioUrls.includes(url))
        : assetUrlsToDelete;
    if (storageUrlsToDelete.length > 0) {
        try {
            const unsharedAssetUrls = await getUnsharedTrackAssetUrls(track._id, storageUrlsToDelete);
            const deletionResults = await deleteCloudinaryAssetsByUrls(unsharedAssetUrls);
            const failedDeletions = deletionResults.filter((result) => result.status === "rejected");

            if (failedDeletions.length > 0) {
                reportCleanupFailure(
                    "cloudinary",
                    `Track đã được xóa nhưng ${failedDeletions.length} file trên Cloudinary chưa dọn dẹp xong.`,
                    failedDeletions[0].reason
                );
            }
        } catch (error) {
            reportCleanupFailure(
                "cloudinary",
                "Track đã được xóa nhưng file trên Cloudinary chưa dọn dẹp xong.",
                error
            );
        }
    }

    return {
        deletedId: trackId,
        alreadyDeleted,
        fingerprintLifecycle,
        cleanupWarnings,
    };
};

const submitArtistTrack = async (userId, trackId, submitData = {}) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("Không tìm thấy người dùng.", StatusCodes.NOT_FOUND);
    }

    if (user.role !== "artist") {
        throw new AppError("Chỉ nghệ sĩ mới có thể gửi duyệt bài hát.", StatusCodes.FORBIDDEN);
    }

    const artist = await Artist.findOne({ userId });
    assertArtistCanCreateTrack(artist);

    if (!artist) {
        throw new AppError("Không tìm thấy hồ sơ nghệ sĩ.", StatusCodes.NOT_FOUND);
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Mã bài hát không hợp lệ.", StatusCodes.BAD_REQUEST, { field: "id" });
    }

    const track = await Track.findOne({
        _id: trackId,
        artist_artistId: artist._id,
        isDeleted: { $ne: true },
    });

    if (!track) {
        throw new AppError("Không tìm thấy bài hát hoặc bạn không có quyền truy cập.", StatusCodes.NOT_FOUND);
    }

    const editableSource = getPendingEditableSource(track);
    const candidateData = cloneTrackMutableData(editableSource);
    if (Object.prototype.hasOwnProperty.call(submitData, "copyright")) {
        const sanitizedCopyright = sanitizeArtistCopyright(submitData.copyright);
        candidateData.copyright = mergeArtistCopyrightUpdate(
            candidateData.copyright,
            sanitizedCopyright,
        );
    }
    assertRejectedTrackHasMeaningfulChanges(track, candidateData);

    // Keep the final declaration attached to the submit request. This prevents
    // a stale draft save from making validation read different data than the
    // edit form currently shows.
    if (Object.prototype.hasOwnProperty.call(submitData, "copyright")) {
        const nextTrackData = cloneTrackMutableData(editableSource);
        const sanitizedCopyright = sanitizeArtistCopyright(submitData.copyright);

        nextTrackData.copyright = mergeArtistCopyrightUpdate(
            nextTrackData.copyright,
            sanitizedCopyright,
        );
        applyMutableTrackData(track, nextTrackData);
        clearPendingUpdate(track);
    }

    const submissionData = await validateTrackForSubmit(track, artist);

    // A rejected draft may keep the artist's latest edits in pendingUpdate.data.
    // Promote that exact data before switching the track to pending moderation.
    if (submissionData !== track) {
        applyMutableTrackData(track, submissionData);
        clearPendingUpdate(track);
        // Persist the exact draft snapshot before the synchronous fingerprint
        // preflight reads the Track from MongoDB.
        await track.save();
    }

    // Submission must not enter the moderation queue while its fingerprint is
    // still pending. Otherwise the API returns success and the artist sees a
    // false "submitted" toast even though duplicate detection has not run.
    const fingerprintPreflight = await processTrackAudioFingerprint(track._id, {
        audioVersion: Number(track.audioVersion || 1),
    });
    if (fingerprintPreflight?.status !== "completed") {
        throw new AppError(
            "Chưa hoàn tất kiểm tra fingerprint âm thanh. Vui lòng thử lại sau khi kiểm tra xong.",
            StatusCodes.CONFLICT,
            {
                field: "fingerprintScreening",
                code: "FINGERPRINT_SCREENING_NOT_READY",
                reason: fingerprintPreflight?.reason || fingerprintPreflight?.errorCode || fingerprintPreflight?.status || "pending",
            }
        );
    }

    track.approvalStatus = "pending";
    track.activeStatus = "draft";
    track.rejectReason = "";
    track.moderation = {
        ...(track.moderation?.toObject?.() || track.moderation || {}),
        submittedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
        adminNote: "",
        violationFlags: [],
        lastRejection: null,
    };
    track.submissionVersion = Number(track.submissionVersion || 1) + 1;
    track.fingerprintScreening = {
        ...(track.fingerprintScreening?.toObject?.() || track.fingerprintScreening || {}),
        status: "pending",
        audioVersion: track.audioVersion || 1,
        audioHash: "",
        fingerprintId: null,
        matchedTrackId: null,
        enforcementEvidenceId: null,
        highestSimilarity: 0,
        riskLevel: "none",
        exactDuplicate: false,
        failureReason: "",
        completedAt: null,
    };

    await track.save();

    void recordAuditEvent({
        actorUserId: userId,
        actorSnapshot: { id: userId, email: user.email || "", role: user.role || "artist" },
        action: "TRACK_RESUBMITTED",
        targetType: "track",
        targetId: track._id,
        metadata: {
            trackId: track._id,
            artistId: artist._id,
            submissionVersion: track.submissionVersion || 1,
            audioVersion: track.audioVersion || 1,
            copyrightVersion: track.copyrightVersion || 1,
            evidenceVersion: track.evidenceVersion || 1,
        },
    }).catch((error) => console.error("Track resubmission audit failed:", error.message));

    await runAcoustIdVerification(track._id, { reevaluate: false });
    await runMusicBrainzVerification(track._id, { reevaluate: false });
    const automaticDecision = await evaluateAutomaticTrackModeration(track._id, { force: true });
    if (["pending_fingerprint", "processing"].includes(automaticDecision?.status)) {
        throw new AppError(
            "Kiểm tra fingerprint âm thanh vừa thay đổi trong lúc gửi duyệt. Vui lòng thử lại.",
            StatusCodes.CONFLICT,
            {
                field: "fingerprintScreening",
                code: "FINGERPRINT_SCREENING_NOT_READY",
                reason: automaticDecision.status,
            }
        );
    }
    if (automaticDecision?.decision === "auto_reject" || automaticDecision?.status === "auto_reject") {
        throw new AppError(
            "Bài hát đã bị tự động từ chối do phát hiện trùng bản ghi âm.",
            StatusCodes.CONFLICT,
            {
                field: "fingerprintScreening",
                code: "TRACK_AUTO_REJECTED",
                reasonCodes: automaticDecision.reasonCodes || [],
            }
        );
    }
    if (automaticDecision?.decision === "enforcement_block" || automaticDecision?.status === "enforcement_block") {
        throw new AppError(
            "Bài hát đã bị chặn bởi cơ chế thực thi bản quyền.",
            StatusCodes.CONFLICT,
            {
                field: "fingerprintScreening",
                code: "TRACK_ENFORCEMENT_BLOCKED",
                reasonCodes: automaticDecision.reasonCodes || [],
            }
        );
    }
    void runMusicBrainzVerification(track._id).catch((error) => {
        console.error("MusicBrainz submit verification failed:", error.message);
    });

    const populatedTrack = await populateManagementTrack(track._id);

    return formatTrackManagementDetail(populatedTrack);
};

export default {
    createTrack,
    updateArtistTrack,
    getArtistTracks,
    getArtistTrackDetail,
    hideArtistTrack,
    unhideArtistTrack,
    deleteArtistTrack,
    submitArtistTrack,
    uploadCopyrightEvidence,
};
