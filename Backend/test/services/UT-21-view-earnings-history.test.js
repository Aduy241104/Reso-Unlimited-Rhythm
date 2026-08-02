import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const userId = "507f1f77bcf86cd799439011";
const artistId = "507f1f77bcf86cd799439012";
const summaryId = "507f1f77bcf86cd799439013";
const periodId = "507f1f77bcf86cd799439014";

const mockArtistModel = { findOne: jest.fn() };
const mockArtistRevenueSummaryModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
};
const mockRevenuePeriodModel = { find: jest.fn() };
const mockTrackMonthlyStatModel = { aggregate: jest.fn() };

const loadService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/ArtistRevenueSummary.js", () => ({
        default: mockArtistRevenueSummaryModel,
    }));
    jest.unstable_mockModule("../../src/models/RevenuePeriod.js", () => ({
        default: mockRevenuePeriodModel,
    }));
    jest.unstable_mockModule("../../src/models/TrackMonthlyStat.js", () => ({
        default: mockTrackMonthlyStatModel,
    }));

    const { default: artistRevenueService } = await import(
        "../../src/services/revenue/artistRevenue.service.js"
    );

    return artistRevenueService;
};

describe("View Earnings History", () => {
    beforeEach(() => {
        mockArtistModel.findOne.mockReset();
        mockArtistRevenueSummaryModel.countDocuments.mockReset();
        mockArtistRevenueSummaryModel.find.mockReset();
        mockRevenuePeriodModel.find.mockReset();
        mockTrackMonthlyStatModel.aggregate.mockReset();
    });

    test("returns paginated earnings history for the artist", async () => {
        const artistRevenueService = await loadService();

        mockArtistModel.findOne.mockReturnValue(
            createAwaitableQuery({ _id: artistId }, ["select", "lean"])
        );
        mockArtistRevenueSummaryModel.countDocuments.mockResolvedValue(1);
        mockArtistRevenueSummaryModel.find.mockReturnValue(
            createAwaitableQuery(
                [
                    {
                        _id: summaryId,
                        year: 2026,
                        month: 6,
                        artistRevenueAmount: 600,
                        totalEligibleStreams: 120,
                        status: "calculated",
                        calculatedAt: new Date("2026-06-30T00:00:00.000Z"),
                        updatedAt: new Date("2026-07-01T00:00:00.000Z"),
                    },
                ],
                ["sort", "skip", "limit", "select", "lean"]
            )
        );
        mockRevenuePeriodModel.find.mockReturnValue(
            createAwaitableQuery(
                [
                    {
                        _id: periodId,
                        year: 2026,
                        month: 6,
                        status: "calculated",
                        periodStart: new Date("2026-06-01T00:00:00.000Z"),
                        periodEnd: new Date("2026-07-01T00:00:00.000Z"),
                    },
                ],
                ["select", "lean"]
            )
        );
        mockTrackMonthlyStatModel.aggregate.mockResolvedValue([
            {
                _id: { year: 2026, month: 6 },
                trackCount: 1,
                totalTrackRevenueAmount: 600,
            },
        ]);

        const result = await artistRevenueService.getArtistRevenuePeriods(userId, {
            status: "calculated",
            page: "1",
            limit: "20",
        });

        expect(result.revenuePeriods).toEqual([
            {
                id: periodId,
                revenueSummaryId: summaryId,
                period: {
                    id: periodId,
                    revenueSummaryId: summaryId,
                    year: 2026,
                    month: 6,
                    label: "06/2026",
                    status: "calculated",
                    periodStart: new Date("2026-06-01T00:00:00.000Z"),
                    periodEnd: new Date("2026-07-01T00:00:00.000Z"),
                },
                summary: {
                    artistRevenueAmount: 600,
                    totalEligibleStreams: 120,
                    status: "calculated",
                    calculatedAt: new Date("2026-06-30T00:00:00.000Z"),
                    confirmedAt: null,
                    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
                },
                trackCount: 1,
                totalTrackRevenueAmount: 600,
            },
        ]);
        expect(result.pagination).toEqual({
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
        });
        expect(mockArtistRevenueSummaryModel.countDocuments).toHaveBeenCalledWith({
            artistId,
            status: "calculated",
        });
    });

    test("uses the requested page and limit to paginate earnings history", async () => {
        const artistRevenueService = await loadService();
        const findQuery = createAwaitableQuery(
            [],
            ["sort", "skip", "limit", "select", "lean"]
        );

        mockArtistModel.findOne.mockReturnValue(
            createAwaitableQuery({ _id: artistId }, ["select", "lean"])
        );
        mockArtistRevenueSummaryModel.countDocuments.mockResolvedValue(21);
        mockArtistRevenueSummaryModel.find.mockReturnValue(findQuery);
        mockRevenuePeriodModel.find.mockReturnValue(
            createAwaitableQuery([], ["select", "lean"])
        );
        mockTrackMonthlyStatModel.aggregate.mockResolvedValue([]);

        const result = await artistRevenueService.getArtistRevenuePeriods(userId, {
            page: "2",
            limit: "10",
        });

        expect(result.pagination).toEqual({
            page: 2,
            limit: 10,
            total: 21,
            totalPages: 3,
        });
        expect(findQuery.skip).toHaveBeenCalledWith(10);
        expect(findQuery.limit).toHaveBeenCalledWith(10);
    });

    test("throws 404 when the account does not have an artist profile", async () => {
        const artistRevenueService = await loadService();

        mockArtistModel.findOne.mockReturnValue(
            createAwaitableQuery(null, ["select", "lean"])
        );

        await expect(
            artistRevenueService.getArtistRevenuePeriods(userId, {
                page: "1",
                limit: "20",
            })
        ).rejects.toMatchObject({
            message: "Artist profile not found for this account.",
            statusCode: 404,
        });

        expect(mockArtistModel.findOne).toHaveBeenCalledWith({ userId });
        expect(mockArtistRevenueSummaryModel.countDocuments).not.toHaveBeenCalled();
        expect(mockArtistRevenueSummaryModel.find).not.toHaveBeenCalled();
    });

    test("returns empty earnings history when the current artist has no revenue summaries", async () => {
        const artistRevenueService = await loadService();

        mockArtistModel.findOne.mockReturnValue(
            createAwaitableQuery({ _id: artistId }, ["select", "lean"])
        );
        mockArtistRevenueSummaryModel.countDocuments.mockResolvedValue(0);
        mockArtistRevenueSummaryModel.find.mockReturnValue(
            createAwaitableQuery([], ["sort", "skip", "limit", "select", "lean"])
        );

        const result = await artistRevenueService.getArtistRevenuePeriods(userId, {
            page: "1",
            limit: "20",
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
        expect(mockArtistModel.findOne).toHaveBeenCalledWith({ userId });
        expect(mockArtistRevenueSummaryModel.countDocuments).toHaveBeenCalledWith({
            artistId,
        });
        expect(mockArtistRevenueSummaryModel.find).toHaveBeenCalledWith({
            artistId,
        });
        expect(mockRevenuePeriodModel.find).not.toHaveBeenCalled();
        expect(mockTrackMonthlyStatModel.aggregate).not.toHaveBeenCalled();
    });

    test("falls back to default page and limit when pagination input is invalid", async () => {
        const artistRevenueService = await loadService();
        const findQuery = createAwaitableQuery(
            [],
            ["sort", "skip", "limit", "select", "lean"]
        );

        mockArtistModel.findOne.mockReturnValue(
            createAwaitableQuery({ _id: artistId }, ["select", "lean"])
        );
        mockArtistRevenueSummaryModel.countDocuments.mockResolvedValue(0);
        mockArtistRevenueSummaryModel.find.mockReturnValue(findQuery);

        const result = await artistRevenueService.getArtistRevenuePeriods(userId, {
            page: "0",
            limit: "abc",
        });

        expect(result.pagination).toEqual({
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
        });
        expect(findQuery.skip).toHaveBeenCalledWith(0);
        expect(findQuery.limit).toHaveBeenCalledWith(20);
    });

    test("caps limit at 50 when the requested limit exceeds the maximum", async () => {
        const artistRevenueService = await loadService();
        const findQuery = createAwaitableQuery(
            [],
            ["sort", "skip", "limit", "select", "lean"]
        );

        mockArtistModel.findOne.mockReturnValue(
            createAwaitableQuery({ _id: artistId }, ["select", "lean"])
        );
        mockArtistRevenueSummaryModel.countDocuments.mockResolvedValue(120);
        mockArtistRevenueSummaryModel.find.mockReturnValue(findQuery);

        const result = await artistRevenueService.getArtistRevenuePeriods(userId, {
            page: "1",
            limit: "999",
        });

        expect(result.pagination).toEqual({
            page: 1,
            limit: 50,
            total: 120,
            totalPages: 3,
        });
        expect(findQuery.skip).toHaveBeenCalledWith(0);
        expect(findQuery.limit).toHaveBeenCalledWith(50);
    });
});
