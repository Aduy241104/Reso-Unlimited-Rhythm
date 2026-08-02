import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockRevenueFind = jest.fn();
const mockWithdrawalCount = jest.fn();
const mockWithdrawalAggregate = jest.fn();

const artistQuery = (result) => ({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
});
const findQuery = (result) => ({
    sort: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
});

jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: { findOne: mockArtistFindOne },
}));
jest.unstable_mockModule("../../src/models/ArtistRevenueSummary.js", () => ({
    default: { find: mockRevenueFind },
}));
jest.unstable_mockModule("../../src/models/WithdrawalRequest.js", () => ({
    default: { countDocuments: mockWithdrawalCount, aggregate: mockWithdrawalAggregate },
}));

const withdrawalService = (
    await import("../../src/services/artist/artist.withdrawal.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const payoutAccountId = new mongoose.Types.ObjectId();

describe("UT-99 getMyRevenueSummaryByUserId", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockWithdrawalCount.mockResolvedValue(0);
        mockWithdrawalAggregate.mockResolvedValue([]);
    });

    test("UTCID01 - returns complete revenue and withdrawal summary", async () => {
        mockArtistFindOne.mockReturnValue(artistQuery({
            _id: artistId,
            name: "Artist",
            revenue: { availableAmount: 2500000, totalWithdrawnAmount: 500000 },
            payoutAccounts: [{
                _id: payoutAccountId,
                bankName: "VCB",
                accountNumber: "123456789",
                accountHolderName: "ARTIST",
                isDefault: true,
            }],
            withdrawalSecurity: { passwordHash: "hashed-password" },
        }));
        mockRevenueFind.mockReturnValue(findQuery([
            {
                _id: new mongoose.Types.ObjectId(),
                year: 2026,
                month: 7,
                totalEligibleStreams: 120000,
                grossRevenueAmount: 3000000,
                artistRevenueAmount: 2500000,
                withdrawnAmount: 500000,
                availableAmount: 2000000,
                status: "calculated",
            },
        ]));
        mockWithdrawalCount.mockResolvedValue(2);
        mockWithdrawalAggregate.mockResolvedValue([{ totalAmount: 300000 }]);

        const result = await withdrawalService.getMyRevenueSummaryByUserId(userId);

        expect(result.balance).toMatchObject({
            availableAmount: 2500000,
            withdrawnAmount: 500000,
            totalEligibleStreams: 120000,
            lifetimeGrossRevenueAmount: 3000000,
            lifetimeArtistRevenueAmount: 2500000,
            summaryCount: 1,
        });
        expect(result.withdrawalSummary).toEqual({ pendingAmount: 300000, requestCount: 2 });
        expect(result.payoutAccounts).toHaveLength(1);
        expect(result.hasWithdrawalPassword).toBe(true);
        expect(result.monthlySummaries).toHaveLength(1);
    });

    test("UTCID02 - returns zero balances and empty arrays without revenue data", async () => {
        mockArtistFindOne.mockReturnValue(artistQuery({
            _id: artistId,
            name: "Artist",
            revenue: {},
            payoutAccounts: [],
            withdrawalSecurity: {},
        }));
        mockRevenueFind.mockReturnValue(findQuery([]));

        const result = await withdrawalService.getMyRevenueSummaryByUserId(userId);

        expect(result.balance).toMatchObject({
            availableAmount: 0,
            withdrawnAmount: 0,
            totalEligibleStreams: 0,
            summaryCount: 0,
        });
        expect(result.payoutAccounts).toEqual([]);
        expect(result.monthlySummaries).toEqual([]);
        expect(result.hasWithdrawalPassword).toBe(false);
    });

    test("UTCID03 - throws 404 when artist profile does not exist", async () => {
        mockArtistFindOne.mockReturnValue(artistQuery(null));

        await expect(
            withdrawalService.getMyRevenueSummaryByUserId(userId)
        ).rejects.toMatchObject({ statusCode: 404 });

        expect(mockRevenueFind).not.toHaveBeenCalled();
    });
});
