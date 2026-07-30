import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockPlanModel = {
    findOne: jest.fn(),
    find: jest.fn(),
};

const mockSubscriptionModel = {
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
};

const mockTransactionModel = {
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
};

const mockUserModel = {
    findById: jest.fn(),
};

const mockVnpayService = {
    getVnpayConfig: jest.fn(),
    buildPaymentUrl: jest.fn(),
    verifyCallback: jest.fn(),
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
        default: mockTransactionModel,
    }));
    jest.unstable_mockModule("../../src/models/User.js", () => ({
        default: mockUserModel,
    }));
    jest.unstable_mockModule("../../src/services/vnpay.service.js", () => ({
        default: mockVnpayService,
    }));

    const { default: subscriptionService } = await import(
        "../../src/services/subscription.service.js"
    );

    return { subscriptionService };
};

describe("Subscribe Premium - subscriptionService.createVnpayOrder", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-13T00:00:00.000Z"));
        mockVnpayService.getVnpayConfig.mockReturnValue({
            expiryMinutes: 15,
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("throws 400 when plan id is invalid", async () => {
        const { subscriptionService } = await loadSubscriptionService();

        await expect(
            subscriptionService.createVnpayOrder({
                userId: "507f1f77bcf86cd799439201",
                planId: "bad-plan-id",
                ipAddr: "127.0.0.1",
            })
        ).rejects.toMatchObject({
            message: "planId is invalid.",
            statusCode: 400,
            details: { field: "planId" },
        });
    });

    test("throws 404 when the user does not exist", async () => {
        const { subscriptionService } = await loadSubscriptionService();

        mockUserModel.findById.mockReturnValue(
            createAwaitableQuery(null, ["select"])
        );
        mockPlanModel.findOne.mockResolvedValue({
            _id: "507f1f77bcf86cd799439301",
            name: "Premium 1M",
            price: 99000,
            durationDays: 30,
            status: "active",
        });

        await expect(
            subscriptionService.createVnpayOrder({
                userId: "507f1f77bcf86cd799439202",
                planId: "507f1f77bcf86cd799439301",
                ipAddr: "127.0.0.1",
            })
        ).rejects.toMatchObject({
            message: "User does not exist.",
            statusCode: 404,
        });
    });

    test("throws 404 when the plan is inactive or missing", async () => {
        const { subscriptionService } = await loadSubscriptionService();

        mockUserModel.findById.mockReturnValue(
            createAwaitableQuery(
                {
                    _id: "507f1f77bcf86cd799439203",
                    role: "user",
                    activeStatus: "active",
                },
                ["select"]
            )
        );
        mockPlanModel.findOne.mockResolvedValue(null);

        await expect(
            subscriptionService.createVnpayOrder({
                userId: "507f1f77bcf86cd799439203",
                planId: "507f1f77bcf86cd799439302",
                ipAddr: "127.0.0.1",
            })
        ).rejects.toMatchObject({
            message: "Subscription plan not found or inactive.",
            statusCode: 404,
            details: { field: "planId" },
        });
    });

    test("creates pending subscription and transaction then returns the payment payload", async () => {
        const { subscriptionService } = await loadSubscriptionService();

        mockUserModel.findById.mockReturnValue(
            createAwaitableQuery(
                {
                    _id: "507f1f77bcf86cd799439204",
                    role: "user",
                    activeStatus: "active",
                },
                ["select"]
            )
        );
        mockPlanModel.findOne.mockResolvedValue({
            _id: "507f1f77bcf86cd799439303",
            name: "Premium 1M",
            price: 99000,
            durationDays: 30,
            status: "active",
        });
        mockSubscriptionModel.create.mockResolvedValue({
            _id: "507f1f77bcf86cd799439403",
            status: "pending",
        });
        mockTransactionModel.create.mockResolvedValue({
            _id: "507f1f77bcf86cd799439503",
            amount: 99000,
            tax: 9900,
            totalAmount: 108900,
            status: "pending",
        });
        mockVnpayService.buildPaymentUrl.mockReturnValue(
            "https://sandbox.vnpay.vn/pay?order=123"
        );

        const result = await subscriptionService.createVnpayOrder({
            userId: "507f1f77bcf86cd799439204",
            planId: "507f1f77bcf86cd799439303",
            ipAddr: "127.0.0.1",
        });

        expect(mockSubscriptionModel.create).toHaveBeenCalledWith({
            userId: "507f1f77bcf86cd799439204",
            planId: "507f1f77bcf86cd799439303",
            planSnapshot: {
                originalPlanId: "507f1f77bcf86cd799439303",
                name: "Premium 1M",
                price: 99000,
                durationDays: 30,
                description: "",
                features: [],
                status: "active",
            },
            status: "pending",
            autoRenew: false,
        });
        expect(mockTransactionModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "507f1f77bcf86cd799439204",
                subscriptionId: "507f1f77bcf86cd799439403",
                planId: "507f1f77bcf86cd799439303",
                amount: 99000,
                tax: 9900,
                totalAmount: 108900,
                status: "pending",
            })
        );
        expect(result).toEqual({
            paymentUrl: "https://sandbox.vnpay.vn/pay?order=123",
            invoiceNumber: expect.stringMatching(/^VNPAY_/),
            transactionId: "507f1f77bcf86cd799439503",
            subscriptionId: "507f1f77bcf86cd799439403",
            amount: 99000,
            tax: 9900,
            taxRate: 0.1,
            totalAmount: 108900,
            plan: {
                originalPlanId: "507f1f77bcf86cd799439303",
                name: "Premium 1M",
                price: 99000,
                durationDays: 30,
                description: "",
                features: [],
                status: "active",
                taxRate: 0.1,
                taxAmount: 9900,
                totalPrice: 108900,
            },
        });
    });

    test("marks pending records as failed or cancelled when payment URL initialization crashes", async () => {
        const { subscriptionService } = await loadSubscriptionService();

        mockUserModel.findById.mockReturnValue(
            createAwaitableQuery(
                {
                    _id: "507f1f77bcf86cd799439205",
                    role: "user",
                    activeStatus: "active",
                },
                ["select"]
            )
        );
        mockPlanModel.findOne.mockResolvedValue({
            _id: "507f1f77bcf86cd799439304",
            name: "Premium 3M",
            price: 249000,
            durationDays: 90,
            status: "active",
        });
        mockSubscriptionModel.create.mockResolvedValue({
            _id: "507f1f77bcf86cd799439404",
            status: "pending",
        });
        mockTransactionModel.create.mockResolvedValue({
            _id: "507f1f77bcf86cd799439504",
            amount: 249000,
            tax: 24900,
            totalAmount: 273900,
            status: "pending",
        });
        mockVnpayService.buildPaymentUrl.mockImplementation(() => {
            throw new Error("gateway down");
        });
        mockTransactionModel.findByIdAndUpdate.mockResolvedValue(null);
        mockSubscriptionModel.findByIdAndUpdate.mockResolvedValue(null);

        await expect(
            subscriptionService.createVnpayOrder({
                userId: "507f1f77bcf86cd799439205",
                planId: "507f1f77bcf86cd799439304",
                ipAddr: "127.0.0.1",
            })
        ).rejects.toThrow("gateway down");

        expect(mockTransactionModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "507f1f77bcf86cd799439504",
            expect.objectContaining({
                status: "failed",
                failureReason: "Could not initialize VNPAY payment order.",
            })
        );
        expect(mockSubscriptionModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "507f1f77bcf86cd799439404",
            { status: "cancelled" }
        );
    });
});
