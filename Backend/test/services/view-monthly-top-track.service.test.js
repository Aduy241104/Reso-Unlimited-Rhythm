import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockTrackModel = {
    find: jest.fn(),
};

const mockTrackMonthlyRankingModel = {
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
        default: { findOne: jest.fn() },
    }));
    jest.unstable_mockModule("../../src/models/TrackMonthlyRanking.js", () => ({
        default: mockTrackMonthlyRankingModel,
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

describe("View Monthly Top Track - trackService.getMonthlyTopTracks", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRedisClient.isOpen = true;
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-13T00:00:00.000Z"));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("returns normalized cached monthly top tracks when Redis has a usable cache", async () => {
        const { trackService } = await loadTrackService();

        mockRedisClient.get.mockResolvedValue(
            JSON.stringify([
                {
                    track: { id: "507f1f77bcf86cd799439011", title: "Cached Song A" },
                    previousRank: 3,
                    playCount: 1000,
                    uniqueListeners: 600,
                },
                {
                    track: { id: "507f1f77bcf86cd799439012", title: "Cached Song B" },
                    previousRank: 1,
                    playCount: 800,
                    uniqueListeners: 450,
                },
            ])
        );
        mockTrackModel.find.mockReturnValue(
            createAwaitableQuery([{ _id: "507f1f77bcf86cd799439011" }], [
                "select",
                "lean",
            ])
        );

        const result = await trackService.getMonthlyTopTracks({
            month: "2026-06",
            limit: 5,
        });

        expect(result.meta).toEqual({
            month: "2026-06",
            limit: 5,
            cacheKey: "top_tracks:monthly:2026-06:limit:5",
            cacheHit: true,
        });
        expect(result.topTracks).toEqual([
            expect.objectContaining({
                rank: 1,
                previousRank: 3,
                rankChange: 2,
                rankTrend: "up",
            }),
        ]);
        expect(mockTrackMonthlyRankingModel.findOne).not.toHaveBeenCalled();
    });

    test("falls back to MongoDB, formats rankings, and caches the result when cache misses", async () => {
        const { trackService } = await loadTrackService();

        mockRedisClient.get.mockResolvedValue(null);
        mockTrackModel.find.mockReturnValue(
            createAwaitableQuery(
                [
                    { _id: "507f1f77bcf86cd799439021" },
                    { _id: "507f1f77bcf86cd799439022" },
                ],
                ["select", "lean"]
            )
        );
        mockTrackMonthlyRankingModel.findOne.mockReturnValue(
            createAwaitableQuery({
                rankings: [
                    {
                        rank: 1,
                        playCount: 1200,
                        uniqueListeners: 700,
                        trackId: {
                            _id: "507f1f77bcf86cd799439021",
                            title: "DB Song A",
                            duration: 210,
                            artist_artistId: {
                                _id: "507f1f77bcf86cd799439101",
                                name: "Artist A",
                                avatar: "artist-a.png",
                                coverImage: "artist-cover-a.png",
                            },
                            album_albumId: {
                                _id: "507f1f77bcf86cd799439201",
                                title: "Album A",
                                coverImage: "album-a.png",
                            },
                            genreIds: [{ _id: "507f1f77bcf86cd799439301", name: "Pop" }],
                            lyricsStatic: "lyric a",
                            lyricsSyncUrl: "https://example.com/a.lrc",
                            stats: { totalPlay: 1200 },
                            releaseDate: new Date("2026-06-01T00:00:00.000Z"),
                        },
                    },
                    {
                        rank: 2,
                        playCount: 900,
                        uniqueListeners: 500,
                        trackId: {
                            _id: "507f1f77bcf86cd799439022",
                            title: "DB Song B",
                            duration: 180,
                            artist_artistId: {
                                _id: "507f1f77bcf86cd799439102",
                                name: "Artist B",
                                avatar: "artist-b.png",
                                coverImage: "artist-cover-b.png",
                            },
                            album_albumId: null,
                            genreIds: [],
                            lyricsStatic: "",
                            lyricsSyncUrl: "",
                            stats: { totalPlay: 900 },
                            releaseDate: new Date("2026-06-05T00:00:00.000Z"),
                        },
                    },
                ],
            })
        );

        const result = await trackService.getMonthlyTopTracks({
            month: "2026-06",
            limit: 2,
        });

        expect(result.meta).toEqual({
            month: "2026-06",
            limit: 2,
            cacheKey: "top_tracks:monthly:2026-06:limit:2",
            cacheHit: false,
        });
        expect(result.topTracks).toEqual([
            expect.objectContaining({
                month: "2026-06",
                rank: 1,
                track: expect.objectContaining({
                    id: "507f1f77bcf86cd799439021",
                    title: "DB Song A",
                }),
            }),
            expect.objectContaining({
                month: "2026-06",
                rank: 2,
                track: expect.objectContaining({
                    id: "507f1f77bcf86cd799439022",
                    title: "DB Song B",
                }),
            }),
        ]);
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
            "top_tracks:monthly:2026-06:limit:2",
            86400,
            JSON.stringify(result.topTracks)
        );
    });

    test("throws 400 when month is invalid", async () => {
        const { trackService } = await loadTrackService();

        await expect(
            trackService.getMonthlyTopTracks({
                month: "2026-13",
                limit: 5,
            })
        ).rejects.toMatchObject({
            message: "Month is invalid.",
            statusCode: 400,
            details: { field: "month" },
        });
    });
});
