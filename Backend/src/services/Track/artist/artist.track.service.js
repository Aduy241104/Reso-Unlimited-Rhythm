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
    validateOptionalAlbumForDraft,
    validateOptionalAudioFiles,
    validateOptionalDuration,
    validateOptionalGenreIds,
} from "../track.draft.validation.js";
import {
    assertTrackEditableByArtist,
    validateTrackForSubmit,
} from "../track.submit.validation.js";
import Artist from "../../../models/Artist.js";
import Track from "../../../models/Track.js";
import User from "../../../models/User.js";
import Album from "../../../models/Album.js";
import { AppError } from "../../../utils/AppError.js";
import { deleteCloudinaryAssetsByUrls } from "../../../utils/uploadCloud.js";
import { formatTrackManagementDetail } from "../track.helper.js";
import { syncAlbumTotalDuration } from "../../album/album.sync.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

const normalizePositiveInteger = (value, fallback) => {
    const parsedValue = Number.parseInt(value, 10);

    if (Number.isInteger(parsedValue) && parsedValue > 0) {
        return parsedValue;
    }

    return fallback;
};

const normalizeAlbumId = (value) => {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (String(value).trim() === "") {
        return null;
    }

    return String(value).trim();
};

const normalizeAudioFiles = (audioFiles = []) =>
    (audioFiles || []).map((file) => {
        if (typeof file === "string") {
            return {
                url: file,
                format: "unknown",
                bitrate: 128,
                label: "original",
                priority: 0,
            };
        }

        return {
            url: file.url,
            format: file.format || "unknown",
            bitrate: file.bitrate || 128,
            label: file.label || "original",
            priority: file.priority !== undefined ? file.priority : 0,
        };
    });

const getTrackAssetUrls = (track) => {
    const audioUrls = (track?.audioFiles || [])
        .map((item) => item?.url)
        .filter(Boolean);

    const coverUrls = (track?.coverImage || []).filter(Boolean);

    return {
        audioUrls,
        coverUrls,
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

const reindexAlbumTrackList = async (albumId) => {
    if (!albumId) {
        return;
    }

    const album = await Album.findById(albumId);

    if (!album) {
        return;
    }

    album.trackList = (album.trackList || []).map((item, index) => ({
        trackId: item.trackId,
        order: index + 1,
    }));

    await syncAlbumTotalDuration(album);
    await album.save();
};

const removeTrackFromAlbum = async (albumId, trackId) => {
    if (!albumId) {
        return;
    }

    const album = await Album.findById(albumId);

    if (!album) {
        return;
    }

    album.trackList = (album.trackList || [])
        .filter((item) => !item.trackId?.equals(trackId))
        .map((item, index) => ({
            trackId: item.trackId,
            order: index + 1,
        }));

    await syncAlbumTotalDuration(album);
    await album.save();
};

const appendTrackToAlbum = async (albumId, trackId) => {
    if (!albumId) {
        return;
    }

    const album = await Album.findById(albumId);

    if (!album) {
        throw new AppError("Album not found.", StatusCodes.NOT_FOUND);
    }

    const nextOrder = (Array.isArray(album.trackList) ? album.trackList.length : 0) + 1;

    album.trackList = [
        ...(album.trackList || []),
        {
            trackId,
            order: nextOrder,
        },
    ];

    await syncAlbumTotalDuration(album);
    await album.save();
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

    const rawAlbumId = trackData.album_albumId;
    const resolvedAlbumId =
        rawAlbumId && String(rawAlbumId).trim() !== ""
            ? String(rawAlbumId).trim()
            : null;

    const processedAudioFiles = validateOptionalAudioFiles(trackData.audioFiles);
    const duration = validateOptionalDuration(trackData.duration, processedAudioFiles.length > 0);
    const genreIds = await validateOptionalGenreIds(trackData.genreIds);

    if (resolvedAlbumId) {
        await validateOptionalAlbumForDraft(resolvedAlbumId, artistId);
    }

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
        artist_artistId: artistId,
        album_albumId: resolvedAlbumId,
        genreIds,
        audioFiles: processedAudioFiles,
        duration,
        avatar: trackData.avatar || "",
        coverImage,
        lyricsStatic,
        lyricsSyncUrl: trackData.lyricsSyncUrl || "",
        releaseDate: trackData.releaseDate || null,
        activeStatus: "draft",
        approvalStatus: "draft",
        stats: {
            totalLike: 0,
            totalPlay: 0,
        },
        ...(sanitizedCopyright !== undefined ? { copyright: sanitizedCopyright } : {}),
    });

    const savedTrack = await newTrack.save();

    if (resolvedAlbumId) {
        await appendTrackToAlbum(resolvedAlbumId, savedTrack._id);
    }

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

    const nextAlbumId = normalizeAlbumId(trackData.album_albumId);
    const currentAlbumId = track.album_albumId ? track.album_albumId.toString() : null;
    const nextGenreIds = Array.isArray(trackData.genreIds)
        ? trackData.genreIds.filter(Boolean)
        : undefined;


    if (trackData.title !== undefined) {
        track.title = validateDraftTitle(trackData.title);
    }

    if (trackData.versionTitle !== undefined) {
        track.versionTitle =
            typeof trackData.versionTitle === "string"
                ? trackData.versionTitle.trim()
                : "";
    }

    if (trackData.duration !== undefined) {
        const hasAudio =
            trackData.audioFiles !== undefined
                ? Array.isArray(trackData.audioFiles) && trackData.audioFiles.length > 0
                : Array.isArray(track.audioFiles) && track.audioFiles.length > 0;

        track.duration = validateOptionalDuration(trackData.duration, hasAudio);
    }

    if (trackData.avatar !== undefined) {
        track.avatar = trackData.avatar || "";
        nextAssets.avatarUrl = track.avatar;
    }

    if (trackData.coverImage !== undefined) {
        track.coverImage = Array.isArray(trackData.coverImage) ? trackData.coverImage : [];
        nextAssets.coverUrls = track.coverImage;
    }

    if (trackData.audioFiles !== undefined) {
        const processedAudioFiles = validateOptionalAudioFiles(trackData.audioFiles);
        track.audioFiles = processedAudioFiles;
        nextAssets.audioUrls = processedAudioFiles.map((item) => item.url).filter(Boolean);
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

    if (trackData.releaseDate !== undefined) {
        track.releaseDate = trackData.releaseDate || null;
    }

    if (nextGenreIds !== undefined) {
        track.genreIds = await validateOptionalGenreIds(nextGenreIds);
    }

    if (nextAlbumId !== undefined) {
        if (nextAlbumId !== currentAlbumId) {
            if (nextAlbumId) {
                await validateOptionalAlbumForDraft(nextAlbumId, artist._id);
            }

            await removeTrackFromAlbum(currentAlbumId, track._id);

            if (nextAlbumId) {
                await appendTrackToAlbum(nextAlbumId, track._id);
            }

            track.album_albumId = nextAlbumId || null;
        }
    }

    if (trackData.copyright !== undefined) {
        const sanitizedCopyright = sanitizeArtistCopyright(trackData.copyright);

        if (sanitizedCopyright) {
            track.copyright = {
                ...(track.copyright?.toObject?.() || track.copyright || {}),
                ...sanitizedCopyright,
            };
        }
    }

    if (trackData.coverImage !== undefined) {
        const coverCount = Array.isArray(track.coverImage)
            ? track.coverImage.filter(Boolean).length
            : 0;

        if (coverCount > MAX_COVER_IMAGES) {
            throw new AppError(
                `A track can have at most ${MAX_COVER_IMAGES} cover images.`,
                StatusCodes.BAD_REQUEST,
                { field: "coverImage" }
            );
        }
    }

    await track.save();

    const replacedAssetUrls = collectReplacedAssetUrls({
        oldAssets,
        nextAssets,
    });

    if (replacedAssetUrls.length > 0) {
        await deleteCloudinaryAssetsByUrls(replacedAssetUrls);
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

    // Filter by activeStatus if provided and valid
    if (typeof query.activeStatus === "string" && query.activeStatus.trim() !== "") {
        const allowed = new Set(["draft", "active", "hidden", "blocked"]);
        const val = query.activeStatus.trim();
        if (allowed.has(val)) {
            filter.activeStatus = val;
        }
    }

    // Filter by approvalStatus if provided and valid
    if (typeof query.approvalStatus === "string" && query.approvalStatus.trim() !== "") {
        const allowedApproval = new Set(["draft", "pending", "approved", "rejected"]);
        const val = query.approvalStatus.trim();
        if (allowedApproval.has(val)) {
            filter.approvalStatus = val;
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

    const albumId = track.album_albumId;
    if (albumId) {
        const album = await Album.findById(albumId);

        if (album) {
            album.trackList = (album.trackList || [])
                .filter((item) => !item.trackId?.equals(track._id))
                .map((item, index) => ({
                    trackId: item.trackId,
                    order: index + 1,
                }));

            await album.save();
        }
    }

    await Track.deleteOne({ _id: track._id, artist_artistId: artist._id });

    if (assetUrlsToDelete.length > 0) {
        await deleteCloudinaryAssetsByUrls(assetUrlsToDelete);
    }

    return {
        deletedId: trackId,
    };
};

// export default moved to end to include submitArtistTrack

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
