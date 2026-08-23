import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockUserModel = {
  findById: jest.fn(),
};

const loadService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/User.js", () => ({
    default: mockUserModel,
  }));
  jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/models/Subscription.js", () => ({
    default: {
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      }),
      exists: jest.fn().mockResolvedValue(null),
    },
  }));
  jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
    uploadImageBuffer: jest.fn(),
    deleteImageByPublicId: jest.fn(),
  }));

  return (await import("../../src/services/user/user.service.js")).default;
};

describe("Update profile - User", () => {
  test("updates user profile details successfully", async () => {
    const service = await loadService();
    const userId = new mongoose.Types.ObjectId().toString();

    const mockUserDoc = {
      _id: userId,
      email: "user@example.com",
      profile: { fullName: "Old Name", gender: "male" },
      save: jest.fn().mockResolvedValue(true),
      toObject: () => ({
        _id: userId,
        email: "user@example.com",
        profile: { fullName: "New Display Name", gender: "male" },
        role: "user",
      }),
    };

    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUserDoc),
    });

    const result = await service.updateMyProfileByUserId(userId, {
      fullName: "New Display Name",
      gender: "male",
    });

    expect(mockUserDoc.save).toHaveBeenCalled();
    expect(result.id).toBe(userId);
  });
});
