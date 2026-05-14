import Joi from "joi";

const optionalCoverUrl = Joi.string()
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

const createSystemPlaylistSchema = Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().max(5000).allow("").default(""),
    coverImage: optionalCoverUrl.optional().default(""),
});

const updateSystemPlaylistSchema = Joi.object({
    title: Joi.string().trim().min(1).max(200),
    description: Joi.string().trim().max(5000).allow(""),
    coverImage: optionalCoverUrl.optional(),
    isPublic: Joi.boolean(),
    isHidden: Joi.boolean(),
}).min(1);

export default {
    createSystemPlaylistSchema,
    updateSystemPlaylistSchema,
};
