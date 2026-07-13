import mongoose from "mongoose";

const { Schema, model } = mongoose;

const RecentListeningInsightGenreSchema = new Schema(
    {
        genreId: {
            type: Schema.Types.ObjectId,
            ref: "Genre",
            default: null,
        },
        name: { type: String, default: "" },
        listenCount: { type: Number, default: 0, min: 0 },
        trackCount: { type: Number, default: 0, min: 0 },
        percentage: { type: Number, default: 0, min: 0 },
    },
    { _id: false }
);

const RecentListeningInsightTrackGenreSchema = new Schema(
    {
        genreId: {
            type: Schema.Types.ObjectId,
            ref: "Genre",
            default: null,
        },
        name: { type: String, default: "" },
    },
    { _id: false }
);

const RecentListeningInsightTrackSchema = new Schema(
    {
        trackId: {
            type: Schema.Types.ObjectId,
            ref: "Track",
            default: null,
        },
        title: { type: String, default: "" },
        image: { type: String, default: "" },
        listenCount: { type: Number, default: 0, min: 0 },
        listenedMinutes: { type: Number, default: 0, min: 0 },
        genres: {
            type: [RecentListeningInsightTrackGenreSchema],
            default: [],
        },
    },
    { _id: false }
);

const UserRecentListeningInsightsCacheSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },
        range: {
            from: { type: String, required: true, trim: true },
            to: { type: String, required: true, trim: true },
        },
        topGenres: {
            type: [RecentListeningInsightGenreSchema],
            default: [],
        },
        topTracks: {
            type: [RecentListeningInsightTrackSchema],
            default: [],
        },
        lastCalculatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

const UserRecentListeningInsightsCache = model(
    "UserRecentListeningInsightsCache",
    UserRecentListeningInsightsCacheSchema,
    "userrecentlisteninginsights"
);

export default UserRecentListeningInsightsCache;
