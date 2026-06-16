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

const mockUserModel = {
  find: jest.fn(),
};

const mockArtistListenerBehaviorInsightsService = {
  getArtistListenerBehaviorInsights: jest.fn(),
};

const mockArtistTopPerformingTracksService = {
  getTopPerformingTracks: jest.fn(),
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
  jest.unstable_mockModule("../../src/models/User.js", () => ({
    default: mockUserModel,
  }));
  jest.unstable_mockModule(
    "../../src/services/artist/artistListenerBehaviorInsights.service.js",
    () => ({
      default: mockArtistListenerBehaviorInsightsService,
    })
  );
  jest.unstable_mockModule(
    "../../src/services/artist/artistTopPerformingTracks.service.js",
    () => ({
      default: mockArtistTopPerformingTracksService,
    })
  );
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
    mockUserModel.find.mockReset();
    mockArtistListenerBehaviorInsightsService.getArtistListenerBehaviorInsights.mockReset();
    mockArtistTopPerformingTracksService.getTopPerformingTracks.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("builds artist performance overview with filled daily, monthly, yearly and audience breakdown data", async () => {
    const { artistPerformanceOverviewService } =
      await loadArtistPerformanceOverviewService();

    mockArtistModel.findOne.mockReturnValue(
      createQueryChain({
        _id: artistId,
        name: "Synth Horizon",
      })
    );

    mockArtistDailyStatModel.aggregate
      .mockResolvedValueOnce([
        {
          streamCount: 7,
        },
      ])
      .mockResolvedValueOnce([
        {
          streamCount: 15,
        },
      ])
      .mockResolvedValueOnce([
        {
          streamCount: 115,
        },
      ])
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

    mockArtistDailyStatModel.find.mockReturnValue(
      {
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
      }
    );

    mockListenEventModel.aggregate
      .mockResolvedValueOnce([
        {
          streamCount: 12,
          uniqueListeners: 3,
        },
      ])
      .mockResolvedValueOnce([
        {
          streamCount: 5,
        },
      ])
      .mockResolvedValueOnce([
        {
          streamCount: 5,
        },
      ])
      .mockResolvedValueOnce([
        {
          streamCount: 5,
        },
      ])
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
      ])
      .mockResolvedValueOnce([
        {
          _id: "listener-1",
          country: "Vietnam",
        },
        {
          _id: "listener-2",
          country: "Thailand",
        },
        {
          _id: "listener-3",
          country: "",
        },
      ]);

    mockUserModel.find.mockReturnValue(
      createQueryChain([
        {
          _id: "listener-1",
          profile: {
            dateOfBirth: new Date("2000-03-01T00:00:00.000Z"),
            country: "Vietnam",
          },
        },
        {
          _id: "listener-2",
          profile: {
            dateOfBirth: new Date("1987-07-12T00:00:00.000Z"),
            country: "Thailand",
          },
        },
        {
          _id: "listener-3",
          profile: {
            dateOfBirth: null,
            country: "Cambodia",
          },
        },
      ])
    );

    mockArtistListenerBehaviorInsightsService.getArtistListenerBehaviorInsights.mockResolvedValue({
      artist: {
        id: artistId,
        name: "Synth Horizon",
      },
      range: "all",
      period: {
        from: "2026-01-01",
        to: "2026-06-15",
      },
      summary: {
        totalStreams: 20,
        uniqueListeners: 3,
        returningListeners: 2,
        averageStreamsPerListener: 6.67,
        completionRate: 75,
        skipRate: 25,
        engagementRate: 66.67,
      },
      behavior: {
        sources: [],
        devices: [],
        listeningHours: [],
        loyaltySegments: [],
        engagement: {
          engagedListeners: 2,
          followActions: 1,
          likeActions: 2,
          totalActions: 3,
          engagementRate: 66.67,
        },
      },
    });

    mockArtistTopPerformingTracksService.getTopPerformingTracks.mockResolvedValue({
      period: {
        from: "2026-06-09",
        to: "2026-06-15",
        range: "7d",
      },
      summary: {
        rankedTracks: 1,
        totalPlays: 12,
        totalUniqueListeners: 3,
        topTrack: {
          rank: 1,
          title: "Synth Horizon",
          playCount: 12,
        },
      },
      topTracks: [],
    });

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
      selectedRangeStreams: 12,
      selectedRangeUniqueListeners: 3,
      currentMonthStreams: 20,
      currentYearStreams: 120,
      selectedYearStreams: 60,
    });
    expect(result.availableYears).toEqual([2026, 2025]);
    expect(result.listenerBehavior.summary.totalStreams).toBe(20);
    expect(result.topPerformingTracks.summary.rankedTracks).toBe(1);
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
    expect(result.audience.totalListeners).toBe(3);
    expect(result.audience.ageGroups).toEqual(
      expect.arrayContaining([
        {
          key: "25_34",
          label: "25 - 34",
          count: 1,
          percentage: 33.33,
        },
        {
          key: "35_44",
          label: "35 - 44",
          count: 1,
          percentage: 33.33,
        },
        {
          key: "unknown",
          label: "Không xác định",
          count: 1,
          percentage: 33.33,
        },
      ])
    );
    expect(result.audience.regions).toEqual([
      {
        key: "Cambodia",
        label: "Cambodia",
        count: 1,
        percentage: 33.33,
      },
      {
        key: "Thailand",
        label: "Thailand",
        count: 1,
        percentage: 33.33,
      },
      {
        key: "Vietnam",
        label: "Vietnam",
        count: 1,
        percentage: 33.33,
      },
    ]);
  });

  test("throws 400 when range is invalid", async () => {
    const { artistPerformanceOverviewService } =
      await loadArtistPerformanceOverviewService();

    mockArtistModel.findOne.mockReturnValue(
      createQueryChain({
        _id: artistId,
        name: "Synth Horizon",
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
