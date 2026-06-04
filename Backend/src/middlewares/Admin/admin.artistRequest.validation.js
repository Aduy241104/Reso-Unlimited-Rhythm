import Joi from "joi";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const artistRequestIdParamSchema = Joi.object({
    id: Joi.string().trim().pattern(objectIdPattern).required(),
});

const artistRequestChecklistSchema = Joi.object({
    profileComplete: Joi.boolean().required(),
    identityVerified: Joi.boolean().required(),
    hasMusicActivity: Joi.boolean().required(),
    socialLinksValid: Joi.boolean().required(),
    noImpersonation: Joi.boolean().required(),
    acceptedCopyrightPolicy: Joi.boolean().required(),
}).required();

const updateArtistRequestDecisionSchema = Joi.object({
    status: Joi.string().valid("approved", "rejected").required(),
    adminNote: Joi.string().trim().max(5000).allow("").default(""),
    rejectReason: Joi.when("status", {
        is: "rejected",
        then: Joi.string().trim().min(1).max(2000).required(),
        otherwise: Joi.string().trim().allow("").default(""),
    }),
    checklist: artistRequestChecklistSchema,
});

export default {
    artistRequestIdParamSchema,
    artistRequestChecklistSchema,
    updateArtistRequestDecisionSchema,
};
