import mongoose from "mongoose";

const { Schema, model } = mongoose;

const TrackDailyRankingItemSchema = new Schema(
    {
        trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true },
        playCount: { type: Number, default: 0, min: 0 },
        uniqueListeners: { type: Number, default: 0, min: 0 },
        averageListenDuration: { type: Number, default: 0, min: 0 },
        skipCount: { type: Number, default: 0, min: 0 },
        rank: { type: Number, required: true, min: 1 },
        previousRank: { type: Number, default: null, min: 1 },
        rankChange: { type: Number, default: 0 },
        rankTrend: {
            type: String,
            enum: ["up", "down", "same", "new"],
            default: "new",
        },
    },
    { _id: false }
);

const TrackDailyRankingSchema = new Schema(
    {
        date: { type: Date, required: true, index: true },
        rankings: {
            type: [TrackDailyRankingItemSchema],
            default: [],
            validate: {
                validator: (value) => value.length <= 100,
                message: "Track daily rankings cannot contain more than 100 tracks.",
            },
        },
    },
    { timestamps: true }
);

TrackDailyRankingSchema.index({ date: 1 }, { unique: true });

const TrackDailyRanking = model("TrackDailyRanking", TrackDailyRankingSchema);

export default TrackDailyRanking;
