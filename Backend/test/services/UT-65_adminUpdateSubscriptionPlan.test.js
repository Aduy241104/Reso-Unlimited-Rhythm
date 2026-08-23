import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockPlanModel = {
  findById: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
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

describe("Update subscription plan", () => {
  test("updates an existing subscription plan", async () => {
    const service = await loadService();
    const planId = new mongoose.Types.ObjectId().toString();

    mockPlanModel.findById.mockResolvedValue({
      _id: planId,
      name: "Old Plan Name",
      price: 49000,
    });
    mockPlanModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });
    mockPlanModel.findByIdAndUpdate.mockResolvedValue({
      _id: planId,
      name: "Updated Plan Name",
      price: 59000,
    });

    const result = await service.updatePlan(planId, {
      name: "Updated Plan Name",
      price: 59000,
    });

    expect(mockPlanModel.findByIdAndUpdate).toHaveBeenCalled();
    expect(result.name).toBe("Updated Plan Name");
  });
});
