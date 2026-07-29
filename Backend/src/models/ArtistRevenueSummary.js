import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ArtistRevenueSummarySchema = new Schema(
    {
        artistId: {
            type: Schema.Types.ObjectId,
            ref: "Artist",
            required: true,
            index: true,
        },
        year: {
            type: Number,
            required: true,
            min: 2000,
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },
        totalEligibleStreams: {
            type: Number,
            default: 0,
            min: 0,
        },
        grossRevenueAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        artistRevenueAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        platformRevenueAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        withdrawnAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        availableAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
            type: String,
            enum: [
                "pending",
                "calculated",
                "confirmed"
            ],
            default: "pending",
            index: true,
        },
        calculatedAt: {
            type: Date,
            default: null,
        },
        confirmedAt: {
            type: Date,
            default: null,
        },
        confirmedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

ArtistRevenueSummarySchema.index({ artistId: 1, year: 1, month: 1 }, { unique: true });
ArtistRevenueSummarySchema.index({ year: 1, month: 1 });

export default model("ArtistRevenueSummary", ArtistRevenueSummarySchema);
