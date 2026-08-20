import { jest } from "@jest/globals";

const mockReportModel = {
  find: jest.fn(),
};

const mockTrackModel = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  find: jest.fn(),
};

const mockAlbumModel = {
  findByIdAndUpdate: jest.fn(),
  find: jest.fn(),
};

const mockArtistModel = {
  findById: jest.fn(),
};

const mockNotificationModel = {
  create: jest.fn(),
};

const mockSyncArtistContentVisibility = jest.fn();

const createTrackQuery = (result) => ({
  select: jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(result),
    }),
  }),
});

const createLeanSelectQuery = (result) => ({
  select: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(result),
  }),
});

const createReportPopulateQuery = (result) => ({
  populate: jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(result),
      }),
    }),
  }),
});

const loadAdminReportService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/Report.js", () => ({
    default: mockReportModel,
  }));
  jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: mockTrackModel,
  }));
  jest.unstable_mockModule("../../src/models/Album.js", () => ({
    default: mockAlbumModel,
  }));
  jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: mockArtistModel,
  }));
  jest.unstable_mockModule("../../src/models/Notification.js", () => ({
    default: mockNotificationModel,
  }));
  jest.unstable_mockModule("../../src/services/artist/admin.artist.service.js", () => ({
    syncArtistContentVisibility: mockSyncArtistContentVisibility,
  }));

  const { default: adminReportService } = await import(
    "../../src/services/report/admin.report.service.js"
  );

  return adminReportService;
};

describe("admin.report.service resolveGroupedReport", () => {
  const artistId = "507f1f77bcf86cd799439011";
  const trackId = "507f1f77bcf86cd799439012";
  const adminId = "507f1f77bcf86cd799439013";

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationModel.create.mockResolvedValue({});
    mockSyncArtistContentVisibility.mockResolvedValue(undefined);
    mockTrackModel.findById.mockReturnValue(
      createTrackQuery({
        _id: trackId,
        title: "Violation Track",
        artist_artistId: {
          _id: artistId,
          userId: "user-1",
          name: "Artist One",
        },
      })
    );
    mockTrackModel.findByIdAndUpdate.mockResolvedValue({ _id: trackId });
    mockAlbumModel.findByIdAndUpdate.mockResolvedValue({ _id: "507f1f77bcf86cd799439014" });
  });

  test("keeps the 4th confirmed violation as a final warning", async () => {
    const service = await loadAdminReportService();
    const reports = [
      {
        _id: "report-1",
        status: "pending",
        save: jest.fn().mockResolvedValue(undefined),
      },
    ];

    const artistDoc = {
      _id: artistId,
      userId: "user-1",
      activeStatus: "active",
      violations: [
        { content: "Violation 1" },
        { content: "Violation 2" },
        { content: "Violation 3" },
      ],
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockReportModel.find.mockResolvedValue(reports);
    mockArtistModel.findById.mockResolvedValue(artistDoc);

    const result = await service.resolveGroupedReport(
      "track",
      trackId,
      {
        action: "warning",
        resolutionNote: "Repeated infringement",
        evaluations: [{ reportId: "report-1", isValid: true }],
      },
      adminId
    );

    expect(mockSyncArtistContentVisibility).not.toHaveBeenCalled();
    expect(artistDoc.activeStatus).toBe("active");
    expect(result.updatedViolationsCount).toBe(4);
    expect(result.artistActiveStatus).toBe("active");
    expect(result.penaltyAppliedMessage).toContain("cảnh báo cuối cùng");
  });

  test("blocks the artist account on the 5th confirmed violation", async () => {
    const service = await loadAdminReportService();
    const reports = [
      {
        _id: "report-2",
        status: "pending",
        save: jest.fn().mockResolvedValue(undefined),
      },
    ];

    const artistDoc = {
      _id: artistId,
      userId: "user-1",
      activeStatus: "active",
      violations: [
        { content: "Violation 1" },
        { content: "Violation 2" },
        { content: "Violation 3" },
        { content: "Violation 4" },
      ],
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockReportModel.find.mockResolvedValue(reports);
    mockArtistModel.findById.mockResolvedValue(artistDoc);

    const result = await service.resolveGroupedReport(
      "track",
      trackId,
      {
        action: "warning",
        resolutionNote: "Fifth strike",
        evaluations: [{ reportId: "report-2", isValid: true }],
      },
      adminId
    );

    expect(mockSyncArtistContentVisibility).toHaveBeenCalledWith(
      artistId,
      "blocked",
      "Fifth strike"
    );
    expect(artistDoc.activeStatus).toBe("blocked");
    expect(result.updatedViolationsCount).toBe(5);
    expect(result.artistActiveStatus).toBe("blocked");
    expect(result.penaltyAppliedMessage).toContain("5");
  });

  test("blocks only the reported track for the hide-content action", async () => {
    const service = await loadAdminReportService();
    const reports = [
      {
        _id: "report-hide-1",
        status: "pending",
        save: jest.fn().mockResolvedValue(undefined),
      },
    ];

    const artistDoc = {
      _id: artistId,
      userId: "user-1",
      activeStatus: "active",
      violations: [],
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockReportModel.find.mockResolvedValue(reports);
    mockArtistModel.findById.mockResolvedValue(artistDoc);

    await service.resolveGroupedReport(
      "track",
      trackId,
      {
        action: "hide",
        resolutionNote: "Bài hát vi phạm bản quyền",
        evaluations: [{ reportId: "report-hide-1", isValid: true }],
      },
      adminId
    );

    expect(mockTrackModel.findByIdAndUpdate).toHaveBeenCalledWith(
      trackId,
      {
        $set: expect.objectContaining({
          activeStatus: "blocked",
          blockedReason: "Bài hát vi phạm bản quyền",
          hiddenReason: "",
          hiddenAt: null,
        }),
      },
      { new: true }
    );
    expect(mockSyncArtistContentVisibility).not.toHaveBeenCalled();
  });

  test("grouped artist report detail excludes track and album reports by default", async () => {
    const service = await loadAdminReportService();
    const artistReports = [
      {
        _id: "report-artist-1",
        targetType: "artist",
        targetId: artistId,
        status: "pending",
        createdAt: "2026-08-19T10:00:00.000Z",
      },
    ];

    mockReportModel.find.mockReturnValue(createReportPopulateQuery(artistReports));
    mockArtistModel.findById.mockReturnValue(
      createLeanSelectQuery({
        _id: artistId,
        userId: "user-1",
        name: "Artist One",
        activeStatus: "active",
        violations: [{ content: "Violation 1" }],
      })
    );

    const result = await service.getGroupedReportDetail("artist", artistId);

    expect(mockReportModel.find).toHaveBeenCalledWith({
      targetType: "artist",
      targetId: artistId,
    });
    expect(result.totalReports).toBe(1);
    expect(result.reports).toHaveLength(1);
    expect(result.reports[0].targetType).toBe("artist");
    expect(mockTrackModel.find).not.toHaveBeenCalled();
    expect(mockAlbumModel.find).not.toHaveBeenCalled();
  });
});
