import Joi from "joi";

const socialLinksSchema = Joi.object({
    facebook: Joi.string().allow("").max(512),
    instagram: Joi.string().allow("").max(512),
    youtube: Joi.string().allow("").max(512),
});

const patchArtistProfileSchema = Joi.object({
    name: Joi.string().trim().min(1).max(120),
    bio: Joi.string().allow("").max(8000),
    avatar: Joi.string().allow("").max(2048),
    coverImage: Joi.string().allow("").max(2048),
    socialLinks: socialLinksSchema,
})
    .or("name", "bio", "avatar", "coverImage", "socialLinks")
    .messages({
        "object.missing": "At least one field must be provided to update your profile.",
    });

export default {
    patchArtistProfileSchema,
};
