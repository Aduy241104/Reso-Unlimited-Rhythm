import mongoose from "mongoose";

const { Schema, model } = mongoose;

const PodcastSchema = new Schema(
    {
        // The creator is always resolved from the authenticated artist. It is
        // deliberately not accepted from artist request payloads.
        creator: {
            type: Schema.Types.ObjectId,
            ref: "Artist",
            required: true,
            index: true,
        },
        title: { type: String, default: "", trim: true, index: true, maxlength: 200 },
        description: { type: String, default: "", trim: true, maxlength: 10000 },
        audioUrl: { type: String, default: "", trim: true },
        coverImageUrl: { type: String, default: "", trim: true },
        duration: { type: Number, default: 0, min: 0 },

        releaseDate: { type: Date, default: null, index: true },
        releaseStatus: {
            type: String,
            enum: ["unreleased", "scheduled", "released"],
            default: "unreleased",
            index: true,
        },
        releasedAt: { type: Date, default: null },

        approvalStatus: {
            type: String,
            enum: ["draft", "pending", "approved", "rejected"],
            default: "draft",
            index: true,
        },
        reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        reviewedAt: { type: Date, default: null },
        rejectReason: { type: String, default: null, trim: true },

        visibility: {
            type: String,
            enum: ["public", "hidden"],
            default: "hidden",
            index: true,
        },

        isBlocked: { type: Boolean, default: false, index: true },
        blockedReason: { type: String, default: null, trim: true },
        blockedAt: { type: Date, default: null },
        blockedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

        // Podcast V1 intentionally keeps copyright as a declaration rather
        // than importing Track's fingerprint/moderation state machine.
        copyrightType: {
            type: String,
            enum: ["original", "licensed", "third_party"],
            default: "original",
        },
        copyrightSource: { type: String, default: "", trim: true, maxlength: 2000 },
        copyrightProofUrl: { type: String, default: "", trim: true, maxlength: 2000 },
        copyrightConfirmed: { type: Boolean, default: false },

        stats: {
            totalListen: { type: Number, default: 0, min: 0 },
        },

        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date, default: null },
        deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

PodcastSchema.index({ creator: 1, title: 1 });
PodcastSchema.index({
    approvalStatus: 1,
    visibility: 1,
    isBlocked: 1,
    isDeleted: 1,
});

const Podcast = model("Podcast", PodcastSchema);
export default Podcast;
