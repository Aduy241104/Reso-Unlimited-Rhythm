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

const mockUserRecentListeningInsightsCacheModel = {
    findOne: jest.fn(),
};
const mockGenreModel = {
    find: jest.fn(),
};
const mockTrackModel = {
    find: jest.fn(),
};

const createFindQuery = (result) => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
});

const createStatFindQuery = (result) => ({
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
});

const loadRecentListeningService = async () => {
    jest.resetModules();

    jest.unstable_mockModule(
        "../../src/models/userRecentListeningActivity.model.js",
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
        "../../src/models/userRecentListeningInsightsCache.model.js",
        () => ({
            default: mockUserRecentListeningInsightsCacheModel,
        })
    );
    jest.unstable_mockModule("../../src/models/Genre.js", () => ({
        default: mockGenreModel,
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));
    jest.unstable_mockModule(
        "../../src/services/analytics/trackStatAggregation.service.js",
        () => ({
            getAnalyticsTimezone: () => "UTC",
        })
    );

    const { default: userRecentListeningService } = await import(
        "../../src/services/user/userListeningAnalytics.service.js"
    );

    return { userRecentListeningService };
};

describe("userRecentListeningService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRecentListeningActivityModel.aggregate.mockReset();
        mockRecentListeningActivityModel.create.mockReset();
        mockRecentListeningActivityModel.find.mockReset();
        mockUserListeningDailyStatModel.find.mockReset();
        mockUserRecentListeningInsightsCacheModel.findOne.mockReset();
        mockGenreModel.find.mockReset();
        mockTrackModel.find.mockReset();
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

    test("returns a 7 day chart, comparison metrics, and live insights", async () => {
        const { userRecentListeningService } = await loadRecentListeningService();

        mockUserListeningDailyStatModel.find.mockReturnValue(
            createStatFindQuery([
                {
                    userId,
                    dateKey: "2026-06-18",
                    listenCount: 2,
                    totalListenedDuration: 240,
                },
                {
                    userId,
                    dateKey: "2026-06-22",
                    listenCount: 1,
                    totalListenedDuration: 90,
                },
            ])
        );

        mockRecentListeningActivityModel.aggregate
            .mockResolvedValueOnce([
                {
                    _id: "2026-06-22",
                    listenCount: 1,
                    totalListenedDuration: 90,
                },
                {
                    _id: "2026-06-23",
                    listenCount: 3,
                    totalListenedDuration: 450,
                },
            ])
            .mockResolvedValueOnce([
                {
                    _id: trackId,
                    listenCount: 4,
                    totalListenedDuration: 270,
                    latestListenedAt: new Date("2026-06-23T10:00:00.000Z"),
                    trackTitle: "Night Drive",
                    trackImage: "https://cdn.test/track.jpg",
                },
                {
                    _id: "507f1f77bcf86cd799439015",
                    listenCount: 1,
                    totalListenedDuration: 120,
                    latestListenedAt: new Date("2026-06-21T09:00:00.000Z"),
                    trackTitle: "Blue Hour",
                    trackImage: "https://cdn.test/blue-hour.jpg",
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

        mockTrackModel.find.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([
                {
                    _id: trackId,
                    title: "Night Drive",
                    avatar: "https://cdn.test/track.jpg",
                    genreIds: [
                        "507f1f77bcf86cd799439099",
                    ],
                },
                {
                    _id: "507f1f77bcf86cd799439015",
                    title: "Blue Hour",
                    avatar: "https://cdn.test/blue-hour.jpg",
                    genreIds: [
                        "507f1f77bcf86cd799439099",
                        "507f1f77bcf86cd799439098",
                    ],
                },
            ]),
        });

        mockGenreModel.find.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([
                {
                    _id: "507f1f77bcf86cd799439099",
                    name: "Pop",
                },
                {
                    _id: "507f1f77bcf86cd799439098",
                    name: "Ballad",
                },
            ]),
        });

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
            totalListens: 3,
            totalMinutes: 5.5,
            activeDays: 2,
            latestTrackTitle: "Night Drive",
            today: {
                listenCount: 3,
                listenedMinutes: 7.5,
            },
            yesterday: {
                listenCount: 1,
                listenedMinutes: 1.5,
            },
            comparison: {
                listenCount: {
                    current: 3,
                    previous: 1,
                    diff: 2,
                    absoluteDiff: 2,
                    trend: "up",
                },
                listenedMinutes: {
                    current: 7.5,
                    previous: 1.5,
                    diff: 6,
                    absoluteDiff: 6,
                    trend: "up",
                },
            },
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
                listenCount: 1,
                listenedMinutes: 1.5,
            },
            {
                date: "2026-06-23",
                label: "23/06",
                listenCount: 0,
                listenedMinutes: 0,
            },
        ]);
        expect(result.topGenres).toEqual([
            {
                id: "507f1f77bcf86cd799439099",
                name: "Pop",
                listenCount: 5,
                trackCount: 2,
                percentage: 83.33,
            },
            {
                id: "507f1f77bcf86cd799439098",
                name: "Ballad",
                listenCount: 1,
                trackCount: 1,
                percentage: 16.67,
            },
        ]);
        expect(result.topTracks).toEqual([
            {
                id: trackId,
                title: "Night Drive",
                image: "https://cdn.test/track.jpg",
                listenCount: 4,
                listenedMinutes: 4.5,
                genres: [
                    {
                        id: "507f1f77bcf86cd799439099",
                        name: "Pop",
                    },
                ],
            },
            {
                id: "507f1f77bcf86cd799439015",
                title: "Blue Hour",
                image: "https://cdn.test/blue-hour.jpg",
                listenCount: 1,
                listenedMinutes: 2,
                genres: [
                    {
                        id: "507f1f77bcf86cd799439099",
                        name: "Pop",
                    },
                    {
                        id: "507f1f77bcf86cd799439098",
                        name: "Ballad",
                    },
                ],
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
        expect(mockTrackModel.find).toHaveBeenCalled();
        expect(mockGenreModel.find).toHaveBeenCalled();
    });
});
