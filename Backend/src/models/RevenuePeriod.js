import mongoose from "mongoose";

const { Schema, model } = mongoose;

const RevenuePeriodSchema = new Schema(
    {
        year: { type: Number, required: true, index: true },
        month: { type: Number, required: true, min: 1, max: 12, index: true },

        periodStart: { type: Date, required: true },
        periodEnd: { type: Date, required: true },

        status: {
            type: String,
            enum: ["open", "closed", "calculated", "confirmed"],
            default: "open",
            index: true,
        },

        totalPremiumRevenue: { type: Number, default: 0, min: 0 },
        totalArtistPool: { type: Number, default: 0, min: 0 },
        totalPlatformRevenue: { type: Number, default: 0, min: 0 },
        totalEligibleStreams: { type: Number, default: 0, min: 0 },

        closedAt: { type: Date, default: null },
        calculatedAt: { type: Date, default: null },
        confirmedAt: { type: Date, default: null },
        confirmedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

RevenuePeriodSchema.index({ year: 1, month: 1 }, { unique: true });

const RevenuePeriod = model("RevenuePeriod", RevenuePeriodSchema);

export default RevenuePeriod;
