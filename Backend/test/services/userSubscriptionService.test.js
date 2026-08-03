import { jest } from "@jest/globals";

const mockSubscriptionModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
};

const loadUserSubscriptionService = async () => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.unstable_mockModule("../../src/models/Subscription.js", () => ({
        default: mockSubscriptionModel,
    }));

    const { default: userSubscriptionService } = await import(
        "../../src/services/user/user.subscription.service.js"
    );
    return userSubscriptionService;
};

describe("userSubscriptionService", () => {
    let userSubscriptionService;

    beforeEach(async () => {
        userSubscriptionService = await loadUserSubscriptionService();
    });

    describe("getTotalSubscriptions", () => {
        test("returns subscriptions list and total count for a user", async () => {
            const mockSubscriptions = [
                {
                    _id: "sub-1",
                    userId: "user-1",
                    planId: {
                        _id: "plan-1",
                        name: "Premium",
                        price: 59000,
                        durationDays: 30,
                    },
                    status: "active",
                    createdAt: new Date("2026-06-01"),
                },
                {
                    _id: "sub-2",
                    userId: "user-1",
                    planId: {
                        _id: "plan-2",
                        name: "Basic",
                        price: 29000,
                        durationDays: 30,
                    },
                    status: "expired",
                    createdAt: new Date("2026-03-01"),
                },
            ];

            mockSubscriptionModel.countDocuments.mockResolvedValue(2);
            mockSubscriptionModel.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockResolvedValue(mockSubscriptions),
                }),
            });

            const result = await userSubscriptionService.getTotalSubscriptions("user-1");

            expect(mockSubscriptionModel.countDocuments).toHaveBeenCalledWith({
                userId: "user-1",
            });
            expect(mockSubscriptionModel.find).toHaveBeenCalledWith({
                userId: "user-1",
            });
            expect(result).toEqual({
                subscriptions: mockSubscriptions,
                total: 2,
            });
        });

        test("returns empty list and zero total when user has no subscriptions", async () => {
            mockSubscriptionModel.countDocuments.mockResolvedValue(0);
            mockSubscriptionModel.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockResolvedValue([]),
                }),
            });

            const result = await userSubscriptionService.getTotalSubscriptions("user-no-subs");

            expect(mockSubscriptionModel.countDocuments).toHaveBeenCalledWith({
                userId: "user-no-subs",
            });
            expect(result).toEqual({
                subscriptions: [],
                total: 0,
            });
        });

        test("populates planId with name, price and durationDays", async () => {
            const populateMock = jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue([]),
            });

            mockSubscriptionModel.countDocuments.mockResolvedValue(0);
            mockSubscriptionModel.find.mockReturnValue({
                populate: populateMock,
            });

            await userSubscriptionService.getTotalSubscriptions("user-1");

            expect(populateMock).toHaveBeenCalledWith(
                "planId",
                "name price durationDays"
            );
        });

        test("sorts subscriptions by createdAt descending", async () => {
            const sortMock = jest.fn().mockResolvedValue([]);
            mockSubscriptionModel.countDocuments.mockResolvedValue(0);
            mockSubscriptionModel.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: sortMock,
                }),
            });

            await userSubscriptionService.getTotalSubscriptions("user-1");

            expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
        });
    });
});
