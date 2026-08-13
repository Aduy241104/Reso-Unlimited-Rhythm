import { jest } from "@jest/globals";

const mockTransactionModel = {
    find: jest.fn(),
};

const createQuery = (value) => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value),
});

const loadService = async () => {
    jest.resetModules();
    jest.unstable_mockModule("../../src/models/Transaction.js", () => ({
        default: mockTransactionModel,
    }));
    return (await import("../../src/services/transaction/transaction.service.js")).default;
};

describe("transaction service authorization", () => {
    const userA = "507f1f77bcf86cd799439011";
    const userB = "507f1f77bcf86cd799439012";

    beforeEach(() => {
        mockTransactionModel.find.mockReset();
        mockTransactionModel.find.mockReturnValue(createQuery([]));
    });

    test("allows a user to read their own transactions", async () => {
        const service = await loadService();
        await expect(service.getByUserId(userA, { id: userA, role: "user" })).resolves.toEqual([]);
    });

    test("rejects a user reading another user's transactions", async () => {
        const service = await loadService();
        await expect(service.getByUserId(userB, { id: userA, role: "user" }))
            .rejects.toMatchObject({ statusCode: 403 });
    });

    test("allows an admin to read another user's transactions", async () => {
        const service = await loadService();
        await expect(service.getByUserId(userB, { id: userA, role: "admin" })).resolves.toEqual([]);
    });

    test("rejects invalid ids before querying", async () => {
        const service = await loadService();
        await expect(service.getByUserId("not-an-id", { id: userA, role: "admin" }))
            .rejects.toMatchObject({ statusCode: 400 });
        expect(mockTransactionModel.find).not.toHaveBeenCalled();
    });
});
