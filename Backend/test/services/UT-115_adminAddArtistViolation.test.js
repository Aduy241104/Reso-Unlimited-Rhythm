import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockArtistModel = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

const mockReportModel = {
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

const loadService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: mockArtistModel,
  }));
  jest.unstable_mockModule("../../src/models/Report.js", () => ({
    default: mockReportModel,
  }));
  jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/models/Album.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/models/Notification.js", () => ({ default: {} }));

  return (await import("../../src/services/report/admin.report.service.js")).default;
};

describe("Add Artist Violation - Admin", () => {
  test("increments artist violations when resolving report with violation action", async () => {
    const service = await loadService();
    const artistId = new mongoose.Types.ObjectId().toString();
    const reportId = new mongoose.Types.ObjectId().toString();

    const mockArtistDoc = {
      _id: artistId,
      violations: [],
      save: jest.fn().mockResolvedValue(true),
    };

    mockArtistModel.findById.mockResolvedValue(mockArtistDoc);

    const mockReportDoc = {
      _id: reportId,
      targetId: artistId,
      targetType: "artist",
      status: "pending",
      reason: "copyright_infringement",
      save: jest.fn().mockResolvedValue(true),
    };

    mockReportModel.find.mockResolvedValue([mockReportDoc]);

    const result = await service.resolveGroupedReport("artist", artistId, {
      action: "warn",
      resolutionNote: "Artist warning issued",
      evaluations: [{ reportId, isValid: true }],
    }, "admin-1");

    expect(mockArtistDoc.violations).toHaveLength(1);
    expect(mockArtistDoc.save).toHaveBeenCalled();
    expect(result.artistViolationsCount).toBe(1);
  });
});
