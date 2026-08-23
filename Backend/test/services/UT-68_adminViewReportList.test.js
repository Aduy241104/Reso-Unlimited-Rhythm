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

describe("View report list - Admin", () => {
  test("retrieves grouped report list for admin", async () => {
    const service = await loadService();

    mockReportModel.aggregate.mockResolvedValue([
      {
        _id: { targetType: "track", targetId: "tr-1" },
        totalReports: 3,
        pendingReports: 3,
        resolvedReports: 0,
        rejectedReports: 0,
        reasons: ["copyright_infringement"],
        latestReportAt: new Date(),
      },
    ]);

    const result = await service.getGroupedReports({ page: 1, limit: 10 });

    expect(mockReportModel.aggregate).toHaveBeenCalled();
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].totalReports).toBe(3);
  });
});
