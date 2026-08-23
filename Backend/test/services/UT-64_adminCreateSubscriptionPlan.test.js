import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockPlanModel = {
  findOne: jest.fn(),
  create: jest.fn(),
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

describe("Create subscription plan", () => {
  test("creates a new subscription plan successfully", async () => {
    const service = await loadService();
    const planId = new mongoose.Types.ObjectId().toString();

    mockPlanModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    mockPlanModel.create.mockResolvedValue({
      _id: planId,
      name: "Student Plan",
      price: 29000,
      durationDays: 30,
      status: "active",
    });

    const result = await service.createPlan({
      name: "Student Plan",
      description: "Discounted plan for students",
      price: 29000,
      durationDays: 30,
    });

    expect(mockPlanModel.create).toHaveBeenCalled();
    expect(result.name).toBe("Student Plan");
  });
});
