import Joi from "joi";

const createVnpayOrderSchema = Joi.object({
    planId: Joi.string().trim().length(24).hex().required(),
    clientPlatform: Joi.string().trim().lowercase().valid("web", "mobile").default("web"),
});

export default {
    createVnpayOrderSchema,
};

