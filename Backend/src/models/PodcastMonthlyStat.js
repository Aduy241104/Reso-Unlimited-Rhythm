import mongoose from "mongoose";

const { Schema, model } = mongoose;

const PodcastMonthlyStatSchema = new Schema(
    {
        podcastId: {
            type: Schema.Types.ObjectId,
            ref: "Podcast",
            required: true,
            index: true,
        },
        year: { type: Number, required: true, min: 2000 },
        month: { type: Number, required: true, min: 1, max: 12 },
        listenCount: { type: Number, default: 0, min: 0 },
        eligibleStreams: { type: Number, default: 0, min: 0 },
        revenue: {
            eligibleStreams: { type: Number, default: 0, min: 0 },
            revenueAmount: { type: Number, default: 0, min: 0 },
            artistRevenueAmount: { type: Number, default: 0, min: 0 },
            calculatedAt: { type: Date, default: null },
        },
    },
    { timestamps: true }
);

PodcastMonthlyStatSchema.index({ podcastId: 1, year: 1, month: 1 }, { unique: true });
PodcastMonthlyStatSchema.index({ year: 1, month: 1, "revenue.artistRevenueAmount": -1 });

const PodcastMonthlyStat = model("PodcastMonthlyStat", PodcastMonthlyStatSchema);

export default PodcastMonthlyStat;
