import { jest } from "@jest/globals";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const userId = "507f1f77bcf86cd799439011";
const artistId = "507f1f77bcf86cd799439012";
const otherArtistId = "507f1f77bcf86cd799439013";
const trackId = "507f1f77bcf86cd799439014";

const mockArtistModel = {
    findOne: jest.fn(),
};

const mockTrackModel = {
    findById: jest.fn(),
    find: jest.fn(),
};

const mockTrackDailyStatModel = {
    find: jest.fn(),
};

const mockTrackMonthlyStatModel = {
    find: jest.fn(),
};

const createQueryChain = (result) => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
});

const loadTrackAnalyticsService = async () => {
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

    return { trackAnalyticsService };
};

const mockOwnedTrack = (overrides = {}) => ({
    _id: trackId,
    title: "Test Track",
    avatar: "https://example.com/avatar.jpg",
    coverImage: ["https://example.com/cover.jpg"],
    duration: 210,
    artist_artistId: artistId,
    ...overrides,
});

describe("trackAnalyticsService", () => {
    beforeEach(() => {
        mockArtistModel.findOne.mockReset();
        mockTrackModel.findById.mockReset();
        mockTrackModel.find.mockReset();
        mockTrackDailyStatModel.find.mockReset();
        mockTrackMonthlyStatModel.find.mockReset();
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-06-30T12:00:00.000Z"));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("throws 404 when the track does not exist", async () => {
        const { trackAnalyticsService } = await loadTrackAnalyticsService();

        mockTrackModel.findById.mockReturnValue(createQueryChain(null));

        await expect(
            trackAnalyticsService.validateTrackOwnership({
                artistId,
                trackId,
            })
        ).rejects.toMatchObject({
            message: "Track not found",
            statusCode: 404,
        });
    });

    test("throws 403 when the artist does not own the track", async () => {
        const { trackAnalyticsService } = await loadTrackAnalyticsService();

        mockTrackModel.findById.mockReturnValue(
            createQueryChain(
                mockOwnedTrack({
                    artist_artistId: otherArtistId,
                })
            )
        );

        await expect(
            trackAnalyticsService.validateTrackOwnership({
                artistId,
                trackId,
            })
        ).rejects.toMatchObject({
            message: "You are not allowed to view analytics for this track",
            statusCode: 403,
        });
    });

    test("uses 30d as the default overview range and keeps charts on recent daily and monthly windows", async () => {
        const { trackAnalyticsService } = await loadTrackAnalyticsService();

        mockArtistModel.findOne.mockReturnValue(createQueryChain({ _id: artistId }));
        mockTrackModel.findById.mockReturnValue(createQueryChain(mockOwnedTrack()));
        mockTrackDailyStatModel.find
            .mockReturnValueOnce(
                createQueryChain([
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
                createQueryChain([
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
                createQueryChain([
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
            createQueryChain([
                {
                    year: 2025,
                    month: 12,
                    playCount: 100,
                    uniqueListeners: 80,
                    updatedAt: "2025-12-31T23:00:00.000Z",
                    revenue: {
                        eligibleStreams: 90,
                        artistRevenueAmount: 1000,
                    },
                },
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
        expect(result.track.duration).toBe(3.5);
        expect(result.lastUpdatedAt).toBe("2026-06-30T10:30:00.000Z");
        expect(result.summary).toEqual({
            totalPlays: 15,
            uniqueListeners: 12,
            totalListeningTime: 43.33,
            averageListenDuration: 1.56,
            skipCount: 3,
            skipRate: 20,
        });
        expect(result.comparison).toBeUndefined();
        expect(result.dailyChart).toHaveLength(7);
        expect(result.dailyChart[0]).toEqual({
            date: "2026-06-24",
            playCount: 0,
            uniqueListeners: 0,
            averageListenDuration: 0,
            skipCount: 0,
        });
        expect(result.dailyChart[4]).toEqual({
            date: "2026-06-28",
            playCount: 5,
            uniqueListeners: 4,
            averageListenDuration: 1.33,
            skipCount: 1,
        });
        expect(result.monthlyChart).toHaveLength(12);
        expect(result.monthlyChart[0]).toEqual({
            month: "2025-07",
            year: 2025,
            monthNumber: 7,
            playCount: 0,
            uniqueListeners: 0,
            eligibleStreams: 0,
            artistRevenueAmount: 0,
        });
        expect(result.monthlyChart[5]).toEqual({
            month: "2025-12",
            year: 2025,
            monthNumber: 12,
            playCount: 100,
            uniqueListeners: 80,
            eligibleStreams: 90,
            artistRevenueAmount: 1000,
        });
        expect(result.monthlyChart[11]).toEqual({
            month: "2026-06",
            year: 2026,
            monthNumber: 6,
            playCount: 300,
            uniqueListeners: 200,
            eligibleStreams: 280,
            artistRevenueAmount: 15000.5,
        });
    });

    test("throws 400 when custom overview range is missing from/to", async () => {
        const { trackAnalyticsService } = await loadTrackAnalyticsService();

        await expect(
            trackAnalyticsService.getTrackAnalyticsOverview({
                userId,
                trackId,
                range: "custom",
                from: "2026-06-01",
            })
        ).rejects.toMatchObject({
            message: "Invalid date range",
            statusCode: 400,
        });

        expect(mockArtistModel.findOne).not.toHaveBeenCalled();
        expect(mockTrackModel.findById).not.toHaveBeenCalled();
    });

    test("only applies the selected range to summary while charts stay on recent windows", async () => {
        const { trackAnalyticsService } = await loadTrackAnalyticsService();

        mockArtistModel.findOne.mockReturnValue(createQueryChain({ _id: artistId }));
        mockTrackModel.findById.mockReturnValue(createQueryChain(mockOwnedTrack()));
        mockTrackDailyStatModel.find
            .mockReturnValueOnce(
                createQueryChain([
                    {
                        dateKey: "2026-05-15",
                        playCount: 20,
                        uniqueListeners: 10,
                        averageListenDuration: 60,
                        skipCount: 2,
                        updatedAt: "2026-05-16T09:00:00.000Z",
                    },
                ])
            )
            .mockReturnValueOnce(
                createQueryChain([
                    {
                        dateKey: "2026-05-15",
                        playCount: 20,
                        uniqueListeners: 10,
                        averageListenDuration: 60,
                        skipCount: 2,
                        updatedAt: "2026-05-16T09:00:00.000Z",
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
                createQueryChain([
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
            createQueryChain([
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
            range: "custom",
            from: "2026-05-01",
            to: "2026-05-31",
        });

        expect(result.summary).toEqual({
            totalPlays: 20,
            uniqueListeners: 10,
            totalListeningTime: 26.67,
            averageListenDuration: 1,
            skipCount: 2,
            skipRate: 10,
        });
        expect(result.dailyChart[4]).toEqual({
            date: "2026-06-28",
            playCount: 5,
            uniqueListeners: 4,
            averageListenDuration: 1.33,
            skipCount: 1,
        });
        expect(result.monthlyChart[11].month).toBe("2026-06");
    });

    test("returns 100 percent growth when previous period has no data", async () => {
        const { trackAnalyticsService } = await loadTrackAnalyticsService();

        mockArtistModel.findOne.mockReturnValue(createQueryChain({ _id: artistId }));
        mockTrackModel.findById.mockReturnValue(createQueryChain(mockOwnedTrack()));
        mockTrackDailyStatModel.find
            .mockReturnValueOnce(
                createQueryChain([
                    {
                        dateKey: "2026-06-01",
                        playCount: 12,
                        uniqueListeners: 9,
                        averageListenDuration: 120,
                        skipCount: 1,
                        updatedAt: "2026-06-30T10:00:00.000Z",
                    },
                ])
            )
            .mockReturnValueOnce(createQueryChain([]));

        const result = await trackAnalyticsService.compareTrackPerformance({
            userId,
            trackId,
            currentFrom: "2026-06-01",
            currentTo: "2026-06-30",
            previousFrom: "2026-05-01",
            previousTo: "2026-05-31",
        });

        expect(result.metrics.playCount).toEqual({
            current: 12,
            previous: 0,
            changePercent: 100,
            trend: "up",
        });
        expect(result.lastUpdatedAt).toBe("2026-06-30T10:00:00.000Z");
        expect(result.metrics.skipRate).toEqual({
            current: 8.33,
            previous: 0,
            changePercent: 100,
            trend: "up",
        });
        expect(result.metrics.averageListenDuration).toEqual({
            current: 2,
            previous: 0,
            changePercent: 100,
            trend: "up",
        });
    });

    test("fills missing days with zero values in daily analytics", async () => {
        const { trackAnalyticsService } = await loadTrackAnalyticsService();

        mockArtistModel.findOne.mockReturnValue(createQueryChain({ _id: artistId }));
        mockTrackModel.findById.mockReturnValue(createQueryChain(mockOwnedTrack()));
        mockTrackDailyStatModel.find.mockReturnValue(
            createQueryChain([
                {
                    dateKey: "2026-06-01",
                    playCount: 4,
                    uniqueListeners: 3,
                    averageListenDuration: 90,
                    skipCount: 1,
                    updatedAt: "2026-06-03T08:00:00.000Z",
                },
                {
                    dateKey: "2026-06-03",
                    playCount: 7,
                    uniqueListeners: 5,
                    averageListenDuration: 95,
                    skipCount: 0,
                    updatedAt: "2026-06-03T11:00:00.000Z",
                },
            ])
        );

        const result = await trackAnalyticsService.getTrackDailyAnalytics({
            userId,
            trackId,
            from: "2026-06-01",
            to: "2026-06-03",
        });

        expect(result.dailyStats).toEqual([
            {
                date: "2026-06-01",
                playCount: 4,
                uniqueListeners: 3,
                averageListenDuration: 1.5,
                skipCount: 1,
            },
            {
                date: "2026-06-02",
                playCount: 0,
                uniqueListeners: 0,
                averageListenDuration: 0,
                skipCount: 0,
            },
            {
                date: "2026-06-03",
                playCount: 7,
                uniqueListeners: 5,
                averageListenDuration: 1.58,
                skipCount: 0,
            },
        ]);
        expect(result.lastUpdatedAt).toBe("2026-06-03T11:00:00.000Z");
    });

    test("returns all 12 months and fills missing monthly stats with zeroes", async () => {
        const { trackAnalyticsService } = await loadTrackAnalyticsService();

        mockArtistModel.findOne.mockReturnValue(createQueryChain({ _id: artistId }));
        mockTrackModel.findById.mockReturnValue(createQueryChain(mockOwnedTrack()));
        mockTrackMonthlyStatModel.find.mockReturnValue(
            createQueryChain([
                {
                    month: 1,
                    playCount: 2500,
                    uniqueListeners: 1700,
                    updatedAt: "2026-01-31T23:00:00.000Z",
                    revenue: {
                        eligibleStreams: 2400,
                        artistRevenueAmount: 120000,
                    },
                },
                {
                    month: 3,
                    playCount: 300,
                    uniqueListeners: 200,
                    updatedAt: "2026-03-31T23:30:00.000Z",
                    revenue: {
                        eligibleStreams: 280,
                        artistRevenueAmount: 15000.5,
                    },
                },
            ])
        );

        const result = await trackAnalyticsService.getTrackMonthlyAnalytics({
            userId,
            trackId,
            year: 2026,
        });

        expect(result.year).toBe(2026);
        expect(result.lastUpdatedAt).toBe("2026-03-31T23:30:00.000Z");
        expect(result.monthlyStats).toHaveLength(12);
        expect(result.monthlyStats[0]).toEqual({
            month: 1,
            playCount: 2500,
            uniqueListeners: 1700,
            eligibleStreams: 2400,
            artistRevenueAmount: 120000,
        });
        expect(result.monthlyStats[1]).toEqual({
            month: 2,
            playCount: 0,
            uniqueListeners: 0,
            eligibleStreams: 0,
            artistRevenueAmount: 0,
        });
        expect(result.monthlyStats[2]).toEqual({
            month: 3,
            playCount: 300,
            uniqueListeners: 200,
            eligibleStreams: 280,
            artistRevenueAmount: 15000.5,
        });
    });

    test("returns null lastUpdatedAt when the selected period has no stats", async () => {
        const { trackAnalyticsService } = await loadTrackAnalyticsService();

        mockArtistModel.findOne.mockReturnValue(createQueryChain({ _id: artistId }));
        mockTrackModel.findById.mockReturnValue(createQueryChain(mockOwnedTrack()));
        mockTrackDailyStatModel.find
            .mockReturnValueOnce(createQueryChain([]))
            .mockReturnValueOnce(createQueryChain([]))
            .mockReturnValueOnce(createQueryChain([]));
        mockTrackMonthlyStatModel.find.mockReturnValue(createQueryChain([]));

        const result = await trackAnalyticsService.getTrackAnalyticsOverview({
            userId,
            trackId,
            range: "7d",
        });

        expect(result.lastUpdatedAt).toBeNull();
        expect(result.comparison).toBeUndefined();
    });
});
