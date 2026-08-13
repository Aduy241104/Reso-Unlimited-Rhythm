import Joi from "joi";
import {
    AUDIO_FORMATS,
    DESCRIPTION_MAX_LENGTH,
    LYRICS_STATIC_MAX_LENGTH,
    MAX_AUDIO_FILES,
    MAX_COVER_IMAGES,
    MAX_GENRE_IDS,
    MAX_TAG_LENGTH,
    MAX_TAGS,
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
    primaryCopyrightType: Joi.string().valid("original", "cover", "remix", "sample", "licensed_beat"),
    usesThirdPartyBeat: Joi.boolean(),
    rightsConfirmed: Joi.boolean(),
    originalTrackTitle: Joi.string().trim().max(500).allow(""),
    originalArtistName: Joi.string().trim().max(500).allow(""),
    originalComposer: Joi.string().trim().max(500).allow(""),
    originalISRC: Joi.string().trim().max(32).allow(""),
    originalISWC: Joi.string().trim().max(32).allow(""),
    sampleSourceTitle: Joi.string().trim().max(500).allow(""),
    sampleSourceArtist: Joi.string().trim().max(500).allow(""),
    sampleSourceISRC: Joi.string().trim().max(32).allow(""),
    sampleStartTime: Joi.number().min(0).allow(null),
    sampleEndTime: Joi.number().min(0).allow(null),
    beatTitle: Joi.string().trim().max(500).allow(""),
    beatProducer: Joi.string().trim().max(500).allow(""),
    beatSourceUrl: optionalHttpUrl,
    licenseType: Joi.string().valid("", "exclusive", "non_exclusive", "custom", "other"),
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
    copyrightEvidenceDocuments: Joi.array()
        .max(5)
        .items(
            Joi.object({
                documentId: Joi.string().trim().max(128).required(),
                type: Joi.string().valid("license", "contract", "copyright_certificate", "sample_clearance", "beat_license", "remix_permission", "other").default("other"),
                version: Joi.number().integer().min(1).default(1),
                originalName: Joi.string().trim().max(255).required(),
                fileName: Joi.string().trim().max(255).allow(""),
                evidenceType: Joi.string().trim().max(80).allow(""),
                mimeType: Joi.string().trim().max(120).required(),
                size: Joi.number().integer().positive().max(25 * 1024 * 1024).required(),
                storageUrl: optionalHttpUrl.required(),
                url: optionalHttpUrl,
                publicId: Joi.string().trim().max(500).allow(""),
                sha256: Joi.string().trim().hex().length(64).required(),
                hash: Joi.string().trim().hex().length(64),
                uploadedAt: Joi.date().iso().optional(),
                uploadStatus: Joi.string().valid("uploaded", "replaced", "deleted", "failed").default("uploaded"),
                // Server-managed review/audit fields are accepted only so a
                // stale client payload can be stripped before business logic.
                reviewedAt: Joi.any().strip(),
                reviewedBy: Joi.any().strip(),
                reviewedSessionId: Joi.any().strip(),
                adminNote: Joi.any().strip(),
                reviewDecision: Joi.any().strip(),
                verificationResult: Joi.any().strip(),
                reviewStatus: Joi.any().strip(),
            }).unknown(false)
        )
        .default([]),
    declarationAccepted: Joi.boolean(),
    copyrightNote: Joi.string().trim().max(2000).allow(""),
    copyrightNotes: Joi.string().trim().max(2000).allow(""),
    isrc: Joi.string().trim().max(32).allow(""),
    iswc: Joi.string().trim().max(32).allow(""),
    proName: Joi.string().trim().max(255).allow(""),
    workRegistrationNumber: Joi.string().trim().max(255).allow(""),
    recordingId: Joi.string().trim().max(255).allow(""),
});

const audioAnalysisSchema = Joi.object({
    duration: Joi.number().positive().required(),
    format: Joi.string().trim().allow("").optional(),
    bitrate: Joi.number().integer().min(1).optional(),
    sampleRate: Joi.number().integer().min(1).optional(),
    channels: Joi.number().integer().min(1).optional(),
}).unknown(true);

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

    description: Joi.string().trim().max(DESCRIPTION_MAX_LENGTH).allow("").optional(),

    tags: Joi.array()
        .items(Joi.string().trim().max(MAX_TAG_LENGTH))
        .max(MAX_TAGS)
        .optional()
        .messages({
            "array.base": "Tags must be an array",
            "array.max": `A track can have at most ${MAX_TAGS} tags`,
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
        .min(1)
        .optional()
        .messages({
            "array.base": "Audio files must be an array",
            "array.max": `A track can have at most ${MAX_AUDIO_FILES} audio files`,
        }),

    audioAnalysis: audioAnalysisSchema.optional(),

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

    copyright: draftCopyrightSchema.optional(),

    stats: Joi.forbidden(),
    activeStatus: Joi.forbidden(),
    releaseStatus: Joi.forbidden(),
    releasedAt: Joi.forbidden(),
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

    description: Joi.string().trim().max(DESCRIPTION_MAX_LENGTH).allow("").optional(),

    tags: Joi.array()
        .items(Joi.string().trim().max(MAX_TAG_LENGTH))
        .max(MAX_TAGS)
        .optional()
        .messages({
            "array.base": "Tags must be an array",
            "array.max": `A track can have at most ${MAX_TAGS} tags`,
        }),

    copyright: draftCopyrightSchema,

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

    audioAnalysis: audioAnalysisSchema.optional(),

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

    stats: Joi.forbidden(),
    activeStatus: Joi.forbidden(),
    releaseStatus: Joi.forbidden(),
    releasedAt: Joi.forbidden(),
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
