import Joi from "joi";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const transactionUserIdParamSchema = Joi.object({
    userId: Joi.string().trim().pattern(objectIdPattern).required(),
});

export default {
    transactionUserIdParamSchema,
};
