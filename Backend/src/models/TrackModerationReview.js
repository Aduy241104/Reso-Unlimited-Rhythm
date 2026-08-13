import mongoose from "mongoose";

const { Schema, model } = mongoose;

const reviewEventSchema = new Schema(
    {
        type: { type: String, required: true, trim: true },
        resourceId: { type: String, default: "", trim: true },
        resourceVersion: { type: Number, min: 1, default: 1 },
        resourceHash: { type: String, default: "", trim: true },
        deltaSeconds: { type: Number, min: 0, max: 30, default: 0 },
        metadata: { type: Schema.Types.Mixed, default: {} },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const TrackModerationReviewSchema = new Schema(
    {
        trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true, index: true },
        adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        source: { type: String, enum: ["track_release", "pending_update"], required: true },
        status: { type: String, enum: ["active", "completed", "abandoned"], default: "active", index: true },
        versions: {
            submission: { type: Number, min: 1, required: true },
            audio: { type: Number, min: 1, required: true },
            copyright: { type: Number, min: 1, required: true },
            evidence: { type: Number, min: 1, required: true },
            audioHash: { type: String, default: "" },
            copyrightHash: { type: String, default: "" },
            evidenceHash: { type: String, default: "" },
        },
        events: { type: [reviewEventSchema], default: [] },
        audioListenedSeconds: { type: Number, min: 0, default: 0 },
        finalConfirmedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
        decision: { type: String, enum: ["approved", "rejected", "", null], default: "" },
    },
    { timestamps: true }
);

TrackModerationReviewSchema.index({ trackId: 1, adminId: 1, status: 1, updatedAt: -1 });

export default model("TrackModerationReview", TrackModerationReviewSchema);
