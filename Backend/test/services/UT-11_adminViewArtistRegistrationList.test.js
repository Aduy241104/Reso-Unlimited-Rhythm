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
  jest.unstable_mockModule("../../src/models/User.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: {} }));

  return (await import("../../src/services/artist/admin.artistRequest.service.js")).default;
};

describe("View Artist Registration List - Admin", () => {
  test("retrieves list of all artist requests for admin", async () => {
    const service = await loadService();

    const mockData = [
      {
        _id: "req-100",
        stageName: "Pending Star",
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

    const result = await service.getArtistRequests({ status: "pending", page: 1, limit: 10 });

    expect(mockArtistRequestModel.find).toHaveBeenCalled();
    expect(result.artistRequests).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});
