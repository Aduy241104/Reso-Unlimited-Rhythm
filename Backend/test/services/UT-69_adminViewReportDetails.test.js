import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockReportModel = {
  find: jest.fn(),
};

const mockTrackModel = {
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
  jest.unstable_mockModule("../../src/models/Album.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: { findById: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }) } }));
  jest.unstable_mockModule("../../src/models/Notification.js", () => ({ default: {} }));

  return (await import("../../src/services/report/admin.report.service.js")).default;
};

describe("View report details - Admin", () => {
  test("retrieves grouped report details for admin", async () => {
    const service = await loadService();
    const targetId = new mongoose.Types.ObjectId().toString();

    mockTrackModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: targetId, title: "Reported Song" }),
        }),
      }),
    });

    const mockReports = [
      {
        _id: "rep-1",
        targetType: "track",
        targetId,
        reason: "copyright_infringement",
        status: "pending",
      },
    ];

    const chainMock = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockReports),
    };

    mockReportModel.find.mockReturnValue(chainMock);

    const result = await service.getGroupedReportDetail("track", targetId);

    expect(result.targetType).toBe("track");
    expect(result.reports).toHaveLength(1);
  });
});
