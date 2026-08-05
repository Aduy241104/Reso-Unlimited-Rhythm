import { jest } from "@jest/globals";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const artistId = "507f1f77bcf86cd799439012";

const createFindQuery = (result) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(result),
    }),
});

const mockArtistModel = {
    find: jest.fn(),
};

const mockArtistMonthlyStatModel = {
    bulkWrite: jest.fn(),
    deleteMany: jest.fn(),
};

const mockArtistRevenueSummaryModel = {
    find: jest.fn(),
};

const mockInteractionModel = {
    aggregate: jest.fn(),
};

const mockListenEventModel = {
    aggregate: jest.fn(),
};

const loadService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/ArtistMonthlyStat.js", () => ({
        default: mockArtistMonthlyStatModel,
    }));
    jest.unstable_mockModule("../../src/models/ArtistRevenueSummary.js", () => ({
        default: mockArtistRevenueSummaryModel,
    }));
    jest.unstable_mockModule("../../src/models/Interaction.js", () => ({
        default: mockInteractionModel,
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

    return import(
        "../../src/services/analytics/artistMonthlyStatAggregation.service.js"
    );
};

describe("artistMonthlyStatAggregation.service", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-01T00:30:00.000Z"));

        mockArtistModel.find.mockReset();
        mockArtistMonthlyStatModel.bulkWrite.mockReset();
        mockArtistMonthlyStatModel.deleteMany.mockReset();
        mockArtistRevenueSummaryModel.find.mockReset();
        mockInteractionModel.aggregate.mockReset();
        mockListenEventModel.aggregate.mockReset();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("aggregates and upserts the previous completed month", async () => {
        const { syncArtistMonthlyStatsForMonth } = await loadService();

        mockArtistModel.find.mockReturnValue(createFindQuery([{ _id: artistId }]));
        mockListenEventModel.aggregate.mockResolvedValue([
            { _id: artistId, totalStreams: 125 },
        ]);
        mockInteractionModel.aggregate
            .mockResolvedValueOnce([{ _id: artistId, count: 8 }])
            .mockResolvedValueOnce([{ _id: artistId, count: 240 }]);
        mockArtistRevenueSummaryModel.find.mockReturnValue(
            createFindQuery([
                { artistId, artistRevenueAmount: 325000 },
            ])
        );
        mockArtistMonthlyStatModel.bulkWrite.mockResolvedValue({
            upsertedCount: 1,
            modifiedCount: 0,
        });
        mockArtistMonthlyStatModel.deleteMany.mockResolvedValue({
            deletedCount: 0,
        });

        const result = await syncArtistMonthlyStatsForMonth();

        const streamMatch = mockListenEventModel.aggregate.mock.calls[0][0][0].$match;
        expect(streamMatch.listenedAt).toEqual({
            $gte: new Date("2026-06-01T00:00:00.000Z"),
            $lt: new Date("2026-07-01T00:00:00.000Z"),
        });
        expect(mockArtistMonthlyStatModel.bulkWrite.mock.calls[0][0][0]).toEqual({
            updateOne: {
                filter: { artistId, year: 2026, month: 6 },
                update: {
                    $set: {
                        newFollowers: 8,
                        totalFollowers: 240,
                        totalStreams: 125,
                        revenueAmount: 325000,
                    },
                },
                upsert: true,
            },
        });
        expect(result).toEqual({
            timezone: "UTC",
            targetMonth: "2026-06",
            monthly: {
                matchedArtists: 1,
                deletedCount: 0,
                upsertedCount: 1,
                modifiedCount: 0,
            },
        });
    });
});
