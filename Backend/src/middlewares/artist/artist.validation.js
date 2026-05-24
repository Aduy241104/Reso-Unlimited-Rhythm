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
    removeAvatar: Joi.boolean().optional(),
    removeCover: Joi.boolean().optional(),
})
    .or("name", "bio", "socialLinks", "avatar", "coverImage", "removeAvatar", "removeCover")
    .messages({
        "object.missing": "At least one field must be provided to update your profile.",
    });

const requestVerificationSchema = Joi.object({
    note: Joi.string().trim().max(2000).allow(""),
});

export default {
    updateMyProfileSchema,
    requestVerificationSchema,
};
