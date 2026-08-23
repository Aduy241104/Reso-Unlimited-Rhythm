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

describe("View profile - User", () => {
  test("retrieves user profile information", async () => {
    const service = await loadService();
    const userId = new mongoose.Types.ObjectId().toString();

    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: userId,
          email: "user@example.com",
          displayName: "Regular User",
          avatar: "https://example.com/avatar.jpg",
          role: "user",
        }),
      }),
    });

    const result = await service.getMyProfileByUserId(userId);

    expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
    expect(result.email).toBe("user@example.com");
  });
});
