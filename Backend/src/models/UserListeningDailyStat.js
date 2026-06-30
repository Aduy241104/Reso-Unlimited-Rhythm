import mongoose from "mongoose";

const { Schema, model } = mongoose;

const UserListeningDailyStatSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        dateKey: { type: String, required: true, trim: true, index: true },
        date: { type: Date, required: true },
        listenCount: { type: Number, default: 0, min: 0 },
        totalListenedDuration: { type: Number, default: 0, min: 0 },
        uniqueTracks: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
);

UserListeningDailyStatSchema.index({ userId: 1, dateKey: 1 }, { unique: true });
UserListeningDailyStatSchema.index({ dateKey: 1, listenCount: -1 });

const UserListeningDailyStat = model(
    "UserListeningDailyStat",
    UserListeningDailyStatSchema
);

export default UserListeningDailyStat;
