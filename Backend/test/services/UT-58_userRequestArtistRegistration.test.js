import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockArtistRequestModel = {
  findOne: jest.fn(),
  create: jest.fn(),
};

const mockUserModel = {
  findById: jest.fn(),
};

const mockArtistModel = {
  findOne: jest.fn(),
};

const loadService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/ArtistRequest.js", () => ({
    default: mockArtistRequestModel,
  }));
  jest.unstable_mockModule("../../src/models/User.js", () => ({
    default: mockUserModel,
  }));
  jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: mockArtistModel,
  }));
  jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
    uploadImageBuffer: jest.fn().mockResolvedValue("https://example.com/avatar.jpg"),
  }));

  return (await import("../../src/services/artist/artist.registration.service.js")).default;
};

describe("Request artist registration", () => {
  test("creates a registration request successfully when user is eligible", async () => {
    const service = await loadService();
    const userId = new mongoose.Types.ObjectId().toString();

    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: userId,
          role: "user",
          emailVerified: true,
          status: "active",
        }),
      }),
    });

    mockArtistModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    mockArtistRequestModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    mockArtistRequestModel.create.mockResolvedValue({
      toObject: () => ({
        _id: "req-123",
        userId,
        stageName: "Test Artist",
        status: "pending",
      }),
    });

    const payload = {
      stageName: "Test Artist",
      fullName: "Nguyen Van A",
      idNumber: "123456789012",
      dateOfBirth: "2000-01-01",
      socialLinks: { spotify: "https://spotify.com/artist/test" },
      acceptedTerms: true,
      copyrightCommitment: true,
      truthfulInformationCommitment: true,
      demoTrackUrls: ["https://example.com/demo.mp3"],
      frontImage: "https://example.com/front.jpg",
      backImage: "https://example.com/back.jpg",
    };

    const result = await service.createArtistRegistrationRequestByUserId(userId, payload);

    expect(mockArtistRequestModel.create).toHaveBeenCalled();
    expect(result.status).toBe("pending");
  });
});
