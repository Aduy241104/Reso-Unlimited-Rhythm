import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockPlanModel = {
    find: jest.fn(),
};

const mockSubscriptionModel = {
    findOne: jest.fn(),
};

const mockUserModel = {
    findById: jest.fn(),
};

const loadSubscriptionService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Plan.js", () => ({
        default: mockPlanModel,
    }));
    jest.unstable_mockModule("../../src/models/Subscription.js", () => ({
        default: mockSubscriptionModel,
    }));
    jest.unstable_mockModule("../../src/models/Transaction.js", () => ({
        default: { findOne: jest.fn(), updateMany: jest.fn(), find: jest.fn() },
    }));
    jest.unstable_mockModule("../../src/models/User.js", () => ({
        default: mockUserModel,
    }));
    jest.unstable_mockModule("../../src/services/vnpay.service.js", () => ({
        default: { getVnpayConfig: jest.fn(), buildPaymentUrl: jest.fn(), verifyCallback: jest.fn() },
    }));

    const { default: subscriptionService } = await import(
        "../../src/services/subscription.service.js"
    );

    return { subscriptionService };
};

describe("View Plan Detail - subscriptionService.getMySubscriptionStatus", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-13T00:00:00.000Z"));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("returns the populated current plan and active subscription detail", async () => {
        const { subscriptionService } = await loadSubscriptionService();

        mockUserModel.findById.mockReturnValue(
            createAwaitableQuery({
                _id: "507f1f77bcf86cd799439191",
                subscription: {
                    isPremium: true,
                    premiumEndDate: new Date("2026-08-13T00:00:00.000Z"),
                    currentPlanId: {
                        _id: "507f1f77bcf86cd799439291",
                        name: "Premium 1M",
                        price: 99000,
                        durationDays: 30,
                    },
                },
            }, ["populate", "lean"])
        );
        mockSubscriptionModel.findOne.mockReturnValue(
            createAwaitableQuery({
                _id: "507f1f77bcf86cd799439391",
                status: "active",
                startDate: new Date("2026-07-13T00:00:00.000Z"),
                endDate: new Date("2026-08-13T00:00:00.000Z"),
                planId: {
                    _id: "507f1f77bcf86cd799439291",
                    name: "Premium 1M",
                    price: 99000,
                    durationDays: 30,
                },
            }, ["populate", "sort", "lean"])
        );

        const result = await subscriptionService.getMySubscriptionStatus(
            "507f1f77bcf86cd799439191"
        );

        expect(result).toEqual({
            isPremium: true,
            currentPlan: {
                _id: "507f1f77bcf86cd799439291",
                name: "Premium 1M",
                price: 99000,
                durationDays: 30,
                taxRate: 0.1,
                taxAmount: 9900,
                totalPrice: 108900,
            },
            premiumEndDate: new Date("2026-08-13T00:00:00.000Z"),
            activeSubscription: {
                _id: "507f1f77bcf86cd799439391",
                status: "active",
                startDate: new Date("2026-07-13T00:00:00.000Z"),
                endDate: new Date("2026-08-13T00:00:00.000Z"),
                planId: "507f1f77bcf86cd799439291",
                plan: {
                    _id: "507f1f77bcf86cd799439291",
                    name: "Premium 1M",
                    price: 99000,
                    durationDays: 30,
                    taxRate: 0.1,
                    taxAmount: 9900,
                    totalPrice: 108900,
                },
            },
        });
    });

    test("falls back to the active subscription plan when the user has no populated currentPlanId", async () => {
        const { subscriptionService } = await loadSubscriptionService();

        mockUserModel.findById.mockReturnValue(
            createAwaitableQuery({
                _id: "507f1f77bcf86cd799439192",
                subscription: {
                    isPremium: true,
                    premiumEndDate: new Date("2026-08-13T00:00:00.000Z"),
                    currentPlanId: null,
                },
            }, ["populate", "lean"])
        );
        mockSubscriptionModel.findOne.mockReturnValue(
            createAwaitableQuery({
                _id: "507f1f77bcf86cd799439392",
                status: "active",
                startDate: new Date("2026-07-13T00:00:00.000Z"),
                endDate: new Date("2026-08-13T00:00:00.000Z"),
                planId: {
                    _id: "507f1f77bcf86cd799439292",
                    name: "Premium 3M",
                    price: 249000,
                    durationDays: 90,
                },
            }, ["populate", "sort", "lean"])
        );

        const result = await subscriptionService.getMySubscriptionStatus(
            "507f1f77bcf86cd799439192"
        );

        expect(result.currentPlan).toEqual({
            _id: "507f1f77bcf86cd799439292",
            name: "Premium 3M",
            price: 249000,
            durationDays: 90,
            taxRate: 0.1,
            taxAmount: 24900,
            totalPrice: 273900,
        });
    });

    test("returns a non-premium state when the premium end date has expired", async () => {
        const { subscriptionService } = await loadSubscriptionService();

        mockUserModel.findById.mockReturnValue(
            createAwaitableQuery({
                _id: "507f1f77bcf86cd799439193",
                subscription: {
                    isPremium: true,
                    premiumEndDate: new Date("2026-07-01T00:00:00.000Z"),
                    currentPlanId: null,
                },
            }, ["populate", "lean"])
        );
        mockSubscriptionModel.findOne.mockReturnValue(
            createAwaitableQuery(null, ["populate", "sort", "lean"])
        );

        const result = await subscriptionService.getMySubscriptionStatus(
            "507f1f77bcf86cd799439193"
        );

        expect(result).toEqual({
            isPremium: false,
            currentPlan: null,
            premiumEndDate: new Date("2026-07-01T00:00:00.000Z"),
            activeSubscription: null,
        });
    });

    test("throws 404 when the user does not exist", async () => {
        const { subscriptionService } = await loadSubscriptionService();

        mockUserModel.findById.mockReturnValue(
            createAwaitableQuery(null, ["populate", "lean"])
        );
        mockSubscriptionModel.findOne.mockReturnValue(
            createAwaitableQuery(null, ["populate", "sort", "lean"])
        );

        await expect(
            subscriptionService.getMySubscriptionStatus(
                "507f1f77bcf86cd799439194"
            )
        ).rejects.toMatchObject({
            message: "User does not exist.",
            statusCode: 404,
        });
    });
});
