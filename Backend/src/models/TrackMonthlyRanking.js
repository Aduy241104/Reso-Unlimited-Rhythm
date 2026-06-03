import mongoose from "mongoose";

const { Schema, model } = mongoose;

const TrackMonthlyRankingItemSchema = new Schema(
    {
        trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true },
        playCount: { type: Number, default: 0, min: 0 },
        uniqueListeners: { type: Number, default: 0, min: 0 },
        rank: { type: Number, required: true, min: 1 },
    },
    { _id: false }
);

const TrackMonthlyRankingSchema = new Schema(
    {
        year: { type: Number, required: true, min: 2000 },
        month: { type: Number, required: true, min: 1, max: 12 },
        rankings: {
            type: [TrackMonthlyRankingItemSchema],
            default: [],
            validate: {
                validator: (value) => value.length <= 100,
                message: "Track monthly rankings cannot contain more than 100 tracks.",
            },
        },
    },
    { timestamps: true }
);

TrackMonthlyRankingSchema.index({ year: 1, month: 1 }, { unique: true });

const TrackMonthlyRanking = model("TrackMonthlyRanking", TrackMonthlyRankingSchema);

export default TrackMonthlyRanking;
