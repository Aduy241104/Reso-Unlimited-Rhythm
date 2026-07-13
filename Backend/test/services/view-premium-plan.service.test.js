import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockPlanModel = {
    find: jest.fn(),
};

const loadSubscriptionService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Plan.js", () => ({
        default: mockPlanModel,
    }));
    jest.unstable_mockModule("../../src/models/Subscription.js", () => ({
        default: { findOne: jest.fn(), findById: jest.fn(), updateMany: jest.fn(), find: jest.fn() },
    }));
    jest.unstable_mockModule("../../src/models/Transaction.js", () => ({
        default: { findOne: jest.fn(), updateMany: jest.fn(), find: jest.fn() },
    }));
    jest.unstable_mockModule("../../src/models/User.js", () => ({
        default: { findById: jest.fn(), updateMany: jest.fn() },
    }));
    jest.unstable_mockModule("../../src/services/vnpay.service.js", () => ({
        default: { getVnpayConfig: jest.fn(), buildPaymentUrl: jest.fn(), verifyCallback: jest.fn() },
    }));

    const { default: subscriptionService } = await import(
        "../../src/services/subscription.service.js"
    );

    return { subscriptionService };
};

describe("View Premium Plan - subscriptionService.listActivePlans", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns active plans enriched with tax and total price", async () => {
        const { subscriptionService } = await loadSubscriptionService();
        const planQuery = createAwaitableQuery([
            {
                _id: "507f1f77bcf86cd799439181",
                name: "Premium Monthly",
                price: 99000.4,
                durationDays: 30,
                features: ["NO_ADS", "HIGH_QUALITY_AUDIO"],
            },
        ]);
        mockPlanModel.find.mockReturnValue(planQuery);

        const result = await subscriptionService.listActivePlans();

        expect(mockPlanModel.find).toHaveBeenCalledWith({ status: "active" });
        expect(planQuery.sort).toHaveBeenCalledWith({ price: 1, createdAt: 1 });
        expect(result).toEqual([
            {
                _id: "507f1f77bcf86cd799439181",
                name: "Premium Monthly",
                price: 99000,
                durationDays: 30,
                features: ["NO_ADS", "HIGH_QUALITY_AUDIO"],
                taxRate: 0.1,
                taxAmount: 9900,
                totalPrice: 108900,
            },
        ]);
    });

    test("returns an empty array when there are no active plans", async () => {
        const { subscriptionService } = await loadSubscriptionService();
        const planQuery = createAwaitableQuery([]);
        mockPlanModel.find.mockReturnValue(planQuery);

        await expect(subscriptionService.listActivePlans()).resolves.toEqual([]);
    });
});
