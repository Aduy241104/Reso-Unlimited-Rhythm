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
import Track from "../../../models/Track.js";
import User from "../../../models/User.js";
import { AppError } from "../../../utils/AppError.js";
import { deleteCloudinaryAssetsByUrls } from "../../../utils/uploadCloud.js";
import { formatTrackManagementDetail } from "../track.helper.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

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

    const oldAssets = getTrackAssetUrls(track);
    const nextAssets = {
        audioUrls: undefined,
        coverUrls: undefined,
        avatarUrl: undefined,
        lyricsSyncUrl: undefined,
    };
    const isApprovedTrack = track.approvalStatus === "approved";
    let shouldResubmitForApproval = false;

    if (trackData.title !== undefined) {
        const nextTitle = validateDraftTitle(trackData.title);

        if (track.title !== nextTitle && isApprovedTrack) {
            shouldResubmitForApproval = true;
        }

        track.title = nextTitle;
    }

    if (trackData.versionTitle !== undefined) {
        const nextVersionTitle =
            typeof trackData.versionTitle === "string"
                ? trackData.versionTitle.trim()
                : "";

        if ((track.versionTitle || "") !== nextVersionTitle && isApprovedTrack) {
            shouldResubmitForApproval = true;
        }

        track.versionTitle = nextVersionTitle;
    }

    if (trackData.description !== undefined) {
        track.description = validateOptionalDescription(trackData.description);
    }

    if (trackData.tags !== undefined) {
        track.tags = validateOptionalTags(trackData.tags);
    }

    if (trackData.genreIds !== undefined) {
        const nextGenreIds = await validateOptionalGenreIds(trackData.genreIds);
        track.genreIds = nextGenreIds;
    }

    if (trackData.avatar !== undefined) {
        track.avatar = trackData.avatar || "";
        nextAssets.avatarUrl = track.avatar;
    }

    if (trackData.coverImage !== undefined) {
        track.coverImage = Array.isArray(trackData.coverImage) ? trackData.coverImage.filter(Boolean) : [];

        if (track.coverImage.length > MAX_COVER_IMAGES) {
            throw new AppError(
                `A track can have at most ${MAX_COVER_IMAGES} cover images.`,
                StatusCodes.BAD_REQUEST,
                { field: "coverImage" }
            );
        }

        nextAssets.coverUrls = track.coverImage;
    }

    if (trackData.audioFiles !== undefined) {
        const nextAudioFiles = validateOptionalAudioFiles(trackData.audioFiles);
        const nextDuration = validateDurationFromAudioAnalysis(
            trackData.audioAnalysis,
            nextAudioFiles.length > 0
        );
        const currentAudioSnapshot = stringifyComparableAudioFiles(track.audioFiles || []);
        const nextAudioSnapshot = stringifyComparableAudioFiles(nextAudioFiles);
        const currentDuration = Number(track.duration) || 0;

        if (
            isApprovedTrack &&
            (
                currentAudioSnapshot !== nextAudioSnapshot ||
                currentDuration !== nextDuration
            )
        ) {
            shouldResubmitForApproval = true;
        }

        track.audioFiles = nextAudioFiles;
        track.duration = nextDuration;
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

        track.lyricsStatic = nextLyrics;
    }

    if (trackData.lyricsSyncUrl !== undefined) {
        track.lyricsSyncUrl = trackData.lyricsSyncUrl || "";
        nextAssets.lyricsSyncUrl = track.lyricsSyncUrl;
    }

    if (trackData.copyright !== undefined) {
        const sanitizedCopyright = sanitizeArtistCopyright(trackData.copyright);

        if (sanitizedCopyright !== undefined) {
            const nextCopyright = {
                ...(track.copyright?.toObject?.() || track.copyright || {}),
                ...sanitizedCopyright,
            };
            const currentCopyrightSnapshot = stringifyComparableCopyright(
                track.copyright?.toObject?.() || track.copyright || null
            );
            const nextCopyrightSnapshot = stringifyComparableCopyright(nextCopyright);

            if (isApprovedTrack && currentCopyrightSnapshot !== nextCopyrightSnapshot) {
                shouldResubmitForApproval = true;
            }

            track.copyright = nextCopyright;
        }
    }

    if (isApprovedTrack && shouldResubmitForApproval) {
        clearTrackModerationForResubmission(track);
    }

    await track.save();

    const urlsToDelete = collectReplacedAssetUrls({
        oldAssets,
        nextAssets,
    });

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

const hideArtistTrack = async (userId, trackId, reason = "") => {
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

    track.activeStatus = "hidden";
    track.hiddenReason = String(reason || "Hidden by artist.").trim() || "Hidden by artist.";
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
    deleteArtistTrack,
    submitArtistTrack,
};
