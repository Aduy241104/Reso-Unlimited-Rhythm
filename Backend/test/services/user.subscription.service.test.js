import { jest } from "@jest/globals";

const mockSubscriptionModel = {
    findOne: jest.fn(),
};

const mockUserModel = {
    findById: jest.fn(),
};

const mockHelper = {
    buildEmptySubscriptionResponse: jest.fn(),
    calculateDaysRemaining: jest.fn(),
};

const createUserFindByIdChain = (result) => {
    const lean = jest.fn().mockResolvedValue(result);
    const select = jest.fn().mockReturnValue({ lean });

    return {
        select,
        lean,
    };
};

const createSubscriptionFindOneChain = (result) => {
    const lean = jest.fn().mockResolvedValue(result);
    const populate = jest.fn().mockReturnValue({ lean });
    const sort = jest.fn().mockReturnValue({ populate });

    return {
        sort,
        populate,
        lean,
    };
};

const createUser = (overrides = {}) => ({
    _id: "user-1",
    subscription: {
        isPremium: false,
        premiumEndDate: null,
    },
    ...overrides,
});

const createSubscription = (overrides = {}) => ({
    _id: "subscription-1",
    userId: "user-1",
    planId: {
        _id: {
            toString: () => "plan-1",
        },
        name: "Premium 30 Days",
        price: 99000,
        durationDays: 30,
        features: ["NO_ADS", "BACKGROUND_PLAY"],
    },
    status: "active",
    startDate: new Date("2026-07-01T00:00:00.000Z"),
    endDate: new Date("2026-07-31T00:00:00.000Z"),
    autoRenew: true,
    ...overrides,
});

const loadUserSubscriptionService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Subscription.js", () => ({
        default: mockSubscriptionModel,
    }));

    jest.unstable_mockModule("../../src/models/User.js", () => ({
        default: mockUserModel,
    }));

    jest.unstable_mockModule(
        "../../src/services/userSubscription/user.subscription.service.helper.js",
        () => ({
            buildEmptySubscriptionResponse:
                mockHelper.buildEmptySubscriptionResponse,
            calculateDaysRemaining: mockHelper.calculateDaysRemaining,
        })
    );

    const [{ default: userSubscriptionService }, { AppError }] =
        await Promise.all([
            import(
                "../../src/services/userSubscription/user.subscription.service.js"
            ),
            import("../../src/utils/AppError.js"),
        ]);

    return {
        userSubscriptionService,
        AppError,
    };
};

describe("userSubscriptionService.getSubscriptionStatus", () => {
    let userSubscriptionService;
    let AppError;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-16T00:00:00.000Z"));

        mockHelper.buildEmptySubscriptionResponse.mockReturnValue({
            isPremium: false,
            planId: null,
            planName: null,
            price: null,
            durationDays: null,
            status: "none",
            startDate: null,
            endDate: null,
            autoRenew: false,
            daysRemaining: 0,
            features: [],
        });
        mockHelper.calculateDaysRemaining.mockReturnValue(15);

        ({ userSubscriptionService, AppError } =
            await loadUserSubscriptionService());
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("returns the current subscription status for an active premium user", async () => {
        const user = createUser({
            subscription: {
                isPremium: true,
                premiumEndDate: "2026-07-20T00:00:00.000Z",
            },
        });
        const subscription = createSubscription();
        const userQuery = createUserFindByIdChain(user);
        const subscriptionQuery = createSubscriptionFindOneChain(subscription);

        mockUserModel.findById.mockReturnValue(userQuery);
        mockSubscriptionModel.findOne.mockReturnValue(subscriptionQuery);

        const result = await userSubscriptionService.getSubscriptionStatus(
            "user-1"
        );

        expect(mockUserModel.findById).toHaveBeenCalledWith("user-1");
        expect(userQuery.select).toHaveBeenCalledWith("subscription");
        expect(userQuery.lean).toHaveBeenCalledTimes(1);

        expect(mockSubscriptionModel.findOne).toHaveBeenCalledWith({
            userId: "user-1",
        });
        expect(subscriptionQuery.sort).toHaveBeenCalledWith({
            createdAt: -1,
        });
        expect(subscriptionQuery.populate).toHaveBeenCalledWith({
            path: "planId",
            select: "name price durationDays features",
        });
        expect(subscriptionQuery.lean).toHaveBeenCalledTimes(1);

        expect(mockHelper.calculateDaysRemaining).toHaveBeenCalledWith(
            subscription.endDate
        );
        expect(mockHelper.buildEmptySubscriptionResponse).not.toHaveBeenCalled();

        expect(result).toEqual({
            isPremium: true,
            planId: "plan-1",
            planName: "Premium 30 Days",
            price: 99000,
            durationDays: 30,
            status: "active",
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            autoRenew: true,
            daysRemaining: 15,
            features: ["NO_ADS", "BACKGROUND_PLAY"],
        });
    });

    test("returns premium status from the newest active subscription when the user subscription flag is false", async () => {
        const user = createUser({
            subscription: {
                isPremium: false,
                premiumEndDate: null,
            },
        });
        const subscription = createSubscription({
            endDate: new Date("2026-07-25T00:00:00.000Z"),
        });

        mockHelper.calculateDaysRemaining.mockReturnValue(9);

        mockUserModel.findById.mockReturnValue(
            createUserFindByIdChain(user)
        );
        mockSubscriptionModel.findOne.mockReturnValue(
            createSubscriptionFindOneChain(subscription)
        );

        const result = await userSubscriptionService.getSubscriptionStatus(
            "user-1"
        );

        expect(result).toEqual({
            isPremium: true,
            planId: "plan-1",
            planName: "Premium 30 Days",
            price: 99000,
            durationDays: 30,
            status: "active",
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            autoRenew: true,
            daysRemaining: 9,
            features: ["NO_ADS", "BACKGROUND_PLAY"],
        });
    });

    test("returns a non-premium response when the newest subscription has expired", async () => {
        const user = createUser({
            subscription: {
                isPremium: true,
                premiumEndDate: "2026-07-10T00:00:00.000Z",
            },
        });
        const subscription = createSubscription({
            status: "active",
            endDate: new Date("2026-07-15T00:00:00.000Z"),
        });

        mockHelper.calculateDaysRemaining.mockReturnValue(0);

        mockUserModel.findById.mockReturnValue(
            createUserFindByIdChain(user)
        );
        mockSubscriptionModel.findOne.mockReturnValue(
            createSubscriptionFindOneChain(subscription)
        );

        const result = await userSubscriptionService.getSubscriptionStatus(
            "user-1"
        );

        expect(result).toEqual({
            isPremium: false,
            planId: "plan-1",
            planName: "Premium 30 Days",
            price: 99000,
            durationDays: 30,
            status: "active",
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            autoRenew: true,
            daysRemaining: 0,
            features: ["NO_ADS", "BACKGROUND_PLAY"],
        });
    });

    test("returns a pending subscription without premium access", async () => {
        const subscription = createSubscription({
            status: "pending",
            endDate: new Date("2026-07-31T00:00:00.000Z"),
            autoRenew: false,
        });

        mockHelper.calculateDaysRemaining.mockReturnValue(15);

        mockUserModel.findById.mockReturnValue(
            createUserFindByIdChain(createUser())
        );
        mockSubscriptionModel.findOne.mockReturnValue(
            createSubscriptionFindOneChain(subscription)
        );

        const result = await userSubscriptionService.getSubscriptionStatus(
            "user-1"
        );

        expect(result).toEqual({
            isPremium: false,
            planId: "plan-1",
            planName: "Premium 30 Days",
            price: 99000,
            durationDays: 30,
            status: "pending",
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            autoRenew: false,
            daysRemaining: 15,
            features: ["NO_ADS", "BACKGROUND_PLAY"],
        });
    });

    test("returns a cancelled subscription without premium access", async () => {
        const subscription = createSubscription({
            status: "cancelled",
            endDate: new Date("2026-07-31T00:00:00.000Z"),
        });

        mockHelper.calculateDaysRemaining.mockReturnValue(15);

        mockUserModel.findById.mockReturnValue(
            createUserFindByIdChain(createUser())
        );
        mockSubscriptionModel.findOne.mockReturnValue(
            createSubscriptionFindOneChain(subscription)
        );

        const result = await userSubscriptionService.getSubscriptionStatus(
            "user-1"
        );

        expect(result).toEqual({
            isPremium: false,
            planId: "plan-1",
            planName: "Premium 30 Days",
            price: 99000,
            durationDays: 30,
            status: "cancelled",
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            autoRenew: true,
            daysRemaining: 15,
            features: ["NO_ADS", "BACKGROUND_PLAY"],
        });
    });

    test("formats a subscription when plan data is not populated", async () => {
        const subscription = createSubscription({
            planId: {
                toString: () => "plan-raw-id",
            },
            status: "",
            startDate: null,
            endDate: null,
            autoRenew: 0,
        });

        mockHelper.calculateDaysRemaining.mockReturnValue(0);

        mockUserModel.findById.mockReturnValue(
            createUserFindByIdChain(createUser())
        );
        mockSubscriptionModel.findOne.mockReturnValue(
            createSubscriptionFindOneChain(subscription)
        );

        const result = await userSubscriptionService.getSubscriptionStatus(
            "user-1"
        );

        expect(mockHelper.calculateDaysRemaining).toHaveBeenCalledWith(null);

        expect(result).toEqual({
            isPremium: false,
            planId: "plan-raw-id",
            planName: null,
            price: null,
            durationDays: null,
            status: "none",
            startDate: null,
            endDate: null,
            autoRenew: false,
            daysRemaining: 0,
            features: [],
        });
    });

    test("returns the empty subscription response when the user has no subscription records", async () => {
        const userQuery = createUserFindByIdChain(createUser());
        const subscriptionQuery = createSubscriptionFindOneChain(null);
        const emptyResponse = {
            isPremium: false,
            planId: null,
            planName: null,
            price: null,
            durationDays: null,
            status: "none",
            startDate: null,
            endDate: null,
            autoRenew: false,
            daysRemaining: 0,
            features: [],
        };

        mockHelper.buildEmptySubscriptionResponse.mockReturnValue(
            emptyResponse
        );
        mockUserModel.findById.mockReturnValue(userQuery);
        mockSubscriptionModel.findOne.mockReturnValue(subscriptionQuery);

        const result = await userSubscriptionService.getSubscriptionStatus(
            "user-1"
        );

        expect(mockHelper.buildEmptySubscriptionResponse).toHaveBeenCalledTimes(
            1
        );
        expect(mockHelper.calculateDaysRemaining).not.toHaveBeenCalled();
        expect(result).toEqual(emptyResponse);
    });

    test("throws AppError 401 when the user id is missing", async () => {
        const promise = userSubscriptionService.getSubscriptionStatus("");

        await expect(promise).rejects.toBeInstanceOf(AppError);
        await expect(promise).rejects.toMatchObject({
            message: "Unauthorized.",
            statusCode: 401,
        });

        expect(mockUserModel.findById).not.toHaveBeenCalled();
        expect(mockSubscriptionModel.findOne).not.toHaveBeenCalled();
    });

    test("throws AppError 404 when the user does not exist", async () => {
        mockUserModel.findById.mockReturnValue(
            createUserFindByIdChain(null)
        );
        mockSubscriptionModel.findOne.mockReturnValue(
            createSubscriptionFindOneChain(createSubscription())
        );

        const promise = userSubscriptionService.getSubscriptionStatus(
            "missing-user"
        );

        await expect(promise).rejects.toBeInstanceOf(AppError);
        await expect(promise).rejects.toMatchObject({
            message: "User does not exist.",
            statusCode: 404,
        });

        expect(mockHelper.buildEmptySubscriptionResponse).not.toHaveBeenCalled();
    });

    test("propagates a database failure from the user lookup", async () => {
        const error = new Error("User lookup failed.");
        const select = jest.fn().mockReturnValue({
            lean: jest.fn().mockRejectedValue(error),
        });

        mockUserModel.findById.mockReturnValue({ select });
        mockSubscriptionModel.findOne.mockReturnValue(
            createSubscriptionFindOneChain(createSubscription())
        );

        await expect(
            userSubscriptionService.getSubscriptionStatus("user-1")
        ).rejects.toBe(error);
    });

    test("propagates a database failure from the subscription lookup", async () => {
        const error = new Error("Subscription lookup failed.");
        const sort = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockRejectedValue(error),
            }),
        });

        mockUserModel.findById.mockReturnValue(
            createUserFindByIdChain(createUser())
        );
        mockSubscriptionModel.findOne.mockReturnValue({ sort });

        await expect(
            userSubscriptionService.getSubscriptionStatus("user-1")
        ).rejects.toBe(error);
    });

    test("propagates a helper failure when building the empty response fails", async () => {
        const error = new Error("Empty response build failed.");

        mockHelper.buildEmptySubscriptionResponse.mockImplementation(() => {
            throw error;
        });
        mockUserModel.findById.mockReturnValue(
            createUserFindByIdChain(createUser())
        );
        mockSubscriptionModel.findOne.mockReturnValue(
            createSubscriptionFindOneChain(null)
        );

        await expect(
            userSubscriptionService.getSubscriptionStatus("user-1")
        ).rejects.toBe(error);
    });

    test("propagates a helper failure when calculating days remaining fails", async () => {
        const error = new Error("Days remaining calculation failed.");

        mockHelper.calculateDaysRemaining.mockImplementation(() => {
            throw error;
        });
        mockUserModel.findById.mockReturnValue(
            createUserFindByIdChain(createUser())
        );
        mockSubscriptionModel.findOne.mockReturnValue(
            createSubscriptionFindOneChain(createSubscription())
        );

        await expect(
            userSubscriptionService.getSubscriptionStatus("user-1")
        ).rejects.toBe(error);
    });
});
