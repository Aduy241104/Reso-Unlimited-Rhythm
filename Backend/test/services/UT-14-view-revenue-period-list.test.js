import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const periodId = "507f1f77bcf86cd799439011";

const mockArtistModel = {};
const mockArtistRevenueSummaryModel = { aggregate: jest.fn() };
const mockListenEventModel = {};
const mockRevenuePeriodModel = {
    exists: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
};
const mockTrackMonthlyStatModel = {};
const mockTransactionModel = {};

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
        runRevenueAggregation: jest.fn(),
    }));
    jest.unstable_mockModule("../../src/helpers/revenuePeriod.helper.js", () => ({
        ARTIST_REVENUE_SHARE_PERCENT: 60,
        ARTIST_REVENUE_SHARE_RATIO: 0.6,
        PLATFORM_REVENUE_SHARE_PERCENT: 40,
        buildRevenuePeriodRange: jest.fn(),
        normalizeRevenueDashboardPeriod: jest.fn(() => ({
            year: 2026,
            month: 6,
            currentYear: 2026,
            currentMonth: 6,
            timezone: "UTC",
        })),
        resolveRevenuePeriodStatus: jest.fn(),
    }));

    const { default: adminRevenueService } = await import(
        "../../src/services/revenue/admin.revenue.service.js"
    );

    return adminRevenueService;
};

describe("View Revenue Period List", () => {
    beforeEach(() => {
        mockArtistRevenueSummaryModel.aggregate.mockReset();
        mockRevenuePeriodModel.exists.mockReset();
        mockRevenuePeriodModel.countDocuments.mockReset();
        mockRevenuePeriodModel.find.mockReset();
    });

    test("uses the requested page and limit to paginate revenue periods", async () => {
        const adminRevenueService = await loadService();
        const findChain = createAwaitableQuery(
            [
                {
                    _id: periodId,
                    year: 2026,
                    month: 6,
                    status: "open",
                    periodStart: new Date("2026-06-01T00:00:00.000Z"),
                    periodEnd: new Date("2026-07-01T00:00:00.000Z"),
                    totalPremiumRevenue: 1000,
                    totalArtistPool: 600,
                    totalPlatformRevenue: 400,
                    totalEligibleStreams: 25,
                    successfulTransactions: 2,
                    createdAt: new Date("2026-06-01T00:00:00.000Z"),
                    updatedAt: new Date("2026-06-30T00:00:00.000Z"),
                },
            ],
            ["sort", "skip", "limit", "lean"]
        );

        mockRevenuePeriodModel.exists.mockResolvedValue(true);
        mockRevenuePeriodModel.countDocuments.mockResolvedValue(21);
        mockRevenuePeriodModel.find.mockReturnValue(findChain);
        mockArtistRevenueSummaryModel.aggregate.mockResolvedValue([
            {
                _id: { year: 2026, month: 6 },
                distributedArtistCount: 2,
                distributedArtistRevenueAmount: 600,
            },
        ]);

        const result = await adminRevenueService.getRevenuePeriods({
            page: "2",
            limit: "10",
        });

        expect(result.revenuePeriods).toEqual([
            expect.objectContaining({
                id: periodId,
                year: 2026,
                month: 6,
                status: "open",
                distribution: {
                    distributedArtistCount: 2,
                    distributedArtistRevenueAmount: 600,
                },
                availableActions: ["close"],
            }),
        ]);
        expect(result.pagination).toEqual({
            page: 2,
            limit: 10,
            total: 21,
            totalPages: 3,
        });
        expect(findChain.skip).toHaveBeenCalledWith(10);
        expect(findChain.limit).toHaveBeenCalledWith(10);
        expect(mockRevenuePeriodModel.exists).toHaveBeenCalledWith({
            year: 2026,
            month: 6,
        });
    });

    test("falls back to default page and limit when pagination input is invalid", async () => {
        const adminRevenueService = await loadService();
        const findChain = createAwaitableQuery([], ["sort", "skip", "limit", "lean"]);

        mockRevenuePeriodModel.exists.mockResolvedValue(true);
        mockRevenuePeriodModel.countDocuments.mockResolvedValue(0);
        mockRevenuePeriodModel.find.mockReturnValue(findChain);

        const result = await adminRevenueService.getRevenuePeriods({
            page: "0",
            limit: "-5",
        });

        expect(result).toEqual({
            revenuePeriods: [],
            pagination: {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
            },
        });
        expect(findChain.skip).toHaveBeenCalledWith(0);
        expect(findChain.limit).toHaveBeenCalledWith(20);
        expect(mockArtistRevenueSummaryModel.aggregate).not.toHaveBeenCalled();
    });

    test("caps limit at 50 when the requested limit exceeds the maximum", async () => {
        const adminRevenueService = await loadService();
        const findChain = createAwaitableQuery([], ["sort", "skip", "limit", "lean"]);

        mockRevenuePeriodModel.exists.mockResolvedValue(true);
        mockRevenuePeriodModel.countDocuments.mockResolvedValue(120);
        mockRevenuePeriodModel.find.mockReturnValue(findChain);

        const result = await adminRevenueService.getRevenuePeriods({
            page: "1",
            limit: "999",
        });

        expect(result.pagination).toEqual({
            page: 1,
            limit: 50,
            total: 120,
            totalPages: 3,
        });
        expect(findChain.skip).toHaveBeenCalledWith(0);
        expect(findChain.limit).toHaveBeenCalledWith(50);
        expect(mockArtistRevenueSummaryModel.aggregate).not.toHaveBeenCalled();
    });
});
