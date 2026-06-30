import { jest } from "@jest/globals";

const mockPlanModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
};

const mockSubscriptionModel = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
};

const mockTransactionModel = {
    create: jest.fn(),
    findOne: jest.fn(),
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

const createUserSelectQuery = (result) => ({
    select: jest.fn().mockResolvedValue(result),
});

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

    return subscriptionService;
};

describe("subscriptionService premium purchase snapshot flow", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-06-29T01:02:03.000Z"));
        mockVnpayService.getVnpayConfig.mockReturnValue({ expiryMinutes: 15 });
        mockVnpayService.buildPaymentUrl.mockReturnValue(
            "https://sandbox.vnpay.vn/payment"
        );
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("stores a plan snapshot when creating a VNPAY order", async () => {
        const subscriptionService = await loadSubscriptionService();
        const plan = {
            _id: "plan-premium-1",
            name: "Premium 30 Days",
            price: 99000,
            durationDays: 30,
            description: "Premium package",
            features: ["NO_ADS", "BACKGROUND_PLAY"],
            status: "active",
        };

        mockUserModel.findById.mockReturnValue(
            createUserSelectQuery({
                _id: "user-1",
                role: "user",
                activeStatus: "active",
            })
        );
        mockPlanModel.findOne.mockResolvedValue(plan);
        mockSubscriptionModel.create.mockResolvedValue({
            _id: "subscription-1",
        });
        mockTransactionModel.create.mockImplementation(async (payload) => ({
            _id: "transaction-1",
            ...payload,
        }));

        const result = await subscriptionService.createVnpayOrder({
            userId: "507f1f77bcf86cd799439011",
            planId: "507f1f77bcf86cd799439012",
            ipAddr: "127.0.0.1",
        });

        expect(mockTransactionModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "user-1",
                subscriptionId: "subscription-1",
                planSnapshot: {
                    originalPlanId: "plan-premium-1",
                    name: "Premium 30 Days",
                    price: 99000,
                    durationDays: 30,
                    description: "Premium package",
                    features: ["NO_ADS", "BACKGROUND_PLAY"],
                    status: "active",
                },
                amount: 99000,
                tax: 9900,
                totalAmount: 108900,
                currency: "VND",
                paymentMethod: "vnpay",
                paymentGateway: "vnpay",
                status: "pending",
            })
        );
        expect(result).toEqual(
            expect.objectContaining({
                paymentUrl: "https://sandbox.vnpay.vn/payment",
                transactionId: "transaction-1",
                subscriptionId: "subscription-1",
                amount: 99000,
                tax: 9900,
                taxRate: 0.1,
                totalAmount: 108900,
                plan: {
                    originalPlanId: "plan-premium-1",
                    name: "Premium 30 Days",
                    price: 99000,
                    durationDays: 30,
                    description: "Premium package",
                    features: ["NO_ADS", "BACKGROUND_PLAY"],
                    status: "active",
                    taxRate: 0.1,
                    taxAmount: 9900,
                    totalPrice: 108900,
                },
            })
        );
    });

    test("settles a successful payment from the stored snapshot without reloading the plan", async () => {
        const subscriptionService = await loadSubscriptionService();
        const transaction = {
            _id: "transaction-1",
            userId: "user-1",
            subscriptionId: "subscription-1",
            totalAmount: 108900,
            status: "pending",
            gatewayTransactionId: "",
            planSnapshot: {
                originalPlanId: "plan-premium-1",
                name: "Premium 30 Days",
                price: 99000,
                durationDays: 45,
                description: "Premium package",
                features: ["NO_ADS", "BACKGROUND_PLAY"],
                status: "active",
            },
            save: jest.fn().mockResolvedValue(undefined),
        };
        const subscription = {
            _id: "subscription-1",
            planId: "plan-premium-1",
            status: "pending",
            startDate: null,
            endDate: null,
            save: jest.fn().mockResolvedValue(undefined),
        };
        const user = {
            _id: "user-1",
            subscription: {
                isPremium: false,
                currentPlanId: null,
                premiumEndDate: null,
            },
            save: jest.fn().mockResolvedValue(undefined),
        };

        mockVnpayService.verifyCallback.mockReturnValue({
            isValid: true,
            invoiceNumber: "INV-0001",
            amount: 108900,
            responseCode: "00",
            gatewayTransactionId: "VNPAY-123",
        });
        mockTransactionModel.findOne.mockResolvedValue(transaction);
        mockSubscriptionModel.findById.mockResolvedValue(subscription);
        mockUserModel.findById.mockResolvedValue(user);

        const result = await subscriptionService.processVnpayIpn({
            vnp_TxnRef: "INV-0001",
        });

        expect(mockPlanModel.findById).not.toHaveBeenCalled();
        expect(subscription.status).toBe("active");
        expect(subscription.startDate).toEqual(new Date("2026-06-29T01:02:03.000Z"));
        expect(subscription.endDate).toEqual(new Date("2026-08-13T01:02:03.000Z"));
        expect(user.subscription).toEqual({
            isPremium: true,
            currentPlanId: "plan-premium-1",
            premiumEndDate: new Date("2026-08-13T01:02:03.000Z"),
        });
        expect(transaction.status).toBe("success");
        expect(transaction.gatewayTransactionId).toBe("VNPAY-123");
        expect(transaction.paidAt).toEqual(new Date("2026-06-29T01:02:03.000Z"));
        expect(transaction.planSnapshot).toEqual(
            expect.objectContaining({
                originalPlanId: "plan-premium-1",
                durationDays: 45,
            })
        );
        expect(result).toEqual({
            RspCode: "00",
            Message: "Confirm success",
        });
    });
});
