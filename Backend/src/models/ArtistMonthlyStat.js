import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ArtistMonthlyStatSchema = new Schema(
    {
        artistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true, index: true },
        year: { type: Number, required: true, min: 1980 },
        month: { type: Number, required: true, min: 1, max: 12 },
        newFollowers: { type: Number, default: 0, min: 0 },
        totalFollowers: { type: Number, default: 0, min: 0 },
        totalStreams: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
);

ArtistMonthlyStatSchema.index({ artistId: 1, year: 1, month: 1 }, { unique: true });
 const ArtistMonthlyStat = model("ArtistMonthlyStat", ArtistMonthlyStatSchema);
 export default ArtistMonthlyStat;
