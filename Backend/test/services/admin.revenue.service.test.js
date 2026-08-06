import { jest } from "@jest/globals";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const mockArtistModel = {
    bulkWrite: jest.fn(),
    find: jest.fn(),
};

const mockArtistRevenueSummaryModel = {
    aggregate: jest.fn(),
    find: jest.fn(),
};

const mockListenEventModel = {
    aggregate: jest.fn(),
};

const mockRevenuePeriodModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
};

const mockTrackMonthlyStatModel = {
    bulkWrite: jest.fn(),
    updateMany: jest.fn(),
};

const mockTransactionModel = {
    aggregate: jest.fn(),
};

const mockRunRevenueAggregation = jest.fn();

const loadService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/ArtistRevenueSummary.js", () => ({
        default: mockArtistRevenueSummaryModel,
    }));
    jest.unstable_mockModule("../../src/models/ListenEvent.js", () => ({
        default: mockListenEventModel,
    }));
    jest.unstable_mockModule("../../src/models/RevenuePeriod.js", () => ({
        default: mockRevenuePeriodModel,
    }));
    jest.unstable_mockModule("../../src/models/TrackMonthlyStat.js", () => ({
        default: mockTrackMonthlyStatModel,
    }));
    jest.unstable_mockModule("../../src/models/Transaction.js", () => ({
        default: mockTransactionModel,
    }));
    jest.unstable_mockModule("../../src/jobs/revenueAggregation.cron.js", () => ({
        runRevenueAggregation: mockRunRevenueAggregation,
    }));

    return import("../../src/services/revenue/admin.revenue.service.js");
};

describe("admin.revenue.service", () => {
    beforeEach(() => {
        mockArtistModel.bulkWrite.mockReset();
        mockArtistModel.find.mockReset();
        mockArtistRevenueSummaryModel.aggregate.mockReset();
        mockArtistRevenueSummaryModel.find.mockReset();
        mockListenEventModel.aggregate.mockReset();
        mockRevenuePeriodModel.findById.mockReset();
        mockRevenuePeriodModel.findOne.mockReset();
        mockTrackMonthlyStatModel.bulkWrite.mockReset();
        mockTrackMonthlyStatModel.updateMany.mockReset();
        mockTransactionModel.aggregate.mockReset();
        mockRunRevenueAggregation.mockReset();
    });

    test("getRevenuePeriodDetail hides calculatedAt for non-calculated periods", async () => {
        const { default: adminRevenueService } = await loadService();

        mockRevenuePeriodModel.findById.mockReturnValue({
            populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue({
                    _id: "6892f7d6a1d5d13339fe0001",
                    year: 2026,
                    month: 8,
                    status: "open",
                    periodStart: new Date("2026-08-01T00:00:00.000Z"),
                    periodEnd: new Date("2026-09-01T00:00:00.000Z"),
                    totalPremiumRevenue: 100000,
                    totalArtistPool: 60000,
                    totalPlatformRevenue: 40000,
                    totalEligibleStreams: 300,
                    successfulTransactions: 5,
                    lastAggregatedAt: new Date("2026-08-06T09:00:00.000Z"),
                    calculatedAt: new Date("2026-08-06T09:00:00.000Z"),
                    confirmedAt: new Date("2026-08-06T09:00:00.000Z"),
                    createdAt: new Date("2026-08-01T00:00:00.000Z"),
                    updatedAt: new Date("2026-08-06T09:00:00.000Z"),
                    confirmedBy: null,
                }),
            }),
        });

        const result = await adminRevenueService.getRevenuePeriodDetail(
            "6892f7d6a1d5d13339fe0001"
        );

        expect(result.lifecycleTimestamps.lastAggregatedAt).toEqual(
            new Date("2026-08-06T09:00:00.000Z")
        );
        expect(result.lifecycleTimestamps.calculatedAt).toBeNull();
        expect(result.lifecycleTimestamps.confirmedAt).toBeNull();
    });
});
