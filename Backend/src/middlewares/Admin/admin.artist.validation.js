import Joi from "joi";

const listArtistsQuerySchema = Joi.object({
    q: Joi.string().allow("").optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional(),
    verificationStatus: Joi.string().valid("verified", "pending", "rejected").optional(),
    activeStatus: Joi.string().valid("active", "inactive", "blocked").optional(),
});

const artistIdParamSchema = Joi.object({
    id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
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