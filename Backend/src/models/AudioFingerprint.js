import mongoose from "mongoose";

const { Schema, model } = mongoose;

const AudioFingerprintSchema = new Schema(
    {
        trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true, index: true },
        algorithm: { type: String, enum: ["chromaprint"], default: "chromaprint", index: true },
        algorithmVersion: { type: String, required: true, default: "chromaprint-v1" },
        duration: { type: Number, min: 0, default: 0 },
        rawFingerprint: { type: [Number], default: undefined },
        fingerprintHash: { type: String, default: "", index: true },
        sourceAudioHash: { type: String, default: "", index: true },
        audioVersion: { type: Number, min: 1, default: 1, index: true },
        // active participates in repository matching; enforcement is retained
        // for deleted violating tracks; historical is audit-only.
        matchingScope: {
            type: String,
            enum: ["active", "enforcement", "historical"],
            default: "active",
            index: true,
        },
        retainedAt: { type: Date, default: null },
        retentionReason: { type: String, default: "", trim: true, maxlength: 2000 },
        sourceAudioFormat: { type: String, default: "", trim: true },
        status: {
            type: String,
            enum: ["pending", "processing", "completed", "failed", "unavailable"],
            default: "pending",
            index: true,
        },
        retryCount: { type: Number, min: 0, default: 0 },
        lastAttemptAt: { type: Date, default: null },
        processingStartedAt: { type: Date, default: null },
        generatedAt: { type: Date, default: null },
        errorCode: { type: String, default: "", trim: true },
        error: { type: String, default: "", trim: true, maxlength: 500 },
    },
    { timestamps: true }
);

AudioFingerprintSchema.index(
    { trackId: 1, algorithm: 1, algorithmVersion: 1 },
    { unique: true }
);
AudioFingerprintSchema.index({ sourceAudioHash: 1, status: 1 });
AudioFingerprintSchema.index({ status: 1, lastAttemptAt: 1 });

export default model("AudioFingerprint", AudioFingerprintSchema);
