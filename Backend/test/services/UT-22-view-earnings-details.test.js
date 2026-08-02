import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const userId = "507f1f77bcf86cd799439011";
const artistId = "507f1f77bcf86cd799439012";
const summaryId = "507f1f77bcf86cd799439013";
const periodId = "507f1f77bcf86cd799439014";
const trackId = "507f1f77bcf86cd799439015";

const mockArtistModel = { findOne: jest.fn() };
const mockArtistRevenueSummaryModel = { findOne: jest.fn() };
const mockRevenuePeriodModel = { findById: jest.fn(), findOne: jest.fn() };
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

describe("View Earnings Details", () => {
    beforeEach(() => {
        mockArtistModel.findOne.mockReset();
        mockArtistRevenueSummaryModel.findOne.mockReset();
        mockRevenuePeriodModel.findById.mockReset();
        mockRevenuePeriodModel.findOne.mockReset();
        mockTrackMonthlyStatModel.aggregate.mockReset();
    });

    test("returns earnings detail when the revenue summary is found", async () => {
        const artistRevenueService = await loadService();

        mockArtistModel.findOne.mockReturnValue(
            createAwaitableQuery({ _id: artistId }, ["select", "lean"])
        );
        mockArtistRevenueSummaryModel.findOne.mockReturnValue(
            createAwaitableQuery(
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
                ["select", "lean"]
            )
        );
        mockRevenuePeriodModel.findById.mockReturnValue(
            createAwaitableQuery(
                {
                    _id: periodId,
                    year: 2026,
                    month: 6,
                    status: "calculated",
                    periodStart: new Date("2026-06-01T00:00:00.000Z"),
                    periodEnd: new Date("2026-07-01T00:00:00.000Z"),
                },
                ["select", "lean"]
            )
        );
        mockTrackMonthlyStatModel.aggregate.mockResolvedValue([
            {
                trackId,
                title: "Night Drive",
                avatar: "track.jpg",
                releaseDate: new Date("2026-06-10T00:00:00.000Z"),
                activeStatus: "active",
                approvalStatus: "approved",
                artistRevenueAmount: 600,
                eligibleStreams: 120,
                playCount: 180,
                uniqueListeners: 80,
                revenueCalculatedAt: new Date("2026-06-30T00:00:00.000Z"),
            },
        ]);

        const result = await artistRevenueService.getArtistRevenuePeriodDetail(
            userId,
            summaryId
        );

        expect(result.period).toEqual({
            id: periodId,
            revenueSummaryId: summaryId,
            year: 2026,
            month: 6,
            label: "06/2026",
            status: "calculated",
            periodStart: new Date("2026-06-01T00:00:00.000Z"),
            periodEnd: new Date("2026-07-01T00:00:00.000Z"),
        });
        expect(result.totals).toEqual({
            trackCount: 1,
            totalTrackRevenueAmount: 600,
            totalEligibleStreams: 120,
        });
        expect(result.trackRevenues).toHaveLength(1);
        expect(result.trackRevenues[0]).toMatchObject({
            trackId,
            title: "Night Drive",
            artistRevenueAmount: 600,
            grossRevenueAmount: 1000,
            platformRevenueAmount: 400,
            revenueSharePercent: 60,
            eligibleStreams: 120,
        });
        expect(mockArtistModel.findOne).toHaveBeenCalledWith({ userId });
        expect(mockArtistRevenueSummaryModel.findOne).toHaveBeenCalledWith({
            _id: summaryId,
            artistId,
        });
        expect(mockRevenuePeriodModel.findById).toHaveBeenCalledWith(summaryId);
        expect(mockTrackMonthlyStatModel.aggregate).toHaveBeenCalledTimes(1);
    });

    test("throws 404 when the account does not have an artist profile", async () => {
        const artistRevenueService = await loadService();

        mockArtistModel.findOne.mockReturnValue(
            createAwaitableQuery(null, ["select", "lean"])
        );

        await expect(
            artistRevenueService.getArtistRevenuePeriodDetail(userId, summaryId)
        ).rejects.toMatchObject({
            message: "Artist profile not found for this account.",
            statusCode: 404,
        });

        expect(mockArtistModel.findOne).toHaveBeenCalledWith({ userId });
        expect(mockArtistRevenueSummaryModel.findOne).not.toHaveBeenCalled();
        expect(mockRevenuePeriodModel.findById).not.toHaveBeenCalled();
    });

    test("throws 404 when the summaryId does not belong to the current artist", async () => {
        const artistRevenueService = await loadService();

        mockArtistModel.findOne.mockReturnValue(
            createAwaitableQuery({ _id: artistId }, ["select", "lean"])
        );
        mockArtistRevenueSummaryModel.findOne.mockReturnValue(
            createAwaitableQuery(null, ["select", "lean"])
        );
        mockRevenuePeriodModel.findById.mockReturnValue(
            createAwaitableQuery(null, ["select", "lean"])
        );

        await expect(
            artistRevenueService.getArtistRevenuePeriodDetail(userId, summaryId)
        ).rejects.toMatchObject({
            message: "Artist revenue period not found.",
            statusCode: 404,
        });

        expect(mockArtistModel.findOne).toHaveBeenCalledWith({ userId });
        expect(mockArtistRevenueSummaryModel.findOne).toHaveBeenCalledWith({
            _id: summaryId,
            artistId,
        });
        expect(mockRevenuePeriodModel.findById).toHaveBeenCalledWith(summaryId);
        expect(mockTrackMonthlyStatModel.aggregate).not.toHaveBeenCalled();
    });

    test("throws 404 when the summaryId is not found", async () => {
        const artistRevenueService = await loadService();

        mockArtistModel.findOne.mockReturnValue(
            createAwaitableQuery({ _id: artistId }, ["select", "lean"])
        );
        mockArtistRevenueSummaryModel.findOne.mockReturnValue(
            createAwaitableQuery(null, ["select", "lean"])
        );
        mockRevenuePeriodModel.findById.mockReturnValue(
            createAwaitableQuery(
                {
                    _id: periodId,
                    year: 2026,
                    month: 6,
                    status: "calculated",
                    periodStart: new Date("2026-06-01T00:00:00.000Z"),
                    periodEnd: new Date("2026-07-01T00:00:00.000Z"),
                },
                ["select", "lean"]
            )
        );

        await expect(
            artistRevenueService.getArtistRevenuePeriodDetail(userId, summaryId)
        ).rejects.toMatchObject({
            message: "Artist revenue period not found.",
            statusCode: 404,
        });

        expect(mockArtistModel.findOne).toHaveBeenCalledWith({ userId });
        expect(mockArtistRevenueSummaryModel.findOne).toHaveBeenCalledWith({
            _id: summaryId,
            artistId,
        });
        expect(mockRevenuePeriodModel.findById).toHaveBeenCalledWith(summaryId);
        expect(mockTrackMonthlyStatModel.aggregate).not.toHaveBeenCalled();
    });
});
