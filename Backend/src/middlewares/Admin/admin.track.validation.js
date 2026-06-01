import Joi from "joi";

const listTracksQuerySchema = Joi.object({
    q: Joi.string().trim().max(200).allow("").default(""),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
});

const updateTrackApprovalSchema = Joi.object({
    status: Joi.string().valid("approved", "rejected").required(),
    rejectReason: Joi.string().trim().max(500).allow("").default(""), // Tương thích dữ liệu cũ
    adminNote: Joi.string().trim().max(1000).allow("").default(""),   // Form mới giải trình chi tiết
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
});

const updateTrackVisibilitySchema = Joi.object({
    action: Joi.string().valid("hide", "unhide").required(),
    hiddenReason: Joi.string().trim().max(1000).allow("").default(""), // Nhận chuỗi đã nối cờ từ FE
    adminNote: Joi.string().trim().max(1000).allow("").default(""),    // Dự phòng an toàn dữ liệu
});

export default {
    listTracksQuerySchema,
    updateTrackApprovalSchema,
    updateTrackVisibilitySchema,
};