import { jest } from "@jest/globals";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const userId = "507f1f77bcf86cd799439011";
const artistId = "507f1f77bcf86cd799439012";

const mockArtistModel = {
  findOne: jest.fn(),
};

const mockArtistDailyStatModel = {
  aggregate: jest.fn(),
  find: jest.fn(),
};

const mockListenEventModel = {
  aggregate: jest.fn(),
};

const mockTrackModel = {
  countDocuments: jest.fn(),
};

const mockUserModel = {
  find: jest.fn(),
};

const createQueryChain = (result) => ({
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(result),
});

const loadArtistPerformanceOverviewService = async () => {
  jest.resetModules();

  jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: mockArtistModel,
  }));
  jest.unstable_mockModule("../../src/models/ArtistDailyStat.js", () => ({
    default: mockArtistDailyStatModel,
  }));
  jest.unstable_mockModule("../../src/models/ListenEvent.js", () => ({
    default: mockListenEventModel,
  }));
  jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: mockTrackModel,
  }));
  jest.unstable_mockModule("../../src/models/User.js", () => ({
    default: mockUserModel,
  }));
  jest.unstable_mockModule(
    "../../src/services/analytics/trackStatAggregation.service.js",
    () => ({
      getAnalyticsTimezone: () => "UTC",
    })
  );

  const { default: artistPerformanceOverviewService } = await import(
    "../../src/services/artist/artistPerformanceOverview.service.js"
  );

  return { artistPerformanceOverviewService };
};

describe("artistPerformanceOverviewService", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-15T08:00:00.000Z"));

    mockArtistModel.findOne.mockReset();
    mockArtistDailyStatModel.aggregate.mockReset();
    mockArtistDailyStatModel.find.mockReset();
    mockListenEventModel.aggregate.mockReset();
    mockTrackModel.countDocuments.mockReset();
    mockUserModel.find.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("builds artist performance overview with all-time summary cards and filled chart data", async () => {
    const { artistPerformanceOverviewService } =
      await loadArtistPerformanceOverviewService();

    mockArtistModel.findOne.mockReturnValue(
      createQueryChain({
        _id: artistId,
        name: "Synth Horizon",
        stats: {
          followers: 1240,
          totalStreams: 98765,
        },
      })
    );

    mockArtistDailyStatModel.aggregate
      .mockResolvedValueOnce([
        {
          month: 1,
          streamCount: 10,
        },
        {
          month: 6,
          streamCount: 45,
        },
      ])
      .mockResolvedValueOnce([
        {
          year: 2022,
          streamCount: 5,
        },
        {
          year: 2026,
          streamCount: 115,
        },
      ]);

    mockArtistDailyStatModel.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          dateKey: "2026-06-09",
          streamCount: 2,
          uniqueListeners: 2,
        },
        {
          dateKey: "2026-06-11",
          streamCount: 5,
          uniqueListeners: 3,
        },
      ]),
    });

    mockListenEventModel.aggregate
      .mockResolvedValueOnce([
        {
          date: "2026-06-15",
          streamCount: 5,
          uniqueListeners: 2,
        },
      ])
      .mockResolvedValueOnce([
        {
          month: 6,
          streamCount: 5,
        },
      ])
      .mockResolvedValueOnce([
        {
          year: 2026,
          streamCount: 5,
        },
      ])
      .mockResolvedValueOnce([
        { year: 2026 },
        { year: 2025 },
      ]);

    mockTrackModel.countDocuments.mockResolvedValue(8);

    const result =
      await artistPerformanceOverviewService.getArtistPerformanceOverview({
        userId,
        range: "7d",
        year: 2026,
      });

    expect(
      mockListenEventModel.aggregate.mock.calls[0][0][0].$match.listenedAt.$lt
    ).toEqual(new Date("2026-06-16T00:00:00.000Z"));
    expect(result.artist).toEqual({
      id: artistId,
      name: "Synth Horizon",
    });
    expect(result.period).toEqual({
      from: "2026-06-09",
      to: "2026-06-15",
    });
    expect(result.summary).toEqual({
      followers: 1240,
      trackCount: 8,
      totalStreams: 98765,
    });
    expect(result.availableYears).toEqual([2026, 2025]);
    expect(result.dailyStats).toHaveLength(7);
    expect(result.dailyStats[1]).toEqual({
      date: "2026-06-10",
      streamCount: 0,
      uniqueListeners: 0,
    });
    expect(result.dailyStats[2]).toEqual({
      date: "2026-06-11",
      streamCount: 5,
      uniqueListeners: 3,
    });
    expect(result.monthlyStats[0]).toEqual({
      month: 1,
      monthKey: "2026-01",
      streamCount: 10,
    });
    expect(result.monthlyStats[1]).toEqual({
      month: 2,
      monthKey: "2026-02",
      streamCount: 0,
    });
    expect(result.monthlyStats[5]).toEqual({
      month: 6,
      monthKey: "2026-06",
      streamCount: 50,
    });
    expect(result.yearlyStats).toEqual([
      {
        year: 2022,
        month: "2022",
        streamCount: 5,
      },
      {
        year: 2023,
        month: "2023",
        streamCount: 0,
      },
      {
        year: 2024,
        month: "2024",
        streamCount: 0,
      },
      {
        year: 2025,
        month: "2025",
        streamCount: 0,
      },
      {
        year: 2026,
        month: "2026",
        streamCount: 120,
      },
    ]);
    expect(result.audience).toBeUndefined();
    expect(result.topPerformingTracks).toBeUndefined();
  });

  test("throws 400 when range is invalid", async () => {
    const { artistPerformanceOverviewService } =
      await loadArtistPerformanceOverviewService();

    mockArtistModel.findOne.mockReturnValue(
      createQueryChain({
        _id: artistId,
        name: "Synth Horizon",
        stats: {
          followers: 0,
          totalStreams: 0,
        },
      })
    );

    await expect(
      artistPerformanceOverviewService.getArtistPerformanceOverview({
        userId,
        range: "365d",
      })
    ).rejects.toMatchObject({
      message: "Invalid analytics range",
      statusCode: 400,
    });

    expect(mockListenEventModel.aggregate).not.toHaveBeenCalled();
  });
});
