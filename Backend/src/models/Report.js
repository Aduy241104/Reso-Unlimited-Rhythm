import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ReportSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        targetId: { type: Schema.Types.ObjectId, required: true, index: true },
        targetType: { type: String, enum: ["track", "album", "podcast", "episode", "artist"], required: true, index: true },
        reason: { type: String, required: true, trim: true },
        description: { type: String, default: "" },
        images: [{ type: String }],
        status: { type: String, enum: ["pending", "reviewing", "resolved", "rejected"], default: "pending", index: true },
        handledBy: { type: Schema.Types.ObjectId, ref: "User" },
        handledAt: { type: Date },
        resolution: { type: String, enum: ["remove_content", "ignore", "warning", ""], default: "" },
        resolutionNote: { type: String, default: "" },
    },
    { timestamps: true }
);

const Report = model("Report", ReportSchema);

export default Report;
