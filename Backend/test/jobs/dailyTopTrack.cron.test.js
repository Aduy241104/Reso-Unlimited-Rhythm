import { jest } from "@jest/globals";

const mockSchedule = jest.fn();
const mockSyncTrackAnalyticsForDay = jest.fn();

const loadDailyTopTrackCron = async () => {
    jest.resetModules();

    jest.unstable_mockModule("node-cron", () => ({
        default: {
            schedule: mockSchedule,
        },
    }));
    jest.unstable_mockModule(
        "../../src/services/analytics/trackStatAggregation.service.js",
        () => ({
            getAnalyticsTimezone: () => "UTC",
            syncTrackAnalyticsForDay: mockSyncTrackAnalyticsForDay,
        })
    );

    return import("../../src/jobs/dailyTopTrack.cron.js");
};

describe("dailyTopTrack cron", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSyncTrackAnalyticsForDay.mockResolvedValue({
            targetDate: "2026-06-07",
            daily: { matchedTracks: 1 },
            ranking: { storedTracks: 1 },
        });
    });

    test("rebuilds yesterday track stats before storing daily rankings", async () => {
        const { runDailyTopTrackAggregation } = await loadDailyTopTrackCron();

        const result = await runDailyTopTrackAggregation();

        expect(mockSyncTrackAnalyticsForDay).toHaveBeenCalledWith("__yesterday__");
        expect(result).toEqual({
            targetDate: "2026-06-07",
            daily: { matchedTracks: 1 },
            ranking: { storedTracks: 1 },
        });
    });
});
