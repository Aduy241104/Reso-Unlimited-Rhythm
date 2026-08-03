import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const userId = "507f1f77bcf86cd799439011";
const artistId = "507f1f77bcf86cd799439012";
const trackId = "507f1f77bcf86cd799439013";

const mockArtistModel = { findOne: jest.fn() };
const mockArtistRevenueSummaryModel = { findOne: jest.fn(), find: jest.fn() };
const mockRevenuePeriodModel = {};
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

describe("View Earnings Overview", () => {
    beforeEach(() => {
        mockArtistModel.findOne.mockReset();
        mockArtistRevenueSummaryModel.findOne.mockReset();
        mockArtistRevenueSummaryModel.find.mockReset();
        mockTrackMonthlyStatModel.aggregate.mockReset();
    });

    test("returns the latest earnings overview with chart and top track revenue", async () => {
        const artistRevenueService = await loadService();

        mockArtistModel.findOne.mockReturnValue(
            createAwaitableQuery({ _id: artistId }, ["select", "lean"])
        );
        mockArtistRevenueSummaryModel.findOne.mockReturnValue(
            createAwaitableQuery(
                {
                    _id: "507f1f77bcf86cd799439021",
                    artistId,
                    year: 2026,
                    month: 6,
                    artistRevenueAmount: 600,
                    totalEligibleStreams: 120,
                    status: "calculated",
                    calculatedAt: new Date("2026-06-30T00:00:00.000Z"),
                    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
                },
                ["sort", "select", "lean"]
            )
        );
        mockArtistRevenueSummaryModel.find.mockReturnValue(
            createAwaitableQuery(
                [
                    {
                        year: 2026,
                        month: 5,
                        artistRevenueAmount: 300,
                        totalEligibleStreams: 90,
                        status: "confirmed",
                    },
                    {
                        year: 2026,
                        month: 6,
                        artistRevenueAmount: 600,
                        totalEligibleStreams: 120,
                        status: "calculated",
                    },
                ],
                ["sort", "select", "lean"]
            )
        );
        mockTrackMonthlyStatModel.aggregate.mockResolvedValue([
            {
                trackId,
                title: "Night Drive",
                avatar: "track.jpg",
                artistRevenueAmount: 600,
                eligibleStreams: 120,
                playCount: 180,
            },
        ]);

        const result =
            await artistRevenueService.getLatestArtistRevenueDashboard(userId);

        expect(result.latestPeriod).toEqual({
            year: 2026,
            month: 6,
            label: "06/2026",
        });
        expect(result.summary).toEqual({
            artistRevenueAmount: 600,
            totalEligibleStreams: 120,
            status: "calculated",
            calculatedAt: new Date("2026-06-30T00:00:00.000Z"),
            confirmedAt: null,
            updatedAt: new Date("2026-07-01T00:00:00.000Z"),
        });
        expect(result.revenueChart).toHaveLength(12);
        expect(result.revenueChart[10]).toMatchObject({
            year: 2026,
            month: 5,
            artistRevenueAmount: 300,
            totalEligibleStreams: 90,
        });
        expect(result.revenueChart[11]).toMatchObject({
            year: 2026,
            month: 6,
            artistRevenueAmount: 600,
            totalEligibleStreams: 120,
        });
        expect(result.trackRevenues).toEqual([
            {
                trackId,
                title: "Night Drive",
                avatar: "track.jpg",
                artistRevenueAmount: 600,
                eligibleStreams: 120,
                playCount: 180,
            },
        ]);
        expect(mockTrackMonthlyStatModel.aggregate).toHaveBeenCalledTimes(1);
    });
});
