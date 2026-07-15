import Joi from "joi";
import {
    AUDIO_FORMATS,
    LYRICS_STATIC_MAX_LENGTH,
    MAX_AUDIO_FILES,
    MAX_COVER_IMAGES,
    MAX_GENRE_IDS,
    TITLE_MAX_LENGTH,
    TITLE_MIN_LENGTH,
} from "../../services/track/track.draft.validation.js";

const optionalHttpUrl = Joi.string()
    .trim()
    .max(2000)
    .allow("")
    .custom((value, helpers) => {
        if (!value) {
            return value;
        }

        try {
            const parsed = new URL(value);

            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                return helpers.error("any.invalid");
            }

            return value;
        } catch {
            return helpers.error("any.invalid");
        }
    }, "http(s) URL");

const audioFileSchema = Joi.object({
    url: optionalHttpUrl.required(),
    format: Joi.string()
        .trim()
        .lowercase()
        .valid(...AUDIO_FORMATS)
        .required(),
    bitrate: Joi.number().integer().min(64).required(),
    label: Joi.string()
        .trim()
        .lowercase()
        .valid("original", "high", "medium", "low", "lowest")
        .default("original"),
    priority: Joi.number().integer().min(0).default(0),
});

const draftCopyrightSchema = Joi.object({
    copyrightOwner: Joi.string().trim().max(500).allow(""),
    recordingOwner: Joi.string().trim().max(500).allow(""),
    composer: Joi.string().trim().max(500).allow(""),
    lyricist: Joi.string().trim().max(500).allow(""),
    producer: Joi.string().trim().max(500).allow(""),
    isOriginal: Joi.boolean(),
    isCover: Joi.boolean(),
    isRemix: Joi.boolean(),
    usesSample: Joi.boolean(),
    usesLicensedBeat: Joi.boolean(),
    originalTrackTitle: Joi.string().trim().max(500).allow(""),
    originalArtistName: Joi.string().trim().max(500).allow(""),
    licenseDocumentUrls: Joi.array()
        .items(optionalHttpUrl)
        .default([])
        .custom((value) => {
            if (!Array.isArray(value)) {
                return [];
            }

            return value
                .map((item) => String(item).trim())
                .filter((item) => item.length > 0);
        }, "filter empty license URLs"),
    declarationAccepted: Joi.boolean(),
    copyrightNote: Joi.string().trim().max(2000).allow(""),
});

const createTrackSchema = Joi.object({
    title: Joi.string()
        .trim()
        .required()
        .min(TITLE_MIN_LENGTH)
        .max(TITLE_MAX_LENGTH)
        .messages({
            "string.empty": "Title is required",
            "any.required": "Title is required",
            "string.min": "Title must be at least 1 character",
            "string.max": `Title cannot exceed ${TITLE_MAX_LENGTH} characters`,
        }),

    artist_artistId: Joi.string()
        .trim()
        .optional()
        .messages({
            "string.base": "Artist ID must be a string",
        }),

    versionTitle: Joi.string().trim().max(150).allow("").optional(),

    duration: Joi.number()
        .min(0)
        .optional()
        .messages({
            "number.base": "Duration must be a number",
            "number.min": "Duration must be >= 0",
        }),

    album_albumId: Joi.string()
        .optional()
        .allow("")
        .messages({
            "string.base": "Album ID must be a string",
        }),

    genreIds: Joi.array()
        .items(Joi.string().trim())
        .max(MAX_GENRE_IDS)
        .optional()
        .messages({
            "array.base": "Genre IDs must be an array",
            "array.max": `A track can have at most ${MAX_GENRE_IDS} genres`,
        }),

    audioFiles: Joi.array()
        .items(audioFileSchema)
        .max(MAX_AUDIO_FILES)
        .optional()
        .messages({
            "array.base": "Audio files must be an array",
            "array.max": `A track can have at most ${MAX_AUDIO_FILES} audio files`,
        }),

    avatar: optionalHttpUrl.optional(),

    coverImage: Joi.array()
        .items(optionalHttpUrl)
        .max(MAX_COVER_IMAGES)
        .optional()
        .messages({
            "array.base": "Cover image must be an array",
            "array.max": `Cover image can have at most ${MAX_COVER_IMAGES} items`,
        }),

    lyricsStatic: Joi.string()
        .optional()
        .allow("")
        .max(LYRICS_STATIC_MAX_LENGTH)
        .messages({
            "string.base": "Static lyrics must be a string",
            "string.max": `Static lyrics cannot exceed ${LYRICS_STATIC_MAX_LENGTH} characters`,
        }),

    lyricsSyncUrl: optionalHttpUrl.optional(),

    releaseDate: Joi.date()
        .optional()
        .allow(null)
        .messages({
            "date.base": "Release date must be a valid date",
        }),

    copyright: draftCopyrightSchema.optional(),

    stats: Joi.forbidden(),
    activeStatus: Joi.forbidden(),
    approvalStatus: Joi.forbidden(),
    moderation: Joi.forbidden(),
    rejectReason: Joi.forbidden(),
    blockedReason: Joi.forbidden(),
    hiddenReason: Joi.forbidden(),
    hiddenAt: Joi.forbidden(),
});

const updateTrackSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(TITLE_MIN_LENGTH)
        .max(TITLE_MAX_LENGTH)
        .messages({
            "string.empty": "Title cannot be empty",
            "string.min": "Title must be at least 1 character",
            "string.max": `Title cannot exceed ${TITLE_MAX_LENGTH} characters`,
        }),

    versionTitle: Joi.string().trim().max(150).allow("").optional(),

    copyright: draftCopyrightSchema,

    duration: Joi.number()
        .min(0)
        .messages({
            "number.base": "Duration must be a number",
            "number.min": "Duration must be >= 0",
        }),

    album_albumId: Joi.string()
        .allow("")
        .messages({
            "string.base": "Album ID must be a string",
        }),

    genreIds: Joi.array()
        .items(Joi.string().trim())
        .max(MAX_GENRE_IDS)
        .messages({
            "array.base": "Genre IDs must be an array",
            "array.max": `A track can have at most ${MAX_GENRE_IDS} genres`,
        }),

    audioFiles: Joi.array()
        .items(audioFileSchema)
        .max(MAX_AUDIO_FILES)
        .messages({
            "array.base": "Audio files must be an array",
            "array.max": `A track can have at most ${MAX_AUDIO_FILES} audio files`,
        }),

    avatar: optionalHttpUrl.allow(""),

    coverImage: Joi.array()
        .items(optionalHttpUrl)
        .max(MAX_COVER_IMAGES)
        .messages({
            "array.base": "Cover image must be an array",
            "array.max": `Cover image can have at most ${MAX_COVER_IMAGES} items`,
        }),

    lyricsStatic: Joi.string()
        .allow("")
        .max(LYRICS_STATIC_MAX_LENGTH)
        .messages({
            "string.base": "Static lyrics must be a string",
            "string.max": `Static lyrics cannot exceed ${LYRICS_STATIC_MAX_LENGTH} characters`,
        }),

    lyricsSyncUrl: optionalHttpUrl.allow(""),

    releaseDate: Joi.date()
        .allow(null)
        .messages({
            "date.base": "Release date must be a valid date",
        }),

    stats: Joi.forbidden(),
    activeStatus: Joi.forbidden(),
    approvalStatus: Joi.forbidden(),
    moderation: Joi.forbidden(),
    rejectReason: Joi.forbidden(),
    blockedReason: Joi.forbidden(),
    hiddenReason: Joi.forbidden(),
    hiddenAt: Joi.forbidden(),
})
    .min(1)
    .messages({
        "object.min": "At least one field must be provided to update the track",
    });

const addLyricsStaticSchema = Joi.object({
    lyricsStatic: Joi.string()
        .allow("")
        .required()
        .messages({
            "string.base": "Static lyrics must be a string",
            "any.required": "Static lyrics is required",
        }),
});

export default createTrackSchema;
export { updateTrackSchema, addLyricsStaticSchema };
