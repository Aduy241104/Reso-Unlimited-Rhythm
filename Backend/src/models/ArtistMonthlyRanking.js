import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ArtistMonthlyRankingItemSchema = new Schema(
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

const ArtistMonthlyRankingSchema = new Schema(
    {
        year: { type: Number, required: true, min: 2000 },
        month: { type: Number, required: true, min: 1, max: 12 },
        rankings: {
            type: [ArtistMonthlyRankingItemSchema],
            default: [],
            validate: {
                validator: (value) => value.length <= 20,
                message: "Artist monthly rankings cannot contain more than 20 artists.",
            },
        },
    },
    { timestamps: true }
);

ArtistMonthlyRankingSchema.index({ year: 1, month: 1 }, { unique: true });

const ArtistMonthlyRanking = model("ArtistMonthlyRanking", ArtistMonthlyRankingSchema);

export default ArtistMonthlyRanking;
