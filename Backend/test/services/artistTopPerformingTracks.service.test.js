import { jest } from "@jest/globals";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const userId = "507f1f77bcf86cd799439011";
const artistId = "507f1f77bcf86cd799439012";
const trackId = "507f1f77bcf86cd799439014";

const mockArtistModel = {
    findOne: jest.fn(),
};

const mockTrackModel = {
    find: jest.fn(),
};

const mockListenEventModel = {
    aggregate: jest.fn(),
};

const createQueryChain = (result) => ({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
});

const loadArtistTopPerformingTracksService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));
    jest.unstable_mockModule("../../src/models/ListenEvent.js", () => ({
        default: mockListenEventModel,
    }));
    jest.unstable_mockModule(
        "../../src/services/analytics/trackStatAggregation.service.js",
        () => ({
            getAnalyticsTimezone: () => "UTC",
        })
    );

    const { default: artistTopPerformingTracksService } = await import(
        "../../src/services/artist/artistTopPerformingTracks.service.js"
    );

    return { artistTopPerformingTracksService };
};

const mockOwnedTrack = (overrides = {}) => ({
    _id: trackId,
    title: "Test Track",
    avatar: "https://example.com/avatar.jpg",
    coverImage: ["https://example.com/cover.jpg"],
    duration: 210,
    artist_artistId: artistId,
    ...overrides,
});

describe("artistTopPerformingTracksService", () => {
    beforeEach(() => {
        mockArtistModel.findOne.mockReset();
        mockTrackModel.find.mockReset();
        mockListenEventModel.aggregate.mockReset();
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-06-30T12:00:00.000Z"));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("returns ranked top performing tracks for the selected period", async () => {
        const { artistTopPerformingTracksService } =
            await loadArtistTopPerformingTracksService();

        mockArtistModel.findOne.mockReturnValue(createQueryChain({ _id: artistId }));
        mockListenEventModel.aggregate.mockResolvedValue([
            {
                trackId: "507f1f77bcf86cd799439014",
                playCount: 25,
                uniqueListeners: 12,
                averageListenDuration: 96,
                skipCount: 5,
                completedCount: 18,
                lastListenedAt: "2026-06-29T10:00:00.000Z",
            },
            {
                trackId: "507f1f77bcf86cd799439015",
                playCount: 18,
                uniqueListeners: 10,
                averageListenDuration: 132,
                skipCount: 2,
                completedCount: 15,
                lastListenedAt: "2026-06-28T10:00:00.000Z",
            },
        ]);
        mockTrackModel.find.mockReturnValue(
            createQueryChain([
                mockOwnedTrack(),
                mockOwnedTrack({
                    _id: "507f1f77bcf86cd799439015",
                    title: "Second Track",
                    duration: 240,
                    stats: {
                        totalPlay: 44,
                    },
                }),
            ])
        );

        const result = await artistTopPerformingTracksService.getTopPerformingTracks({
            userId,
            range: "7d",
        });

        expect(
            mockListenEventModel.aggregate.mock.calls[0][0][0].$match.listenedAt.$gte
        ).toEqual(new Date("2026-06-24T00:00:00.000Z"));
        expect(result.period).toEqual({
            from: "2026-06-24",
            to: "2026-06-30",
            range: "7d",
        });
        expect(result.summary).toEqual({
            rankedTracks: 2,
            totalPlays: 43,
            totalUniqueListeners: 22,
            topTrack: {
                rank: 1,
                title: "Test Track",
                playCount: 25,
            },
        });
        expect(result.topTracks[0]).toEqual({
            rank: 1,
            track: {
                id: trackId,
                title: "Test Track",
                avatar: "https://example.com/avatar.jpg",
                coverImage: ["https://example.com/cover.jpg"],
                duration: 3.5,
                activeStatus: "",
                approvalStatus: "",
                stats: {
                    totalPlay: 0,
                },
            },
            playCount: 25,
            uniqueListeners: 12,
            averageListenDuration: 1.6,
            skipCount: 5,
            skipRate: 20,
            completionRate: 72,
            lastListenedAt: "2026-06-29T10:00:00.000Z",
        });
        expect(result.topTracks[1].track.title).toBe("Second Track");
        expect(result.topTracks[1].averageListenDuration).toBe(2.2);
        expect(result.topTracks[1].skipRate).toBe(11.11);
    });
});
