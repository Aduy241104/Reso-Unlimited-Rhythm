import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ArtistDailyRankingItemSchema = new Schema(
    {
        artistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true },
        playCount: { type: Number, default: 0, min: 0 },
        uniqueListeners: { type: Number, default: 0, min: 0 },
        completedPlayCount: { type: Number, default: 0, min: 0 },
        totalTracksPlayed: { type: Number, default: 0, min: 0 },
        score: { type: Number, default: 0, min: 0 },
        rank: { type: Number, required: true, min: 1 },
    },
    { _id: false }
);

const ArtistDailyRankingSchema = new Schema(
    {
        dateKey: { type: String, required: true, trim: true, index: true },
        date: { type: Date, required: true, index: true },
        rankings: {
            type: [ArtistDailyRankingItemSchema],
            default: [],
            validate: {
                validator: (value) => value.length <= 20,
                message: "Artist daily rankings cannot contain more than 20 artists.",
            },
        },
    },
    { timestamps: true }
);

ArtistDailyRankingSchema.index({ date: 1 }, { unique: true });

const ArtistDailyRanking = model("ArtistDailyRanking", ArtistDailyRankingSchema);

export default ArtistDailyRanking;
