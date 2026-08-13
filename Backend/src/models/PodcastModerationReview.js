import mongoose from "mongoose";

const { Schema, model } = mongoose;

const reviewEventSchema = new Schema(
    {
        type: { type: String, required: true, trim: true },
        deltaSeconds: { type: Number, min: 0, max: 30, default: 0 },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const PodcastModerationReviewSchema = new Schema(
    {
        podcastId: { type: Schema.Types.ObjectId, ref: "Podcast", required: true, index: true },
        adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        status: { type: String, enum: ["active", "completed", "abandoned"], default: "active", index: true },
        snapshot: {
            title: { type: String, default: "" },
            description: { type: String, default: "" },
            audioUrl: { type: String, default: "" },
            coverImageUrl: { type: String, default: "" },
            duration: { type: Number, min: 0, default: 0 },
            copyrightType: { type: String, default: "" },
            copyrightSource: { type: String, default: "" },
            copyrightProofUrl: { type: String, default: "" },
            copyrightConfirmed: { type: Boolean, default: false },
        },
        events: { type: [reviewEventSchema], default: [] },
        audioListenedSeconds: { type: Number, min: 0, default: 0 },
        finalConfirmedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
        decision: { type: String, enum: ["approved", "rejected", "", null], default: "" },
    },
    { timestamps: true }
);

PodcastModerationReviewSchema.index({ podcastId: 1, adminId: 1, status: 1, updatedAt: -1 });

export default model("PodcastModerationReview", PodcastModerationReviewSchema);
