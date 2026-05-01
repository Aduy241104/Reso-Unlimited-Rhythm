import mongoose from "mongoose";

const { Schema, model } = mongoose;

const PodcastSchema = new Schema(
    {
        title: { type: String, required: true, trim: true, index: true },
        artistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true, index: true },

        description: { type: String, default: "" },
        coverImage: { type: String, default: "" },
        trailerUrl: { type: String, default: "" },

        stats: {
            followers: { type: Number, default: 0, min: 0 },
            totalPlays: { type: Number, default: 0, min: 0 },
        },

        activeStatus: {
            type: String,
            enum: ["draft", "active", "hidden", "blocked"],
            default: "draft",
            index: true,
        },

        approvalStatus: {
            type: String,
            enum: ["draft", "pending", "approved", "rejected"],
            default: "draft",
            index: true,
        },

        blockedReason: { type: String, default: "" },
    },
    { timestamps: true }
);

PodcastSchema.index({ artistId: 1, title: 1 });

const Podcast = model("Podcast", PodcastSchema);
export default Podcast;
