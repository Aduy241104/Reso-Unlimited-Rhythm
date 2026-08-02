import Joi from "joi";

const forgotPasswordSchema = Joi.object({
    email: Joi.string().trim().email().required(),
});

export default {
    forgotPasswordSchema,
};
