import Joi from "joi";

const createNotificationSchema = Joi.object({
    title: Joi.string().trim().required(),
    content: Joi.string().required(),
    type: Joi.string().valid("system", "new_release", "payment", "follow", "report", "subscription").required(),
    receiverType: Joi.string().valid("single", "all", "group").required(),
    
    specificUserId: Joi.string().hex().length(24).when("receiverType", {
        is: "single",
        then: Joi.required(),
        otherwise: Joi.optional().allow(null, "")
    }),
    groupRole: Joi.string().valid("user", "artist").when("receiverType", {
        is: "group",
        then: Joi.required(),
        otherwise: Joi.optional().allow(null, "")
    }),

    targetId: Joi.string().hex().length(24).optional().allow(null, ""),
    targetType: Joi.string().valid("track", "album", "plan", "payment", "report", "artist", "").optional().allow("")
});

export default {
    createNotificationSchema
};