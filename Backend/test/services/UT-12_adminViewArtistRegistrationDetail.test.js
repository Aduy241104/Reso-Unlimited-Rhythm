import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockArtistRequestModel = {
  findById: jest.fn(),
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

describe("View Artist Registration Detail - Admin", () => {
  test("retrieves artist registration detail for admin", async () => {
    const service = await loadService();
    const requestId = new mongoose.Types.ObjectId().toString();

    mockArtistRequestModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: requestId,
            stageName: "Star Detail",
            fullName: "Le Van B",
            status: "pending",
          }),
        }),
      }),
    });

    const result = await service.getArtistRequestDetail(requestId);

    expect(mockArtistRequestModel.findById).toHaveBeenCalledWith(requestId);
    expect(result.stageName).toBe("Star Detail");
  });
});
