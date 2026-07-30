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
    validateTrackForSubmit,
} from "../track.submit.validation.js";
import Artist from "../../../models/Artist.js";
import ReleaseSchedule from "../../../models/ReleaseSchedule.js";
import Track from "../../../models/Track.js";
import User from "../../../models/User.js";
import { AppError } from "../../../utils/AppError.js";
import { deleteCloudinaryAssetsByUrls } from "../../../utils/uploadCloud.js";
import { formatTrackManagementDetail } from "../track.helper.js";
import {
    TRACK_RELEASE_STATUS,
    resolveTrackReleaseStatus,
} from "../../../utils/trackRelease.js";

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
            "Cancel the release schedule before changing track visibility.",
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

const getTrackAssetUrls = (track) => ({
    audioUrls: getAudioUrlsFromFiles(track?.audioFiles || []),
    coverUrls: (track?.coverImage || []).filter(Boolean),
    avatarUrl: track?.avatar || "",
    lyricsSyncUrl: track?.lyricsSyncUrl || "",
});

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

    if (nextAssets.avatarUrl !== undefined && oldAssets.avatarUrl && oldAssets.avatarUrl !== nextAssets.avatarUrl) {
        replacedUrls.push(oldAssets.avatarUrl);
    }

    if (
        nextAssets.lyricsSyncUrl !== undefined &&
        oldAssets.lyricsSyncUrl &&
        oldAssets.lyricsSyncUrl !== nextAssets.lyricsSyncUrl
    ) {
        replacedUrls.push(oldAssets.lyricsSyncUrl);
    }

    return [...new Set(replacedUrls)];
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
    };
};

const createTrack = async (userId, trackData) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("User not found.", StatusCodes.NOT_FOUND);
    }

    if (user.role !== "artist") {
        throw new AppError(
            "Only artists can create tracks.",
            StatusCodes.FORBIDDEN
        );
    }

    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError(
            "Artist profile not found. Please complete your artist profile first.",
            StatusCodes.NOT_FOUND
        );
    }

    assertPayloadHasNoForbiddenFields(trackData);
    assertArtistCanCreateTrack(artist);

    const title = validateDraftTitle(trackData.title);
    const artistId = resolveArtistIdForCreate(trackData, artist);
    const audioFiles = validateOptionalAudioFiles(trackData.audioFiles);
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
            `A track can have at most ${MAX_COVER_IMAGES} cover images.`,
            StatusCodes.BAD_REQUEST,
            { field: "coverImage" }
        );
    }

    const lyricsStatic =
        typeof trackData.lyricsStatic === "string" ? trackData.lyricsStatic : "";

    if (lyricsStatic.length > LYRICS_STATIC_MAX_LENGTH) {
        throw new AppError(
            `Static lyrics cannot exceed ${LYRICS_STATIC_MAX_LENGTH} characters.`,
            StatusCodes.BAD_REQUEST,
            { field: "lyricsStatic" }
        );
    }

    const sanitizedCopyright = sanitizeArtistCopyright(trackData.copyright);

    const newTrack = new Track({
        title,
        versionTitle:
            typeof trackData.versionTitle === "string"
                ? trackData.versionTitle.trim()
                : "",
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
        ...(sanitizedCopyright !== undefined ? { copyright: sanitizedCopyright } : {}),
    });

    const savedTrack = await newTrack.save();
    const populatedTrack = await populateManagementTrack(savedTrack._id);

    return formatTrackManagementDetail(populatedTrack);
};

const updateArtistTrack = async (userId, trackId, trackData) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("User not found.", StatusCodes.NOT_FOUND);
    }

    if (user.role !== "artist") {
        throw new AppError(
            "Only artists can update tracks.",
            StatusCodes.FORBIDDEN
        );
    }

    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError("Artist profile not found.", StatusCodes.NOT_FOUND);
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", StatusCodes.BAD_REQUEST, {
            field: "id",
        });
    }

    const track = await Track.findOne({
        _id: trackId,
        artist_artistId: artist._id,
    });

    if (!track) {
        throw new AppError(
            "Track not found or you do not have permission to update it.",
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
                `A track can have at most ${MAX_COVER_IMAGES} cover images.`,
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
                `Static lyrics cannot exceed ${LYRICS_STATIC_MAX_LENGTH} characters.`,
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

    if (trackData.copyright !== undefined) {
        const sanitizedCopyright = sanitizeArtistCopyright(trackData.copyright);

        if (sanitizedCopyright !== undefined) {
            nextTrackData.copyright = {
                ...(nextTrackData.copyright || {}),
                ...sanitizedCopyright,
            };
        }
    }

    let urlsToDelete = [];

    if (isApprovedTrack) {
        const changedFields = getChangedTrackFields(liveSnapshot, nextTrackData);
        const liveAssets = getTrackAssetUrls(track);
        const previousPendingAssets = getTrackAssetUrls(track.pendingUpdate?.data || {});

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

        if (track.approvalStatus === "approved") {
            clearTrackModerationForResubmission(track);
        }

        urlsToDelete = collectReplacedAssetUrls({
            oldAssets,
            nextAssets,
        });
    }

    await track.save();

    if (urlsToDelete.length > 0) {
        await deleteCloudinaryAssetsByUrls(urlsToDelete);
    }

    const populatedTrack = await populateManagementTrack(track._id);

    return formatTrackManagementDetail(populatedTrack);
};

const getArtistTracks = async (userId, query = {}) => {
    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError("Artist profile not found.", StatusCodes.NOT_FOUND);
    }

    const page = normalizePositiveInteger(query.page, DEFAULT_PAGE);
    const requestedLimit = normalizePositiveInteger(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, 100);
    const skip = (page - 1) * limit;

    const filter = {
        artist_artistId: artist._id,
    };

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
        throw new AppError("Artist profile not found.", StatusCodes.NOT_FOUND);
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", StatusCodes.BAD_REQUEST, {
            field: "id",
        });
    }

    const track = await Track.findOne({
        _id: trackId,
        artist_artistId: artist._id,
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
            "Track not found or you do not have permission to view it.",
            StatusCodes.NOT_FOUND
        );
    }

    return formatTrackManagementDetail(track);
};

const hideArtistTrack = async (userId, trackId) => {
    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError("Artist profile not found.", StatusCodes.NOT_FOUND);
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", StatusCodes.BAD_REQUEST, {
            field: "id",
        });
    }

    const track = await Track.findOne({
        _id: trackId,
        artist_artistId: artist._id,
    });

    if (!track) {
        throw new AppError(
            "Track not found or you do not have permission to update it.",
            StatusCodes.NOT_FOUND
        );
    }

    await assertTrackVisibilityCanBeChangedByArtist(track);

    if (track.activeStatus === "blocked") {
        throw new AppError(
            "This track cannot be hidden in its current state.",
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

    if (!artist) {
        throw new AppError("Artist profile not found.", StatusCodes.NOT_FOUND);
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", StatusCodes.BAD_REQUEST, {
            field: "id",
        });
    }

    const track = await Track.findOne({
        _id: trackId,
        artist_artistId: artist._id,
    });

    if (!track) {
        throw new AppError(
            "Track not found or you do not have permission to update it.",
            StatusCodes.NOT_FOUND
        );
    }

    await assertTrackVisibilityCanBeChangedByArtist(track);

    if (track.approvalStatus !== "approved" || track.activeStatus === "blocked") {
        if (track.activeStatus === "blocked") {
            throw new AppError(
                "This track cannot be made active in its current state.",
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

    if (!artist) {
        throw new AppError("Artist profile not found.", StatusCodes.NOT_FOUND);
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", StatusCodes.BAD_REQUEST, {
            field: "id",
        });
    }

    const track = await Track.findOne({
        _id: trackId,
        artist_artistId: artist._id,
    });

    if (!track) {
        throw new AppError(
            "Track not found or you do not have permission to delete it.",
            StatusCodes.NOT_FOUND
        );
    }

    const assetUrlsToDelete = collectReplacedAssetUrls({
        oldAssets: getTrackAssetUrls(track),
        nextAssets: {
            audioUrls: [],
            coverUrls: [],
            avatarUrl: "",
            lyricsSyncUrl: "",
        },
    });

    await Track.deleteOne({ _id: track._id, artist_artistId: artist._id });

    if (assetUrlsToDelete.length > 0) {
        await deleteCloudinaryAssetsByUrls(assetUrlsToDelete);
    }

    return {
        deletedId: trackId,
    };
};

const submitArtistTrack = async (userId, trackId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new AppError("User not found.", StatusCodes.NOT_FOUND);
    }

    if (user.role !== "artist") {
        throw new AppError("Only artists can submit tracks.", StatusCodes.FORBIDDEN);
    }

    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError("Artist profile not found.", StatusCodes.NOT_FOUND);
    }

    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        throw new AppError("Track id is invalid.", StatusCodes.BAD_REQUEST, { field: "id" });
    }

    const track = await Track.findOne({ _id: trackId, artist_artistId: artist._id });

    if (!track) {
        throw new AppError("Track not found or you do not have permission.", StatusCodes.NOT_FOUND);
    }

    await validateTrackForSubmit(track, artist);

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
    };

    await track.save();

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
};
