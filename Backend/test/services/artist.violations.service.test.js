import { jest } from "@jest/globals";

const mockArtistModel = {
  findOne: jest.fn(),
};

const mockArtistVerificationRequestModel = {
  exists: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
};

const mockReportModel = {
  find: jest.fn(),
};

const mockTrackModel = {
  find: jest.fn(),
};

const mockAlbumModel = {
  find: jest.fn(),
};

const createLeanQuery = (result) => ({
  lean: jest.fn().mockResolvedValue(result),
});

const createSelectLeanQuery = (result) => ({
  select: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(result),
  }),
});

const createPopulateLeanQuery = (result) => ({
  populate: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(result),
  }),
});

const loadArtistService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: mockArtistModel,
  }));
  jest.unstable_mockModule("../../src/models/ArtistVerificationRequest.js", () => ({
    default: mockArtistVerificationRequestModel,
  }));
  jest.unstable_mockModule("../../src/models/Report.js", () => ({
    default: mockReportModel,
  }));
  jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: mockTrackModel,
  }));
  jest.unstable_mockModule("../../src/models/Album.js", () => ({
    default: mockAlbumModel,
  }));
  jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
    uploadImageBuffer: jest.fn(),
    deleteImageByPublicId: jest.fn(),
  }));
  jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
    extractPublicIdFromUrl: jest.fn(),
  }));
  jest.unstable_mockModule("../../src/services/artist/artist.helper.js", () => ({
    formatArtistProfile: jest.fn((value) => value),
  }));
  jest.unstable_mockModule("../../src/services/artist/artist.status.helper.js", () => ({
    assertArtistOperational: jest.fn(),
  }));
  jest.unstable_mockModule("../../src/services/artist/artist.name.service.js", () => ({
    assertArtistStageNameAvailable: jest.fn(),
  }));

  const { default: artistService } = await import(
    "../../src/services/artist/artist.service.js"
  );

  return artistService;
};

describe("artist.service getMyViolationsByUserId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns only recorded violations and groups multiple valid reports from one admin decision", async () => {
    const artistService = await loadArtistService();

    const artistDoc = {
      _id: "artist-1",
      userId: "user-1",
      name: "Thanh",
      avatar: "avatar.png",
      activeStatus: "active",
      blockedReason: "",
      updatedAt: "2026-08-19T11:00:00.000Z",
      violations: [
        {
          _id: "violation-1",
          content: 'Báo cáo vi phạm đối với bài hát "Bai A"',
          violatedAt: "2026-08-18T14:00:00.000Z",
        },
        {
          _id: "violation-2",
          content: "Ghi nhận vi phạm thủ công",
          violatedAt: "2026-08-19T11:00:00.000Z",
        },
      ],
    };

    mockArtistModel.findOne.mockReturnValue(createLeanQuery(artistDoc));
    mockTrackModel.find.mockReturnValue(
      createSelectLeanQuery([{ _id: "track-1", title: "Bai A" }])
    );
    mockAlbumModel.find.mockReturnValue(createSelectLeanQuery([]));
    mockReportModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: "report-pending-1",
            targetType: "track",
            targetId: "track-1",
            status: "pending",
            isValidReason: null,
            reason: "copyright_infringement",
            description: "Pending report should stay hidden",
            resolution: "",
            resolutionNote: "",
            images: [],
            createdAt: "2026-08-19T08:00:00.000Z",
          },
          {
            _id: "report-valid-1",
            targetType: "track",
            targetId: "track-1",
            status: "resolved",
            isValidReason: true,
            resolutionBatchId: "batch-1",
            handledAt: "2026-08-18T14:00:00.000Z",
            createdAt: "2026-08-18T13:00:00.000Z",
            reason: "copyright_infringement",
            description: "Trùng bản quyền",
            resolution: "warning",
            resolutionNote: "Đã xác nhận vi phạm",
            images: ["https://img.test/1.png"],
          },
          {
            _id: "report-valid-2",
            targetType: "track",
            targetId: "track-1",
            status: "resolved",
            isValidReason: true,
            resolutionBatchId: "batch-1",
            handledAt: "2026-08-18T14:00:00.000Z",
            createdAt: "2026-08-18T12:00:00.000Z",
            reason: "misleading_information",
            description: "Sai metadata",
            resolution: "warning",
            resolutionNote: "Đã xác nhận vi phạm",
            images: ["https://img.test/2.png"],
          },
          {
            _id: "report-rejected-1",
            targetType: "track",
            targetId: "track-1",
            status: "rejected",
            isValidReason: false,
            createdAt: "2026-08-17T10:00:00.000Z",
            reason: "other",
            description: "Rejected report should stay hidden",
            resolution: "reject",
            resolutionNote: "",
            images: [],
          },
        ]),
      }),
    });

    const result = await artistService.getMyViolationsByUserId("user-1");

    expect(result.artistInfo.violationsCount).toBe(2);
    expect(result.violations).toHaveLength(2);
    expect(result.violations.every((item) => item.status === "resolved")).toBe(true);
    expect(result.violations.some((item) => item.description.includes("Pending report"))).toBe(false);
    expect(result.violations.some((item) => item.description.includes("Rejected report"))).toBe(false);

    const groupedViolation = result.violations.find((item) => item.id === "resolved-batch-1");
    expect(groupedViolation).toBeTruthy();
    expect(groupedViolation.violationType).toContain("Vi phạm bản quyền");
    expect(groupedViolation.violationType).toContain("Thông tin sai lệch");
    expect(groupedViolation.reportCount).toBe(2);
    expect(groupedViolation.reports).toHaveLength(2);
    expect(groupedViolation.reports.map((report) => report.id)).toEqual([
      "report-valid-1",
      "report-valid-2",
    ]);
    expect(groupedViolation.images).toEqual([
      "https://img.test/1.png",
      "https://img.test/2.png",
    ]);
  });
});
