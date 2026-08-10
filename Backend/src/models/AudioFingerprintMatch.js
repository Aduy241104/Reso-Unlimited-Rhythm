import mongoose from "mongoose";

const { Schema, model } = mongoose;

const AudioFingerprintMatchSchema = new Schema(
    {
        sourceTrackId: { type: Schema.Types.ObjectId, ref: "Track", required: true, index: true },
        matchedTrackId: { type: Schema.Types.ObjectId, ref: "Track", required: true, index: true },
        algorithm: { type: String, default: "chromaprint", index: true },
        algorithmVersion: { type: String, required: true, default: "chromaprint-v1" },
        matchType: {
            type: String,
            enum: ["exact_file_duplicate", "chromaprint"],
            required: true,
        },
        similarityScore: { type: Number, min: 0, max: 1, required: true },
        overlapScore: { type: Number, min: 0, max: 1, default: 0 },
        overlapSeconds: { type: Number, min: 0, default: 0 },
        overlapRatio: { type: Number, min: 0, max: 1, default: 0 },
        durationDifference: { type: Number, min: 0, default: 0 },
        bestOffset: { type: Number, default: 0 },
        severity: { type: String, enum: ["none", "review", "high"], default: "review", index: true },
        riskScore: { type: Number, min: 0, max: 100, default: 0 },
        riskLevel: { type: String, enum: ["low", "medium", "high"], default: "low", index: true },
        riskSignals: { type: [Schema.Types.Mixed], default: [] },
        sourceAudioVersion: { type: Number, min: 1, default: null },
        matchedAudioVersion: { type: Number, min: 1, default: null },
        // active is used for current matching; enforcement/historical records
        // remain available for moderation and audit without becoming candidates.
        matchingScope: {
            type: String,
            enum: ["active", "enforcement", "historical"],
            default: "active",
            index: true,
        },
        retainedAt: { type: Date, default: null },
        retentionReason: { type: String, default: "", trim: true, maxlength: 2000 },
        status: {
            type: String,
            enum: ["detected", "under_review", "dismissed", "confirmed"],
            default: "detected",
            index: true,
        },
        reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        reviewedAt: { type: Date, default: null },
        reviewDecision: { type: String, default: "", trim: true },
        reviewNote: { type: String, default: "", trim: true, maxlength: 5000 },
        disputeClaimId: { type: Schema.Types.ObjectId, ref: "CopyrightClaim", default: null },
    },
    { timestamps: true }
);

AudioFingerprintMatchSchema.index(
    { sourceTrackId: 1, matchedTrackId: 1, algorithmVersion: 1 },
    { unique: true }
);
AudioFingerprintMatchSchema.index({ status: 1, severity: 1, createdAt: -1 });

export default model("AudioFingerprintMatch", AudioFingerprintMatchSchema);
