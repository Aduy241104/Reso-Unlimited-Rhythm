import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockTrackFindById = jest.fn();
const mockDailyFind = jest.fn();
const mockMonthlyFind = jest.fn();

const createQuery = (result) => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
});

jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: { findOne: mockArtistFindOne },
}));
jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: { findById: mockTrackFindById },
}));
jest.unstable_mockModule("../../src/models/TrackDailyStat.js", () => ({
    default: { find: mockDailyFind },
}));
jest.unstable_mockModule("../../src/models/TrackMonthlyStat.js", () => ({
    default: { find: mockMonthlyFind },
}));
jest.unstable_mockModule(
    "../../src/services/analytics/trackStatAggregation.service.js",
    () => ({ getAnalyticsTimezone: () => "UTC" })
);

const trackAnalyticsService = (
    await import("../../src/services/artist/trackAnalytics.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const otherArtistId = new mongoose.Types.ObjectId();
const trackId = new mongoose.Types.ObjectId();

const ownedTrack = (overrides = {}) => ({
    _id: trackId,
    title: "Shape of You",
    avatar: "track.jpg",
    coverImage: ["cover.jpg"],
    duration: 180,
    artist_artistId: artistId,
    releaseDate: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
});

describe("UT-95 getTrackAnalyticsOverview", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-16T12:00:00.000Z"));
        mockArtistFindOne.mockReturnValue(createQuery({ _id: artistId }));
        mockTrackFindById.mockReturnValue(createQuery(ownedTrack()));
        mockDailyFind.mockReturnValue(createQuery([]));
        mockMonthlyFind.mockReturnValue(createQuery([]));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("UTCID01 - returns calculated summary and normalized charts", async () => {
        const dailyStats = [
            {
                dateKey: "2026-07-15",
                playCount: 120,
                uniqueListeners: 80,
                averageListenDuration: 180,
                skipCount: 15,
                updatedAt: "2026-07-15T12:00:00.000Z",
            },
        ];
        mockDailyFind
            .mockReturnValueOnce(createQuery(dailyStats))
            .mockReturnValueOnce(createQuery(dailyStats));
        mockMonthlyFind.mockReturnValue(
            createQuery([
                {
                    year: 2026,
                    month: 7,
                    playCount: 120,
                    uniqueListeners: 80,
                    revenueAmount: 150000,
                },
            ])
        );

        const result = await trackAnalyticsService.getTrackAnalyticsOverview({
            userId,
            trackId,
            range: "7d",
        });

        expect(result.period).toEqual({
            from: "2026-07-10",
            to: "2026-07-16",
            range: "7d",
        });
        expect(result.summary).toMatchObject({
            totalPlays: 120,
            uniqueListeners: 80,
            totalListeningTime: 360,
            averageListenDuration: 3,
            skipCount: 15,
            skipRate: 11.11,
        });
        expect(result.dailyChart).toHaveLength(7);
        expect(result.monthlyChart).toHaveLength(12);
        expect(result.monthlyChart.at(-1)).toMatchObject({
            month: "2026-07",
            playCount: 120,
            artistRevenueAmount: 150000,
        });
    });

    test("UTCID02 - returns zero values when statistics are empty", async () => {
        const result = await trackAnalyticsService.getTrackAnalyticsOverview({
            userId,
            trackId,
            range: "7d",
        });

        expect(result.summary).toEqual({
            totalPlays: 0,
            uniqueListeners: 0,
            totalListeningTime: 0,
            averageListenDuration: 0,
            skipCount: 0,
            skipRate: 0,
        });
        expect(result.dailyChart.every((item) => item.playCount === 0)).toBe(true);
        expect(result.lastUpdatedAt).toBeNull();
    });

    test("UTCID03 - throws 404 when artist profile does not exist", async () => {
        mockArtistFindOne.mockReturnValue(createQuery(null));

        await expect(
            trackAnalyticsService.getTrackAnalyticsOverview({
                userId,
                trackId,
                range: "7d",
            })
        ).rejects.toMatchObject({ message: "Artist profile not found.", statusCode: 404 });
    });

    test("UTCID04 - throws 400 when track ID is invalid", async () => {
        await expect(
            trackAnalyticsService.getTrackAnalyticsOverview({
                userId,
                trackId: "invalid-id",
                range: "7d",
            })
        ).rejects.toMatchObject({ message: "Invalid request data.", statusCode: 400 });
    });

    test("UTCID05 - throws 403 when artist does not own the track", async () => {
        mockTrackFindById.mockReturnValue(
            createQuery(ownedTrack({ artist_artistId: otherArtistId }))
        );

        await expect(
            trackAnalyticsService.getTrackAnalyticsOverview({
                userId,
                trackId,
                range: "7d",
            })
        ).rejects.toMatchObject({
            message: "You are not allowed to view analytics for this track",
            statusCode: 403,
        });
    });
});
