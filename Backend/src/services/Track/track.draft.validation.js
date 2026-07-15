import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Album from "../../models/Album.js";
import Genre from "../../models/Genre.js";
import { AppError } from "../../utils/AppError.js";

export const TITLE_MIN_LENGTH = 1;
export const TITLE_MAX_LENGTH = 150;
export const LYRICS_STATIC_MAX_LENGTH = 20000;
export const MAX_GENRE_IDS = 5;
export const MAX_COVER_IMAGES = 3;
export const MAX_AUDIO_FILES = 5;
export const MIN_AUDIO_BITRATE = 64;

export const AUDIO_FORMATS = new Set(["mp3", "wav", "flac", "aac", "m4a"]);
export const AUDIO_LABELS = new Set(["original", "high", "medium", "low", "lowest"]);

export const FORBIDDEN_ARTIST_TRACK_FIELDS = [
    "stats",
    "activeStatus",
    "approvalStatus",
    "moderation",
    "rejectReason",
    "blockedReason",
    "hiddenReason",
    "hiddenAt",
];

const isHttpUrl = (value) => {
    if (!value || typeof value !== "string") {
        return false;
    }

    try {
        const parsed = new URL(value.trim());
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
};

export const assertPayloadHasNoForbiddenFields = (payload = {}) => {
    for (const key of FORBIDDEN_ARTIST_TRACK_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(payload, key)) {
            throw new AppError(
                `Field "${key}" cannot be set by artists.`,
                StatusCodes.BAD_REQUEST,
                { field: key }
            );
        }
    }

    if (
        payload.copyright &&
        Object.prototype.hasOwnProperty.call(payload.copyright, "copyrightStatus")
    ) {
        throw new AppError(
            'Field "copyright.copyrightStatus" cannot be set by artists.',
            StatusCodes.BAD_REQUEST,
            { field: "copyright.copyrightStatus" }
        );
    }
};

export const validateDraftTitle = (title) => {
    const normalizedTitle = typeof title === "string" ? title.trim() : "";

    if (!normalizedTitle) {
        throw new AppError("Title is required.", StatusCodes.BAD_REQUEST, {
            field: "title",
        });
    }

    if (normalizedTitle.length > TITLE_MAX_LENGTH) {
        throw new AppError(
            `Title cannot exceed ${TITLE_MAX_LENGTH} characters.`,
            StatusCodes.BAD_REQUEST,
            { field: "title" }
        );
    }

    return normalizedTitle;
};

export const resolveArtistIdForCreate = (trackData, artist) => {
    const rawArtistId = trackData?.artist_artistId;

    if (rawArtistId === undefined || rawArtistId === null || String(rawArtistId).trim() === "") {
        return artist._id;
    }

    const artistId = String(rawArtistId).trim();

    if (!mongoose.Types.ObjectId.isValid(artistId)) {
        throw new AppError("Artist id is invalid.", StatusCodes.BAD_REQUEST, {
            field: "artist_artistId",
        });
    }

    if (!artist._id.equals(artistId)) {
        throw new AppError(
            "You can only create tracks for your own artist profile.",
            StatusCodes.FORBIDDEN,
            { field: "artist_artistId" }
        );
    }

    return artist._id;
};

export const assertArtistCanCreateTrack = (artist) => {
    if (artist.activeStatus === "blocked") {
        throw new AppError(
            "Your artist account has been blocked. Cannot create tracks.",
            StatusCodes.FORBIDDEN
        );
    }

    if (artist.activeStatus === "inactive") {
        throw new AppError(
            "Your artist account is inactive. Cannot create tracks.",
            StatusCodes.FORBIDDEN
        );
    }
};

const validateSingleAudioFile = (file, index) => {
    const fieldPrefix = `audioFiles[${index}]`;

    if (!file?.url || !isHttpUrl(file.url)) {
        throw new AppError("Audio file URL must be a valid http(s) URL.", StatusCodes.BAD_REQUEST, {
            field: `${fieldPrefix}.url`,
        });
    }

    const format = String(file.format || "").trim().toLowerCase();

    if (!AUDIO_FORMATS.has(format)) {
        throw new AppError(
            `Audio format must be one of: ${[...AUDIO_FORMATS].join(", ")}.`,
            StatusCodes.BAD_REQUEST,
            { field: `${fieldPrefix}.format` }
        );
    }

    const bitrate = Number(file.bitrate);

    if (!Number.isFinite(bitrate) || bitrate < MIN_AUDIO_BITRATE) {
        throw new AppError(
            `Audio bitrate must be at least ${MIN_AUDIO_BITRATE}.`,
            StatusCodes.BAD_REQUEST,
            { field: `${fieldPrefix}.bitrate` }
        );
    }

    const label = String(file.label || "original").trim().toLowerCase();

    if (!AUDIO_LABELS.has(label)) {
        throw new AppError(
            `Audio label must be one of: ${[...AUDIO_LABELS].join(", ")}.`,
            StatusCodes.BAD_REQUEST,
            { field: `${fieldPrefix}.label` }
        );
    }

    const priority = file.priority !== undefined ? Number(file.priority) : 0;

    if (!Number.isFinite(priority) || priority < 0) {
        throw new AppError("Audio priority must be a number >= 0.", StatusCodes.BAD_REQUEST, {
            field: `${fieldPrefix}.priority`,
        });
    }

    return {
        url: file.url.trim(),
        format,
        bitrate,
        label,
        priority,
    };
};

export const validateOptionalAudioFiles = (audioFiles) => {
    if (audioFiles === undefined || audioFiles === null) {
        return [];
    }

    if (!Array.isArray(audioFiles)) {
        throw new AppError("Audio files must be an array.", StatusCodes.BAD_REQUEST, {
            field: "audioFiles",
        });
    }

    if (audioFiles.length === 0) {
        return [];
    }

    if (audioFiles.length > MAX_AUDIO_FILES) {
        throw new AppError(
            `A track can have at most ${MAX_AUDIO_FILES} audio files.`,
            StatusCodes.BAD_REQUEST,
            { field: "audioFiles" }
        );
    }

    const normalizedFiles = audioFiles.map((file, index) => {
        if (typeof file === "string") {
            return validateSingleAudioFile(
                {
                    url: file,
                    format: "mp3",
                    bitrate: 128,
                    label: "original",
                    priority: 0,
                },
                index
            );
        }

        return validateSingleAudioFile(file, index);
    });

    const labels = normalizedFiles.map((file) => file.label);

    if (new Set(labels).size !== labels.length) {
        throw new AppError("Audio file labels must be unique.", StatusCodes.BAD_REQUEST, {
            field: "audioFiles",
        });
    }

    return normalizedFiles.sort((a, b) => b.priority - a.priority);
};

export const validateOptionalDuration = (duration, hasAudioFiles) => {
    if (duration === undefined || duration === null || duration === "") {
        return hasAudioFiles ? 0 : 0;
    }

    const parsedDuration = Number(duration);

    if (!Number.isFinite(parsedDuration) || parsedDuration < 0) {
        throw new AppError("Duration must be a number >= 0.", StatusCodes.BAD_REQUEST, {
            field: "duration",
        });
    }

    if (hasAudioFiles && parsedDuration <= 0) {
        throw new AppError("Duration must be greater than 0 when audio files are provided.", StatusCodes.BAD_REQUEST, {
            field: "duration",
        });
    }

    return parsedDuration;
};

export const validateOptionalGenreIds = async (genreIds) => {
    if (genreIds === undefined || genreIds === null) {
        return [];
    }

    if (!Array.isArray(genreIds)) {
        throw new AppError("Genre IDs must be an array.", StatusCodes.BAD_REQUEST, {
            field: "genreIds",
        });
    }

    if (genreIds.length === 0) {
        return [];
    }

    if (genreIds.length > MAX_GENRE_IDS) {
        throw new AppError(
            `A track can have at most ${MAX_GENRE_IDS} genres.`,
            StatusCodes.BAD_REQUEST,
            { field: "genreIds" }
        );
    }

    const normalizedIds = genreIds.map((id) => String(id).trim()).filter(Boolean);

    if (normalizedIds.length !== genreIds.length) {
        throw new AppError("Genre IDs cannot be empty.", StatusCodes.BAD_REQUEST, {
            field: "genreIds",
        });
    }

    const uniqueIds = [...new Set(normalizedIds)];

    if (uniqueIds.length !== normalizedIds.length) {
        throw new AppError("Duplicate genre IDs are not allowed.", StatusCodes.BAD_REQUEST, {
            field: "genreIds",
        });
    }

    const invalidIds = uniqueIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));

    if (invalidIds.length > 0) {
        throw new AppError("One or more genre IDs are invalid.", StatusCodes.BAD_REQUEST, {
            field: "genreIds",
        });
    }

    const objectIds = uniqueIds.map((id) => new mongoose.Types.ObjectId(id));
    const existingCount = await Genre.countDocuments({
        _id: { $in: objectIds },
        isActive: true,
    });

    if (existingCount !== uniqueIds.length) {
        throw new AppError("One or more genres do not exist or are inactive.", StatusCodes.BAD_REQUEST, {
            field: "genreIds",
        });
    }

    return objectIds;
};

export const validateOptionalAlbumForDraft = async (albumId, artistId) => {
    if (!albumId) {
        return null;
    }

    if (!mongoose.Types.ObjectId.isValid(albumId)) {
        throw new AppError("Album id is invalid.", StatusCodes.BAD_REQUEST, {
            field: "album_albumId",
        });
    }

    const album = await Album.findById(albumId);

    if (!album) {
        throw new AppError("Album not found.", StatusCodes.NOT_FOUND, {
            field: "album_albumId",
        });
    }

    if (!album.artistId.equals(artistId)) {
        throw new AppError(
            "You cannot add a track to another artist's album.",
            StatusCodes.FORBIDDEN,
            { field: "album_albumId" }
        );
    }

    if (album.status === "blocked" || album.status === "hidden") {
        throw new AppError(
            "Cannot add a track to a hidden or blocked album.",
            StatusCodes.BAD_REQUEST,
            { field: "album_albumId" }
        );
    }

    if (album.releaseDate && album.releaseDate <= new Date()) {
        throw new AppError(
            "Cannot add a track to an album that has already been released.",
            StatusCodes.BAD_REQUEST,
            { field: "album_albumId" }
        );
    }

    return album;
};

export const sanitizeArtistCopyright = (copyright = {}) => {
    if (!copyright || typeof copyright !== "object") {
        return undefined;
    }

    const {
        copyrightStatus,
        _id,
        ...allowed
    } = copyright;

    if (Array.isArray(allowed.licenseDocumentUrls)) {
        allowed.licenseDocumentUrls = allowed.licenseDocumentUrls
            .map((url) => String(url).trim())
            .filter((url) => isHttpUrl(url));
    }

    return allowed;
};
