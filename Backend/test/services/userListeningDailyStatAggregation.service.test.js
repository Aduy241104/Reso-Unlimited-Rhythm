import { jest } from "@jest/globals";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const userId = "507f1f77bcf86cd799439011";

const mockRecentListeningActivityModel = {
    aggregate: jest.fn(),
};

const mockUserListeningDailyStatModel = {
    bulkWrite: jest.fn(),
    deleteMany: jest.fn(),
};

const loadService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/user.recentListening.model.js", () => ({
        default: mockRecentListeningActivityModel,
    }));
    jest.unstable_mockModule("../../src/models/UserListeningDailyStat.js", () => ({
        default: mockUserListeningDailyStatModel,
    }));
    jest.unstable_mockModule(
        "../../src/services/analytics/trackStatAggregation.service.js",
        () => ({
            getAnalyticsTimezone: () => "UTC",
        })
    );

    const { default: service } = await import(
        "../../src/services/user/userListeningDailyStatAggregation.service.js"
    );

    return service;
};

describe("userListeningDailyStatAggregationService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-06-24T12:00:00.000Z"));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("aggregates and stores daily user listening stats for yesterday", async () => {
        const service = await loadService();

        mockRecentListeningActivityModel.aggregate.mockResolvedValue([
            {
                userId,
                listenCount: 4,
                totalListenedDuration: 630,
                uniqueTracks: 3,
            },
        ]);
        mockUserListeningDailyStatModel.bulkWrite.mockResolvedValue({
            upsertedCount: 1,
        });
        mockUserListeningDailyStatModel.deleteMany
            .mockResolvedValueOnce({ deletedCount: 0 })
            .mockResolvedValueOnce({ deletedCount: 0 });

        const result = await service.syncUserListeningDailyStatsForDay("__yesterday__");

        expect(mockRecentListeningActivityModel.aggregate).toHaveBeenCalled();
        expect(mockUserListeningDailyStatModel.bulkWrite).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    updateOne: expect.objectContaining({
                        filter: expect.objectContaining({
                            dateKey: "2026-06-23",
                        }),
                        update: expect.objectContaining({
                            $set: expect.objectContaining({
                                listenCount: 4,
                                totalListenedDuration: 630,
                                uniqueTracks: 3,
                            }),
                        }),
                        upsert: true,
                    }),
                }),
            ])
        );
        expect(result).toEqual({
            timezone: "UTC",
            targetDate: "2026-06-23",
            storedUsers: 1,
            deletedCount: 0,
            upsertedCount: 1,
        });
    });

    test("cleans up the target day when no activity exists", async () => {
        const service = await loadService();

        mockRecentListeningActivityModel.aggregate.mockResolvedValue([]);
        mockUserListeningDailyStatModel.deleteMany.mockResolvedValue({
            deletedCount: 2,
        });

        const result = await service.syncUserListeningDailyStatsForDay("__yesterday__");

        expect(mockUserListeningDailyStatModel.bulkWrite).not.toHaveBeenCalled();
        expect(result).toEqual({
            timezone: "UTC",
            targetDate: "2026-06-23",
            storedUsers: 0,
            deletedCount: 2,
            upsertedCount: 0,
        });
    });
});
