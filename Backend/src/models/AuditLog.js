import mongoose from "mongoose";

const { Schema, model } = mongoose;

const AuditLogSchema = new Schema(
    {
        actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

        action: {
            type: String,
            required: true,
            index: true,
            // ví dụ: "artist.block", "track.hide", "album.update", "user.ban"
        },

        targetType: {
            type: String,
            required: true,
            enum: ["User", "Artist", "Track", "Album", "Podcast", "Playlist", "Report"],
            index: true,
        },

        targetId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },

        reason: { type: String, default: "" },

        metadata: {
            before: { type: Schema.Types.Mixed },
            after: { type: Schema.Types.Mixed },
            note: { type: String },
        },

        ipAddress: { type: String, default: "" },
        userAgent: { type: String, default: "" },
    },
    { timestamps: true }
);

AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });

const AuditLog = model("AuditLog", AuditLogSchema);
export default AuditLog;
