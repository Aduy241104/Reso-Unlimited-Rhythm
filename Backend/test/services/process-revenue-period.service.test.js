import { jest } from "@jest/globals";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const periodId = "507f1f77bcf86cd799439011";
const adminUserId = "507f1f77bcf86cd799439012";
const artistId = "507f1f77bcf86cd799439013";
const summaryId = "507f1f77bcf86cd799439014";
const trackId = "507f1f77bcf86cd799439015";

const mockArtistModel = {
    find: jest.fn(),
    bulkWrite: jest.fn(),
};
const mockArtistRevenueSummaryModel = {
    find: jest.fn(),
    deleteMany: jest.fn(),
    bulkWrite: jest.fn(),
    updateMany: jest.fn(),
};
const mockListenEventModel = { aggregate: jest.fn() };
const mockRevenuePeriodModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
};
const mockTrackMonthlyStatModel = {
    updateMany: jest.fn(),
    bulkWrite: jest.fn(),
};
const mockTransactionModel = { aggregate: jest.fn() };

const createQueryChain = (result) => ({
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
});

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

describe("Process Revenue Period", () => {
    beforeEach(() => {
        mockArtistModel.find.mockReset();
        mockArtistModel.bulkWrite.mockReset();
        mockArtistRevenueSummaryModel.find.mockReset();
        mockArtistRevenueSummaryModel.deleteMany.mockReset();
        mockArtistRevenueSummaryModel.bulkWrite.mockReset();
        mockArtistRevenueSummaryModel.updateMany.mockReset();
        mockListenEventModel.aggregate.mockReset();
        mockRevenuePeriodModel.findById.mockReset();
        mockRevenuePeriodModel.findByIdAndUpdate.mockReset();
        mockRevenuePeriodModel.findOneAndUpdate.mockReset();
        mockTrackMonthlyStatModel.updateMany.mockReset();
        mockTrackMonthlyStatModel.bulkWrite.mockReset();
        mockTransactionModel.aggregate.mockReset();
    });

    test("processes the close action and updates the revenue period totals", async () => {
        const adminRevenueService = await loadService();

        mockRevenuePeriodModel.findById.mockResolvedValue({
            _id: periodId,
            status: "open",
            periodStart: new Date("2026-06-01T00:00:00.000Z"),
            periodEnd: new Date("2026-07-01T00:00:00.000Z"),
        });
        mockTransactionModel.aggregate.mockResolvedValue([
            {
                _id: null,
                totalPremiumRevenue: 1000,
                successfulTransactions: 2,
            },
        ]);
        mockListenEventModel.aggregate.mockResolvedValue([
            {
                _id: null,
                totalEligibleStreams: 25,
            },
        ]);
        mockRevenuePeriodModel.findByIdAndUpdate.mockResolvedValue({
            _id: periodId,
            status: "closed",
        });

        const result = await adminRevenueService.processRevenuePeriodAction(
            periodId,
            "close"
        );

        expect(result).toEqual({
            periodId,
            status: "closed",
            totalPremiumRevenue: 1000,
            totalArtistPool: 600,
            totalPlatformRevenue: 400,
            totalEligibleStreams: 25,
            successfulTransactions: 2,
        });
        expect(mockRevenuePeriodModel.findByIdAndUpdate).toHaveBeenCalledWith(
            periodId,
            {
                $set: expect.objectContaining({
                    totalPremiumRevenue: 1000,
                    totalArtistPool: 600,
                    totalPlatformRevenue: 400,
                    totalEligibleStreams: 25,
                    successfulTransactions: 2,
                    status: "closed",
                    closedAt: expect.any(Date),
                    lastAggregatedAt: expect.any(Date),
                }),
            },
            { new: true, lean: true }
        );
    });

    test("throws 400 when close is requested for a non-open revenue period", async () => {
        const adminRevenueService = await loadService();

        mockRevenuePeriodModel.findById.mockResolvedValue({
            _id: periodId,
            status: "closed",
            periodStart: new Date("2026-06-01T00:00:00.000Z"),
            periodEnd: new Date("2026-07-01T00:00:00.000Z"),
        });

        await expect(
            adminRevenueService.processRevenuePeriodAction(periodId, "close")
        ).rejects.toMatchObject({
            message: "Only open revenue period can be closed.",
            statusCode: 400,
        });

        expect(mockTransactionModel.aggregate).not.toHaveBeenCalled();
        expect(mockListenEventModel.aggregate).not.toHaveBeenCalled();
        expect(mockRevenuePeriodModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    test("processes the calculate action for a closed revenue period", async () => {
        const adminRevenueService = await loadService();

        mockRevenuePeriodModel.findById.mockResolvedValue({
            _id: periodId,
            year: 2026,
            month: 6,
            status: "closed",
            totalEligibleStreams: 100,
            totalArtistPool: 600,
            periodStart: new Date("2026-06-01T00:00:00.000Z"),
            periodEnd: new Date("2026-07-01T00:00:00.000Z"),
        });
        mockListenEventModel.aggregate
            .mockResolvedValueOnce([
                {
                    _id: artistId,
                    totalEligibleStreams: 100,
                },
            ])
            .mockResolvedValueOnce([
                {
                    _id: trackId,
                    eligibleStreams: 100,
                },
            ]);
        mockArtistRevenueSummaryModel.deleteMany.mockResolvedValue({
            acknowledged: true,
            deletedCount: 0,
        });
        mockTrackMonthlyStatModel.updateMany.mockResolvedValue({
            acknowledged: true,
            modifiedCount: 1,
        });
        mockArtistRevenueSummaryModel.bulkWrite.mockResolvedValue({
            acknowledged: true,
        });
        mockTrackMonthlyStatModel.bulkWrite.mockResolvedValue({
            acknowledged: true,
        });
        mockRevenuePeriodModel.findByIdAndUpdate.mockResolvedValue({
            _id: periodId,
            status: "calculated",
        });
        mockArtistRevenueSummaryModel.find.mockReturnValue(
            createQueryChain([
                {
                    _id: summaryId,
                    artistId: {
                        _id: artistId,
                        name: "Synth Horizon",
                        avatar: "artist.png",
                        activeStatus: "active",
                    },
                    totalEligibleStreams: 100,
                    grossRevenueAmount: 0,
                    artistRevenueAmount: 600,
                    platformRevenueAmount: 0,
                    withdrawnAmount: 0,
                    availableAmount: 600,
                    status: "calculated",
                    calculatedAt: new Date("2026-06-30T00:00:00.000Z"),
                },
            ])
        );

        const result = await adminRevenueService.processRevenuePeriodAction(
            periodId,
            "calculate"
        );

        expect(result).toEqual({
            periodId,
            status: "calculated",
            isRecalculation: false,
            artistSummaryCount: 1,
            trackRevenueCount: 1,
            distribution: {
                distributedArtistCount: 1,
                distributedArtistRevenueAmount: 600,
                totalWithdrawnAmount: 0,
                totalAvailableAmount: 600,
                artists: [
                    {
                        artistId,
                        artist: {
                            id: artistId,
                            name: "Synth Horizon",
                            avatar: "artist.png",
                            activeStatus: "active",
                        },
                        totalEligibleStreams: 100,
                        grossRevenueAmount: 0,
                        artistRevenueAmount: 600,
                        platformRevenueAmount: 0,
                        withdrawnAmount: 0,
                        availableAmount: 600,
                        status: "calculated",
                        calculatedAt: new Date("2026-06-30T00:00:00.000Z"),
                    },
                ],
            },
        });
        expect(mockArtistRevenueSummaryModel.deleteMany).toHaveBeenCalledWith({
            year: 2026,
            month: 6,
            status: { $ne: "confirmed" },
        });
        expect(mockTrackMonthlyStatModel.updateMany).toHaveBeenCalledWith(
            {
                year: 2026,
                month: 6,
            },
            expect.objectContaining({
                $set: expect.objectContaining({
                    "revenue.eligibleStreams": 0,
                    "revenue.revenueAmount": 0,
                    "revenue.artistRevenueAmount": 0,
                    "revenue.calculatedAt": expect.any(Date),
                }),
            }),
            { strict: false }
        );
        expect(mockArtistRevenueSummaryModel.bulkWrite).toHaveBeenCalledTimes(1);
        expect(mockTrackMonthlyStatModel.bulkWrite).toHaveBeenCalledTimes(1);
        expect(mockRevenuePeriodModel.findByIdAndUpdate).toHaveBeenCalledWith(
            periodId,
            {
                $set: {
                    status: "calculated",
                    calculatedAt: expect.any(Date),
                },
            }
        );
    });

    test("throws 400 when calculate is requested for an open revenue period", async () => {
        const adminRevenueService = await loadService();

        mockRevenuePeriodModel.findById.mockResolvedValue({
            _id: periodId,
            year: 2026,
            month: 6,
            status: "open",
            totalEligibleStreams: 100,
            totalArtistPool: 600,
        });

        await expect(
            adminRevenueService.processRevenuePeriodAction(periodId, "calculate")
        ).rejects.toMatchObject({
            message: "Revenue period must be closed before calculation.",
            statusCode: 400,
        });

        expect(mockListenEventModel.aggregate).not.toHaveBeenCalled();
        expect(mockArtistRevenueSummaryModel.deleteMany).not.toHaveBeenCalled();
        expect(mockTrackMonthlyStatModel.updateMany).not.toHaveBeenCalled();
    });

    test("processes the confirm action for a calculated revenue period", async () => {
        const adminRevenueService = await loadService();

        mockRevenuePeriodModel.findById.mockResolvedValue({
            _id: periodId,
            year: 2026,
            month: 6,
            status: "calculated",
        });
        mockArtistRevenueSummaryModel.find
            .mockReturnValueOnce(
                createQueryChain([
                    {
                        _id: summaryId,
                        artistId,
                        artistRevenueAmount: 600,
                        status: "calculated",
                    },
                ])
            )
            .mockReturnValueOnce(
                createQueryChain([
                    {
                        _id: summaryId,
                        artistId: {
                            _id: artistId,
                            name: "Synth Horizon",
                            avatar: "artist.png",
                            activeStatus: "active",
                        },
                        totalEligibleStreams: 100,
                        grossRevenueAmount: 0,
                        artistRevenueAmount: 600,
                        platformRevenueAmount: 0,
                        withdrawnAmount: 100,
                        availableAmount: 500,
                        status: "confirmed",
                        calculatedAt: new Date("2026-06-30T00:00:00.000Z"),
                    },
                ])
            );
        mockArtistModel.find.mockReturnValue(
            createQueryChain([{ _id: artistId }], ["select", "lean"])
        );
        mockArtistModel.bulkWrite.mockResolvedValue({ acknowledged: true });
        mockArtistRevenueSummaryModel.updateMany.mockResolvedValue({
            acknowledged: true,
            modifiedCount: 1,
        });
        mockRevenuePeriodModel.findOneAndUpdate.mockResolvedValue({
            _id: periodId,
            status: "confirmed",
        });

        const result = await adminRevenueService.processRevenuePeriodAction(
            periodId,
            "confirm",
            adminUserId
        );

        expect(result).toEqual({
            periodId,
            status: "confirmed",
            confirmedArtistCount: 1,
            totalConfirmedAmount: 600,
            distribution: {
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
                        totalEligibleStreams: 100,
                        grossRevenueAmount: 0,
                        artistRevenueAmount: 600,
                        platformRevenueAmount: 0,
                        withdrawnAmount: 100,
                        availableAmount: 500,
                        status: "confirmed",
                        calculatedAt: new Date("2026-06-30T00:00:00.000Z"),
                    },
                ],
            },
        });
        expect(mockArtistModel.bulkWrite).toHaveBeenCalledTimes(1);
        expect(mockArtistRevenueSummaryModel.updateMany).toHaveBeenCalledWith(
            {
                _id: { $in: [summaryId] },
            },
            {
                $set: {
                    status: "confirmed",
                    confirmedAt: expect.any(Date),
                    confirmedBy: adminUserId,
                },
            }
        );
        expect(mockRevenuePeriodModel.findOneAndUpdate).toHaveBeenCalledWith(
            {
                _id: periodId,
                status: "calculated",
            },
            {
                $set: {
                    status: "confirmed",
                    confirmedAt: expect.any(Date),
                    confirmedBy: adminUserId,
                },
            },
            {
                new: true,
            }
        );
    });

    test("throws 404 when the revenue period id does not exist", async () => {
        const adminRevenueService = await loadService();

        mockRevenuePeriodModel.findById.mockResolvedValue(null);

        await expect(
            adminRevenueService.processRevenuePeriodAction(
                periodId,
                "confirm",
                adminUserId
            )
        ).rejects.toMatchObject({
            message: "Revenue period not found.",
            statusCode: 404,
        });

        expect(mockRevenuePeriodModel.findById).toHaveBeenCalledWith(
            periodId,
            null,
            {}
        );
        expect(mockArtistRevenueSummaryModel.find).not.toHaveBeenCalled();
    });

    test("throws bad request when the revenue period action is invalid", async () => {
        const adminRevenueService = await loadService();

        await expect(
            adminRevenueService.processRevenuePeriodAction(periodId, "archive")
        ).rejects.toMatchObject({
            message: "Revenue period action is invalid.",
            statusCode: 400,
        });

        expect(mockRevenuePeriodModel.findById).not.toHaveBeenCalled();
    });
});
