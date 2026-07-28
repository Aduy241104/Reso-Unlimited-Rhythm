import Joi from "joi";

const objectId24 = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const listAlbumsQuerySchema = Joi.object({
    q: Joi.string().trim().max(200).allow("").default(""),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    status: Joi.string().valid("draft", "active", "hidden", "blocked").optional(),
});

const albumIdParamSchema = Joi.object({
    id: objectId24.required(),
});

const updateAlbumStatusSchema = Joi.object({
    action: Joi.string().valid("block", "unblock").required(),
    blockedReason: Joi.string().trim().max(1000).allow("").default(""),
    adminNote: Joi.string().trim().max(1000).allow("").default(""),
});

export default {
    listAlbumsQuerySchema,
    albumIdParamSchema,
    updateAlbumStatusSchema,
};
