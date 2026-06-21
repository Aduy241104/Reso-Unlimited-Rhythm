import Joi from "joi";

const createNotificationSchema = Joi.object({
    title: Joi.string().trim().required(),
    content: Joi.string().required(),
    type: Joi.string().valid("system", "new_release", "artist_update", "payment", "follow", "report", "subscription").required(),
    receiverType: Joi.string().valid("single", "all", "group", "followers").required(),

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
    artistId: Joi.string().hex().length(24).when("receiverType", {
        is: "followers",
        then: Joi.required(),
        otherwise: Joi.optional().allow(null, "")
    }),

    targetId: Joi.string().hex().length(24).optional().allow(null, ""),
    targetType: Joi.string()
        .valid("track", "album", "playlist", "plan", "payment", "report", "artist", "")
        .optional()
        .allow("")
});

export default {
    createNotificationSchema
};
