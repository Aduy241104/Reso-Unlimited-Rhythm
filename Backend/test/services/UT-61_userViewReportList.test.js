import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockReportModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
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

describe("View report list - User", () => {
  test("retrieves reports submitted by the user", async () => {
    const service = await loadService();
    const userId = new mongoose.Types.ObjectId().toString();

    mockReportModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              {
                _id: "rep-1",
                userId,
                targetType: "track",
                reason: "copyright_infringement",
                status: "pending",
              },
            ]),
          }),
        }),
      }),
    });
    mockReportModel.countDocuments.mockResolvedValue(1);

    const result = await service.getReportsByUserId(userId, { page: 1, limit: 10 });

    expect(mockReportModel.find).toHaveBeenCalled();
    expect(result.reports).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });
});
