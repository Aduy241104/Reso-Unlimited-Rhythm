import Joi from "joi";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const listenEventCompletionSchema = Joi.object({
    contentType: Joi.string().trim().valid("track", "podcast"),
    trackId: Joi.string().trim().pattern(objectIdPattern),
    podcastId: Joi.string().trim().pattern(objectIdPattern),
    listenedDuration: Joi.number().integer().positive().required(),
    guestId: Joi.string().trim().guid({ version: ["uuidv4"] }),
    source: Joi.string()
        .trim()
        .valid("track_detail", "album", "playlist", "search", "artist_profile", "podcast_detail", "unknown")
        .default("unknown"),
})
    .xor("trackId", "podcastId")
    .custom((value, helpers) => {
        if (value.contentType === "track" && !value.trackId) {
            return helpers.error("any.invalid");
        }

        if (value.contentType === "podcast" && !value.podcastId) {
            return helpers.error("any.invalid");
        }

        return value;
    });

export default {
    listenEventCompletionSchema,
};
