import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockReportModel = {
  findOne: jest.fn(),
  create: jest.fn(),
};

const mockTrackModel = {
  findById: jest.fn(),
};

const mockAlbumModel = {
  findById: jest.fn(),
};

const mockArtistModel = {
  findById: jest.fn(),
};

const loadService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/Report.js", () => ({
    default: mockReportModel,
  }));
  jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: mockTrackModel,
  }));
  jest.unstable_mockModule("../../src/models/Album.js", () => ({
    default: mockAlbumModel,
  }));
  jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: mockArtistModel,
  }));
  jest.unstable_mockModule("../../src/models/Notification.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
    uploadImageBuffer: jest.fn(),
  }));

  return (await import("../../src/services/report/user.report.service.js")).default;
};

describe("Create report - User", () => {
  test("creates a new report successfully", async () => {
    const service = await loadService();
    const userId = new mongoose.Types.ObjectId().toString();
    const targetId = new mongoose.Types.ObjectId().toString();

    mockTrackModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: targetId, activeStatus: "active" }),
      }),
    });

    mockReportModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    const reportDoc = {
      _id: "report-1",
      userId,
      targetType: "track",
      targetId,
      reason: "spam_or_scam",
      description: "Spam content",
      status: "pending",
      toObject: () => ({
        _id: "report-1",
        userId,
        targetType: "track",
        targetId,
        reason: "spam_or_scam",
        description: "Spam content",
        status: "pending",
      }),
    };

    mockReportModel.create.mockResolvedValue(reportDoc);

    const result = await service.createReportByUserId(
      userId,
      {
        targetType: "track",
        targetId,
        reason: "spam_or_scam",
        description: "Spam content",
      },
      []
    );

    expect(mockReportModel.create).toHaveBeenCalled();
    expect(result.status).toBe("pending");
  });
});
