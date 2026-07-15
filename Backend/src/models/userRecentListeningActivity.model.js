import mongoose from "mongoose";

const { Schema, model } = mongoose;

const RECENT_ACTIVITY_SOURCE_ENUM = [
    "track_detail",
    "album",
    "playlist",
    "search",
    "artist_profile",
    "unknown",
];

const UserRecentListeningActivitySchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        trackId: {
            type: Schema.Types.ObjectId,
            ref: "Track",
            required: true,
            index: true,
        },
        artistId: {
            type: Schema.Types.ObjectId,
            ref: "Artist",
            default: null,
            index: true,
        },
        albumId: {
            type: Schema.Types.ObjectId,
            ref: "Album",
            default: null,
            index: true,
        },
        trackTitle: { type: String, required: true, trim: true },
        trackImage: { type: String, default: "" },
        artistName: { type: String, default: "" },
        artistAvatar: { type: String, default: "" },
        albumTitle: { type: String, default: "" },
        albumCoverImage: { type: String, default: "" },
        trackDuration: { type: Number, default: null, min: 0 },
        listenedDuration: { type: Number, required: true, min: 0 },
        listenPercent: { type: Number, default: null, min: 0, max: 100 },
        listenedAt: { type: Date, default: Date.now, index: true },
        source: {
            type: String,
            enum: RECENT_ACTIVITY_SOURCE_ENUM,
            default: "unknown",
        },
    },
    { timestamps: true }
);

UserRecentListeningActivitySchema.index({ userId: 1, listenedAt: -1 });
UserRecentListeningActivitySchema.index({ userId: 1, trackId: 1, listenedAt: -1 });

const UserRecentListeningActivity = model(
    "UserRecentListeningActivity",
    UserRecentListeningActivitySchema,
    "recentlisteningactivities"
);

export default UserRecentListeningActivity;
