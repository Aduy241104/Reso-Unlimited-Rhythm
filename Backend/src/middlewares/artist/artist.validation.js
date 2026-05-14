import Joi from "joi";

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

const updateMyProfileSchema = Joi.object({
    name: Joi.string().trim().min(1).max(120),
    bio: Joi.string().trim().max(5000).allow(""),
    socialLinks: Joi.object({
        facebook: optionalHttpUrl,
        instagram: optionalHttpUrl,
        youtube: optionalHttpUrl,
    }).optional(),
    avatar: optionalHttpUrl.optional(),
    coverImage: optionalHttpUrl.optional(),
})
    .or("name", "bio", "socialLinks", "avatar", "coverImage")
    .messages({
        "object.missing": "At least one field must be provided to update your profile.",
    });

export default {
    updateMyProfileSchema,
};
