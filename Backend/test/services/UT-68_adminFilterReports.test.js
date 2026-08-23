import { jest } from "@jest/globals";

const mockReportModel = {
  aggregate: jest.fn(),
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
  jest.unstable_mockModule("../../src/models/Notification.js", () => ({ default: {} }));

  return (await import("../../src/services/report/admin.report.service.js")).default;
};

describe("Filter reports - Admin", () => {
  test("filters report list by status and targetType", async () => {
    const service = await loadService();

    mockReportModel.aggregate.mockResolvedValue([
      {
        _id: { targetType: "album", targetId: "alb-1" },
        totalReports: 1,
        pendingReports: 1,
        resolvedReports: 0,
        rejectedReports: 0,
        reasons: ["nudity_or_sexual_content"],
        latestReportAt: new Date(),
      },
    ]);

    const result = await service.getGroupedReports({
      status: "pending",
      targetType: "album",
      reason: "nudity_or_sexual_content",
    });

    expect(mockReportModel.aggregate).toHaveBeenCalled();
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].targetType).toBe("album");
  });
});
