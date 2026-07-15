import { jest } from "@jest/globals";

const mockListenEventModel = {
    distinct: jest.fn(),
};
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
const mockTrackDailyStatModel = {
    find: jest.fn(),
    findOne: jest.fn(),
};
const mockTrackMonthlyRankingModel = {
    findOne: jest.fn(),
};

const loadDailyMixHelpers = async () => {
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
    jest.unstable_mockModule("../../src/utils/AppError.js", () => ({
        AppError: class AppError extends Error {},
    }));
    jest.unstable_mockModule(
        "../../src/services/recommendation/recommendationCache.service.js",
        () => ({
            deleteDailyMixCache: jest.fn(),
            getDailyMixCache: jest.fn(),
            setDailyMixCache: jest.fn(),
        })
    );
    jest.unstable_mockModule(
        "../../src/services/recommendation/tasteProfile.service.js",
        () => ({
            ACTIVE_USER_WINDOW_DAYS: 7,
            ALGORITHM_VERSION: "behavior_rule_based_v2",
            DAILY_MIX_COUNT: 6,
            MIX_TRACK_SPLIT: {
                familiar: 10,
                similar: 6,
                trending: 4,
            },
            TRACKS_PER_MIX: 20,
            SCORE_RULES: {
                searchKeywordOnly: 1,
            },
            calculateKeywordBoost: () => 0,
            getRecommendationDateContext: jest.fn(),
            getWindowStartDate: jest.fn(),
            roundScore: (value, precision = 2) => {
                const safeValue = Number.isFinite(value) ? value : 0;
                const factor = 10 ** precision;
                return Math.round(safeValue * factor) / factor;
            },
            sortScoreEntries: (scoreMap) =>
                Object.entries(scoreMap).sort((left, right) => {
                    if (right[1] !== left[1]) {
                        return right[1] - left[1];
                    }

                    return String(left[0]).localeCompare(String(right[0]));
                }),
            buildTasteProfile: jest.fn(),
        })
    );

    return import("../../src/services/recommendation/dailyMix.service.js");
};

describe("dailyMix recommendation helpers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("builds six behavior-driven mix clusters", async () => {
        const { buildMixClusters } = await loadDailyMixHelpers();

        const clusters = buildMixClusters({
            artistScores: {
                a1: 30,
                a2: 24,
                a3: 20,
                a4: 18,
                a5: 16,
                a6: 14,
            },
            genreScores: {
                g1: 28,
                g2: 22,
                g3: 19,
                g4: 15,
                g5: 12,
                g6: 10,
            },
            recentArtistIds: ["a3", "a2", "a6"],
            recentGenreIds: ["g3", "g2", "g6"],
            followedArtistIds: ["a4"],
        });

        expect(clusters).toHaveLength(6);
        expect(clusters.map((cluster) => cluster.title)).toEqual([
            "Daily Mix 1",
            "Daily Mix 2",
            "Daily Mix 3",
            "Daily Mix 4",
            "Daily Mix 5",
            "Daily Mix 6",
        ]);
        expect(clusters.map((cluster) => cluster.focus)).toEqual([
            "repeat_favorites",
            "completion_flow",
            "playlist_comfort",
            "artist_loyalty",
            "genre_rotation",
            "discovery_intent",
        ]);
        expect(clusters[3].artistIdSet.has("a4")).toBe(true);
        expect(clusters[5].targetSplit.trending).toBe(6);
    });

    test("removes duplicated tracks within each mix and across the same day", async () => {
        const { ensureUniqueTracksAcrossBlueprints } = await loadDailyMixHelpers();

        const blueprints = ensureUniqueTracksAcrossBlueprints([
            {
                title: "Daily Mix 1",
                tracks: [
                    { trackId: "t1", order: 0, score: 10, reason: "liked_track" },
                    { trackId: "t1", order: 1, score: 9, reason: "liked_track" },
                    { trackId: "t2", order: 2, score: 8, reason: "same_genre" },
                ],
            },
            {
                title: "Daily Mix 2",
                tracks: [
                    { trackId: "t2", order: 0, score: 7, reason: "same_artist" },
                    { trackId: "t3", order: 1, score: 6, reason: "same_artist" },
                ],
            },
            {
                title: "Daily Mix 3",
                candidates: [
                    {
                        track: { _id: "t3" },
                        score: 5,
                        reason: "trending_match",
                    },
                    {
                        track: { _id: "t4" },
                        score: 4,
                        reason: "fallback_trending",
                    },
                ],
            },
        ]);

        expect(blueprints[0].tracks.map((track) => track.trackId)).toEqual([
            "t1",
            "t2",
        ]);
        expect(blueprints[1].tracks.map((track) => track.trackId)).toEqual(["t3"]);
        expect(blueprints[2].tracks.map((track) => track.trackId)).toEqual(["t4"]);
        expect(blueprints[0].tracks.map((track) => track.order)).toEqual([0, 1]);

        const allTrackIds = blueprints.flatMap((blueprint) =>
            blueprint.tracks.map((track) => track.trackId)
        );

        expect(new Set(allTrackIds).size).toBe(allTrackIds.length);
    });
});
