import Joi from "joi";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const createReleaseScheduleSchema = Joi.object({
    type: Joi.string()
        .trim()
        .valid("track", "album")
        .required(),
    targetId: Joi.string()
        .trim()
        .pattern(objectIdPattern)
        .required(),
    scheduledAt: Joi.date()
        .iso()
        .greater("now")
        .required()
        .messages({
            "date.greater": "scheduledAt must be in the future.",
        }),
});

export default {
    createReleaseScheduleSchema,
};
