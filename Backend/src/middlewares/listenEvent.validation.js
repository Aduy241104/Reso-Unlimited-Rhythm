import Joi from "joi";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const listenEventCompletionSchema = Joi.object({
    trackId: Joi.string().trim().pattern(objectIdPattern).required(),
    listenedDuration: Joi.number().integer().positive().required(),
    device: Joi.string().trim().max(50).allow("").default(""),
    country: Joi.string().trim().max(10).allow("").default(""),
    source: Joi.string()
        .trim()
        .valid("track_detail", "album", "playlist", "search", "artist_profile", "unknown")
        .default("unknown"),
});

export default {
    listenEventCompletionSchema,
};
