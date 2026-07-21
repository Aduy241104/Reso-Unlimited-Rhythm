import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export const ARTIST_RANKING_PERIOD_TYPES = Object.freeze({
    DAILY: "daily",
    MONTHLY: "monthly",
});

const ArtistRankingItemSchema = new Schema(
    {
        artistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true },
        playCount: { type: Number, default: 0, min: 0 },
        uniqueListeners: { type: Number, default: 0, min: 0 },
        completedPlayCount: { type: Number, default: 0, min: 0 },
        totalTracksPlayed: { type: Number, default: 0, min: 0 },
        score: { type: Number, default: 0, min: 0 },
        rank: { type: Number, required: true, min: 1 },
    },
    { _id: false }
);

const ArtistRankingSchema = new Schema(
    {
        periodType: {
            type: String,
            enum: Object.values(ARTIST_RANKING_PERIOD_TYPES),
            required: true,
            index: true,
        },
        dateKey: {
            type: String,
            trim: true,
            required() {
                return this.periodType === ARTIST_RANKING_PERIOD_TYPES.DAILY;
            },
        },
        date: {
            type: Date,
            required() {
                return this.periodType === ARTIST_RANKING_PERIOD_TYPES.DAILY;
            },
        },
        year: {
            type: Number,
            min: 2000,
            required() {
                return this.periodType === ARTIST_RANKING_PERIOD_TYPES.MONTHLY;
            },
        },
        month: {
            type: Number,
            min: 1,
            max: 12,
            required() {
                return this.periodType === ARTIST_RANKING_PERIOD_TYPES.MONTHLY;
            },
        },
        rankings: {
            type: [ArtistRankingItemSchema],
            default: [],
            validate: {
                validator: (value) => value.length <= 20,
                message: "Artist rankings cannot contain more than 20 artists.",
            },
        },
    },
    { timestamps: true }
);

ArtistRankingSchema.pre("validate", function normalizePeriodSpecificFields(next) {
    if (this.periodType === ARTIST_RANKING_PERIOD_TYPES.DAILY) {
        this.year = undefined;
        this.month = undefined;
    }

    if (this.periodType === ARTIST_RANKING_PERIOD_TYPES.MONTHLY) {
        this.dateKey = undefined;
        this.date = undefined;
    }

    next();
});

ArtistRankingSchema.index(
    { periodType: 1, dateKey: 1 },
    {
        unique: true,
        partialFilterExpression: {
            periodType: ARTIST_RANKING_PERIOD_TYPES.DAILY,
            dateKey: { $exists: true },
        },
    }
);
ArtistRankingSchema.index(
    { periodType: 1, date: 1 },
    {
        partialFilterExpression: {
            periodType: ARTIST_RANKING_PERIOD_TYPES.DAILY,
            date: { $type: "date" },
        },
    }
);
ArtistRankingSchema.index(
    { periodType: 1, year: 1, month: 1 },
    {
        unique: true,
        partialFilterExpression: {
            periodType: ARTIST_RANKING_PERIOD_TYPES.MONTHLY,
            year: { $exists: true },
            month: { $exists: true },
        },
    }
);

export const buildDailyArtistRankingFilter = ({ dateKey, startDate, endDate }) => ({
    periodType: ARTIST_RANKING_PERIOD_TYPES.DAILY,
    $or: [
        { dateKey },
        { date: { $gte: startDate, $lt: endDate } },
    ],
});

export const buildMonthlyArtistRankingFilter = ({ year, month }) => ({
    periodType: ARTIST_RANKING_PERIOD_TYPES.MONTHLY,
    year,
    month,
});

const ArtistRanking = models.ArtistRanking || model("ArtistRanking", ArtistRankingSchema);

export default ArtistRanking;
