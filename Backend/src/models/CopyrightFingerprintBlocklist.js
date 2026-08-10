import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * Minimal copyright enforcement evidence that survives Track deletion.
 * It intentionally stores hashes/fingerprint data only, never the audio file.
 */
const CopyrightFingerprintBlocklistSchema = new Schema(
    {
        algorithm: { type: String, enum: ["chromaprint"], default: "chromaprint", index: true },
        algorithmVersion: { type: String, required: true, default: "chromaprint-v1" },
        sourceAudioHash: { type: String, required: true, trim: true, index: true },
        fingerprintHash: { type: String, default: "", trim: true },
        rawFingerprint: { type: [Number], default: undefined },
        duration: { type: Number, min: 0, default: 0 },
        sourceTrackId: { type: Schema.Types.ObjectId, ref: "Track", default: null, index: true },
        sourceArtistId: { type: Schema.Types.ObjectId, ref: "Artist", default: null, index: true },
        reasonCode: {
            type: String,
            enum: ["copyright_violation", "exact_duplicate", "policy_violation", "claim_remove_content"],
            required: true,
        },
        reason: { type: String, default: "", trim: true, maxlength: 2000 },
        status: { type: String, enum: ["active", "released"], default: "active", index: true },
        retainedAt: { type: Date, default: Date.now },
        releasedAt: { type: Date, default: null },
        releasedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        metadata: { type: Schema.Types.Mixed, default: null },
    },
    { timestamps: true }
);

CopyrightFingerprintBlocklistSchema.index(
    { algorithm: 1, algorithmVersion: 1, sourceAudioHash: 1, status: 1 },
    { unique: true }
);

export default model("CopyrightFingerprintBlocklist", CopyrightFingerprintBlocklistSchema);
