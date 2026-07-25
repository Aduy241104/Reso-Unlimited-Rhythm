import Joi from "joi";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const listenEventCompletionSchema = Joi.object({
    trackId: Joi.string().trim().pattern(objectIdPattern).required(),
    listenedDuration: Joi.number().integer().positive().required(),
    source: Joi.string()
        .trim()
        .valid("track_detail", "album", "playlist", "search", "artist_profile", "unknown")
        .default("unknown"),
});

export default {
    listenEventCompletionSchema,
};
