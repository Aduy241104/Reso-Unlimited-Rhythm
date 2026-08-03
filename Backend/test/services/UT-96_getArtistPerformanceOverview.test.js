import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockDailyFind = jest.fn();
const mockDailyAggregate = jest.fn();
const mockListenAggregate = jest.fn();
const mockTrackCount = jest.fn();
const mockUserFind = jest.fn();

const query = (result) => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
});

jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: { findOne: mockArtistFindOne } }));
jest.unstable_mockModule("../../src/models/ArtistDailyStat.js", () => ({
    default: { find: mockDailyFind, aggregate: mockDailyAggregate },
}));
jest.unstable_mockModule("../../src/models/ListenEvent.js", () => ({
    default: { aggregate: mockListenAggregate },
}));
jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: { countDocuments: mockTrackCount },
}));
jest.unstable_mockModule("../../src/models/User.js", () => ({
    default: { find: mockUserFind },
}));
jest.unstable_mockModule(
    "../../src/services/analytics/trackStatAggregation.service.js",
    () => ({ getAnalyticsTimezone: () => "UTC" })
);

const performanceService = (
    await import("../../src/services/artist/artistPerformanceOverview.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();

describe("UT-96 getArtistPerformanceOverview", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-15T12:00:00.000Z"));
        mockArtistFindOne.mockReturnValue(query({
            _id: artistId,
            name: "Artist",
            stats: { followers: 250 },
        }));
        mockDailyFind.mockReturnValue(query([]));
        mockDailyAggregate.mockResolvedValue([]);
        mockListenAggregate.mockResolvedValue([]);
        mockTrackCount.mockResolvedValue(0);
        mockUserFind.mockReturnValue(query([]));
    });

    afterEach(() => jest.useRealTimers());

    test("UTCID01 - returns complete performance overview with filled periods", async () => {
        mockDailyFind.mockReturnValue(query([
            { dateKey: "2026-07-14", streamCount: 120, uniqueListeners: 80 },
        ]));
        mockDailyAggregate
            .mockResolvedValueOnce([{ month: 7, streamCount: 1500 }])
            .mockResolvedValueOnce([{ year: 2026, streamCount: 10000 }])
            .mockResolvedValueOnce([{ streamCount: 9500 }]);
        mockListenAggregate
            .mockResolvedValueOnce([{ date: "2026-07-15", streamCount: 20, uniqueListeners: 10 }])
            .mockResolvedValueOnce([{ month: 7, streamCount: 20 }])
            .mockResolvedValueOnce([{ year: 2026, streamCount: 20 }])
            .mockResolvedValueOnce([{ year: 2026 }, { year: 2025 }])
            .mockResolvedValueOnce([{ streamCount: 500 }]);
        mockTrackCount.mockResolvedValue(12);

        const result = await performanceService.getArtistPerformanceOverview({
            userId,
            range: "30d",
            year: 2026,
        });

        expect(result.artist).toEqual({ id: artistId.toString(), name: "Artist" });
        expect(result.summary).toEqual({ followers: 250, trackCount: 12, totalStreams: 10000 });
        expect(result.dailyStats).toHaveLength(30);
        expect(result.dailyStats.at(-2)).toMatchObject({
            date: "2026-07-14",
            streamCount: 120,
            uniqueListeners: 80,
        });
        expect(result.monthlyStats).toHaveLength(12);
        expect(result.monthlyStats[6].streamCount).toBe(1520);
        expect(result.yearlyStats).toHaveLength(5);
        expect(result.yearlyStats.at(-1).streamCount).toBe(10020);
    });

    test("UTCID02 - returns zero-filled all-time overview without statistics", async () => {
        const result = await performanceService.getArtistPerformanceOverview({
            userId,
            range: "all",
            year: 2026,
        });

        expect(result.range).toBe("all");
        expect(result.summary).toEqual({ followers: 250, trackCount: 0, totalStreams: 0 });
        expect(result.dailyStats).toHaveLength(1);
        expect(result.monthlyStats.every((item) => item.streamCount === 0)).toBe(true);
        expect(result.yearlyStats.every((item) => item.streamCount === 0)).toBe(true);
    });

    test("UTCID03 - throws 404 when artist profile does not exist", async () => {
        mockArtistFindOne.mockReturnValue(query(null));

        await expect(
            performanceService.getArtistPerformanceOverview({ userId, range: "30d", year: 2026 })
        ).rejects.toMatchObject({ message: "Artist profile not found.", statusCode: 404 });
    });

    test("UTCID04 - throws 400 for unsupported analytics range", async () => {
        await expect(
            performanceService.getArtistPerformanceOverview({ userId, range: "90d", year: 2026 })
        ).rejects.toMatchObject({ message: "Invalid analytics range", statusCode: 400 });
    });

    test("UTCID05 - throws 400 for invalid year", async () => {
        await expect(
            performanceService.getArtistPerformanceOverview({
                userId,
                range: "30d",
                year: "invalid-year",
            })
        ).rejects.toMatchObject({ message: "Invalid request data.", statusCode: 400 });
    });
});
