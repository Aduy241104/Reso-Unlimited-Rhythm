import { jest } from "@jest/globals";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const mockListenEventModel = {
    aggregate: jest.fn(),
};

const mockRevenuePeriodModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
};

const mockTransactionModel = {
    aggregate: jest.fn(),
};

const createLeanQuery = (result) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(result),
    }),
});

const loadService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/ListenEvent.js", () => ({
        default: mockListenEventModel,
    }));
    jest.unstable_mockModule("../../src/models/RevenuePeriod.js", () => ({
        default: mockRevenuePeriodModel,
    }));
    jest.unstable_mockModule("../../src/models/Transaction.js", () => ({
        default: mockTransactionModel,
    }));

    return import("../../src/services/revenue/revenueAggregation.service.js");
};

describe("revenueAggregation.service", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-08-06T09:00:00.000Z"));

        mockListenEventModel.aggregate.mockReset();
        mockRevenuePeriodModel.findOne.mockReset();
        mockRevenuePeriodModel.findOneAndUpdate.mockReset();
        mockTransactionModel.aggregate.mockReset();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("syncRevenueForMonth only updates lastAggregatedAt for open revenue periods", async () => {
        const { syncRevenueForMonth } = await loadService();

        mockTransactionModel.aggregate
            .mockResolvedValueOnce([
                { _id: null, premiumRevenue: 100000, successfulTransactions: 4 },
            ])
            .mockResolvedValueOnce([
                {
                    _id: { dateKey: "2026-08-03" },
                    premiumRevenue: 100000,
                    successfulTransactions: 4,
                },
            ]);
        mockListenEventModel.aggregate.mockResolvedValue([
            { _id: null, totalEligibleStreams: 320 },
        ]);
        mockRevenuePeriodModel.findOne.mockReturnValue(
            createLeanQuery({ status: "open" })
        );
        mockRevenuePeriodModel.findOneAndUpdate.mockResolvedValue({
            _id: "period-1",
            status: "open",
        });

        await syncRevenueForMonth("2026-08-06");

        expect(mockRevenuePeriodModel.findOneAndUpdate).toHaveBeenCalledTimes(1);

        const [, update] = mockRevenuePeriodModel.findOneAndUpdate.mock.calls[0];

        expect(update.$set.lastAggregatedAt).toEqual(
            new Date("2026-08-06T09:00:00.000Z")
        );
        expect(update.$set.calculatedAt).toBeNull();
    });

    test("syncRevenueForMonth preserves calculatedAt for already calculated revenue periods", async () => {
        const { syncRevenueForMonth } = await loadService();

        mockTransactionModel.aggregate
            .mockResolvedValueOnce([
                { _id: null, premiumRevenue: 50000, successfulTransactions: 2 },
            ])
            .mockResolvedValueOnce([]);
        mockListenEventModel.aggregate.mockResolvedValue([
            { _id: null, totalEligibleStreams: 120 },
        ]);
        mockRevenuePeriodModel.findOne.mockReturnValue(
            createLeanQuery({ status: "calculated" })
        );
        mockRevenuePeriodModel.findOneAndUpdate.mockResolvedValue({
            _id: "period-2",
            status: "calculated",
        });

        await syncRevenueForMonth("2026-07-10");

        const [, update] = mockRevenuePeriodModel.findOneAndUpdate.mock.calls[0];

        expect(update.$set.lastAggregatedAt).toEqual(
            new Date("2026-08-06T09:00:00.000Z")
        );
        expect(update.$set).not.toHaveProperty("calculatedAt");
    });
});
