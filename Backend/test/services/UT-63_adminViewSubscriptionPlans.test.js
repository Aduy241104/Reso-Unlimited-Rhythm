import { jest } from "@jest/globals";

const mockPlanModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
};

const loadService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/Plan.js", () => ({
    default: mockPlanModel,
  }));
  jest.unstable_mockModule("../../src/models/Subscription.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/models/Transaction.js", () => ({ default: {} }));

  return (await import("../../src/services/subscription/admin.subscription.service.js")).default;
};

describe("View subscription plans", () => {
  test("retrieves subscription plans for admin", async () => {
    const service = await loadService();

    mockPlanModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              {
                _id: "plan-1",
                name: "Premium Monthly",
                price: 59000,
                status: "active",
              },
            ]),
          }),
        }),
      }),
    });
    mockPlanModel.countDocuments.mockResolvedValue(1);

    const result = await service.getPlans({ page: 1, limit: 10 });

    expect(mockPlanModel.find).toHaveBeenCalled();
    expect(result.plans).toHaveLength(1);
    expect(result.plans[0].name).toBe("Premium Monthly");
  });
});
