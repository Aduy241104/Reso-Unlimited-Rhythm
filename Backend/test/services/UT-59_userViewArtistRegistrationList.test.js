import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockArtistRequestModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
};

const loadService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/ArtistRequest.js", () => ({
    default: mockArtistRequestModel,
  }));

  return (await import("../../src/services/artist/user.artistRegistrationList.service.js")).default;
};

describe("View Artist Registration List - User", () => {
  test("retrieves artist registration requests for the logged-in user", async () => {
    const service = await loadService();
    const userId = new mongoose.Types.ObjectId().toString();

    const mockData = [
      {
        _id: "req-1",
        userId,
        stageName: "My Artist Name",
        status: "pending",
        createdAt: new Date(),
      },
    ];

    const chainMock = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockData),
    };

    mockArtistRequestModel.find.mockReturnValue(chainMock);
    mockArtistRequestModel.countDocuments.mockResolvedValue(1);

    const result = await service.getMyArtistRegistrationRequests(userId, { page: 1, limit: 10 });

    expect(mockArtistRequestModel.find).toHaveBeenCalled();
    expect(result.requests).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});
