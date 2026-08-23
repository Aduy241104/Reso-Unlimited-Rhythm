import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockArtistModel = {
  findOne: jest.fn(),
};

const mockArtistVerificationRequestModel = {
  exists: jest.fn(),
};

const mockCloudinaryService = {
  uploadImageBuffer: jest.fn(),
  deleteImageByPublicId: jest.fn(),
};

const mockUploadCloud = {
  extractPublicIdFromUrl: jest.fn(),
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
  jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => mockCloudinaryService);
  jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => mockUploadCloud);

  return (await import("../../src/services/artist/artist.service.js")).default;
};

describe("Update Artist Profile - Artist", () => {
  test("updates artist stage name, bio, and social links successfully", async () => {
    const service = await loadService();
    const userId = new mongoose.Types.ObjectId().toString();
    const artistId = new mongoose.Types.ObjectId().toString();

    const mockArtistDoc = {
      _id: artistId,
      userId,
      name: "Old Artist Name",
      bio: "Old Bio",
      socialLinks: {},
      activeStatus: "active",
      save: jest.fn().mockResolvedValue(true),
      markModified: jest.fn(),
    };

    const mockUpdatedArtistLean = {
      _id: artistId,
      userId: {
        _id: userId,
        email: "artist@example.com",
        profile: { fullName: "Updated Artist Name" },
      },
      name: "Updated Artist Name",
      bio: "Updated Bio Text",
      socialLinks: { facebook: "https://facebook.com/newartist" },
      verificationStatus: "approved",
      activeStatus: "active",
    };

    mockArtistModel.findOne
      .mockReturnValueOnce(mockArtistDoc) // findOwnedArtistDocumentOrThrow
      .mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUpdatedArtistLean),
        }),
      }); // getMyProfileByUserId

    mockArtistVerificationRequestModel.exists.mockResolvedValue(null);

    const result = await service.updateMyProfileByUserId(userId, {
      name: "Updated Artist Name",
      bio: "Updated Bio Text",
      socialLinks: { facebook: "https://facebook.com/newartist" },
    });

    expect(mockArtistDoc.save).toHaveBeenCalled();
    expect(mockArtistDoc.name).toBe("Updated Artist Name");
    expect(mockArtistDoc.bio).toBe("Updated Bio Text");
    expect(result.name).toBe("Updated Artist Name");
  });

  test("throws FORBIDDEN when artist account is blocked", async () => {
    const service = await loadService();
    const userId = new mongoose.Types.ObjectId().toString();

    const mockBlockedArtistDoc = {
      _id: "artist-blocked",
      userId,
      activeStatus: "blocked",
    };

    mockArtistModel.findOne.mockReturnValue(mockBlockedArtistDoc);

    await expect(
      service.updateMyProfileByUserId(userId, { name: "New Name" })
    ).rejects.toThrow("Your artist profile cannot be updated while it is blocked.");
  });
});
