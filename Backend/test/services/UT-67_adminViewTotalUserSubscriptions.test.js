import { jest } from "@jest/globals";

const mockPlanModel = {
  find: jest.fn(),
};

const mockSubscriptionModel = {
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
};

const loadService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/Plan.js", () => ({
    default: mockPlanModel,
  }));
  jest.unstable_mockModule("../../src/models/Subscription.js", () => ({
    default: mockSubscriptionModel,
  }));
  jest.unstable_mockModule("../../src/models/Transaction.js", () => ({ default: {} }));

  return (await import("../../src/services/subscription/admin.subscription.service.js")).default;
};

describe("View total user subscriptions", () => {
  test("returns aggregated subscription statistics", async () => {
    const service = await loadService();

    mockSubscriptionModel.aggregate.mockResolvedValue([
      { _id: "active", count: 100 },
      { _id: "pending", count: 10 },
      { _id: "cancelled", count: 10 },
      { _id: "expired", count: 30 },
    ]);
    mockSubscriptionModel.countDocuments.mockResolvedValue(150);

    const result = await service.getSubscriptionStats({});

    expect(mockSubscriptionModel.countDocuments).toHaveBeenCalled();
    expect(result.totalSubscriptions).toBe(150);
    expect(result.byStatus.active).toBe(100);
  });
});
