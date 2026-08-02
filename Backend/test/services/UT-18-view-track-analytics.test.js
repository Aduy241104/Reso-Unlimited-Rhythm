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

const createRejectedQueryChain = (error) => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockRejectedValue(error),
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

    test("throws 400 when the analytics range is invalid", async () => {
        const { trackAnalyticsService } = await loadTrackAnalyticsService();

        await expect(
            trackAnalyticsService.getTrackAnalyticsOverview({
                userId,
                trackId,
                range: "365d",
            })
        ).rejects.toMatchObject({
            message: "Invalid analytics range",
            statusCode: 400,
        });

        expect(mockArtistModel.findOne).not.toHaveBeenCalled();
        expect(mockTrackModel.findById).not.toHaveBeenCalled();
    });

    test("returns the default 30-day analytics overview for the owned track", async () => {
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
            totalListeningTime: 23.33,
            averageListenDuration: 1.56,
            skipCount: 3,
            skipRate: 16.67,
        });
        expect(result.dailyChart).toHaveLength(30);
        expect(result.dailyChart[0]).toEqual({
            date: "2026-06-01",
            playCount: 10,
            uniqueListeners: 8,
            averageListenDuration: 1.67,
            skipCount: 2,
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
        expect(mockArtistModel.findOne).toHaveBeenCalledWith({ userId });
        expect(mockTrackModel.findById).toHaveBeenCalledWith(trackId);
        expect(mockTrackDailyStatModel.find).toHaveBeenCalledTimes(2);
        expect(mockTrackMonthlyStatModel.find).toHaveBeenCalledTimes(1);
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

});
