import Joi from "joi";

const notificationListQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    type: Joi.string()
        .valid(
            "system",
            "new_release",
            "artist_update",
            "payment",
            "follow",
            "report",
            "subscription",
            "other"
        )
        .optional(),
    isRead: Joi.boolean().optional(),
});

const notificationDetailParamsSchema = Joi.object({
    id: Joi.string().trim().required(),
});

export default {
    notificationListQuerySchema,
    notificationDetailParamsSchema,
};
