import Joi from "joi";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const trackIdParamSchema = Joi.object({
    id: Joi.string().trim().pattern(objectIdPattern).required(),
});

export default {
    trackIdParamSchema,
};
