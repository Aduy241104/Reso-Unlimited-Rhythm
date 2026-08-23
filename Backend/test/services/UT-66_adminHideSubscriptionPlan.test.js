import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockPlanModel = {
  findByIdAndDelete: jest.fn(),
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

describe("Hide subscription plan", () => {
  test("hides a subscription plan", async () => {
    const service = await loadService();
    const planId = new mongoose.Types.ObjectId().toString();

    mockPlanModel.findByIdAndDelete.mockResolvedValue({
      _id: planId,
      name: "Legacy Plan",
    });

    const result = await service.deletePlan(planId);

    expect(mockPlanModel.findByIdAndDelete).toHaveBeenCalledWith(planId);
    expect(result._id).toBe(planId);
  });
});
