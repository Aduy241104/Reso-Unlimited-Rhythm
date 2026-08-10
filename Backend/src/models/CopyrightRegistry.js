import mongoose from "mongoose";

const { Schema, model } = mongoose;

const CopyrightRegistrySchema = new Schema(
    {
        trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true, unique: true, index: true },
        rightsOwner: { type: String, default: "", trim: true },
        source: { type: String, enum: ["artist_declaration", "claim_decision", "admin_entry", "external_reference"], default: "artist_declaration" },
        verificationStatus: { type: String, enum: ["unknown", "pending", "verified", "disputed", "rejected"], default: "unknown", index: true },
        fingerprint: {
            algorithm: { type: String, enum: ["sha256", "chromaprint", "none"], default: "none" },
            value: { type: String, default: "", index: true },
            algorithmVersion: { type: String, default: "" },
            status: { type: String, enum: ["pending", "processing", "completed", "failed", "unavailable", ""], default: "" },
            sourceAudioHash: { type: String, default: "", index: true },
            duration: { type: Number, min: 0, default: 0 },
            generatedAt: { type: Date },
        },
        recording: {
            recordingId: { type: String, default: "", trim: true },
            title: { type: String, default: "", trim: true },
            owner: { type: String, default: "", trim: true },
            isrc: { type: String, default: "", trim: true, index: true },
        },
        musicalWork: {
            workId: { type: String, default: "", trim: true },
            iswc: { type: String, default: "", trim: true, index: true },
            composer: { type: String, default: "", trim: true },
            lyricist: { type: String, default: "", trim: true },
        },
        externalVerification: {
            mode: { type: String, enum: ["none", "manual", "musicbrainz"], default: "none" },
            provider: { type: String, default: "", trim: true },
            source: { type: String, default: "", trim: true },
            status: { type: String, enum: ["matched", "possible_match", "not_found", "failed", "pending", ""], default: "" },
            reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
            reviewedAt: { type: Date },
            note: { type: String, default: "", trim: true, maxlength: 5000 },
        },
        // Keep the artist declaration and the external result side by side.
        // MusicBrainz is metadata reference only; it is never the legal rights decision.
        artistDeclaredData: { type: Schema.Types.Mixed, default: null },
        externalResult: { type: Schema.Types.Mixed, default: null },
        externalSubmissionVersion: { type: Number, min: 1, default: 1, index: true },
        acoustIdResult: { type: Schema.Types.Mixed, default: null },
        acoustIdFingerprintHash: { type: String, default: "", trim: true, index: true },
        acoustIdAudioVersion: { type: Number, min: 1, default: 1, index: true },
        notes: { type: String, default: "", trim: true, maxlength: 5000 },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

const CopyrightRegistry = model("CopyrightRegistry", CopyrightRegistrySchema);
export default CopyrightRegistry;
