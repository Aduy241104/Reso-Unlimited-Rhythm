import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockArtistModel = {
    find: jest.fn(),
};

const mockArtistDailyRankingModel = {
    findOne: jest.fn(),
};

const mockRedisClient = {
    isOpen: true,
    get: jest.fn(),
    setEx: jest.fn(),
};

const loadArtistBrowseService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Album.js", () => ({
        default: { find: jest.fn(), countDocuments: jest.fn() },
    }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/ArtistDailyRanking.js", () => ({
        default: mockArtistDailyRankingModel,
    }));
    jest.unstable_mockModule("../../src/models/ArtistMonthlyRanking.js", () => ({
        default: { findOne: jest.fn() },
    }));
    jest.unstable_mockModule("../../src/models/Interaction.js", () => ({
        default: { findOne: jest.fn(), create: jest.fn(), deleteOne: jest.fn() },
    }));
    jest.unstable_mockModule("../../src/models/ReleaseSchedule.js", () => ({
        default: { find: jest.fn(), countDocuments: jest.fn() },
    }));
    jest.unstable_mockModule("../../src/models/ArtistStat.js", () => ({
        default: { findOne: jest.fn() },
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: { find: jest.fn(), countDocuments: jest.fn() },
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
    jest.unstable_mockModule("../../src/services/album/album.sync.js", () => ({
        enrichAlbumsWithTotalDuration: jest.fn(),
    }));

    const { default: artistBrowseService } = await import(
        "../../src/services/artistBrowse/artistBrowse.service.js"
    );

    return { artistBrowseService };
};

describe("View Daily Top Artist - artistBrowseService.getDailyTopArtists", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRedisClient.isOpen = true;
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-13T00:00:00.000Z"));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("returns cached daily top artists after filtering inactive artist ids", async () => {
        const { artistBrowseService } = await loadArtistBrowseService();

        mockRedisClient.get.mockResolvedValue(
            JSON.stringify([
                {
                    artist: { id: "507f1f77bcf86cd799439081", name: "Cached Daily A" },
                    score: 700,
                },
                {
                    artist: { id: "507f1f77bcf86cd799439082", name: "Cached Daily B" },
                    score: 650,
                },
            ])
        );
        mockArtistModel.find.mockReturnValue(
            createAwaitableQuery(
                [{ _id: "507f1f77bcf86cd799439081" }],
                ["select", "lean"]
            )
        );

        const result = await artistBrowseService.getDailyTopArtists({
            date: "2026-07-13",
            limit: 5,
        });

        expect(result.meta).toEqual({
            date: "2026-07-13",
            limit: 5,
            cacheKey: "top_artists:daily:2026-07-13:limit:5",
            cacheHit: true,
        });
        expect(result.topArtists).toEqual([
            expect.objectContaining({
                rank: 1,
                artist: expect.objectContaining({
                    id: "507f1f77bcf86cd799439081",
                }),
            }),
        ]);
        expect(mockArtistDailyRankingModel.findOne).not.toHaveBeenCalled();
    });

    test("falls back to MongoDB and caches daily top artists with the short TTL for today", async () => {
        const { artistBrowseService } = await loadArtistBrowseService();

        mockRedisClient.get.mockResolvedValue(null);
        mockArtistModel.find.mockReturnValue(
            createAwaitableQuery(
                [{ _id: "507f1f77bcf86cd799439091" }],
                ["select", "lean"]
            )
        );
        mockArtistDailyRankingModel.findOne.mockReturnValue(
            createAwaitableQuery({
                dateKey: "2026-07-13",
                rankings: [
                    {
                        rank: 1,
                        score: 1100,
                        uniqueListeners: 500,
                        playCount: 1700,
                        completedPlayCount: 1300,
                        artistId: {
                            _id: "507f1f77bcf86cd799439091",
                            name: "Daily Artist",
                            avatar: "daily.png",
                        },
                    },
                ],
            })
        );

        const result = await artistBrowseService.getDailyTopArtists({
            date: "2026-07-13",
            limit: 1,
        });

        expect(result.topArtists).toEqual([
            expect.objectContaining({
                date: "2026-07-13",
                rank: 1,
                artist: expect.objectContaining({
                    id: "507f1f77bcf86cd799439091",
                    name: "Daily Artist",
                }),
            }),
        ]);
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
            "top_artists:daily:2026-07-13:limit:1",
            300,
            JSON.stringify(result.topArtists)
        );
    });

    test("throws 400 when date is invalid", async () => {
        const { artistBrowseService } = await loadArtistBrowseService();

        await expect(
            artistBrowseService.getDailyTopArtists({
                date: "bad-date",
                limit: 2,
            })
        ).rejects.toMatchObject({
            message: "Date is invalid.",
            statusCode: 400,
            details: { field: "date" },
        });
    });
});
