const ArtistDailyRankingSchema = new Schema(
    {
        artistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true, index: true },
        date: { type: Date, required: true, index: true },

        playCount: { type: Number, default: 0 },
        uniqueListeners: { type: Number, default: 0 },
        totalTracksPlayed: { type: Number, default: 0 },

        score: { type: Number, default: 0 },
        rank: { type: Number, required: true },
    },
    { timestamps: true }
);

ArtistDailyRankingSchema.index({ date: 1, rank: 1 });
ArtistDailyRankingSchema.index({ artistId: 1, date: 1 }, { unique: true });

export default model("ArtistDailyRanking", ArtistDailyRankingSchema);