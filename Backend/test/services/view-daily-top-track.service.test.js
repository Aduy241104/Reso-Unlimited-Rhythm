import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockTrackModel = {
    find: jest.fn(),
};

const mockTrackDailyRankingModel = {
    findOne: jest.fn(),
};

const mockRedisClient = {
    isOpen: true,
    get: jest.fn(),
    setEx: jest.fn(),
};

const loadTrackService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));
    jest.unstable_mockModule("../../src/models/TrackDailyRanking.js", () => ({
        default: mockTrackDailyRankingModel,
    }));
    jest.unstable_mockModule("../../src/models/TrackMonthlyRanking.js", () => ({
        default: { findOne: jest.fn() },
    }));
    jest.unstable_mockModule("../../src/config/redisConfig.js", () => ({
        default: mockRedisClient,
    }));
    jest.unstable_mockModule(
        "../../src/services/analytics/trackStatAggregation.service.js",
        () => ({
            getAnalyticsTimezone: () => "UTC",
        })
    );

    const { default: trackService } = await import(
        "../../src/services/track/track.service.js"
    );

    return { trackService };
};

describe("View Daily Top Track - trackService.getDailyTopTracks", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRedisClient.isOpen = true;
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-13T00:00:00.000Z"));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("returns cached daily top tracks and recalculates rank trend", async () => {
        const { trackService } = await loadTrackService();

        mockRedisClient.get.mockResolvedValue(
            JSON.stringify([
                {
                    track: { _id: "507f1f77bcf86cd799439041", title: "Cached Daily A" },
                    previousRank: 1,
                },
                {
                    track: { _id: "507f1f77bcf86cd799439042", title: "Cached Daily B" },
                    previousRank: null,
                },
            ])
        );
        mockTrackModel.find.mockReturnValue(
            createAwaitableQuery(
                [
                    { _id: "507f1f77bcf86cd799439041" },
                    { _id: "507f1f77bcf86cd799439042" },
                ],
                ["select", "lean"]
            )
        );

        const result = await trackService.getDailyTopTracks({
            date: "2026-07-13",
            limit: 2,
        });

        expect(result.meta).toEqual({
            date: "2026-07-13",
            limit: 2,
            cacheKey: "top_tracks:daily:2026-07-13:limit:2",
            cacheHit: true,
        });
        expect(result.topTracks).toEqual([
            expect.objectContaining({
                rank: 1,
                previousRank: 1,
                rankChange: 0,
                rankTrend: "same",
            }),
            expect.objectContaining({
                rank: 2,
                previousRank: null,
                rankChange: 0,
                rankTrend: "new",
            }),
        ]);
        expect(mockTrackDailyRankingModel.findOne).not.toHaveBeenCalled();
    });

    test("loads daily rankings from MongoDB and caches using the current-day TTL", async () => {
        const { trackService } = await loadTrackService();

        mockRedisClient.get.mockResolvedValue(null);
        mockTrackModel.find.mockReturnValue(
            createAwaitableQuery(
                [{ _id: "507f1f77bcf86cd799439051" }],
                ["select", "lean"]
            )
        );
        mockTrackDailyRankingModel.findOne.mockReturnValue(
            createAwaitableQuery({
                dateKey: "2026-07-13",
                rankings: [
                    {
                        rank: 1,
                        previousRank: 2,
                        rankChange: 1,
                        rankTrend: "up",
                        playCount: 650,
                        uniqueListeners: 400,
                        averageListenDuration: 150,
                        skipCount: 20,
                        trackId: {
                            _id: "507f1f77bcf86cd799439051",
                            title: "Daily Song",
                            duration: 205,
                            avatar: "song.png",
                            stats: { totalPlay: 650 },
                            activeStatus: "active",
                            approvalStatus: "approved",
                            artist_artistId: {
                                _id: "507f1f77bcf86cd799439151",
                                name: "Daily Artist",
                                avatar: "artist.png",
                            },
                        },
                    },
                ],
            })
        );

        const result = await trackService.getDailyTopTracks({
            date: "2026-07-13",
            limit: 1,
        });

        expect(result.topTracks).toEqual([
            expect.objectContaining({
                date: "2026-07-13",
                rank: 1,
                track: expect.objectContaining({
                    _id: "507f1f77bcf86cd799439051",
                    title: "Daily Song",
                }),
            }),
        ]);
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
            "top_tracks:daily:2026-07-13:limit:1",
            300,
            JSON.stringify(result.topTracks)
        );
    });

    test("throws 400 when date is invalid", async () => {
        const { trackService } = await loadTrackService();

        await expect(
            trackService.getDailyTopTracks({
                date: "2026-02-30",
                limit: 3,
            })
        ).rejects.toMatchObject({
            message: "Date is invalid.",
            statusCode: 400,
            details: { field: "date" },
        });
    });
});
