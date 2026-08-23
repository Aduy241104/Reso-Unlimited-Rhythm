import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockReportModel = {
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

const mockTrackModel = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
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
  jest.unstable_mockModule("../../src/models/Album.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/models/Notification.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/services/artist/admin.artist.service.js", () => ({
    syncArtistContentVisibility: jest.fn().mockResolvedValue(true),
  }));

  return (await import("../../src/services/report/admin.report.service.js")).default;
};

describe("Handle report - Admin", () => {
  test("resolves a report by rejecting it", async () => {
    const service = await loadService();
    const targetId = new mongoose.Types.ObjectId().toString();

    mockTrackModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: targetId, title: "Reported Song" }),
        }),
      }),
    });

    const mockReportDoc = {
      _id: "rep-1",
      targetId,
      targetType: "track",
      status: "pending",
      save: jest.fn().mockResolvedValue(true),
    };

    mockReportModel.find.mockResolvedValue([mockReportDoc]);

    const result = await service.resolveGroupedReport("track", targetId, {
      action: "reject",
      resolutionNote: "No violation found",
    }, "admin-1");

    expect(mockReportDoc.status).toBe("rejected");
    expect(result.actionTaken).toBe("reject");
  });
});
