import mongoose from "mongoose";
const { Schema, model } = mongoose;

const NotificationSchema = new Schema(
    {
        // Không để required, vì tin nhắn All/Group sẽ không cần điền trường này
        userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
        
        type: {
            type: String,
            enum: ["system", "new_release", "payment", "follow", "report", "subscription"],
            required: true,
            index: true,
        },
        title: { type: String, required: true, trim: true },
        content: { type: String, required: true },
        isRead: { type: Boolean, default: false, index: true }, // Chỉ dùng cho receiverType === "single"

        actorId: { type: Schema.Types.ObjectId },
        actorType: { type: String, enum: ["admin", "artist", "system", "user", ""], default: "" },
        targetId: { type: Schema.Types.ObjectId },
        targetType: { type: String, enum: ["track", "album", "plan", "payment", "report", "artist", ""], default: "" },

        receiverType: { type: String, enum: ["single", "all", "group"], default: "single" },
        isGlobal: { type: Boolean, default: false, index: true },

        // 👇 CÁC TRƯỜNG QUAN TRỌNG ĐỂ GỘP RECORD
        targetRoles: [{ type: String, enum: ["user", "artist"] }], 
        readBy: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
        deletedBy: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],

        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date },
    },
    { timestamps: true }
);

const Notification = model("Notification", NotificationSchema);
export default Notification;