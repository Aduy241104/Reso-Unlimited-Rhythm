import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ListenEventSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        trackId: { type: Schema.Types.ObjectId, ref: "Track", index: true },
        artistId: { type: Schema.Types.ObjectId, ref: "Artist", index: true },
        podcastId: { type: Schema.Types.ObjectId, ref: "Podcast", index: true },
        episodeId: { type: Schema.Types.ObjectId, ref: "Episode", index: true },
        listenedAt: { type: Date, default: Date.now, index: true },
        duration: { type: Number, default: 0, min: 0 },
        completed: { type: Boolean, default: false },
        skipped: { type: Boolean, default: false },
        device: { type: String, default: "" },
        country: { type: String, default: "" },
    },
    { timestamps: true }
);

ListenEventSchema.index({ userId: 1, listenedAt: -1 });

const ListenEvent = model("ListenEvent", ListenEventSchema);
export default ListenEvent;