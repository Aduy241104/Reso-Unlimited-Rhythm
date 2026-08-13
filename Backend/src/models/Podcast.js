import mongoose from "mongoose";

const { Schema, model } = mongoose;

const PodcastSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        description: {
            type: String,
            required: true,
        },

        creator: {
            type: Schema.Types.ObjectId,
            ref: "Artist",
            required: true,
            index: true,
        },

        audioUrl: {
            type: String,
            required: true,
        },

        coverImageUrl: {
            type: String,
            default: null,
        },

        duration: {
            type: Number,
            required: true,
            min: 0,
        },

        stats: {
            totalListen: {
                type: Number,
                default: 0,
                min: 0,
            },
        },

        genre: {
            type: Schema.Types.ObjectId,
            ref: "Genre",
            required: true,
            index: true,
        },

        releaseDate: {
            type: Date,
            required: true,
            index: true,
        },

        approvalStatus: {
            type: String,
            enum: ["draft", "pending", "approved", "rejected"],
            default: "draft",
            index: true,
        },

        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        reviewedAt: {
            type: Date,
            default: null,
        },

        rejectReason: {
            type: String,
            default: null,
        },

        visibility: {
            type: String,
            enum: ["public", "hidden"],
            default: "hidden",
            index: true,
        },

        isBlocked: {
            type: Boolean,
            default: false,
            index: true,
        },

        blockedReason: {
            type: String,
            default: null,
        },

        blockedAt: {
            type: Date,
            default: null,
        },

        copyrightType: {
            type: String,
            enum: ["original", "licensed", "third_party"],
            required: true,
        },

        copyrightSource: {
            type: String,
            default: null,
        },

        copyrightProofUrl: {
            type: String,
            default: null,
        },

        copyrightConfirmed: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

PodcastSchema.index({ creator: 1, title: 1 });
PodcastSchema.index({ approvalStatus: 1, visibility: 1, isBlocked: 1 });

const Podcast = model("Podcast", PodcastSchema);

export default Podcast;
