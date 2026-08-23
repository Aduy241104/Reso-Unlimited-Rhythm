import { jest } from "@jest/globals";

const mockUserModel = { countDocuments: jest.fn() };
const mockArtistModel = { countDocuments: jest.fn() };
const mockTrackModel = { countDocuments: jest.fn() };
const mockListenEventModel = { countDocuments: jest.fn(), aggregate: jest.fn() };
const mockPlatformMonthlyStatModel = { findOne: jest.fn(), findOneAndUpdate: jest.fn() };

const loadService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/User.js", () => ({ default: mockUserModel }));
  jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: mockArtistModel }));
  jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: mockTrackModel }));
  jest.unstable_mockModule("../../src/models/ListenEvent.js", () => ({ default: mockListenEventModel }));
  jest.unstable_mockModule("../../src/models/PlatformMonthlyStat.js", () => ({ default: mockPlatformMonthlyStatModel }));

  return (await import("../../src/services/analytics/platformStreamingStats.service.js")).default;
};

describe("View Platform Statistics Overview", () => {
  test("retrieves platform-wide overview statistics for admin dashboard", async () => {
    const service = await loadService();

    mockPlatformMonthlyStatModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    mockUserModel.countDocuments.mockResolvedValue(500);
    mockArtistModel.countDocuments.mockResolvedValue(50);
    mockTrackModel.countDocuments.mockResolvedValue(1200);
    mockListenEventModel.countDocuments.mockResolvedValue(10000);
    mockListenEventModel.aggregate.mockResolvedValue([]);

    const result = await service.getOverviewStats();

    expect(mockUserModel.countDocuments).toHaveBeenCalled();
    expect(result.totalUsers).toBe(500);
    expect(result.totalArtists).toBe(50);
  });
});
