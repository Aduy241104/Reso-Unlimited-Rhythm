import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockArtistModel = {
  findById: jest.fn(),
};

const mockTrackModel = {
  countDocuments: jest.fn(),
};

const mockAlbumModel = {
  countDocuments: jest.fn(),
};

const mockArtistMonthlyStatModel = {
  findOne: jest.fn(),
};

const mockArtistStatModel = {
  findOne: jest.fn(),
};

const mockArtistRevenueSummaryModel = {
  findOne: jest.fn(),
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
  jest.unstable_mockModule("../../src/models/ArtistMonthlyStat.js", () => ({
    default: mockArtistMonthlyStatModel,
  }));
  jest.unstable_mockModule("../../src/models/ArtistStat.js", () => ({
    default: mockArtistStatModel,
  }));
  jest.unstable_mockModule("../../src/models/ArtistRevenueSummary.js", () => ({
    default: mockArtistRevenueSummaryModel,
  }));
  jest.unstable_mockModule("../../src/models/Notification.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/services/Playlist/playlist.helper.js", () => ({
    normalizePositiveInteger: jest.fn().mockImplementation((val, def) => val || def),
  }));

  return (await import("../../src/services/artist/admin.artist.service.js")).default;
};

describe("View Artist Violation History - Admin", () => {
  test("retrieves artist detail including violation history", async () => {
    const service = await loadService();
    const artistId = new mongoose.Types.ObjectId().toString();

    mockArtistModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: artistId,
          name: "Violator Artist",
          activeStatus: "active",
          violations: [
            { content: "Copyright infringement on Track A", violatedAt: "2026-08-10" },
          ],
        }),
      }),
    });

    mockTrackModel.countDocuments.mockResolvedValue(5);
    mockAlbumModel.countDocuments.mockResolvedValue(1);
    mockArtistMonthlyStatModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });
    mockArtistStatModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    mockArtistRevenueSummaryModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    const result = await service.getArtistDetailForAdmin(artistId);

    expect(mockArtistModel.findById).toHaveBeenCalledWith(artistId);
    expect(result.name).toBe("Violator Artist");
    expect(result.activeStatus).toBe("active");
  });
});
