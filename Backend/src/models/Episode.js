import mongoose from "mongoose";

const { Schema, model } = mongoose;

const EpisodeSchema = new Schema(
    {
        podcastId: { type: Schema.Types.ObjectId, ref: "Podcast", required: true, index: true },

        title: { type: String, required: true, trim: true, index: true },
        description: { type: String, default: "" },
        thumbnailUrl: { type: String, default: "" },

        audioFiles: [{ type: String }],
        duration: { type: Number, required: true, min: 0 },

        stats: {
            totalPlay: { type: Number, default: 0, min: 0 },
            totalLikes: { type: Number, default: 0, min: 0 },
        },

        activeStatus: {
            type: String,
            enum: ["draft", "active", "hidden", "blocked"],
            default: "draft",
            index: true,
        },

        blockedReason: { type: String, default: "" },
    },
    { timestamps: true }
);

EpisodeSchema.index({ podcastId: 1, title: 1 });

const Episode = model("Episode", EpisodeSchema);
export default Episode;