import { jest } from "@jest/globals";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const userId = "507f1f77bcf86cd799439011";
const artistId = "507f1f77bcf86cd799439012";

const mockArtistModel = {
  findOne: jest.fn(),
};

const mockArtistRevenueSummaryModel = {
  find: jest.fn(),
};

const mockWithdrawalRequestModel = {
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
};

const createQueryChain = (result) => ({
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(result),
});

const createFindChain = (result) => ({
  sort: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(result),
});

const loadArtistWithdrawalService = async () => {
  jest.resetModules();

  jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: mockArtistModel,
  }));
  jest.unstable_mockModule("../../src/models/ArtistRevenueSummary.js", () => ({
    default: mockArtistRevenueSummaryModel,
  }));
  jest.unstable_mockModule("../../src/models/WithdrawalRequest.js", () => ({
    default: mockWithdrawalRequestModel,
  }));

  const { default: artistWithdrawalService } = await import(
    "../../src/services/artist/artist.withdrawal.service.js"
  );

  return { artistWithdrawalService };
};

describe("artistWithdrawalService.getMyRevenueSummaryByUserId", () => {
  beforeEach(() => {
    mockArtistModel.findOne.mockReset();
    mockArtistRevenueSummaryModel.find.mockReset();
    mockWithdrawalRequestModel.countDocuments.mockReset();
    mockWithdrawalRequestModel.aggregate.mockReset();
  });

  test("returns current available balance and monthly revenue history", async () => {
    const { artistWithdrawalService } = await loadArtistWithdrawalService();

    mockArtistModel.findOne.mockReturnValue(
      createQueryChain({
        _id: artistId,
        name: "Synth Horizon",
      })
    );

    mockArtistRevenueSummaryModel.find.mockReturnValue(
      createFindChain([
        {
          _id: "summary-2026-06",
          year: 2026,
          month: 6,
          totalEligibleStreams: 1200,
          grossRevenueAmount: 1500000,
          artistRevenueAmount: 1050000,
          withdrawnAmount: 300000,
          availableAmount: 750000,
          status: "calculated",
          calculatedAt: new Date("2026-06-15T00:00:00.000Z"),
          updatedAt: new Date("2026-06-16T00:00:00.000Z"),
        },
        {
          _id: "summary-2026-05",
          year: 2026,
          month: 5,
          totalEligibleStreams: 900,
          grossRevenueAmount: 1100000,
          artistRevenueAmount: 770000,
          withdrawnAmount: 200000,
          availableAmount: 500000,
          status: "paid",
          calculatedAt: new Date("2026-05-31T00:00:00.000Z"),
          updatedAt: new Date("2026-06-01T00:00:00.000Z"),
        },
      ])
    );
    mockWithdrawalRequestModel.countDocuments.mockResolvedValue(2);
    mockWithdrawalRequestModel.aggregate.mockResolvedValue([
      {
        _id: null,
        totalAmount: 120000,
      },
    ]);

    const result = await artistWithdrawalService.getMyRevenueSummaryByUserId(
      userId
    );

    expect(result.artist).toEqual({
      id: artistId,
      name: "Synth Horizon",
    });
    expect(result.balance).toEqual({
      currency: "VND",
      availableAmount: 750000,
      withdrawnAmount: 300000,
      totalEligibleStreams: 2100,
      lifetimeGrossRevenueAmount: 2600000,
      lifetimeArtistRevenueAmount: 1820000,
      latestStatus: "calculated",
      latestPeriod: {
        year: 2026,
        month: 6,
      },
      calculatedAt: new Date("2026-06-15T00:00:00.000Z"),
      updatedAt: new Date("2026-06-16T00:00:00.000Z"),
      summaryCount: 2,
    });
    expect(result.monthlySummaries).toHaveLength(2);
    expect(result.withdrawalSummary).toEqual({
      pendingAmount: 120000,
      requestCount: 2,
    });
    expect(result.monthlySummaries[0]).toMatchObject({
      id: "summary-2026-06",
      year: 2026,
      month: 6,
      availableAmount: 750000,
      status: "calculated",
    });
  });

  test("returns zero balance when artist has no revenue summaries", async () => {
    const { artistWithdrawalService } = await loadArtistWithdrawalService();

    mockArtistModel.findOne.mockReturnValue(
      createQueryChain({
        _id: artistId,
        name: "Synth Horizon",
      })
    );

    mockArtistRevenueSummaryModel.find.mockReturnValue(createFindChain([]));
    mockWithdrawalRequestModel.countDocuments.mockResolvedValue(0);
    mockWithdrawalRequestModel.aggregate.mockResolvedValue([]);

    const result = await artistWithdrawalService.getMyRevenueSummaryByUserId(
      userId
    );

    expect(result.balance.availableAmount).toBe(0);
    expect(result.balance.summaryCount).toBe(0);
    expect(result.monthlySummaries).toEqual([]);
  });
});
