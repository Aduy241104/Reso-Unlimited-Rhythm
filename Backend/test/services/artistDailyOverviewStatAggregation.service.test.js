import { jest } from "@jest/globals";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const artistId = "507f1f77bcf86cd799439012";

const mockListenEventModel = {
    aggregate: jest.fn(),
};

const mockArtistDailyStatModel = {
    bulkWrite: jest.fn(),
    deleteMany: jest.fn(),
};

const loadArtistDailyOverviewStatAggregationService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/ListenEvent.js", () => ({
        default: mockListenEventModel,
    }));
    jest.unstable_mockModule("../../src/models/ArtistDailyStat.js", () => ({
        default: mockArtistDailyStatModel,
    }));
    jest.unstable_mockModule(
        "../../src/services/analytics/trackStatAggregation.service.js",
        () => ({
            getAnalyticsTimezone: () => "UTC",
        })
    );

    const serviceModule = await import(
        "../../src/services/analytics/artistDailyOverviewStatAggregation.service.js"
    );

    return serviceModule;
};

describe("artistDailyOverviewStatAggregation.service", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-06-15T08:00:00.000Z"));

        mockListenEventModel.aggregate.mockReset();
        mockArtistDailyStatModel.bulkWrite.mockReset();
        mockArtistDailyStatModel.deleteMany.mockReset();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("syncs yesterday artist daily overview stats", async () => {
        const { syncArtistDailyOverviewStatsForDay } =
            await loadArtistDailyOverviewStatAggregationService();

        mockListenEventModel.aggregate.mockResolvedValue([
            {
                artistId,
                date: new Date("2026-06-14T00:00:00.000Z"),
                streamCount: 12,
                uniqueListeners: 4,
            },
        ]);
        mockArtistDailyStatModel.bulkWrite.mockResolvedValue({
            upsertedCount: 1,
        });
        mockArtistDailyStatModel.deleteMany
            .mockResolvedValueOnce({ deletedCount: 0 })
            .mockResolvedValueOnce({ deletedCount: 0 });

        const result = await syncArtistDailyOverviewStatsForDay("__yesterday__");

        expect(
            mockListenEventModel.aggregate.mock.calls[0][0][0].$match.listenedAt.$gte
        ).toEqual(new Date("2026-06-14T00:00:00.000Z"));
        expect(mockArtistDailyStatModel.bulkWrite).toHaveBeenCalledTimes(1);
        expect(mockArtistDailyStatModel.bulkWrite.mock.calls[0][0][0]).toEqual({
            updateOne: {
                filter: { artistId, dateKey: "2026-06-14" },
                update: {
                    $set: {
                        dateKey: "2026-06-14",
                        date: new Date("2026-06-14T00:00:00.000Z"),
                        streamCount: 12,
                        uniqueListeners: 4,
                    },
                },
                upsert: true,
            },
        });
        expect(result).toEqual({
            timezone: "UTC",
            targetDate: "2026-06-14",
            daily: {
                matchedArtists: 1,
                deletedCount: 0,
                upsertedCount: 1,
            },
        });
    });
});
