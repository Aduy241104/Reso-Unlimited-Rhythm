import { jest } from "@jest/globals";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const primaryArtistId = "507f1f77bcf86cd799439011";
const fillerArtistId = "507f1f77bcf86cd799439012";

const mockAlbumModel = {};
const mockArtistModel = {
    find: jest.fn(),
    findOne: jest.fn(),
};
const mockArtistRankingModel = {
    findOne: jest.fn(),
};
const mockInteractionModel = {};
const mockListenEventModel = {
    aggregate: jest.fn(),
};
const mockReleaseScheduleModel = {};
const mockArtistMonthlyStatModel = {};
const mockTrackModel = {};
const mockRedisClient = {
    isOpen: true,
    get: jest.fn(),
    setEx: jest.fn(),
};

const createRankingQuery = (result) => ({
    populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(result),
    }),
});

const createSelectQuery = (result) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(result),
    }),
});

const createSortLimitSelectQuery = (result) => ({
    sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(result),
            }),
        }),
    }),
});

const loadArtistBrowseService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Album.js", () => ({
        default: mockAlbumModel,
    }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/ArtistRanking.js", () => ({
        default: mockArtistRankingModel,
        buildDailyArtistRankingFilter: ({ dateKey, startDate, endDate }) => ({
            periodType: "daily",
            $or: [
                { dateKey },
                { date: { $gte: startDate, $lt: endDate } },
            ],
        }),
        buildMonthlyArtistRankingFilter: ({ year, month }) => ({
            periodType: "monthly",
            year,
            month,
        }),
    }));
    jest.unstable_mockModule("../../src/models/Interaction.js", () => ({
        default: mockInteractionModel,
    }));
    jest.unstable_mockModule("../../src/models/ListenEvent.js", () => ({
        default: mockListenEventModel,
    }));
    jest.unstable_mockModule("../../src/models/ReleaseSchedule.js", () => ({
        default: mockReleaseScheduleModel,
    }));
    jest.unstable_mockModule("../../src/models/ArtistMonthlyStat.js", () => ({
        default: mockArtistMonthlyStatModel,
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
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

    const { default: artistBrowseService } = await import(
        "../../src/services/artistBrowse/artistBrowse.service.js"
    );

    return { artistBrowseService };
};

describe("artistBrowseService top artists fallback", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-08-06T12:00:00.000Z"));

        mockArtistModel.find.mockReset();
        mockArtistModel.findOne.mockReset();
        mockArtistRankingModel.findOne.mockReset();
        mockListenEventModel.aggregate.mockReset();
        mockRedisClient.get.mockReset();
        mockRedisClient.setEx.mockReset();
        mockRedisClient.isOpen = true;
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("aggregates daily top artists from ListenEvent when Redis and ranking snapshot are missing", async () => {
        const { artistBrowseService } = await loadArtistBrowseService();

        mockRedisClient.get.mockResolvedValue(null);
        mockRedisClient.setEx.mockResolvedValue("OK");
        mockArtistRankingModel.findOne.mockReturnValue(createRankingQuery(null));
        mockListenEventModel.aggregate.mockResolvedValue([
            {
                artistId: primaryArtistId,
                playCount: 10,
                uniqueListeners: 3,
                completedPlayCount: 5,
                totalTracksPlayed: 2,
                score: 25,
            },
        ]);
        mockArtistModel.find
            .mockReturnValueOnce(
                createSortLimitSelectQuery([{ _id: fillerArtistId }])
            )
            .mockReturnValueOnce(
                createSelectQuery([
                    {
                        _id: primaryArtistId,
                        name: "Primary Artist",
                        avatar: "primary.jpg",
                        activeStatus: "active",
                    },
                    {
                        _id: fillerArtistId,
                        name: "Filler Artist",
                        avatar: "filler.jpg",
                        activeStatus: "active",
                    },
                ])
            );

        const result = await artistBrowseService.getDailyTopArtists({
            date: "2026-08-05",
            limit: "2",
        });

        expect(mockListenEventModel.aggregate).toHaveBeenCalledTimes(1);
        expect(mockListenEventModel.aggregate.mock.calls[0][0][0].$match.listenedAt).toEqual({
            $gte: new Date("2026-08-05T00:00:00.000Z"),
            $lt: new Date("2026-08-06T00:00:00.000Z"),
        });
        expect(result).toEqual({
            topArtists: [
                {
                    artist: {
                        id: primaryArtistId,
                        name: "Primary Artist",
                        avatar: "primary.jpg",
                    },
                    rank: 1,
                    date: "2026-08-05",
                    score: 25,
                    uniqueListeners: 3,
                    playCount: 10,
                    completedPlayCount: 5,
                },
                {
                    artist: {
                        id: fillerArtistId,
                        name: "Filler Artist",
                        avatar: "filler.jpg",
                    },
                    rank: 2,
                    date: "2026-08-05",
                    score: 0,
                    uniqueListeners: 0,
                    playCount: 0,
                    completedPlayCount: 0,
                },
            ],
            meta: {
                date: "2026-08-05",
                limit: 2,
                cacheKey: "top_artists:daily:2026-08-05:limit:2",
                cacheHit: false,
            },
        });
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
            "top_artists:daily:2026-08-05:limit:2",
            86400,
            JSON.stringify(result.topArtists)
        );
    });

    test("ignores an empty daily Redis cache entry and falls back to database data", async () => {
        const { artistBrowseService } = await loadArtistBrowseService();

        mockRedisClient.get.mockResolvedValue("[]");
        mockRedisClient.setEx.mockResolvedValue("OK");
        mockArtistRankingModel.findOne.mockReturnValue(
            createRankingQuery({
                rankings: [
                    {
                        artistId: {
                            _id: primaryArtistId,
                            name: "Primary Artist",
                            avatar: "primary.jpg",
                            activeStatus: "active",
                        },
                        rank: 1,
                        score: 25,
                        uniqueListeners: 3,
                        playCount: 10,
                        completedPlayCount: 5,
                    },
                ],
            })
        );

        const result = await artistBrowseService.getDailyTopArtists({
            date: "2026-08-05",
            limit: "2",
        });

        expect(mockListenEventModel.aggregate).not.toHaveBeenCalled();
        expect(result).toEqual({
            topArtists: [
                {
                    artist: {
                        id: primaryArtistId,
                        name: "Primary Artist",
                        avatar: "primary.jpg",
                    },
                    rank: 1,
                    date: "2026-08-05",
                    score: 25,
                    uniqueListeners: 3,
                    playCount: 10,
                    completedPlayCount: 5,
                },
            ],
            meta: {
                date: "2026-08-05",
                limit: 2,
                cacheKey: "top_artists:daily:2026-08-05:limit:2",
                cacheHit: false,
            },
        });
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
            "top_artists:daily:2026-08-05:limit:2",
            86400,
            JSON.stringify(result.topArtists)
        );
    });

    test("aggregates monthly top artists from ListenEvent when Redis and ranking snapshot are missing", async () => {
        const { artistBrowseService } = await loadArtistBrowseService();

        mockRedisClient.get.mockResolvedValue(null);
        mockRedisClient.setEx.mockResolvedValue("OK");
        mockArtistRankingModel.findOne.mockReturnValue(createRankingQuery(null));
        mockListenEventModel.aggregate.mockResolvedValue([
            {
                artistId: primaryArtistId,
                playCount: 42,
                uniqueListeners: 11,
                completedPlayCount: 21,
                totalTracksPlayed: 6,
                score: 97,
            },
        ]);
        mockArtistModel.find
            .mockReturnValueOnce(
                createSortLimitSelectQuery([{ _id: fillerArtistId }])
            )
            .mockReturnValueOnce(
                createSelectQuery([
                    {
                        _id: primaryArtistId,
                        name: "Primary Artist",
                        avatar: "primary.jpg",
                        activeStatus: "active",
                    },
                    {
                        _id: fillerArtistId,
                        name: "Filler Artist",
                        avatar: "filler.jpg",
                        activeStatus: "active",
                    },
                ])
            );

        const result = await artistBrowseService.getMonthlyTopArtists({
            month: "2026-07",
            limit: "2",
        });

        expect(mockListenEventModel.aggregate).toHaveBeenCalledTimes(1);
        expect(mockListenEventModel.aggregate.mock.calls[0][0][0].$match.listenedAt).toEqual({
            $gte: new Date("2026-07-01T00:00:00.000Z"),
            $lt: new Date("2026-08-01T00:00:00.000Z"),
        });
        expect(result).toEqual({
            topArtists: [
                {
                    artist: {
                        id: primaryArtistId,
                        name: "Primary Artist",
                        avatar: "primary.jpg",
                    },
                    rank: 1,
                    month: "2026-07",
                    score: 97,
                    uniqueListeners: 11,
                    playCount: 42,
                    completedPlayCount: 21,
                },
                {
                    artist: {
                        id: fillerArtistId,
                        name: "Filler Artist",
                        avatar: "filler.jpg",
                    },
                    rank: 2,
                    month: "2026-07",
                    score: 0,
                    uniqueListeners: 0,
                    playCount: 0,
                    completedPlayCount: 0,
                },
            ],
            meta: {
                month: "2026-07",
                limit: 2,
                cacheKey: "top_artists:monthly:2026-07:limit:2",
                cacheHit: false,
            },
        });
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
            "top_artists:monthly:2026-07:limit:2",
            86400,
            JSON.stringify(result.topArtists)
        );
    });
});
