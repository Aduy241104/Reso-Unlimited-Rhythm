import Joi from "joi";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const releaseScheduleIdParamSchema = Joi.object({
    id: Joi.string()
        .trim()
        .pattern(objectIdPattern)
        .required(),
});

const createReleaseScheduleSchema = Joi.object({
    type: Joi.string()
        .trim()
        .valid("track", "album")
        .required(),
    targetId: Joi.string()
        .trim()
        .pattern(objectIdPattern)
        .required(),
    publishMode: Joi.string()
        .trim()
        .valid("immediate", "scheduled")
        .default("scheduled"),
    scheduledAt: Joi.alternatives()
        .conditional("publishMode", {
            is: "scheduled",
            then: Joi.date()
                .iso()
                .greater("now")
                .required()
                .messages({
                    "date.greater": "scheduledAt must be in the future.",
                }),
            otherwise: Joi.any()
                .optional()
                .allow(null),
        }),
});

const updateReleaseScheduleSchema = Joi.object({
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
    releaseScheduleIdParamSchema,
    updateReleaseScheduleSchema,
};
