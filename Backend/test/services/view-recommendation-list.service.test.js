import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockPersonalizedMixModel = {
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
};

const mockTrackModel = {
    find: jest.fn(),
};

const mockTrackDailyRankingModel = {
    findOne: jest.fn(),
};

const mockTrackMonthlyRankingModel = {
    findOne: jest.fn(),
};

const mockTrackDailyStatModel = {
    find: jest.fn(),
    findOne: jest.fn(),
};

const mockListenEventModel = {
    distinct: jest.fn(),
};

const mockCacheService = {
    getDailyMixCache: jest.fn(),
    setDailyMixCache: jest.fn(),
    deleteDailyMixCache: jest.fn(),
};

const mockTasteProfileService = {
    ACTIVE_USER_WINDOW_DAYS: 7,
    ALGORITHM_VERSION: "test-v1",
    DAILY_MIX_COUNT: 2,
    MIX_TRACK_SPLIT: {
        familiar: 1,
        similar: 0,
        trending: 1,
    },
    TRACKS_PER_MIX: 2,
    SCORE_RULES: {
        searchKeywordOnly: 5,
    },
    calculateKeywordBoost: jest.fn(() => 0),
    getRecommendationDateContext: jest.fn(),
    getWindowStartDate: jest.fn(),
    roundScore: jest.fn((value) => Number(value)),
    sortScoreEntries: jest.fn((scores = {}) =>
        Object.entries(scores).sort((left, right) => right[1] - left[1])
    ),
    buildTasteProfile: jest.fn(),
};

const loadDailyMixService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/ListenEvent.js", () => ({
        default: mockListenEventModel,
    }));
    jest.unstable_mockModule("../../src/models/PersonalizedMix.js", () => ({
        default: mockPersonalizedMixModel,
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));
    jest.unstable_mockModule("../../src/models/TrackDailyRanking.js", () => ({
        default: mockTrackDailyRankingModel,
    }));
    jest.unstable_mockModule("../../src/models/TrackDailyStat.js", () => ({
        default: mockTrackDailyStatModel,
    }));
    jest.unstable_mockModule("../../src/models/TrackMonthlyRanking.js", () => ({
        default: mockTrackMonthlyRankingModel,
    }));
    jest.unstable_mockModule(
        "../../src/services/recommendation/recommendationCache.service.js",
        () => mockCacheService
    );
    jest.unstable_mockModule(
        "../../src/services/recommendation/tasteProfile.service.js",
        () => mockTasteProfileService
    );

    const dailyMixService = await import(
        "../../src/services/recommendation/dailyMix.service.js"
    );

    return dailyMixService;
};

const createStoredMixDoc = (title, trackIds) => ({
    _id: `${title}-id`,
    title,
    description: `${title} description`,
    mixType: "daily_mix",
    basedOn: {
        genres: [],
        artists: [],
    },
    tracks: trackIds.map((trackId, index) => ({
        order: index,
        score: 10 - index,
        reason: "fallback_trending",
        trackId: {
            _id: trackId,
            title: `${title} Track ${index + 1}`,
            duration: 200 + index,
            avatar: `${trackId}.png`,
            coverImage: [],
            artist_artistId: {
                _id: `artist-${trackId}`,
                name: `Artist ${trackId}`,
                avatar: `artist-${trackId}.png`,
            },
        },
    })),
    generatedAt: new Date("2026-07-13T00:00:00.000Z"),
    expiresAt: new Date("2026-07-14T00:00:00.000Z"),
});

describe("View Recommendation List - dailyMixService.getDailyMixesForUser", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockTasteProfileService.getRecommendationDateContext.mockReturnValue({
            dateKey: "2026-07-13",
            date: new Date("2026-07-13T00:00:00.000Z"),
            expiresAt: new Date("2026-07-14T00:00:00.000Z"),
            dayEnd: new Date("2026-07-13T23:59:59.999Z"),
        });
        mockCacheService.setDailyMixCache.mockResolvedValue(undefined);
        mockCacheService.deleteDailyMixCache.mockResolvedValue(undefined);
        mockPersonalizedMixModel.findOneAndUpdate.mockResolvedValue(undefined);
    });

    test("returns Redis mixes immediately when cached recommendation data exists", async () => {
        const { getDailyMixesForUser } = await loadDailyMixService();

        // Arrange
        const cachedPayload = {
            source: "database",
            dateKey: "2026-07-13",
            mixes: [{ _id: "mix-1", title: "Daily Mix 1", tracks: [{ _id: "track-1" }] }],
        };
        mockCacheService.getDailyMixCache.mockResolvedValue(cachedPayload);

        // Act
        const result = await getDailyMixesForUser("507f1f77bcf86cd799439811");

        // Assert
        expect(result).toEqual({
            ...cachedPayload,
            source: "redis",
        });
        expect(mockPersonalizedMixModel.find).not.toHaveBeenCalled();
        expect(mockCacheService.setDailyMixCache).not.toHaveBeenCalled();
    });

    test("returns complete stored mixes from database and refreshes Redis cache", async () => {
        const { getDailyMixesForUser } = await loadDailyMixService();

        // Arrange
        const storedMixes = [
            createStoredMixDoc("Daily Mix 1", ["track-1", "track-2"]),
            createStoredMixDoc("Daily Mix 2", ["track-3", "track-4"]),
        ];
        mockCacheService.getDailyMixCache.mockResolvedValue(null);
        mockPersonalizedMixModel.find.mockReturnValue(
            createAwaitableQuery(storedMixes, ["sort", "populate", "lean"])
        );

        // Act
        const result = await getDailyMixesForUser("507f1f77bcf86cd799439812");

        // Assert
        expect(result).toEqual({
            source: "database",
            dateKey: "2026-07-13",
            mixes: expect.arrayContaining([
                expect.objectContaining({ title: "Daily Mix 1" }),
                expect.objectContaining({ title: "Daily Mix 2" }),
            ]),
        });
        expect(mockCacheService.setDailyMixCache).toHaveBeenCalledWith(
            "507f1f77bcf86cd799439812",
            "2026-07-13",
            result
        );
    });

    test("rebuilds mixes when forceRebuild is true and caches the rebuilt payload", async () => {
        const { rebuildDailyMixesForUser } = await loadDailyMixService();

        // Arrange
        mockTasteProfileService.buildTasteProfile.mockResolvedValue({
            isColdStart: true,
            trackScores: {},
            artistScores: {},
            genreScores: {},
            searchKeywords: [],
            genreNames: {},
            artistNames: {},
            skippedTrackIds: [],
            recentlyPlayedTrackIdSet: [],
            followedArtistIds: [],
        });
        mockTrackDailyRankingModel.findOne.mockReturnValue(
            createAwaitableQuery(
                {
                    rankings: [
                        { trackId: "track-1", rank: 1, playCount: 100, uniqueListeners: 20 },
                        { trackId: "track-2", rank: 2, playCount: 90, uniqueListeners: 18 },
                        { trackId: "track-3", rank: 3, playCount: 80, uniqueListeners: 16 },
                        { trackId: "track-4", rank: 4, playCount: 70, uniqueListeners: 14 },
                    ],
                },
                ["sort", "lean", "select"]
            )
        );
        mockTrackMonthlyRankingModel.findOne.mockReturnValue(
            createAwaitableQuery(null, ["sort", "lean", "select"])
        );
        mockTrackDailyStatModel.find.mockReturnValue(
            createAwaitableQuery([], ["sort", "limit", "lean", "select"])
        );
        mockTrackDailyStatModel.findOne.mockReturnValue(
            createAwaitableQuery(null, ["sort", "lean", "select"])
        );
        mockTrackModel.find.mockReturnValue(
            createAwaitableQuery(
                ["track-1", "track-2", "track-3", "track-4"].map((trackId, index) => ({
                    _id: trackId,
                    title: `Track ${index + 1}`,
                    duration: 200 + index,
                    avatar: `${trackId}.png`,
                    coverImage: [],
                    releaseDate: new Date("2026-07-01T00:00:00.000Z"),
                    stats: { totalPlay: 100 - index },
                    artist_artistId: {
                        _id: `artist-${trackId}`,
                        name: `Artist ${index + 1}`,
                        avatar: `artist-${trackId}.png`,
                        activeStatus: "active",
                    },
                    genreIds: [],
                })),
                ["select", "populate", "lean"]
            )
        );
        mockPersonalizedMixModel.find.mockReturnValue(
            createAwaitableQuery(
                [
                    createStoredMixDoc("Daily Mix 1", ["track-1", "track-2"]),
                    createStoredMixDoc("Daily Mix 2", ["track-3", "track-4"]),
                ],
                ["sort", "populate", "lean"]
            )
        );

        // Act
        const result = await rebuildDailyMixesForUser("507f1f77bcf86cd799439813");

        // Assert
        expect(mockCacheService.deleteDailyMixCache).toHaveBeenCalledWith(
            "507f1f77bcf86cd799439813",
            "2026-07-13"
        );
        expect(mockPersonalizedMixModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
        expect(result).toEqual({
            source: "fallback",
            dateKey: "2026-07-13",
            mixes: expect.arrayContaining([
                expect.objectContaining({ title: "Daily Mix 1" }),
                expect.objectContaining({ title: "Daily Mix 2" }),
            ]),
        });
        expect(mockCacheService.setDailyMixCache).toHaveBeenCalledWith(
            "507f1f77bcf86cd799439813",
            "2026-07-13",
            result
        );
    });

    test("throws 400 when userId is invalid", async () => {
        const { getDailyMixesForUser } = await loadDailyMixService();

        // Arrange
        const invalidUserId = "invalid-user";

        // Act / Assert
        await expect(getDailyMixesForUser(invalidUserId)).rejects.toMatchObject({
            message: "User id is invalid.",
            statusCode: 400,
            details: { field: "userId" },
        });
    });

    test("propagates database errors when stored mixes cannot be loaded", async () => {
        const { getDailyMixesForUser } = await loadDailyMixService();

        // Arrange
        const databaseError = new Error("PersonalizedMix query failed");
        mockCacheService.getDailyMixCache.mockResolvedValue(null);
        mockPersonalizedMixModel.find.mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockRejectedValue(databaseError),
        });

        // Act / Assert
        await expect(
            getDailyMixesForUser("507f1f77bcf86cd799439814")
        ).rejects.toThrow("PersonalizedMix query failed");
    });
});
