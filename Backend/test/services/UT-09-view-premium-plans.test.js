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

    test("returns active plans when there is data", async () => {
        const { subscriptionService } = await loadSubscriptionService();
        const activePlans = [
            {
                _id: "507f1f77bcf86cd799439181",
                status: "active",
            },
            {
                _id: "507f1f77bcf86cd799439183",
                status: "active",
            },
        ];
        const planQuery = createAwaitableQuery(activePlans);
        mockPlanModel.find.mockReturnValue(planQuery);

        const result = await subscriptionService.listActivePlans();

        expect(mockPlanModel.find).toHaveBeenCalledWith({ status: "active" });
        expect(planQuery.sort).toHaveBeenCalledWith({ price: 1, createdAt: 1 });
        expect(result).toMatchObject([
            {
                _id: "507f1f77bcf86cd799439181",
                status: "active",
            },
            {
                _id: "507f1f77bcf86cd799439183",
                status: "active",
            },
        ]);
    });

    test("returns an empty array when there are no active plans", async () => {
        const { subscriptionService } = await loadSubscriptionService();
        const planQuery = createAwaitableQuery([]);
        mockPlanModel.find.mockReturnValue(planQuery);

        await expect(subscriptionService.listActivePlans()).resolves.toEqual([]);
        expect(mockPlanModel.find).toHaveBeenCalledWith({ status: "active" });
    });

    test("returns only the active plan when there is one active plan and one inactive plan", async () => {
        const { subscriptionService } = await loadSubscriptionService();
        const allPlans = [
            {
                _id: "507f1f77bcf86cd799439181",
                status: "active",
            },
            {
                _id: "507f1f77bcf86cd799439182",
                status: "inactive",
            },
        ];
        const planQuery = createAwaitableQuery(
            allPlans.filter((plan) => plan.status === "active")
        );
        mockPlanModel.find.mockImplementation((filter) => {
            expect(filter).toEqual({ status: "active" });
            return planQuery;
        });

        const result = await subscriptionService.listActivePlans();

        expect(planQuery.sort).toHaveBeenCalledWith({ price: 1, createdAt: 1 });
        expect(result).toHaveLength(1);
        expect(result).toMatchObject([
            {
                _id: "507f1f77bcf86cd799439181",
                status: "active",
            },
        ]);
    });
});
