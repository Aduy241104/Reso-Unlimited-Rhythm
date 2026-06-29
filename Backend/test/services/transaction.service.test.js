import { jest } from "@jest/globals";

const mockTransactionModel = {
    find: jest.fn(),
};

const createFindQuery = (result) => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
});

const loadTransactionService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Transaction.js", () => ({
        default: mockTransactionModel,
    }));

    const { default: transactionService } = await import(
        "../../src/services/transaction/transaction.service.js"
    );

    return transactionService;
};

describe("transactionService.getByUserId", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns a normalized plan snapshot for transaction history", async () => {
        const transactionService = await loadTransactionService();

        mockTransactionModel.find.mockReturnValue(
            createFindQuery([
                {
                    _id: "transaction-1",
                    userId: "user-1",
                    planSnapshot: {
                        originalPlanId: "plan-1",
                        name: "Premium 30 Days",
                        price: 99000,
                        durationDays: 30,
                        description: "Premium package",
                        features: ["NO_ADS"],
                        status: "active",
                    },
                },
            ])
        );

        const result = await transactionService.getByUserId("user-1");

        expect(result).toEqual([
            {
                _id: "transaction-1",
                userId: "user-1",
                planId: "plan-1",
                plan: {
                    originalPlanId: "plan-1",
                    name: "Premium 30 Days",
                    price: 99000,
                    durationDays: 30,
                    description: "Premium package",
                    features: ["NO_ADS"],
                    status: "active",
                },
                planSnapshot: {
                    originalPlanId: "plan-1",
                    name: "Premium 30 Days",
                    price: 99000,
                    durationDays: 30,
                    description: "Premium package",
                    features: ["NO_ADS"],
                    status: "active",
                },
            },
        ]);
    });
});
