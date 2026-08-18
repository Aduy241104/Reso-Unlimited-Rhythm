import Joi from "joi";

const objectId = Joi.string().trim().pattern(/^[0-9a-fA-F]{24}$/);
const httpUrl = Joi.string()
    .trim()
    .max(2000)
    .allow("")
    .custom((value, helpers) => {
        if (!value) return value;
        try {
            const url = new URL(value);
            if (!["http:", "https:"].includes(url.protocol)) {
                return helpers.error("any.invalid");
            }
            return value;
        } catch {
            return helpers.error("any.invalid");
        }
    }, "HTTP(S) URL");

const copyrightFields = {
    copyrightType: Joi.string().valid("original", "licensed", "third_party"),
    copyrightSource: Joi.string().trim().max(2000).allow(""),
    copyrightProofUrl: httpUrl,
    copyrightConfirmed: Joi.boolean(),
};

const podcastFields = {
    title: Joi.string().trim().max(200).allow(""),
    description: Joi.string().trim().max(10000).allow(""),
    audioUrl: httpUrl,
    coverImageUrl: httpUrl,
    duration: Joi.number().min(0),
    ...copyrightFields,
};

const createPodcastSchema = Joi.object(podcastFields).unknown(false);
const updatePodcastSchema = Joi.object(podcastFields)
    .min(1)
    .unknown(false);

const podcastIdParamSchema = Joi.object({ id: objectId.required() });

const artistPodcastQuerySchema = Joi.object({
    status: Joi.string()
        .valid("all", "draft", "pending", "approved", "rejected")
        .default("all"),
    includeDeleted: Joi.boolean().default(false),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
});

const adminPodcastQuerySchema = Joi.object({
    q: Joi.string().trim().max(200).allow("").default(""),
    status: Joi.string()
        .valid("all", "draft", "pending", "approved", "rejected", "blocked")
        .default("all"),
    includeDeleted: Joi.boolean().default(false),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
});

const rejectPodcastSchema = Joi.object({
    reason: Joi.string().trim().min(1).max(2000).required(),
});

const blockPodcastSchema = Joi.object({
    reason: Joi.string().trim().min(1).max(2000).required(),
});

const podcastApprovalSchema = Joi.object({
    reviewSessionId: objectId.required(),
});

const podcastReviewEventSchema = Joi.object({
    type: Joi.string().valid(
        "OPEN_PODCAST_DETAIL",
        "OPEN_METADATA",
        "OPEN_COPYRIGHT_SECTION",
        "OPEN_AUDIO",
        "AUDIO_PLAY_STARTED",
        "AUDIO_PLAY_PROGRESS",
        "AUDIO_REVIEWED",
        "FINAL_CONFIRMATION",
    ).required(),
    deltaSeconds: Joi.number().min(0).max(30).optional(),
}).unknown(false);

const visibilitySchema = Joi.object({
    visibility: Joi.string().valid("public", "hidden").required(),
});

const publicPodcastQuerySchema = Joi.object({
    q: Joi.string().trim().max(200).allow("").default(""),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
});

const listenPodcastSchema = Joi.object({
    duration: Joi.number().min(0).default(0),
    listenedDuration: Joi.number().min(0),
    sessionId: Joi.string().trim().max(200).allow(""),
});

const podcastStreamSchema = Joi.object({
    listenedDuration: Joi.number().positive().required(),
    guestId: Joi.string().trim().guid({ version: ["uuidv4"] }),
    source: Joi.string()
        .trim()
        .valid("podcast_detail", "search", "unknown")
        .default("podcast_detail"),
});

export {
    createPodcastSchema,
    updatePodcastSchema,
    podcastIdParamSchema,
    artistPodcastQuerySchema,
    adminPodcastQuerySchema,
    rejectPodcastSchema,
    blockPodcastSchema,
    podcastApprovalSchema,
    podcastReviewEventSchema,
    visibilitySchema,
    publicPodcastQuerySchema,
    listenPodcastSchema,
    podcastStreamSchema,
};
