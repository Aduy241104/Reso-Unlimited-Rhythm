import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import ArtistRevenueSummary from "../../models/ArtistRevenueSummary.js";
import { AppError } from "../../utils/AppError.js";

export const getMyRevenueSummaryByUserId = async (userId) => {
    const artist = await Artist.findOne({ userId }).select("_id name").lean();

    if (!artist) {
        throw new AppError(
            "Artist profile not found for this account.",
            StatusCodes.NOT_FOUND
        );
    }

    const revenueSummaries = await ArtistRevenueSummary.find({ artistId: artist._id })
        .sort({ year: -1, month: -1, _id: -1 })
        .select(
            "year month totalEligibleStreams grossRevenueAmount artistRevenueAmount withdrawnAmount availableAmount status calculatedAt updatedAt"
        )
        .lean();

    const latestSummary = revenueSummaries[0] || null;
    const totals = revenueSummaries.reduce(
        (accumulator, summary) => ({
            totalEligibleStreams:
                accumulator.totalEligibleStreams +
                Number(summary?.totalEligibleStreams || 0),
            lifetimeGrossRevenueAmount:
                accumulator.lifetimeGrossRevenueAmount +
                Number(summary?.grossRevenueAmount || 0),
            lifetimeArtistRevenueAmount:
                accumulator.lifetimeArtistRevenueAmount +
                Number(summary?.artistRevenueAmount || 0),
        }),
        {
            totalEligibleStreams: 0,
            lifetimeGrossRevenueAmount: 0,
            lifetimeArtistRevenueAmount: 0,
        }
    );

    return {
        artist: {
            id: String(artist._id),
            name: artist.name || "Artist",
        },
        balance: {
            currency: "VND",
            availableAmount: Number(latestSummary?.availableAmount || 0),
            withdrawnAmount: Number(latestSummary?.withdrawnAmount || 0),
            totalEligibleStreams: Number(totals.totalEligibleStreams || 0),
            lifetimeGrossRevenueAmount: Number(
                totals.lifetimeGrossRevenueAmount || 0
            ),
            lifetimeArtistRevenueAmount: Number(
                totals.lifetimeArtistRevenueAmount || 0
            ),
            latestStatus: latestSummary?.status || "pending",
            latestPeriod: latestSummary
                ? {
                    year: Number(latestSummary.year),
                    month: Number(latestSummary.month),
                }
                : null,
            calculatedAt: latestSummary?.calculatedAt || null,
            updatedAt: latestSummary?.updatedAt || null,
            summaryCount: revenueSummaries.length,
        },
        monthlySummaries: revenueSummaries.map((summary) => ({
            id: String(summary._id),
            year: Number(summary.year),
            month: Number(summary.month),
            totalEligibleStreams: Number(summary?.totalEligibleStreams || 0),
            grossRevenueAmount: Number(summary?.grossRevenueAmount || 0),
            artistRevenueAmount: Number(summary?.artistRevenueAmount || 0),
            withdrawnAmount: Number(summary?.withdrawnAmount || 0),
            availableAmount: Number(summary?.availableAmount || 0),
            status: summary?.status || "pending",
            calculatedAt: summary?.calculatedAt || null,
            updatedAt: summary?.updatedAt || null,
        })),
    };
};

export default {
    getMyRevenueSummaryByUserId,
};
