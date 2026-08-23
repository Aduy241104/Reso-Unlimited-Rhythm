import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ReportSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        targetId: { type: Schema.Types.ObjectId, required: true, index: true },
        targetType: { type: String, enum: ["track", "album", "artist"], required: true, index: true },
        reason: { type: String, required: true, trim: true },
        description: { type: String, default: "" },
        images: [{ type: String }],
        status: { type: String, enum: ["pending", "reviewing", "resolved", "rejected"], default: "pending", index: true },
        isValidReason: { type: Boolean, default: null },
        handledBy: { type: Schema.Types.ObjectId, ref: "User" },
        handledAt: { type: Date },
        resolutionBatchId: { type: String, default: "", index: true },
        resolution: { type: String, enum: ["remove_content", "hide_content", "block_artist", "ignore", "warning", "reject", ""], default: "" },
        resolutionNote: { type: String, default: "" },
    },
    { timestamps: true }
);

ReportSchema.index({ userId: 1, targetId: 1, targetType: 1, status: 1 });

const Report = model("Report", ReportSchema);

export default Report;
