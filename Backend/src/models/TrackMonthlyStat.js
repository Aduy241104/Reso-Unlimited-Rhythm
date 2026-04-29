import mongoose from "mongoose";

const { Schema, model } = mongoose;

const TrackMonthlyStatSchema = new Schema(
    {
        trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true, index: true },
        year: { type: Number, required: true, min: 2000 },
        month: { type: Number, required: true, min: 1, max: 12 },
        playCount: { type: Number, default: 0, min: 0 },
        uniqueListeners: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
);

TrackMonthlyStatSchema.index({ trackId: 1, year: 1, month: 1 }, { unique: true });

const TrackMonthlyStat = model("TrackMonthlyStat", TrackMonthlyStatSchema);

export default TrackMonthlyStat;
