import Joi from "joi";

const listTracksQuerySchema = Joi.object({
    q: Joi.string().trim().max(200).allow("").default(""),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
});

const updateTrackApprovalSchema = Joi.object({
    status: Joi.string().valid("approved", "rejected").required(),
    rejectReason: Joi.string().trim().max(500).allow("").default(""),
});

export default {
    listTracksQuerySchema,
    updateTrackApprovalSchema,
};
