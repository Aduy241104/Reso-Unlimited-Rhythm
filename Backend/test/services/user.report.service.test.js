import { jest } from "@jest/globals";

const mockReportModel = {
  findOne: jest.fn(),
  create: jest.fn(),
};

const mockUploadImageBuffer = jest.fn();

const createFindOneQuery = (result) => ({
  select: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(result),
  }),
});

const loadUserReportService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/Report.js", () => ({
    default: mockReportModel,
  }));
  jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
    uploadImageBuffer: mockUploadImageBuffer,
  }));

  const [{ default: userReportService }, { AppError }] = await Promise.all([
    import("../../src/services/report/user.report.service.js"),
    import("../../src/utils/AppError.js"),
  ]);

  return { userReportService, AppError };
};

describe("user.report.service createReportByUserId", () => {
  const userId = "6890af8b5f0d8e4e7c3a1001";
  const targetId = "6890af8b5f0d8e4e7c3a2002";
  const payload = {
    targetId,
    targetType: "track",
    reason: "spam_or_scam",
    description: "Reported because this content is suspicious.",
  };

  test("rejects duplicate open reports for the same user and target", async () => {
    mockReportModel.findOne.mockReturnValue(
      createFindOneQuery({
        _id: "report-open-1",
        status: "pending",
      })
    );

    const { userReportService } = await loadUserReportService();

    await expect(
      userReportService.createReportByUserId(userId, payload, [])
    ).rejects.toMatchObject({
      statusCode: 409,
      message:
        "You already have an open report for this content. Please wait until it is processed before reporting it again.",
    });

    expect(mockReportModel.findOne).toHaveBeenCalledWith({
      userId,
      targetId,
      targetType: "track",
      status: { $in: ["pending", "reviewing"] },
    });
    expect(mockReportModel.create).not.toHaveBeenCalled();
  });

  test("allows creating a new report when there is no open report for that target", async () => {
    mockReportModel.findOne.mockReturnValue(createFindOneQuery(null));
    mockReportModel.create.mockResolvedValue({
      toObject: () => ({
        _id: "report-new-1",
        userId,
        targetId,
        targetType: "track",
        status: "pending",
      }),
    });

    const { userReportService } = await loadUserReportService();
    const result = await userReportService.createReportByUserId(userId, payload, []);

    expect(mockReportModel.create).toHaveBeenCalledWith({
      userId,
      targetId,
      targetType: "track",
      reason: "spam_or_scam",
      description: "Reported because this content is suspicious.",
      images: [],
      status: "pending",
    });
    expect(result).toMatchObject({
      _id: "report-new-1",
      userId,
      targetId,
      targetType: "track",
      status: "pending",
    });
  });
});
