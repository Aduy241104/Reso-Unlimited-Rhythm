import mongoose from "mongoose";

const { Schema, model } = mongoose;

const TrackDailyStatSchema = new Schema(
    {
        trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true, index: true },
        date: { type: Date, required: true, index: true },
        playCount: { type: Number, default: 0, min: 0 },
        uniqueListeners: { type: Number, default: 0, min: 0 },
        skipCount: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
);

TrackDailyStatSchema.index({ trackId: 1, date: 1 }, { unique: true });
TrackDailyStatSchema.index({ date: 1, playCount: -1 });

const TrackDailyStat = model("TrackDailyStat", TrackDailyStatSchema);

export default TrackDailyStat;
