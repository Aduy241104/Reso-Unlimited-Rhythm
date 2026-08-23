import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockArtistModel = {
  findOne: jest.fn(),
};

const mockArtistVerificationRequestModel = {
  exists: jest.fn(),
};

const loadService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: mockArtistModel,
  }));
  jest.unstable_mockModule("../../src/models/ArtistVerificationRequest.js", () => ({
    default: mockArtistVerificationRequestModel,
  }));
  jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
    uploadImageBuffer: jest.fn(),
    deleteImageByPublicId: jest.fn(),
  }));
  jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
    extractPublicIdFromUrl: jest.fn(),
  }));

  return (await import("../../src/services/artist/artist.service.js")).default;
};

describe("View Artist Profile - Artist", () => {
  test("retrieves artist profile successfully for authenticated artist user", async () => {
    const service = await loadService();
    const userId = new mongoose.Types.ObjectId().toString();
    const artistId = new mongoose.Types.ObjectId().toString();

    const mockArtistData = {
      _id: artistId,
      userId: {
        _id: userId,
        email: "artist@example.com",
        profile: { fullName: "Star Artist" },
        avatar: "https://example.com/user-avatar.jpg",
        role: "artist",
        activeStatus: "active",
      },
      name: "Star Artist Stage Name",
      bio: "Official artist bio",
      avatar: "https://example.com/artist-avatar.jpg",
      coverImage: "https://example.com/cover.jpg",
      socialLinks: { facebook: "https://facebook.com/starartist" },
      verificationStatus: "approved",
      activeStatus: "active",
    };

    mockArtistModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockArtistData),
      }),
    });

    mockArtistVerificationRequestModel.exists.mockResolvedValue(null);

    const result = await service.getMyProfileByUserId(userId);

    expect(mockArtistModel.findOne).toHaveBeenCalledWith({ userId });
    expect(result.name).toBe("Star Artist Stage Name");
    expect(result.bio).toBe("Official artist bio");
    expect(result.hasPendingVerificationRequest).toBe(false);
  });

  test("throws NOT_FOUND when artist profile does not exist", async () => {
    const service = await loadService();
    const userId = new mongoose.Types.ObjectId().toString();

    mockArtistModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(service.getMyProfileByUserId(userId)).rejects.toThrow(
      "Artist profile not found for this account."
    );
  });
});
