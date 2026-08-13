import mongoose from "mongoose";

const { Schema, model } = mongoose;

const AuditLogSchema = new Schema(
    {
        actorUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
        actorSnapshot: {
            id: { type: Schema.Types.ObjectId },
            email: { type: String, default: "" },
            role: { type: String, default: "" },
        },
        action: { type: String, required: true, index: true },
        targetType: { type: String, required: true, index: true },
        targetId: { type: Schema.Types.ObjectId, index: true },
        metadata: { type: Schema.Types.Mixed, default: {} },
        previousHash: { type: String, default: "" },
        eventHash: { type: String, required: true, unique: true, index: true },
        occurredAt: { type: Date, default: Date.now, index: true },
    },
    { timestamps: true }
);

AuditLogSchema.index({ targetType: 1, targetId: 1, occurredAt: -1 });

const AuditLog = model("AuditLog", AuditLogSchema);
export default AuditLog;
