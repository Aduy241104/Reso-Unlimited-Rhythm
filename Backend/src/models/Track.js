import mongoose from "mongoose";

const { Schema, model } = mongoose;

const TrackSchema = new Schema(
    {
        title: { type: String, required: true, trim: true, index: true },
        artist_artistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true, index: true },
        album_albumId: { type: Schema.Types.ObjectId, ref: "Album", index: true },
        genreIds: [{ type: Schema.Types.ObjectId, ref: "Genre" }],
        audioFiles: [{
            url: { type: String, required: true },
            format: { type: String, required: true },
            bitrate: { type: Number, required: true },
            label: { type: String, enum: ["original", "high", "medium", "low", "lowest"], default: "original" },
            priority: { type: Number, default: 0 },
         }],

        duration: { type: Number, required: true, min: 0 },
        avatar: { type: String, default: "" },
        coverImage: [{ type: String }],
        lyricsStatic: { type: String, default: "" },
        lyricsSyncUrl: { type: String, default: "" },

        stats: {
            totalLike: { type: Number, default: 0, min: 0 },
            totalPlay: { type: Number, default: 0, min: 0 },
        },

        releaseDate: { type: Date },
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
        rejectReason: {
            type: String,
            default: "",
        },

        blockedReason: { type: String, default: "" },
        hiddenReason: { type: String, default: "" },
        hiddenAt: { type: Date },
    },
    { timestamps: true }
);

TrackSchema.index({ artist_artistId: 1, title: 1 });

const Track = model("Track", TrackSchema);
export default Track;   
