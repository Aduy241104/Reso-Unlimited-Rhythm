import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockArtistModel = {
  findOne: jest.fn(),
};

const mockTrackModel = {
  find: jest.fn(),
};

const mockAlbumModel = {
  find: jest.fn(),
};

const mockReportModel = {
  find: jest.fn(),
};

const loadService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: mockArtistModel,
  }));
  jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: mockTrackModel,
  }));
  jest.unstable_mockModule("../../src/models/Album.js", () => ({
    default: mockAlbumModel,
  }));
  jest.unstable_mockModule("../../src/models/Report.js", () => ({
    default: mockReportModel,
  }));
  jest.unstable_mockModule("../../src/models/User.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
    uploadImageBuffer: jest.fn(),
    deleteImageByPublicId: jest.fn(),
  }));

  return (await import("../../src/services/artist/artist.service.js")).default;
};

describe("View My Violations", () => {
  test("returns violation records for the requesting artist", async () => {
    const service = await loadService();
    const userId = new mongoose.Types.ObjectId().toString();
    const artistId = new mongoose.Types.ObjectId().toString();

    mockArtistModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: artistId,
        userId,
        name: "Artist Violator",
        violations: [
          { content: "Copyright Violation", violatedAt: "2026-08-01T10:00:00.000Z" },
        ],
      }),
    });

    mockTrackModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    mockAlbumModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    const createChain = () => ({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
      lean: jest.fn().mockResolvedValue([]),
    });

    mockReportModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue(createChain()),
        sort: jest.fn().mockReturnValue(createChain()),
      }),
      populate: jest.fn().mockReturnValue(createChain()),
      sort: jest.fn().mockReturnValue(createChain()),
      lean: jest.fn().mockResolvedValue([]),
    });

    const result = await service.getMyViolationsByUserId(userId);

    expect(mockArtistModel.findOne).toHaveBeenCalledWith({ userId });
    expect(result.artistInfo.name).toBe("Artist Violator");
    expect(result.artistInfo.violationsCount).toBe(1);
  });
});
