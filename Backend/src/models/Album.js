import mongoose from "mongoose";

const { Schema, model } = mongoose;

const AlbumSchema = new Schema(
    {
        title: { type: String, required: true, trim: true, index: true },
        artistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true, index: true },
        coverImage: { type: String, default: "" },
        trackList: [
            {
                trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true },
                order: { type: Number, required: true },
            }
        ],
        releaseDate: { type: Date },

        status: {
            type: String,
            enum: ["draft", "active", "hidden", "blocked"],
            default: "draft",
            index: true,
        },

        blockedReason: { type: String, default: "" },
        previousStatusBeforeAdminBlock: {
            type: String,
            enum: ["draft", "active", "hidden", null],
            default: null,
        },
        totalDuration: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
);

AlbumSchema.index({ artistId: 1, title: 1 });

const Album = model("Album", AlbumSchema);
export default Album;
