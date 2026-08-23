import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const periodId = "507f1f77bcf86cd799439011";

const mockArtistModel = {};
const mockArtistRevenueSummaryModel = {};
const mockListenEventModel = {};
const mockRevenuePeriodModel = { findOne: jest.fn() };
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

describe("View Revenue Overview", () => {
    beforeEach(() => {
        mockRevenuePeriodModel.findOne.mockReset();
    });

    test("returns the current revenue period overview for admin", async () => {
        const adminRevenueService = await loadService();

        mockRevenuePeriodModel.findOne.mockReturnValue(
            createAwaitableQuery(
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
                    lastAggregatedAt: null,
                    closedAt: null,
                    calculatedAt: null,
                    confirmedAt: null,
                    createdAt: new Date("2026-06-01T00:00:00.000Z"),
                    updatedAt: new Date("2026-06-30T00:00:00.000Z"),
                    confirmedBy: null,
                },
                ["populate", "lean"]
            )
        );

        const result = await adminRevenueService.getCurrentRevenuePeriod();

        expect(result.period).toEqual({
            id: periodId,
            year: 2026,
            month: 6,
            label: "06/2026",
            status: "open",
            periodStart: new Date("2026-06-01T00:00:00.000Z"),
            periodEnd: new Date("2026-07-01T00:00:00.000Z"),
        });
        expect(result.summary).toEqual({
            premiumRevenue: 1000,
            artistPool: 600,
            platformRevenue: 400,
            totalEligibleStreams: 25,
            successfulTransactions: 2,
        });
        expect(result.availableActions).toEqual(["close"]);
        expect(result.distribution).toBeNull();
    });
});
