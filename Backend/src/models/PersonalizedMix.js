import mongoose from "mongoose";

const { Schema, model } = mongoose;

const PersonalizedMixBasedOnGenreSchema = new Schema(
    {
        genreId: {
            type: Schema.Types.ObjectId,
            ref: "Genre",
        },
        name: {
            type: String,
            default: "",
            trim: true,
        },
        score: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { _id: false }
);

const PersonalizedMixBasedOnArtistSchema = new Schema(
    {
        artistId: {
            type: Schema.Types.ObjectId,
            ref: "Artist",
        },
        name: {
            type: String,
            default: "",
            trim: true,
        },
        score: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { _id: false }
);

const PersonalizedMixTrackSchema = new Schema(
    {
        trackId: {
            type: Schema.Types.ObjectId,
            ref: "Track",
            required: true,
        },
        order: {
            type: Number,
            required: true,
            min: 0,
        },
        score: {
            type: Number,
            default: 0,
            min: 0,
        },
        reason: {
            type: String,
            enum: [
                "liked_track",
                "frequent_listen",
                "same_genre",
                "same_artist",
                "followed_artist",
                "user_playlist",
                "trending_match",
                "fallback_trending",
            ],
            default: "same_genre",
        },
    },
    { _id: false }
);

const PersonalizedMixSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        dateKey: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        date: {
            type: Date,
            required: true,
            index: true,
        },

        mixType: {
            type: String,
            enum: ["daily_mix", "discover_mix", "recent_mix"],
            default: "daily_mix",
            index: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            default: "",
        },

        basedOn: {
            genres: {
                type: [PersonalizedMixBasedOnGenreSchema],
                default: [],
            },
            artists: {
                type: [PersonalizedMixBasedOnArtistSchema],
                default: [],
            },
        },

        tracks: {
            type: [PersonalizedMixTrackSchema],
            default: [],
        },

        algorithmVersion: {
            type: String,
            default: "rule_based_v1",
            index: true,
        },

        generatedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },

        expiresAt: {
            type: Date,
            index: true,
        },
    },
    { timestamps: true }
);

PersonalizedMixSchema.index(
    { userId: 1, dateKey: 1, mixType: 1, title: 1 },
    { unique: true }
);

PersonalizedMixSchema.index({ userId: 1, dateKey: 1 });

const PersonalizedMix = model("PersonalizedMix", PersonalizedMixSchema);

export default PersonalizedMix;
