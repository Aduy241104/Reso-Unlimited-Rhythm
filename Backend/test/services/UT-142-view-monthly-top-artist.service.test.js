import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockArtistModel = {
    find: jest.fn(),
};

const mockArtistMonthlyRankingModel = {
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
    jest.unstable_mockModule("../../src/models/ArtistRanking.js", () => ({
        default: mockArtistMonthlyRankingModel,
        buildDailyArtistRankingFilter: jest.fn(() => ({})),
        buildMonthlyArtistRankingFilter: jest.fn(({ year, month }) => ({
            periodType: "monthly",
            year,
            month,
        })),
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

describe("View Monthly Top Artist - artistBrowseService.getMonthlyTopArtists", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRedisClient.isOpen = true;
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-13T00:00:00.000Z"));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("uses cached top artists when the cached list is sufficient", async () => {
        const { artistBrowseService } = await loadArtistBrowseService();

        mockRedisClient.get.mockResolvedValue(
            JSON.stringify([
                {
                    artist: { id: "507f1f77bcf86cd799439061", name: "Cached Artist A" },
                    score: 950,
                },
                {
                    artist: { id: "507f1f77bcf86cd799439062", name: "Cached Artist B" },
                    score: 800,
                },
            ])
        );
        mockArtistModel.find.mockReturnValue(
            createAwaitableQuery(
                [{ _id: "507f1f77bcf86cd799439061" }],
                ["select", "lean"]
            )
        );

        const result = await artistBrowseService.getMonthlyTopArtists({
            month: "2026-06",
            limit: 3,
        });

        expect(result.meta).toEqual({
            month: "2026-06",
            limit: 3,
            cacheKey: "top_artists:monthly:2026-06:limit:3",
            cacheHit: true,
        });
        expect(result.topArtists).toEqual([
            expect.objectContaining({
                rank: 1,
                artist: expect.objectContaining({
                    id: "507f1f77bcf86cd799439061",
                }),
            }),
        ]);
        expect(mockArtistMonthlyRankingModel.findOne).not.toHaveBeenCalled();
    });

    test("queries MongoDB, formats top artists, and caches the normalized result", async () => {
        const { artistBrowseService } = await loadArtistBrowseService();

        mockRedisClient.get.mockResolvedValue(null);
        mockArtistModel.find.mockReturnValue(
            createAwaitableQuery(
                [
                    { _id: "507f1f77bcf86cd799439071" },
                    { _id: "507f1f77bcf86cd799439072" },
                ],
                ["select", "lean"]
            )
        );
        mockArtistMonthlyRankingModel.findOne.mockReturnValue(
            createAwaitableQuery({
                rankings: [
                    {
                        rank: 1,
                        score: 1500,
                        uniqueListeners: 900,
                        playCount: 2400,
                        completedPlayCount: 2000,
                        artistId: {
                            _id: "507f1f77bcf86cd799439071",
                            name: "Artist One",
                            avatar: "one.png",
                        },
                    },
                    {
                        rank: 2,
                        score: 1200,
                        uniqueListeners: 700,
                        playCount: 1800,
                        completedPlayCount: 1500,
                        artistId: {
                            _id: "507f1f77bcf86cd799439072",
                            name: "Artist Two",
                            avatar: "two.png",
                        },
                    },
                ],
            })
        );

        const result = await artistBrowseService.getMonthlyTopArtists({
            month: "2026-06",
            limit: 2,
        });

        expect(result.topArtists).toEqual([
            expect.objectContaining({
                month: "2026-06",
                rank: 1,
                artist: expect.objectContaining({
                    id: "507f1f77bcf86cd799439071",
                    name: "Artist One",
                }),
            }),
            expect.objectContaining({
                month: "2026-06",
                rank: 2,
                artist: expect.objectContaining({
                    id: "507f1f77bcf86cd799439072",
                    name: "Artist Two",
                }),
            }),
        ]);
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
            "top_artists:monthly:2026-06:limit:2",
            86400,
            JSON.stringify(result.topArtists)
        );
    });

    test("throws 400 when month is invalid", async () => {
        const { artistBrowseService } = await loadArtistBrowseService();

        await expect(
            artistBrowseService.getMonthlyTopArtists({
                month: "2026-00",
                limit: 2,
            })
        ).rejects.toMatchObject({
            message: "Month is invalid.",
            statusCode: 400,
            details: { field: "month" },
        });
    });
});
