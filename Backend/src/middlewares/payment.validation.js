import Joi from "joi";

const createVnpayOrderSchema = Joi.object({
    planId: Joi.string().trim().length(24).hex().required(),
});

export default {
    createVnpayOrderSchema,
};

