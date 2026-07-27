import mongoose from "mongoose";

const { Schema, model } = mongoose;
const GUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ListenEventSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", default: undefined, index: true },
        guestId: {
            type: String,
            trim: true,
            lowercase: true,
            match: GUEST_ID_PATTERN,
            default: undefined,
            index: true,
        },
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

ListenEventSchema.pre("validate", function validateListenerIdentity(next) {
    const identityCount = Number(Boolean(this.userId)) + Number(Boolean(this.guestId));

    if (identityCount !== 1) {
        this.invalidate(
            "guestId",
            "A listen event must belong to exactly one userId or guestId."
        );
    }

    next();
});

ListenEventSchema.index({ userId: 1, listenedAt: -1 });
ListenEventSchema.index({ userId: 1, trackId: 1, listenedAt: -1 });
ListenEventSchema.index({ guestId: 1, listenedAt: -1 });
ListenEventSchema.index({ guestId: 1, trackId: 1, listenedAt: -1 });
ListenEventSchema.index({ trackId: 1, listenedAt: -1 });
ListenEventSchema.index({ artistId: 1, listenedAt: -1 });
ListenEventSchema.index({ trackId: 1, listenedAt: -1, isValidStream: 1 });
ListenEventSchema.index({ artistId: 1, listenedAt: -1, isValidStream: 1 });

const ListenEvent = model("ListenEvent", ListenEventSchema);
export default ListenEvent;
