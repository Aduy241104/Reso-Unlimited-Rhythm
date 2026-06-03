import mongoose from "mongoose";

const { Schema, model } = mongoose;

const NotificationSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
        type: {
            type: String,
            enum: ["system", "new_release", "payment", "follow", "report", "subscription"],
            required: true,
            index: true,
        },
        title: { type: String, required: true, trim: true },
        content: { type: String, required: true },
        isRead: { type: Boolean, default: false, index: true },

        actorId: { type: Schema.Types.ObjectId },
        actorType: { type: String, enum: ["admin", "artist", "system", "user", ""], default: "" },

        targetId: { type: Schema.Types.ObjectId },
        targetType: { type: String, enum: ["track", "album", "plan", "payment", "report", "artist", ""], default: "" },

        receiverType: { type: String, enum: ["single", "all", "group"], default: "single" },
        isGlobal: { type: Boolean, default: false },

        createdBy: { type: Schema.Types.ObjectId, ref: "User" },

        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date },
    },
    { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
const Notification = model("Notification", NotificationSchema);
export default Notification;    
