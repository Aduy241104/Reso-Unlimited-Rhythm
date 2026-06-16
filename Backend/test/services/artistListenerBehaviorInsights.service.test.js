import { jest } from "@jest/globals";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const userId = "507f1f77bcf86cd799439011";
const artistId = "507f1f77bcf86cd799439012";
const trackId = "507f1f77bcf86cd799439013";

const mockArtistModel = {
    findOne: jest.fn(),
};

const mockListenEventModel = {
    aggregate: jest.fn(),
};

const mockTrackModel = {
    find: jest.fn(),
};

const mockInteractionModel = {
    aggregate: jest.fn(),
};

const createQueryChain = (result) => ({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
});

const loadArtistListenerBehaviorInsightsService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/ListenEvent.js", () => ({
        default: mockListenEventModel,
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));
    jest.unstable_mockModule("../../src/models/Interaction.js", () => ({
        default: mockInteractionModel,
    }));
    jest.unstable_mockModule(
        "../../src/services/analytics/trackStatAggregation.service.js",
        () => ({
            getAnalyticsTimezone: () => "UTC",
        })
    );

    const { default: artistListenerBehaviorInsightsService } = await import(
        "../../src/services/artist/artistListenerBehaviorInsights.service.js"
    );

    return { artistListenerBehaviorInsightsService };
};

describe("artistListenerBehaviorInsightsService", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-06-15T08:00:00.000Z"));

        mockArtistModel.findOne.mockReset();
        mockListenEventModel.aggregate.mockReset();
        mockTrackModel.find.mockReset();
        mockInteractionModel.aggregate.mockReset();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("builds listener behavior insights from listen and interaction data", async () => {
        const { artistListenerBehaviorInsightsService } =
            await loadArtistListenerBehaviorInsightsService();

        mockArtistModel.findOne.mockReturnValue(
            createQueryChain({
                _id: artistId,
                name: "Synth Horizon",
            })
        );

        mockListenEventModel.aggregate
            .mockResolvedValueOnce([
                {
                    earliestListenedAt: new Date("2026-06-09T10:00:00.000Z"),
                },
            ])
            .mockResolvedValueOnce([
                {
                    totalStreams: 12,
                    uniqueListeners: 3,
                    completedStreams: 9,
                    skippedStreams: 3,
                },
            ])
            .mockResolvedValueOnce([
                {
                    _id: "listener-1",
                    streamCount: 6,
                },
                {
                    _id: "listener-2",
                    streamCount: 3,
                },
                {
                    _id: "listener-3",
                    streamCount: 1,
                },
            ])
            .mockResolvedValueOnce([
                {
                    _id: "artist_profile",
                    count: 7,
                },
                {
                    _id: "search",
                    count: 3,
                },
                {
                    _id: "playlist",
                    count: 2,
                },
            ])
            .mockResolvedValueOnce([
                {
                    _id: "mobile",
                    count: 8,
                },
                {
                    _id: "desktop",
                    count: 4,
                },
            ])
            .mockResolvedValueOnce([
                {
                    _id: 21,
                    count: 5,
                },
                {
                    _id: 9,
                    count: 4,
                },
                {
                    _id: 13,
                    count: 3,
                },
            ]);

        mockTrackModel.find.mockReturnValue(
            createQueryChain([
                {
                    _id: trackId,
                },
            ])
        );

        mockInteractionModel.aggregate.mockResolvedValue([
            {
                engagedListeners: 2,
                followActions: 1,
                likeActions: 2,
                totalActions: 3,
            },
        ]);

        const result =
            await artistListenerBehaviorInsightsService.getArtistListenerBehaviorInsights({
                userId,
            });

        expect(
            mockListenEventModel.aggregate.mock.calls[1][0][0].$match.listenedAt.$gte
        ).toEqual(new Date("2026-06-09T00:00:00.000Z"));
        expect(result.artist).toEqual({
            id: artistId,
            name: "Synth Horizon",
        });
        expect(result.range).toBe("all");
        expect(result.period).toEqual({
            from: "2026-06-09",
            to: "2026-06-15",
        });
        expect(result.summary).toEqual({
            totalStreams: 12,
            uniqueListeners: 3,
            returningListeners: 2,
            averageStreamsPerListener: 4,
            completionRate: 75,
            skipRate: 25,
            engagementRate: 66.67,
        });
        expect(result.behavior.sources[0]).toEqual({
            key: "artist_profile",
            label: "Trang nghe si",
            count: 7,
            percentage: 58.33,
        });
        expect(result.behavior.devices).toEqual([
            {
                key: "mobile",
                label: "Mobile",
                count: 8,
                percentage: 66.67,
            },
            {
                key: "desktop",
                label: "Desktop",
                count: 4,
                percentage: 33.33,
            },
        ]);
        expect(result.behavior.listeningHours[0]).toEqual({
            key: "21",
            label: "21:00 - 21:59",
            count: 5,
            percentage: 41.67,
        });
        expect(result.behavior.loyaltySegments).toEqual([
            {
                key: "single_stream",
                label: "1 luot nghe",
                count: 1,
                percentage: 33.33,
            },
            {
                key: "repeat_2_4",
                label: "2 - 4 luot nghe",
                count: 1,
                percentage: 33.33,
            },
            {
                key: "loyal_5_9",
                label: "5 - 9 luot nghe",
                count: 1,
                percentage: 33.33,
            },
            {
                key: "super_10_plus",
                label: "10+ luot nghe",
                count: 0,
                percentage: 0,
            },
        ]);
        expect(result.behavior.engagement).toEqual({
            engagedListeners: 2,
            followActions: 1,
            likeActions: 2,
            totalActions: 3,
            engagementRate: 66.67,
        });
    });
});
