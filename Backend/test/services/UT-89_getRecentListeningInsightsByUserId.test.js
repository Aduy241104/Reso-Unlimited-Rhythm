import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockActivityAggregate = jest.fn();
const mockTrackFind = jest.fn();
const mockGenreFind = jest.fn();

const createQuery = (result) => ({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
});

jest.unstable_mockModule("../../src/models/userRecentListeningActivity.js", () => ({
    default: { aggregate: mockActivityAggregate },
}));
jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: { find: mockTrackFind },
}));
jest.unstable_mockModule("../../src/models/Genre.js", () => ({
    default: { find: mockGenreFind },
}));
jest.unstable_mockModule(
    "../../src/services/analytics/trackStatAggregation.service.js",
    () => ({ getAnalyticsTimezone: () => "UTC" })
);

const listeningService = await import(
    "../../src/services/user/userListeningAnalytics.service.js"
);

const userId = new mongoose.Types.ObjectId();
const trackId = new mongoose.Types.ObjectId();
const genreId = new mongoose.Types.ObjectId();

describe("UT-89 getRecentListeningInsightsByUserId", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-15T12:00:00.000Z"));
        mockActivityAggregate.mockResolvedValue([]);
        mockTrackFind.mockReturnValue(createQuery([]));
        mockGenreFind.mockReturnValue(createQuery([]));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("UTCID01 - returns normalized live top genres and tracks", async () => {
        mockActivityAggregate.mockResolvedValue([
            {
                _id: trackId,
                listenCount: 8,
                totalListenedDuration: 1110,
                latestListenedAt: new Date("2026-07-15T10:00:00.000Z"),
                trackTitle: "Snapshot title",
                trackImage: "snapshot.jpg",
            },
        ]);
        mockTrackFind.mockReturnValue(
            createQuery([
                {
                    _id: trackId,
                    title: "Shape of You",
                    avatar: "https://res.cloudinary.com/demo/shape-of-you.jpg",
                    genreIds: [genreId],
                },
            ])
        );
        mockGenreFind.mockReturnValue(
            createQuery([{ _id: genreId, name: "Pop" }])
        );

        const result = await listeningService.getRecentListeningInsightsByUserId(userId);

        expect(result.range).toEqual({ from: "2026-07-09", to: "2026-07-15" });
        expect(result.topGenres[0]).toMatchObject({
            id: genreId.toString(),
            name: "Pop",
            listenCount: 8,
            trackCount: 1,
            percentage: 100,
        });
        expect(result.topTracks[0]).toMatchObject({
            id: trackId.toString(),
            title: "Shape of You",
            listenCount: 8,
            listenedMinutes: 18.5,
        });
    });

    test("UTCID02 - returns empty insights when live fallback is disabled", async () => {
        const result = await listeningService.getRecentListeningInsightsByUserId(
            userId,
            { allowLiveFallback: false }
        );

        expect(result).toEqual({
            range: { from: "2026-07-09", to: "2026-07-15" },
            topGenres: [],
            topTracks: [],
            lastCalculatedAt: null,
        });
        expect(mockActivityAggregate).not.toHaveBeenCalled();
    });

    test("UTCID03 - returns empty normalized arrays when no activity exists", async () => {
        const result = await listeningService.getRecentListeningInsightsByUserId(userId);

        expect(result.topGenres).toEqual([]);
        expect(result.topTracks).toEqual([]);
        expect(result.lastCalculatedAt).toBeInstanceOf(Date);
    });

    test("UTCID04 - applies defaults when track metadata was deleted", async () => {
        mockActivityAggregate.mockResolvedValue([
            {
                _id: trackId,
                listenCount: 2,
                totalListenedDuration: 0,
                trackTitle: "",
                trackImage: null,
            },
        ]);

        const result = await listeningService.getRecentListeningInsightsByUserId(userId);

        expect(result.topTracks[0]).toMatchObject({
            id: trackId.toString(),
            title: "Untitled track",
            image: "",
            listenCount: 2,
            listenedMinutes: 0,
            genres: [],
        });
        expect(result.topGenres[0]).toMatchObject({ name: "Khac", listenCount: 2 });
    });

    test("UTCID05 - rejects an invalid ObjectId", async () => {
        await expect(
            listeningService.getRecentListeningInsightsByUserId("invalid-user-id")
        ).rejects.toThrow();
    });

    test("UTCID06 - propagates database aggregation errors", async () => {
        mockActivityAggregate.mockRejectedValue(new Error("Database connection failed"));

        await expect(
            listeningService.getRecentListeningInsightsByUserId(userId)
        ).rejects.toThrow("Database connection failed");
    });
});
