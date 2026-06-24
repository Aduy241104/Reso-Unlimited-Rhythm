import { jest } from "@jest/globals";

const userId = "507f1f77bcf86cd799439011";
const artistId = "507f1f77bcf86cd799439012";
const trackId = "507f1f77bcf86cd799439013";

const mockTrackModel = {
    findById: jest.fn(),
};

const mockRedisClient = {
    isOpen: true,
    executeIsolated: jest.fn(),
};
const mockStoreRecentListeningActivity = jest.fn();

const createTrackQuery = (result) => ({
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
});

const createIsolatedRedisClient = ({
    currentCount = "0",
    execResult = ["1717716000000-0", 1, 1],
} = {}) => {
    const transactionChain = {
        rPush: jest.fn().mockReturnThis(),
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(execResult),
    };

    return {
        watch: jest.fn().mockResolvedValue("OK"),
        get: jest.fn().mockResolvedValue(currentCount),
        unwatch: jest.fn().mockResolvedValue("OK"),
        multi: jest.fn(() => transactionChain),
        transactionChain,
    };
};

const loadListenEventService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));
    jest.unstable_mockModule("../../src/config/redisConfig.js", () => ({
        default: mockRedisClient,
    }));
    jest.unstable_mockModule(
        "../../src/services/analytics/trackStatAggregation.service.js",
        () => ({
            getAnalyticsTimezone: () => "UTC",
        })
    );
    jest.unstable_mockModule(
        "../../src/services/user/user.recentListening.service.js",
        () => ({
            storeRecentListeningActivity: mockStoreRecentListeningActivity,
        })
    );

    const { default: listenEventService } = await import(
        "../../src/services/listenEvent/listenEvent.service.js"
    );

    return { listenEventService };
};

describe("listenEventService.recordCompletedListenAttempt", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRedisClient.isOpen = true;
        mockStoreRecentListeningActivity.mockResolvedValue({ _id: "activity-1" });
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-06-07T12:00:00.000Z"));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("queues a first valid stream when the listen reaches 40 percent", async () => {
        const { listenEventService } = await loadListenEventService();
        const isolatedClient = createIsolatedRedisClient({ currentCount: "0" });

        mockTrackModel.findById.mockReturnValue(
            createTrackQuery({
                _id: trackId,
                artist_artistId: artistId,
                duration: 200,
                activeStatus: "active",
                approvalStatus: "approved",
            })
        );
        mockRedisClient.executeIsolated.mockImplementation((callback) => callback(isolatedClient));

        const result = await listenEventService.recordCompletedListenAttempt({
            userId,
            trackId,
            listenedDuration: 80,
            device: "web",
            country: "VN",
            source: "playlist",
        });

        expect(result).toEqual({
            success: true,
            isValidStream: true,
            isSkipped: false,
            listenPercent: 40,
            requiredPercent: 40,
            dailyListenOrder: 1,
            message: "Stream counted successfully.",
        });
        expect(isolatedClient.watch).toHaveBeenCalledWith(
            "valid_stream_count:2026-06-07:507f1f77bcf86cd799439011:507f1f77bcf86cd799439013"
        );
        expect(isolatedClient.transactionChain.rPush).toHaveBeenCalledWith(
            "listen_event_queue",
            expect.stringContaining('"trackId":"507f1f77bcf86cd799439013"')
        );
        expect(isolatedClient.transactionChain.incr).toHaveBeenCalledTimes(1);
        expect(isolatedClient.transactionChain.expire).toHaveBeenCalledWith(
            "valid_stream_count:2026-06-07:507f1f77bcf86cd799439011:507f1f77bcf86cd799439013",
            172800
        );
        expect(mockStoreRecentListeningActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                userId,
                artistId,
                listenedDuration: 80,
                listenPercent: 40,
                source: "playlist",
            })
        );
    });

    test("does not queue an invalid second stream when it stays under 60 percent", async () => {
        const { listenEventService } = await loadListenEventService();
        const isolatedClient = createIsolatedRedisClient({ currentCount: "1" });

        mockTrackModel.findById.mockReturnValue(
            createTrackQuery({
                _id: trackId,
                artist_artistId: artistId,
                duration: 200,
                activeStatus: "active",
                approvalStatus: "approved",
            })
        );
        mockRedisClient.executeIsolated.mockImplementation((callback) => callback(isolatedClient));

        const result = await listenEventService.recordCompletedListenAttempt({
            userId,
            trackId,
            listenedDuration: 100,
            device: "web",
        });

        expect(result).toEqual({
            success: true,
            isValidStream: false,
            isSkipped: false,
            listenPercent: 50,
            requiredPercent: 60,
            dailyListenOrder: 2,
            message: "This listen attempt did not meet the required threshold.",
        });
        expect(isolatedClient.unwatch).toHaveBeenCalledTimes(1);
        expect(isolatedClient.multi).not.toHaveBeenCalled();
    });

    test("requires the fourth valid stream in a day to reach 100 percent", async () => {
        const { listenEventService } = await loadListenEventService();
        const isolatedClient = createIsolatedRedisClient({ currentCount: "3" });

        mockTrackModel.findById.mockReturnValue(
            createTrackQuery({
                _id: trackId,
                artist_artistId: artistId,
                duration: 200,
                activeStatus: "active",
                approvalStatus: "approved",
            })
        );
        mockRedisClient.executeIsolated.mockImplementation((callback) => callback(isolatedClient));

        const result = await listenEventService.recordCompletedListenAttempt({
            userId,
            trackId,
            listenedDuration: 199,
            source: "track_detail",
        });

        expect(result).toEqual({
            success: true,
            isValidStream: false,
            isSkipped: false,
            listenPercent: 99.5,
            requiredPercent: 100,
            dailyListenOrder: 4,
            message: "This listen attempt did not meet the required threshold.",
        });
        expect(isolatedClient.multi).not.toHaveBeenCalled();
    });

    test("rejects obviously fake listened durations that exceed the allowed buffer", async () => {
        const { listenEventService } = await loadListenEventService();

        mockTrackModel.findById.mockReturnValue(
            createTrackQuery({
                _id: trackId,
                artist_artistId: artistId,
                duration: 200,
                activeStatus: "active",
                approvalStatus: "approved",
            })
        );

        await expect(
            listenEventService.recordCompletedListenAttempt({
                userId,
                trackId,
                listenedDuration: 250,
            })
        ).rejects.toMatchObject({
            message: "Listened duration exceeds the allowed playback window.",
            statusCode: 400,
        });

        expect(mockRedisClient.executeIsolated).not.toHaveBeenCalled();
    });
});
