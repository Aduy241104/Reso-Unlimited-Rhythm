import mongoose from "mongoose";

const { Schema, model } = mongoose;

const PlatformMonthlyStatSchema = new Schema(
    {
        year: { type: Number, required: true, min: 2000, index: true },
        month: { type: Number, required: true, min: 1, max: 12, index: true },

        periodStart: { type: Date, required: true },
        periodEnd: { type: Date, required: true },

        userStats: {
            newUsers: { type: Number, default: 0, min: 0 },
            totalUsers: { type: Number, default: 0, min: 0 },
        },

        artistStats: {
            totalArtists: { type: Number, default: 0, min: 0 },
        },

        streamingStats: {
            totalStreams: { type: Number, default: 0, min: 0 },
            trackStreams: { type: Number, default: 0, min: 0 },
            totalListeningTime: { type: Number, default: 0, min: 0 },
        },

        dailyStats: [{
            date: { type: String, required: true },
            totalStreams: { type: Number, default: 0, min: 0 },
            uniqueUsers: { type: Number, default: 0, min: 0 },
            totalListeningTime: { type: Number, default: 0, min: 0 },
            topTracks: [{
                trackId: { type: Schema.Types.ObjectId, ref: "Track" },
                title: { type: String, default: "" },
                streamCount: { type: Number, default: 0, min: 0 },
            }],
            topArtists: [{
                artistId: { type: Schema.Types.ObjectId, ref: "Artist" },
                streamCount: { type: Number, default: 0, min: 0 },
            }],
        }],
    },
    { timestamps: true }
);

PlatformMonthlyStatSchema.index({ year: 1, month: 1 }, { unique: true });
PlatformMonthlyStatSchema.index({ "dailyStats.date": 1 });

const PlatformMonthlyStat = model("PlatformMonthlyStat", PlatformMonthlyStatSchema);

export default PlatformMonthlyStat;
