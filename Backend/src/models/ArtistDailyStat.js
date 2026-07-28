import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ArtistDailyStatSchema = new Schema(
    {
        artistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true, index: true },
        dateKey: { type: String, required: true, trim: true, index: true },
        date: { type: Date, required: true, index: true },
        streamCount: { type: Number, default: 0, min: 0 },
        uniqueListeners: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
);

ArtistDailyStatSchema.index({ artistId: 1, date: 1 }, { unique: true });
ArtistDailyStatSchema.index({ date: 1, streamCount: -1 });

const ArtistDailyStat = model("ArtistDailyStat", ArtistDailyStatSchema);

export default ArtistDailyStat;
