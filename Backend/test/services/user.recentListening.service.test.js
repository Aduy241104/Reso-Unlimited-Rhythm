import { jest } from "@jest/globals";

const userId = "507f1f77bcf86cd799439011";
const trackId = "507f1f77bcf86cd799439013";
const artistId = "507f1f77bcf86cd799439012";
const albumId = "507f1f77bcf86cd799439014";

const mockRecentListeningActivityModel = {
    aggregate: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
};

const mockUserListeningDailyStatModel = {
    find: jest.fn(),
};

const createFindQuery = (result) => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
});

const loadRecentListeningService = async () => {
    jest.resetModules();

    jest.unstable_mockModule(
        "../../src/models/user.recentListening.model.js",
        () => ({
            default: mockRecentListeningActivityModel,
        })
    );
    jest.unstable_mockModule(
        "../../src/models/UserListeningDailyStat.js",
        () => ({
            default: mockUserListeningDailyStatModel,
        })
    );
    jest.unstable_mockModule(
        "../../src/services/analytics/trackStatAggregation.service.js",
        () => ({
            getAnalyticsTimezone: () => "UTC",
        })
    );

    const { default: userRecentListeningService } = await import(
        "../../src/services/user/user.recentListening.service.js"
    );

    return { userRecentListeningService };
};

describe("userRecentListeningService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-06-23T12:00:00.000Z"));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("stores a recent listening activity snapshot", async () => {
        const { userRecentListeningService } = await loadRecentListeningService();

        mockRecentListeningActivityModel.create.mockResolvedValue({
            _id: "activity-1",
        });

        await userRecentListeningService.storeRecentListeningActivity({
            userId,
            listenedAt: new Date("2026-06-23T10:00:00.000Z"),
            listenedDuration: 165,
            listenPercent: 82.5,
            source: "playlist",
            track: {
                _id: trackId,
                title: "Night Drive",
                duration: 200,
                avatar: "https://cdn.test/track.jpg",
                artist_artistId: {
                    _id: artistId,
                    name: "Midnight Club",
                    avatar: "https://cdn.test/artist.jpg",
                },
                album_albumId: {
                    _id: albumId,
                    title: "After Hours",
                    coverImage: "https://cdn.test/album.jpg",
                },
            },
        });

        expect(mockRecentListeningActivityModel.create).toHaveBeenCalledWith({
            userId,
            trackId,
            artistId,
            albumId,
            trackTitle: "Night Drive",
            trackImage: "https://cdn.test/track.jpg",
            artistName: "Midnight Club",
            artistAvatar: "https://cdn.test/artist.jpg",
            albumTitle: "After Hours",
            albumCoverImage: "https://cdn.test/album.jpg",
            trackDuration: 200,
            listenedDuration: 165,
            listenPercent: 82.5,
            listenedAt: new Date("2026-06-23T10:00:00.000Z"),
            source: "playlist",
        });
    });

    test("returns a 7 day chart and recent items", async () => {
        const { userRecentListeningService } = await loadRecentListeningService();

        mockUserListeningDailyStatModel.find.mockReturnValue(
            createFindQuery([
                {
                    userId,
                    dateKey: "2026-06-18",
                    listenCount: 2,
                    totalListenedDuration: 240,
                },
            ])
        );
        mockRecentListeningActivityModel.aggregate.mockResolvedValue([
            {
                _id: "2026-06-23",
                listenCount: 3,
                totalListenedDuration: 450,
            },
        ]);
        mockRecentListeningActivityModel.find.mockReturnValue(
            createFindQuery([
                {
                    _id: "activity-3",
                    trackId,
                    artistId,
                    albumId,
                    trackTitle: "Night Drive",
                    trackImage: "https://cdn.test/track.jpg",
                    artistName: "Midnight Club",
                    artistAvatar: "https://cdn.test/artist.jpg",
                    albumTitle: "After Hours",
                    albumCoverImage: "https://cdn.test/album.jpg",
                    trackDuration: 200,
                    listenedDuration: 180,
                    listenedAt: new Date("2026-06-23T10:00:00.000Z"),
                    source: "track_detail",
                },
                {
                    _id: "activity-2",
                    trackId,
                    artistId,
                    albumId,
                    trackTitle: "Blue Hour",
                    trackImage: "",
                    artistName: "Midnight Club",
                    artistAvatar: "",
                    albumTitle: "",
                    albumCoverImage: "",
                    trackDuration: 210,
                    listenedDuration: 90,
                    listenedAt: new Date("2026-06-21T09:00:00.000Z"),
                    source: "search",
                },
            ])
        );

        const result =
            await userRecentListeningService.getRecentListeningActivityByUserId(
                userId
            );

        expect(result.range).toEqual({
            days: 7,
            from: "2026-06-17",
            to: "2026-06-23",
        });
        expect(result.summary).toEqual({
            totalListens: 5,
            totalMinutes: 11.5,
            activeDays: 2,
            latestTrackTitle: "Night Drive",
        });
        expect(result.chart).toEqual([
            {
                date: "2026-06-17",
                label: "17/06",
                listenCount: 0,
                listenedMinutes: 0,
            },
            {
                date: "2026-06-18",
                label: "18/06",
                listenCount: 2,
                listenedMinutes: 4,
            },
            {
                date: "2026-06-19",
                label: "19/06",
                listenCount: 0,
                listenedMinutes: 0,
            },
            {
                date: "2026-06-20",
                label: "20/06",
                listenCount: 0,
                listenedMinutes: 0,
            },
            {
                date: "2026-06-21",
                label: "21/06",
                listenCount: 0,
                listenedMinutes: 0,
            },
            {
                date: "2026-06-22",
                label: "22/06",
                listenCount: 0,
                listenedMinutes: 0,
            },
            {
                date: "2026-06-23",
                label: "23/06",
                listenCount: 3,
                listenedMinutes: 7.5,
            },
        ]);
        expect(result.recentTracks[0]).toEqual({
            id: "activity-3",
            listenedAt: new Date("2026-06-23T10:00:00.000Z"),
            listenedDuration: 180,
            listenedMinutes: 3,
            source: "track_detail",
            track: {
                id: trackId,
                title: "Night Drive",
                image: "https://cdn.test/track.jpg",
                duration: 200,
            },
            artist: {
                id: artistId,
                name: "Midnight Club",
                avatar: "https://cdn.test/artist.jpg",
            },
            album: {
                id: albumId,
                title: "After Hours",
                coverImage: "https://cdn.test/album.jpg",
            },
        });
    });
});
