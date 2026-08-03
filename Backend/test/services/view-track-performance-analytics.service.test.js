import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const userId = "507f1f77bcf86cd799439011";
const artistId = "507f1f77bcf86cd799439012";
const trackId = "507f1f77bcf86cd799439014";

const mockArtistModel = { findOne: jest.fn() };
const mockTrackModel = { findById: jest.fn() };
const mockTrackDailyStatModel = { find: jest.fn() };
const mockTrackMonthlyStatModel = { find: jest.fn() };

const loadService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));
    jest.unstable_mockModule("../../src/models/TrackDailyStat.js", () => ({
        default: mockTrackDailyStatModel,
    }));
    jest.unstable_mockModule("../../src/models/TrackMonthlyStat.js", () => ({
        default: mockTrackMonthlyStatModel,
    }));
    jest.unstable_mockModule(
        "../../src/services/analytics/trackStatAggregation.service.js",
        () => ({
            getAnalyticsTimezone: () => "UTC",
        })
    );

    const { default: trackAnalyticsService } = await import(
        "../../src/services/artist/trackAnalytics.service.js"
    );

    return trackAnalyticsService;
};

describe("View track performance analytics", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-06-30T12:00:00.000Z"));

        mockArtistModel.findOne.mockReset();
        mockTrackModel.findById.mockReset();
        mockTrackDailyStatModel.find.mockReset();
        mockTrackMonthlyStatModel.find.mockReset();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("returns the 30-day track analytics overview for the owned track", async () => {
        const trackAnalyticsService = await loadService();

        mockArtistModel.findOne.mockReturnValue(
            createAwaitableQuery({ _id: artistId }, ["select", "lean"])
        );
        mockTrackModel.findById.mockReturnValue(
            createAwaitableQuery(
                {
                    _id: trackId,
                    title: "Test Track",
                    avatar: "https://example.com/avatar.jpg",
                    coverImage: ["https://example.com/cover.jpg"],
                    duration: 210,
                    artist_artistId: artistId,
                },
                ["select", "lean"]
            )
        );
        mockTrackDailyStatModel.find
            .mockReturnValueOnce(
                createAwaitableQuery([
                    {
                        dateKey: "2026-05-15",
                        playCount: 20,
                        uniqueListeners: 10,
                        averageListenDuration: 60,
                        skipCount: 2,
                        updatedAt: "2026-05-16T09:00:00.000Z",
                    },
                    {
                        dateKey: "2026-06-01",
                        playCount: 10,
                        uniqueListeners: 8,
                        averageListenDuration: 100,
                        skipCount: 2,
                        updatedAt: "2026-06-30T08:00:00.000Z",
                    },
                    {
                        dateKey: "2026-06-28",
                        playCount: 5,
                        uniqueListeners: 4,
                        averageListenDuration: 80,
                        skipCount: 1,
                        updatedAt: "2026-06-30T09:15:00.000Z",
                    },
                ])
            )
            .mockReturnValueOnce(
                createAwaitableQuery([
                    {
                        dateKey: "2026-06-01",
                        playCount: 10,
                        uniqueListeners: 8,
                        averageListenDuration: 100,
                        skipCount: 2,
                        updatedAt: "2026-06-30T08:00:00.000Z",
                    },
                    {
                        dateKey: "2026-06-28",
                        playCount: 5,
                        uniqueListeners: 4,
                        averageListenDuration: 80,
                        skipCount: 1,
                        updatedAt: "2026-06-30T09:15:00.000Z",
                    },
                ])
            );
        mockTrackMonthlyStatModel.find.mockReturnValue(
            createAwaitableQuery([
                {
                    year: 2026,
                    month: 6,
                    playCount: 300,
                    uniqueListeners: 200,
                    updatedAt: "2026-06-30T10:30:00.000Z",
                    revenue: {
                        eligibleStreams: 280,
                        artistRevenueAmount: 15000.5,
                    },
                },
            ])
        );

        const result = await trackAnalyticsService.getTrackAnalyticsOverview({
            userId,
            trackId,
        });

        expect(result.period).toEqual({
            from: "2026-06-01",
            to: "2026-06-30",
            range: "30d",
        });
        expect(result.summary).toEqual({
            totalPlays: 15,
            uniqueListeners: 12,
            totalListeningTime: 23.33,
            averageListenDuration: 1.56,
            skipCount: 3,
            skipRate: 20,
        });
        expect(result.lastUpdatedAt).toBe("2026-06-30T10:30:00.000Z");
        expect(result.dailyChart).toHaveLength(30);
        expect(result.monthlyChart[11]).toEqual({
            month: "2026-06",
            year: 2026,
            monthNumber: 6,
            playCount: 300,
            uniqueListeners: 200,
            eligibleStreams: 280,
            artistRevenueAmount: 15000.5,
        });
        expect(mockTrackDailyStatModel.find).toHaveBeenNthCalledWith(1, {
            trackId,
        });
        expect(mockTrackDailyStatModel.find).toHaveBeenNthCalledWith(2, {
            trackId,
            dateKey: {
                $gte: "2026-06-01",
                $lte: "2026-06-30",
            },
        });
    });
});
