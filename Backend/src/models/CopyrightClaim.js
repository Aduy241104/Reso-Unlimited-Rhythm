import mongoose from "mongoose";

const { Schema, model } = mongoose;

const evidenceSchema = new Schema(
    {
        sha256: { type: String, required: true, index: true },
        originalName: { type: String, default: "", trim: true },
        mimeType: { type: String, default: "", trim: true },
        size: { type: Number, min: 0, default: 0 },
        storageUrl: { type: String, required: true },
        publicId: { type: String, default: "" },
        uploadedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const responseSchema = new Schema(
    {
        statement: { type: String, default: "", trim: true, maxlength: 5000 },
        evidence: { type: [evidenceSchema], default: [] },
        respondedBy: { type: Schema.Types.ObjectId, ref: "User" },
        respondedAt: { type: Date },
    },
    { _id: false }
);

const decisionSchema = new Schema(
    {
        outcome: {
            type: String,
            enum: ["remove_content", "keep_content", "credit_update", "no_action", ""],
            default: "",
        },
        note: { type: String, default: "", trim: true, maxlength: 5000 },
        decidedBy: { type: Schema.Types.ObjectId, ref: "User" },
        decidedAt: { type: Date },
    },
    { _id: false }
);

const appealSchema = new Schema(
    {
        statement: { type: String, default: "", trim: true, maxlength: 5000 },
        evidence: { type: [evidenceSchema], default: [] },
        submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
        submittedAt: { type: Date },
    },
    { _id: false }
);

const CopyrightClaimSchema = new Schema(
    {
        trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true, index: true },
        claimantUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        claimantArtistId: { type: Schema.Types.ObjectId, ref: "Artist", index: true },
        respondentUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        respondentArtistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true, index: true },
        claimType: {
            type: String,
            enum: ["ownership", "license", "metadata", "other"],
            default: "ownership",
        },
        statement: { type: String, required: true, trim: true, maxlength: 5000 },
        requestedAction: {
            type: String,
            enum: ["remove_content", "credit_update", "review"],
            default: "review",
        },
        evidence: { type: [evidenceSchema], default: [] },
        status: {
            type: String,
            enum: ["submitted", "under_review", "responded", "resolved", "rejected", "withdrawn", "appealed"],
            default: "submitted",
            index: true,
        },
        response: { type: responseSchema, default: () => ({}) },
        appeal: { type: appealSchema, default: () => ({}) },
        decision: { type: decisionSchema, default: () => ({}) },
    },
    { timestamps: true }
);

CopyrightClaimSchema.index({ trackId: 1, status: 1, createdAt: -1 });
CopyrightClaimSchema.index({ claimantUserId: 1, createdAt: -1 });

const CopyrightClaim = model("CopyrightClaim", CopyrightClaimSchema);
export default CopyrightClaim;
