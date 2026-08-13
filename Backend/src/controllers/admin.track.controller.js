import adminTrackService from "../services/track/admin/admin.track.service.js";
import adminTrackValidation from "../middlewares/Admin/admin.track.validation.js";
import formatResponse from "../utils/formatResponse.js";
import { AppError } from "../utils/AppError.js";

import Track from "../models/Track.js";
import Artist from "../models/Artist.js";
import Interaction from "../models/Interaction.js";
import Notification from "../models/Notification.js";
import fingerprintAdminService from "../services/fingerprint/fingerprintAdmin.service.js";
import moderationReviewService from "../services/track/moderationReview.service.js";

const listTracksForAdmin = async (req, res, next) => {
    try {
        const { error, value } = adminTrackValidation.listTracksQuerySchema.validate(
            req.query,
            { abortEarly: false, stripUnknown: true }
        );

        if (error) {
            throw new AppError(
                "Invalid request data.",
                400,
                error.details.map((detail) => ({
                    field: detail.path.join("."),
                    message: detail.message,
                }))
            );
        }

        const result = await adminTrackService.listTracksForAdmin(value);

        return formatResponse.success(
            res,
            { tracks: result.tracks },
            "Tracks fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

const getTrackDetailForAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const trackDetail = await adminTrackService.getTrackDetailForAdmin(id);

        return formatResponse.success(
            res,
            { track: trackDetail },
            "Track detail fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateTrackApprovalStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Bốc đầu đầy đủ tất cả các trường kiểm duyệt nâng cao gửi từ FE lên
        const {
            status,
            adminNote,
            violationFlags,
            rejectReason,
            rejectCategory,
            fingerprintOverrideReason,
            acoustIdOverride,
            acoustIdOverrideReason,
            reviewSessionId,
        } = req.body;

        const updatedTrack = await adminTrackService.updateTrackApprovalStatus(
            id,
            {
                status,
                adminNote,
                violationFlags,
                rejectReason,
                rejectCategory,
                fingerprintOverrideReason,
                acoustIdOverride,
                acoustIdOverrideReason,
                moderationRole: req.user.role,
                reviewSessionId,
            },
            req.user.id,
            req.app.get("io")
        );

        return formatResponse.success(
            res,
            { track: updatedTrack },
            "Track approval status updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateTrackVisibilityController = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { action, hiddenReason, blockedReason, adminNote } = req.body;

        const track = await adminTrackService.updateTrackVisibility(id, {
            action,
            hiddenReason,
            blockedReason,
            adminNote
        },
        req.user.id,
        req.app.get("io"));

        return formatResponse.success(
            res,
            { track },
            "Track visibility updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

const startTrackReviewSession = async (req, res, next) => {
    try {
        const review = await moderationReviewService.ensureReviewSession(req.user.id, req.params.id);
        return formatResponse.success(res, { review }, "Track review session ready");
    } catch (error) {
        next(error);
    }
};

const getTrackReviewSession = async (req, res, next) => {
    try {
        const review = await moderationReviewService.getReviewSession(req.user.id, req.params.id);
        return formatResponse.success(res, { review }, "Track review session fetched");
    } catch (error) {
        next(error);
    }
};

const recordTrackReviewEvent = async (req, res, next) => {
    try {
        const review = await moderationReviewService.recordReviewEvent(
            req.user.id,
            req.params.id,
            req.body
        );
        return formatResponse.success(res, { review }, "Track review event recorded");
    } catch (error) {
        next(error);
    }
};

const reprocessFingerprint = async (req, res, next) => {
    try {
        const result = await fingerprintAdminService.reprocessFingerprint(req.params.id);
        return formatResponse.success(res, result, "Fingerprint reprocess started.");
    } catch (error) {
        next(error);
    }
};

const listFingerprintMatches = async (req, res, next) => {
    try {
        const result = await fingerprintAdminService.listFingerprintMatches(req.query);
        return formatResponse.success(res, { matches: result.matches }, "Fingerprint matches fetched successfully", result.pagination);
    } catch (error) {
        next(error);
    }
};

const getFingerprintMatchDetail = async (req, res, next) => {
    try {
        const match = await fingerprintAdminService.getFingerprintMatchDetail(req.params.matchId);
        return formatResponse.success(res, { match }, "Fingerprint match fetched successfully");
    } catch (error) {
        next(error);
    }
};

const reviewFingerprintMatch = async (req, res, next) => {
    try {
        const match = await fingerprintAdminService.reviewFingerprintMatch(req.user.id, req.params.matchId, req.body);
        return formatResponse.success(res, { match }, "Fingerprint match review updated successfully");
    } catch (error) {
        next(error);
    }
};

const getFingerprintMetrics = async (req, res, next) => {
    try {
        const metrics = await fingerprintAdminService.getFingerprintMetrics();
        return formatResponse.success(res, { metrics }, "Fingerprint metrics fetched successfully");
    } catch (error) {
        next(error);
    }
};

export default {
    listTracksForAdmin,
    updateTrackApprovalStatus,
    updateTrackVisibilityController,
    getTrackDetailForAdmin,
    reprocessFingerprint,
    listFingerprintMatches,
    getFingerprintMatchDetail,
    reviewFingerprintMatch,
    getFingerprintMetrics,
    startTrackReviewSession,
    getTrackReviewSession,
    recordTrackReviewEvent,
};
