import mongoose from "mongoose";

const { Schema, model } = mongoose;

const PlaylistTrackSchema = new Schema(
    {
        trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true },
        addedAt: { type: Date, default: Date.now },
        order: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const PlaylistSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        title: { type: String, required: true, trim: true, index: true },
        description: { type: String, default: "" },
        type: {
            type: String,
            enum: ["user", "system", "ai_generated"],
            default: "user",
            index: true,
        },
        coverImage: { type: String, default: "" },
        isPublic: { type: Boolean, default: false, index: true },
        isHidden: { type: Boolean, default: false, index: true },
        aiPrompt: { type: String, default: "" },
        aiGeneratedAt: { type: Date },
        trackCount: { type: Number, default: 0, min: 0 },
        totalDuration: { type: Number, default: 0, min: 0 },
        tracks: [PlaylistTrackSchema],
    },
    { timestamps: true }
);

PlaylistSchema.index({ userId: 1, title: 1 });

const Playlist = model("Playlist", PlaylistSchema);

export default Playlist;
    