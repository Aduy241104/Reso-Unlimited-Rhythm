import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ReleaseScheduleSchema = new Schema(
    {
        type: { type: String, enum: ["track", "album"], required: true, index: true },
        targetId: { type: Schema.Types.ObjectId, required: true, index: true },
        artistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true, index: true },
        scheduledAt: { type: Date, required: true, index: true },
        releasedAt: { type: Date },
        status: { type: String, enum: ["scheduled", "released", "cancelled"], default: "scheduled", index: true },
    },
    { timestamps: true }
);

const ReleaseSchedule = model("ReleaseSchedule", ReleaseScheduleSchema);

export default ReleaseSchedule;
