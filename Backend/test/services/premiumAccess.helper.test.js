import { jest } from "@jest/globals";

const mockSubscriptionModel = {
    exists: jest.fn(),
};

const loadPremiumAccessHelper = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Subscription.js", () => ({
        default: mockSubscriptionModel,
    }));

    return import("../../src/utils/premiumAccess.js");
};

describe("premiumAccess helper", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSubscriptionModel.exists.mockReset();
    });

    test("returns true when the user premium flag is still active", async () => {
        const { resolveUserPremiumState } = await loadPremiumAccessHelper();

        const result = await resolveUserPremiumState({
            id: "507f1f77bcf86cd799439011",
            subscription: {
                isPremium: true,
                premiumEndDate: "2026-08-01T00:00:00.000Z",
            },
        }, new Date("2026-07-14T00:00:00.000Z"));

        expect(result).toBe(true);
        expect(mockSubscriptionModel.exists).not.toHaveBeenCalled();
    });

    test("falls back to the active subscription lookup when the flag is stale", async () => {
        const { resolveUserPremiumState } = await loadPremiumAccessHelper();

        mockSubscriptionModel.exists.mockResolvedValue({ _id: "subscription-1" });

        const result = await resolveUserPremiumState({
            _id: "507f1f77bcf86cd799439011",
            subscription: {
                isPremium: false,
                premiumEndDate: "2026-07-01T00:00:00.000Z",
            },
        }, new Date("2026-07-14T00:00:00.000Z"));

        expect(result).toBe(true);
        expect(mockSubscriptionModel.exists).toHaveBeenCalledWith({
            userId: "507f1f77bcf86cd799439011",
            status: "active",
            $and: [
                {
                    $or: [
                        { startDate: null },
                        { startDate: { $lte: new Date("2026-07-14T00:00:00.000Z") } },
                    ],
                },
                {
                    $or: [
                        { endDate: null },
                        { endDate: { $gt: new Date("2026-07-14T00:00:00.000Z") } },
                    ],
                },
            ],
        });
    });

    test("returns false when the user has no premium flag and no active subscription", async () => {
        const { resolveUserPremiumState } = await loadPremiumAccessHelper();

        mockSubscriptionModel.exists.mockResolvedValue(null);

        const result = await resolveUserPremiumState({
            id: "507f1f77bcf86cd799439011",
            subscription: {
                isPremium: false,
                premiumEndDate: null,
            },
        }, new Date("2026-07-14T00:00:00.000Z"));

        expect(result).toBe(false);
    });
});
