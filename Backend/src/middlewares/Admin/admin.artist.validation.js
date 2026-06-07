import Joi from "joi";

const listArtistsQuerySchema = Joi.object({
    q: Joi.string().allow("").default(""),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
});

const artistIdParamSchema = Joi.object({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
        "string.pattern.base": "Artist id is invalid.",
    }),
});

const updateArtistStatusSchema = Joi.object({
    action: Joi.string().valid("block", "unblock", "verify", "reject").required(),
    reason: Joi.string().allow("").max(500),
    adminNote: Joi.string().allow("").max(500),
});

export default {
    listArtistsQuerySchema,
    artistIdParamSchema,
    updateArtistStatusSchema,
};