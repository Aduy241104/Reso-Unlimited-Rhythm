import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
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

    if (artist.activeStatus === "blocked") {
        throw new AppError(
            "Your artist account has been blocked. Cannot create tracks.",
            StatusCodes.FORBIDDEN
        );
    }

    const rawAlbumId = trackData.album_albumId;
    const resolvedAlbumId =
        rawAlbumId && String(rawAlbumId).trim() !== ""
            ? String(rawAlbumId).trim()
            : null;

    if (resolvedAlbumId && !mongoose.Types.ObjectId.isValid(resolvedAlbumId)) {
        throw new AppError("Album id is invalid.", StatusCodes.BAD_REQUEST, {
            field: "album_albumId",
        });
    }

    const processedAudioFiles = normalizeAudioFiles(trackData.audioFiles || []);

    processedAudioFiles.sort((a, b) => b.priority - a.priority);

    const newTrack = new Track({
        title: trackData.title,
        artist_artistId: artist._id,
        album_albumId: resolvedAlbumId,
        genreIds: trackData.genreIds || [],
        audioFiles: processedAudioFiles,
        duration: trackData.duration,
        avatar: trackData.avatar || "",
        coverImage: trackData.coverImage || [],
        lyricsStatic: trackData.lyricsStatic || "",
        lyricsSyncUrl: trackData.lyricsSyncUrl || "",
        releaseDate: trackData.releaseDate || null,
        activeStatus: trackData.activeStatus || "active",
        approvalStatus: "draft",
        stats: {
            totalLike: 0,
            totalPlay: 0,
        },
    });

    const savedTrack = await newTrack.save();

    if (resolvedAlbumId) {
        const album = await Album.findById(resolvedAlbumId);

        if (!album) {
            throw new AppError("Album not found.", StatusCodes.NOT_FOUND);
        }

        if (!album.artistId.equals(artist._id)) {
            throw new AppError(
                "This album does not belong to your artist profile.",
                StatusCodes.FORBIDDEN
            );
        }

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
        track.title = trackData.title;
    }

    if (trackData.duration !== undefined) {
        track.duration = trackData.duration;
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
        const processedAudioFiles = normalizeAudioFiles(trackData.audioFiles);
        processedAudioFiles.sort((a, b) => b.priority - a.priority);
        track.audioFiles = processedAudioFiles;
        nextAssets.audioUrls = processedAudioFiles.map((item) => item.url).filter(Boolean);
    }

    if (trackData.lyricsStatic !== undefined) {
        track.lyricsStatic = trackData.lyricsStatic || "";
    }

    if (trackData.lyricsSyncUrl !== undefined) {
        track.lyricsSyncUrl = trackData.lyricsSyncUrl || "";
        nextAssets.lyricsSyncUrl = track.lyricsSyncUrl;
    }

    if (trackData.releaseDate !== undefined) {
        track.releaseDate = trackData.releaseDate || null;
    }

    if (nextGenreIds !== undefined) {
        track.genreIds = nextGenreIds;
    }

    if (nextAlbumId !== undefined) {
        if (nextAlbumId !== currentAlbumId) {
            if (nextAlbumId) {
                const targetAlbum = await Album.findById(nextAlbumId);

                if (!targetAlbum) {
                    throw new AppError("Album not found.", StatusCodes.NOT_FOUND);
                }

                if (!targetAlbum.artistId.equals(artist._id)) {
                    throw new AppError(
                        "This album does not belong to your artist profile.",
                        StatusCodes.FORBIDDEN
                    );
                }
            }

            await removeTrackFromAlbum(currentAlbumId, track._id);

            if (nextAlbumId) {
                await appendTrackToAlbum(nextAlbumId, track._id);
            }

            track.album_albumId = nextAlbumId || null;
        }
    }

    if (track.approvalStatus === "approved" || track.approvalStatus === "rejected") {
        track.approvalStatus = "pending";
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

    // Only allow submitting if not already pending/approved
    if (track.approvalStatus === "pending" || track.approvalStatus === "approved") {
        throw new AppError("Track is already submitted or approved.", StatusCodes.BAD_REQUEST);
    }

    // Basic validation: require at least one audio file and a title
    if (!track.title || !Array.isArray(track.audioFiles) || track.audioFiles.length === 0) {
        throw new AppError("Track must have a title and at least one audio file before submitting.", StatusCodes.BAD_REQUEST);
    }

    track.approvalStatus = "pending";
    await track.save();

    const populatedTrack = await Track.findById(track._id)
        .populate({ path: "artist_artistId", select: "name avatar coverImage" })
        .populate({ path: "album_albumId", select: "title avatar" })
        .populate({ path: "genreIds", select: "name" })
        .lean();

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
