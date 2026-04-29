import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ArtistStatSchema = new Schema(
    {
        artistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true, unique: true, index: true },

        totalStreams: { type: Number, default: 0, min: 0 },
        totalFollowers: { type: Number, default: 0, min: 0 },
        monthlyListeners: { type: Number, default: 0, min: 0 },

        demographics: {
            ageGroups: { type: Schema.Types.Mixed, default: {} },
            gender: { type: Schema.Types.Mixed, default: {} },
            countries: { type: Schema.Types.Mixed, default: {} },
        },
    },
    { timestamps: true }
);

const ArtistStat = model("ArtistStat", ArtistStatSchema);
export default ArtistStat;  