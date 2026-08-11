import mongoose from "mongoose";

const { Schema, model } = mongoose;

const evidenceDocumentSchema = new Schema(
    {
        documentId: { type: String, default: "", trim: true, maxlength: 128 },
        type: { type: String, default: "other", trim: true, maxlength: 80 },
        version: { type: Number, min: 1, default: 1 },
        originalName: { type: String, default: "", trim: true, maxlength: 255 },
        fileName: { type: String, default: "", trim: true, maxlength: 255 },
        mimeType: { type: String, default: "", trim: true, maxlength: 120 },
        size: { type: Number, min: 0, default: 0 },
        storageUrl: { type: String, default: "", trim: true },
        url: { type: String, default: "", trim: true },
        publicId: { type: String, default: "", trim: true },
        sha256: { type: String, default: "", trim: true },
        hash: { type: String, default: "", trim: true },
        evidenceType: { type: String, default: "", trim: true },
        uploadedAt: { type: Date, default: null },
    },
    { _id: false }
);

const rejectionSnapshotSchema = new Schema(
    {
        rejectionId: { type: String, required: true, trim: true },
        rejectReason: { type: String, default: "" },
        violationFlags: { type: [String], default: [] },
        submissionVersion: { type: Number, min: 1, required: true },
        audioVersion: { type: Number, min: 1, required: true },
        copyrightVersion: { type: Number, min: 1, required: true },
        evidenceVersion: { type: Number, min: 1, required: true },
        mutableSnapshotHash: { type: String, default: "", trim: true },
        rejectedAt: { type: Date, required: true },
    },
    { _id: false }
);

const TrackReviewAppealSchema = new Schema(
    {
        trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true, index: true },
        artistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true, index: true },
        reviewTarget: {
            type: String,
            enum: ["track_submission", "pending_update", "enforcement"],
            default: "track_submission",
        },
        rejectionSnapshot: { type: rejectionSnapshotSchema, required: true },
        rejectionKey: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
        evidenceDocuments: { type: [evidenceDocumentSchema], default: [] },
        status: {
            type: String,
            enum: ["pending", "accepted", "rejected", "cancelled"],
            default: "pending",
            index: true,
        },
        submittedAt: { type: Date, default: Date.now },
        reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        reviewedAt: { type: Date, default: null },
        adminResponse: { type: String, default: "", trim: true, maxlength: 5000 },
        resolution: {
            action: { type: String, default: "" },
            note: { type: String, default: "", trim: true, maxlength: 5000 },
        },
    },
    { timestamps: true }
);

TrackReviewAppealSchema.index(
    { trackId: 1, rejectionKey: 1 },
    { unique: true, name: "track_review_appeal_snapshot_unique" }
);

export default model("TrackReviewAppeal", TrackReviewAppealSchema);
