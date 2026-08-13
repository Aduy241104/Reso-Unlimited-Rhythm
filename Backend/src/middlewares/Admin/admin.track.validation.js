import Joi from "joi";

const listTracksQuerySchema = Joi.object({
    q: Joi.string().trim().max(200).allow("").default(""),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    artistId: Joi.string().trim().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    deletionStatus: Joi.string().valid("active", "deleted", "all").default("active"),
    scope: Joi.string().valid("catalog", "moderation").optional(),
    reviewSource: Joi.string()
        .valid("track_release", "pending_update")
        .optional(),
    // BỔ SUNG 2 DÒNG NÀY ĐỂ NHẬN BỘ LỌC TỪ FRONTEND:
    approvalStatus: Joi.string().valid("pending", "approved", "rejected").optional(),
    moderationDecision: Joi.string().valid(
        "auto_clear",
        "auto_reject",
        "manual_review",
        "manual_review_high",
        "enforcement_block"
    ).optional(),
    activeStatus: Joi.string().valid("draft", "active", "hidden", "blocked").optional(),
    releaseStatus: Joi.string().valid("unreleased", "scheduled", "released").optional(),
});

const updateTrackApprovalSchema = Joi.object({
    status: Joi.string().valid("approved", "rejected").required(),
    rejectReason: Joi.string().trim().max(500).allow("").default(""), 
    adminNote: Joi.string().trim().max(1000).allow("").default(""),   
    violationFlags: Joi.array()
        .items(
            Joi.string().valid(
                "copyright",
                "missing_rights_proof",
                "wrong_metadata",
                "low_audio_quality",
                "explicit_content",
                "duplicate_track",
                "other"
            )
        )
        .default([]),
    rejectCategory: Joi.string().valid(
        "duplicate_audio",
        "insufficient_copyright_information",
        "missing_license",
        "invalid_license",
        "copyright_conflict",
        "policy_violation",
        "other"
    ).allow("").default(""),
    fingerprintOverrideReason: Joi.string().trim().max(2000).allow("").default(""),
    acoustIdOverride: Joi.boolean().default(false),
    acoustIdOverrideReason: Joi.string().trim().max(2000).allow("").default(""),
    reviewSessionId: Joi.string().trim().pattern(/^[0-9a-fA-F]{24}$/).allow("").default(""),
});

const reviewEventSchema = Joi.object({
    type: Joi.string().valid(
        "OPEN_TRACK_DETAIL",
        "OPEN_COPYRIGHT_SECTION",
        "OPEN_METADATA",
        "OPEN_AUDIO",
        "AUDIO_PLAY_STARTED",
        "AUDIO_PLAY_PROGRESS",
        "AUDIO_REVIEWED",
        "OPEN_FINGERPRINT_RESULT",
        "OPEN_ACOUSTID_RESULT",
        "OPEN_MUSICBRAINZ_RESULT",
        "OPEN_LICENSE_DOCUMENT",
        "DOWNLOAD_LICENSE_DOCUMENT",
        "OPEN_LYRICS",
        "OPEN_LRC",
        "FINAL_CONFIRMATION"
    ).required(),
    resourceId: Joi.string().trim().max(500).allow(""),
    deltaSeconds: Joi.number().min(0).max(60).default(0),
    metadata: Joi.object().unknown(false).default({}),
});

const updateTrackVisibilitySchema = Joi.object({
    action: Joi.string().valid("hide", "unhide", "block", "unblock").required(),
    hiddenReason: Joi.string().trim().max(1000).allow("").default(""),
    blockedReason: Joi.string().trim().max(1000).allow("").default(""),
    adminNote: Joi.string().trim().max(1000).allow("").default(""),
});

const fingerprintMatchIdParamSchema = Joi.object({
    matchId: Joi.string().trim().pattern(/^[0-9a-fA-F]{24}$/).required(),
});

const fingerprintMatchesQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid("detected", "under_review", "dismissed", "confirmed").optional(),
    severity: Joi.string().valid("none", "review", "high").optional(),
    riskLevel: Joi.string().valid("low", "medium", "high").optional(),
    sourceTrackId: Joi.string().trim().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    matchedTrackId: Joi.string().trim().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    artistId: Joi.string().trim().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
});

const fingerprintReviewBodySchema = Joi.object({
    decision: Joi.string().valid("dismiss", "confirm", "request_evidence", "open_dispute", "link_recording").required(),
    note: Joi.string().trim().max(5000).allow("").default(""),
    recordingId: Joi.string().trim().max(255).allow("").when("decision", {
        is: "link_recording",
        then: Joi.string().trim().max(255).min(1).required(),
    }),
});

export default {
    listTracksQuerySchema,
    updateTrackApprovalSchema,
    updateTrackVisibilitySchema,
    fingerprintMatchIdParamSchema,
    fingerprintMatchesQuerySchema,
    fingerprintReviewBodySchema,
    reviewEventSchema,
};
