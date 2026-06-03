import Joi from "joi";

const notificationListQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    type: Joi.string()
        .valid("system", "new_release", "payment", "follow", "report", "subscription")
        .optional(),
    isRead: Joi.boolean().optional(),
});

export default {
    notificationListQuerySchema,
};
