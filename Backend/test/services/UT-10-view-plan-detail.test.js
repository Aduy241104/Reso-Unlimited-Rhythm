import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockPlanModel = {
    findOne: jest.fn(),
};

const loadSubscriptionService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Plan.js", () => ({
        default: mockPlanModel,
    }));
    jest.unstable_mockModule("../../src/models/Subscription.js", () => ({
        default: {
            findOne: jest.fn(),
            findById: jest.fn(),
            updateMany: jest.fn(),
            create: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            find: jest.fn(),
        },
    }));
    jest.unstable_mockModule("../../src/models/Transaction.js", () => ({
        default: {
            findOne: jest.fn(),
            updateMany: jest.fn(),
            create: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            collection: { findOne: jest.fn() },
            find: jest.fn(),
        },
    }));
    jest.unstable_mockModule("../../src/models/User.js", () => ({
        default: {
            findById: jest.fn(),
            updateMany: jest.fn(),
        },
    }));
    jest.unstable_mockModule("../../src/services/vnpay.service.js", () => ({
        default: {
            getVnpayConfig: jest.fn(),
            buildPaymentUrl: jest.fn(),
            verifyCallback: jest.fn(),
        },
    }));

    const { default: subscriptionService } = await import(
        "../../src/services/subscription.service.js"
    );

    return { subscriptionService };
};

describe("View Plan Detail - subscriptionService.getActivePlanDetail", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns the requested active plan with the same id and active status", async () => {
        const { subscriptionService } = await loadSubscriptionService();

        const activePlan = {
            _id: "507f1f77bcf86cd799439991",
            status: "active",
        };
        mockPlanModel.findOne.mockReturnValue(createAwaitableQuery(activePlan, ["lean"]));

        const result = await subscriptionService.getActivePlanDetail(
            "507f1f77bcf86cd799439991"
        );

        expect(mockPlanModel.findOne).toHaveBeenCalledWith({
            _id: "507f1f77bcf86cd799439991",
            status: "active",
        });
        expect(result).toMatchObject({
            _id: "507f1f77bcf86cd799439991",
            status: "active",
        });
    });

    test("throws 400 when planId is invalid", async () => {
        const { subscriptionService } = await loadSubscriptionService();

        const invalidPlanId = "bad-id";

        await expect(
            subscriptionService.getActivePlanDetail(invalidPlanId)
        ).rejects.toMatchObject({
            message: "planId is invalid.",
            statusCode: 400,
            details: { field: "planId" },
        });
        expect(mockPlanModel.findOne).not.toHaveBeenCalled();
    });

    test("throws 404 when the plan is inactive", async () => {
        const { subscriptionService } = await loadSubscriptionService();

        mockPlanModel.findOne.mockReturnValue(createAwaitableQuery(null, ["lean"]));

        await expect(
            subscriptionService.getActivePlanDetail("507f1f77bcf86cd799439992")
        ).rejects.toMatchObject({
            message: "Subscription plan not found or inactive.",
            statusCode: 404,
            details: { field: "planId" },
        });
        expect(mockPlanModel.findOne).toHaveBeenCalledWith({
            _id: "507f1f77bcf86cd799439992",
            status: "active",
        });
    });

    test("propagates database errors from Plan.findOne", async () => {
        const { subscriptionService } = await loadSubscriptionService();

        const databaseError = new Error("Database unavailable");
        mockPlanModel.findOne.mockReturnValue({
            lean: jest.fn().mockRejectedValue(databaseError),
        });

        await expect(
            subscriptionService.getActivePlanDetail("507f1f77bcf86cd799439993")
        ).rejects.toThrow("Database unavailable");
    });
});
