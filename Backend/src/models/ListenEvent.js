import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ListenEventSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        trackId: { type: Schema.Types.ObjectId, ref: "Track", required: true, index: true },
        artistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true, index: true },
        listenedAt: { type: Date, default: Date.now, index: true },
        trackDuration: { type: Number, default: null, min: 0 },
        listenedDuration: { type: Number, default: null, min: 0 },
        listenPercent: { type: Number, default: null, min: 0, max: 100 },
        dailyListenOrder: { type: Number, default: null, min: 1 },
        requiredPercent: { type: Number, default: null, min: 0, max: 100 },
        source: {
            type: String,
            enum: ["track_detail", "album", "playlist", "search", "artist_profile", "unknown"],
            default: "unknown",
        },
        isValidStream: { type: Boolean, default: null, index: true },
        duration: { type: Number, default: 0, min: 0 },
        completed: { type: Boolean, default: false },
        skipped: { type: Boolean, default: false },
    },
    { timestamps: true }
);

ListenEventSchema.index({ userId: 1, listenedAt: -1 });
ListenEventSchema.index({ userId: 1, trackId: 1, listenedAt: -1 });
ListenEventSchema.index({ trackId: 1, listenedAt: -1 });
ListenEventSchema.index({ artistId: 1, listenedAt: -1 });
ListenEventSchema.index({ trackId: 1, listenedAt: -1, isValidStream: 1 });
ListenEventSchema.index({ artistId: 1, listenedAt: -1, isValidStream: 1 });

const ListenEvent = model("ListenEvent", ListenEventSchema);
export default ListenEvent;
