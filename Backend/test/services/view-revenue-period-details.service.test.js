import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const periodId = "507f1f77bcf86cd799439011";
const artistId = "507f1f77bcf86cd799439012";

const mockArtistModel = {};
const mockArtistRevenueSummaryModel = {
    find: jest.fn(),
};
const mockListenEventModel = {};
const mockRevenuePeriodModel = {
    findById: jest.fn(),
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

describe("View Revenue Period Details", () => {
    beforeEach(() => {
        mockArtistRevenueSummaryModel.find.mockReset();
        mockRevenuePeriodModel.findById.mockReset();
    });

    test("returns revenue period detail for a current or past period", async () => {
        const adminRevenueService = await loadService();

        mockRevenuePeriodModel.findById.mockReturnValue(
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
                    createdAt: new Date("2026-06-01T00:00:00.000Z"),
                    updatedAt: new Date("2026-06-30T00:00:00.000Z"),
                    confirmedBy: null,
                },
                ["populate", "lean"]
            )
        );

        const result = await adminRevenueService.getRevenuePeriodDetail(periodId);

        expect(result.period).toEqual({
            id: periodId,
            year: 2026,
            month: 6,
            label: "06/2026",
            status: "open",
            periodStart: new Date("2026-06-01T00:00:00.000Z"),
            periodEnd: new Date("2026-07-01T00:00:00.000Z"),
        });
        expect(result.availableActions).toEqual(["close"]);
    });

    test("returns revenue distribution and confirmedBy info when the period is calculated", async () => {
        const adminRevenueService = await loadService();

        mockRevenuePeriodModel.findById.mockReturnValue(
            createAwaitableQuery(
                {
                    _id: periodId,
                    year: 2026,
                    month: 6,
                    status: "calculated",
                    periodStart: new Date("2026-06-01T00:00:00.000Z"),
                    periodEnd: new Date("2026-07-01T00:00:00.000Z"),
                    totalPremiumRevenue: 1000,
                    totalArtistPool: 600,
                    totalPlatformRevenue: 400,
                    totalEligibleStreams: 25,
                    successfulTransactions: 2,
                    confirmedBy: {
                        _id: "507f1f77bcf86cd799439099",
                        email: "admin@example.com",
                        profile: {
                            fullName: "Admin User",
                        },
                    },
                },
                ["populate", "lean"]
            )
        );
        mockArtistRevenueSummaryModel.find.mockReturnValue(
            createAwaitableQuery(
                [
                    {
                        _id: "507f1f77bcf86cd799439013",
                        artistId: {
                            _id: artistId,
                            name: "Synth Horizon",
                            avatar: "artist.png",
                            activeStatus: "active",
                        },
                        totalEligibleStreams: 25,
                        grossRevenueAmount: 1000,
                        artistRevenueAmount: 600,
                        platformRevenueAmount: 400,
                        withdrawnAmount: 100,
                        availableAmount: 500,
                        status: "calculated",
                        calculatedAt: new Date("2026-06-30T00:00:00.000Z"),
                    },
                ],
                ["populate", "sort", "lean"]
            )
        );

        const result = await adminRevenueService.getRevenuePeriodDetail(periodId);

        expect(result.availableActions).toEqual(["confirm"]);
        expect(result.confirmedBy).toEqual({
            id: "507f1f77bcf86cd799439099",
            email: "admin@example.com",
            fullName: "Admin User",
        });
        expect(result.distribution).toEqual({
            distributedArtistCount: 1,
            distributedArtistRevenueAmount: 600,
            totalWithdrawnAmount: 100,
            totalAvailableAmount: 500,
            artists: [
                {
                    artistId,
                    artist: {
                        id: artistId,
                        name: "Synth Horizon",
                        avatar: "artist.png",
                        activeStatus: "active",
                    },
                    totalEligibleStreams: 25,
                    grossRevenueAmount: 1000,
                    artistRevenueAmount: 600,
                    platformRevenueAmount: 400,
                    withdrawnAmount: 100,
                    availableAmount: 500,
                    status: "calculated",
                    calculatedAt: new Date("2026-06-30T00:00:00.000Z"),
                },
            ],
        });
        expect(mockArtistRevenueSummaryModel.find).toHaveBeenCalledWith({
            year: 2026,
            month: 6,
            artistRevenueAmount: { $gt: 0 },
            status: { $in: ["calculated", "confirmed"] },
        });
    });

    test("throws 400 when the revenue period id is invalid", async () => {
        const adminRevenueService = await loadService();

        await expect(
            adminRevenueService.getRevenuePeriodDetail("bad-id")
        ).rejects.toMatchObject({
            message: "Revenue period id is invalid.",
            statusCode: 400,
        });

        expect(mockRevenuePeriodModel.findById).not.toHaveBeenCalled();
    });

    test("throws 404 when the revenue period does not exist", async () => {
        const adminRevenueService = await loadService();

        mockRevenuePeriodModel.findById.mockReturnValue(
            createAwaitableQuery(null, ["populate", "lean"])
        );

        await expect(
            adminRevenueService.getRevenuePeriodDetail(periodId)
        ).rejects.toMatchObject({
            message: "Revenue period not found.",
            statusCode: 404,
        });

        expect(mockArtistRevenueSummaryModel.find).not.toHaveBeenCalled();
    });
});
