import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockReportModel = {
  findOne: jest.fn(),
};

const loadService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/Report.js", () => ({
    default: mockReportModel,
  }));
  jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/models/Album.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: {} }));

  return (await import("../../src/services/report/user.report.service.js")).default;
};

describe("View report details - User", () => {
  test("retrieves details of a report owned by the user", async () => {
    const service = await loadService();
    const userId = new mongoose.Types.ObjectId().toString();
    const reportId = new mongoose.Types.ObjectId().toString();

    mockReportModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: reportId,
        userId,
        targetType: "track",
        reason: "spam_or_scam",
        status: "pending",
      }),
    });

    const result = await service.getReportById(userId, reportId);

    expect(mockReportModel.findOne).toHaveBeenCalledWith({ _id: reportId, userId });
    expect(result.reason).toBe("spam_or_scam");
  });
});
