import Joi from "joi";
import { COPYRIGHT_EVIDENCE_TYPES, MAX_EVIDENCE_DOCUMENTS, MAX_EVIDENCE_SIZE } from "../services/track/copyright.validation.service.js";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const appealIdParamSchema = Joi.object({
    appealId: Joi.string().trim().pattern(objectIdPattern).required(),
});

const evidenceDocumentSchema = Joi.object({
    documentId: Joi.string().trim().max(128).allow(""),
    type: Joi.string().valid(...COPYRIGHT_EVIDENCE_TYPES).default("other"),
    evidenceType: Joi.string().valid(...COPYRIGHT_EVIDENCE_TYPES),
    version: Joi.number().integer().min(1).default(1),
    originalName: Joi.string().trim().max(255).allow(""),
    fileName: Joi.string().trim().max(255).allow(""),
    mimeType: Joi.string().trim().max(120).required(),
    size: Joi.number().integer().positive().max(MAX_EVIDENCE_SIZE).required(),
    storageUrl: Joi.string().uri({ scheme: ["http", "https"] }).allow(""),
    url: Joi.string().uri({ scheme: ["http", "https"] }).required(),
    publicId: Joi.string().trim().max(500).allow(""),
    sha256: Joi.string().trim().hex().length(64).allow(""),
    hash: Joi.string().trim().hex().length(64).allow(""),
    uploadedAt: Joi.date().iso().optional(),
}).unknown(false);

export const createTrackReviewAppealSchema = Joi.object({
    reviewTarget: Joi.string().valid("track_submission", "pending_update", "enforcement").default("track_submission"),
    message: Joi.string().trim().min(10).max(5000).required(),
    evidenceDocuments: Joi.array().max(MAX_EVIDENCE_DOCUMENTS).items(evidenceDocumentSchema).default([]),
});

export const adminAcceptTrackReviewAppealSchema = Joi.object({
    adminResponse: Joi.string().trim().max(5000).allow("").default(""),
});

export const adminRejectTrackReviewAppealSchema = Joi.object({
    adminResponse: Joi.string().trim().min(10).max(5000).required(),
});

export const adminTrackReviewAppealsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    status: Joi.string().valid("pending", "accepted", "rejected", "cancelled").optional(),
    reviewTarget: Joi.string().valid("track_submission", "pending_update", "enforcement").optional(),
    q: Joi.string().trim().max(120).allow("").optional(),
});

export default {
    createTrackReviewAppealSchema,
    adminAcceptTrackReviewAppealSchema,
    adminRejectTrackReviewAppealSchema,
    adminTrackReviewAppealsQuerySchema,
    appealIdParamSchema,
};
