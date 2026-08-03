import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockBcryptCompare = jest.fn();
const mockArtistFindOne = jest.fn();
const mockArtistUpdateOne = jest.fn();
const mockRevenueFindOne = jest.fn();
const mockWithdrawalCreate = jest.fn();

const thenableQuery = (result) => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
});

jest.unstable_mockModule("bcrypt", () => ({
    default: { compare: mockBcryptCompare, hash: jest.fn() },
}));
jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: { findOne: mockArtistFindOne, updateOne: mockArtistUpdateOne },
}));
jest.unstable_mockModule("../../src/models/ArtistRevenueSummary.js", () => ({
    default: { findOne: mockRevenueFindOne },
}));
jest.unstable_mockModule("../../src/models/WithdrawalRequest.js", () => ({
    default: { create: mockWithdrawalCreate },
}));

const withdrawalService = (
    await import("../../src/services/artist/artist.withdrawal.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const payoutAccountId = new mongoose.Types.ObjectId();

const createArtist = () => ({
    _id: artistId,
    name: "Artist",
    revenue: { availableAmount: 2500000, totalWithdrawnAmount: 0 },
    withdrawalSecurity: { passwordHash: "hashed-123456" },
    payoutAccounts: [{
        _id: payoutAccountId,
        bankName: "VCB",
        accountNumber: "123456789",
        accountHolderName: "ARTIST",
        isDefault: true,
    }],
});

describe("UT-100 createWithdrawalRequestByUserId", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockArtistFindOne.mockReturnValue(thenableQuery(createArtist()));
        mockRevenueFindOne.mockReturnValue(thenableQuery({
            _id: new mongoose.Types.ObjectId(),
            year: 2026,
            month: 7,
        }));
        mockBcryptCompare.mockResolvedValue(true);
        mockArtistUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
        mockWithdrawalCreate.mockImplementation(async (data) => ({
            _id: new mongoose.Types.ObjectId(),
            requestedAt: new Date("2026-07-15"),
            ...data,
        }));
    });

    test("UTCID01 - creates a pending withdrawal request", async () => {
        const result = await withdrawalService.createWithdrawalRequestByUserId(userId, {
            amount: 500000,
            withdrawalPassword: "123456",
            payoutAccountId,
        });

        expect(mockBcryptCompare).toHaveBeenCalledWith("123456", "hashed-123456");
        expect(mockArtistUpdateOne).toHaveBeenCalledWith(
            { _id: artistId, "revenue.availableAmount": { $gte: 500000 } },
            { $inc: { "revenue.availableAmount": -500000 } }
        );
        expect(result.withdrawalRequest).toMatchObject({
            amount: 500000,
            method: "bank",
            status: "pending",
            accountInfo: {
                bankName: "VCB",
                accountNumber: "123456789",
                accountHolderName: "ARTIST",
            },
        });
    });

    test("UTCID02 - throws 400 when amount is below the minimum", async () => {
        await expect(
            withdrawalService.createWithdrawalRequestByUserId(userId, {
                amount: 100000,
                withdrawalPassword: "123456",
                payoutAccountId,
            })
        ).rejects.toMatchObject({ statusCode: 400, details: { field: "amount" } });

        expect(mockBcryptCompare).not.toHaveBeenCalled();
    });

    test("UTCID03 - throws 409 when available balance is insufficient", async () => {
        await expect(
            withdrawalService.createWithdrawalRequestByUserId(userId, {
                amount: 3000000,
                withdrawalPassword: "123456",
                payoutAccountId,
            })
        ).rejects.toMatchObject({ statusCode: 409, details: { field: "amount" } });

        expect(mockArtistUpdateOne).not.toHaveBeenCalled();
    });

    test("UTCID04 - throws 400 when withdrawal password is incorrect", async () => {
        mockBcryptCompare.mockResolvedValue(false);

        await expect(
            withdrawalService.createWithdrawalRequestByUserId(userId, {
                amount: 500000,
                withdrawalPassword: "wrong-password",
                payoutAccountId,
            })
        ).rejects.toMatchObject({
            statusCode: 400,
            details: { field: "withdrawalPassword" },
        });

        expect(mockArtistUpdateOne).not.toHaveBeenCalled();
    });

    test("UTCID05 - throws 404 when payout account is not found", async () => {
        await expect(
            withdrawalService.createWithdrawalRequestByUserId(userId, {
                amount: 500000,
                withdrawalPassword: "123456",
                payoutAccountId: null,
            })
        ).rejects.toMatchObject({
            statusCode: 404,
            details: { field: "payoutAccountId" },
        });

        expect(mockWithdrawalCreate).not.toHaveBeenCalled();
    });
});
