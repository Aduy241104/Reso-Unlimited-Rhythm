import { jest } from "@jest/globals";

const artistId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439012";
const albumId = "507f1f77bcf86cd799439013";
const trackIdOne = "507f1f77bcf86cd799439021";
const trackIdTwo = "507f1f77bcf86cd799439022";
const scheduleId = "507f1f77bcf86cd799439031";

const mockAlbumModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    updateMany: jest.fn(),
    updateOne: jest.fn(),
};

const mockArtistModel = {
    findOne: jest.fn(),
};

const mockReleaseScheduleModel = {
    bulkWrite: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    exists: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
};

const mockTrackModel = {
    bulkWrite: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    updateMany: jest.fn(),
    updateOne: jest.fn(),
};

const mockNotificationService = {
    createNewReleaseNotificationForArtistFollowers: jest.fn(),
    createUpcomingReleaseNotificationForArtistFollowers: jest.fn(),
};

const createSelectLeanQuery = (result) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(result),
    }),
});

const createLeanQuery = (result) => ({
    lean: jest.fn().mockResolvedValue(result),
});

const createAlbum = (overrides = {}) => ({
    _id: albumId,
    artistId,
    title: "Album release",
    status: "draft",
    releaseDate: null,
    trackList: [
        { trackId: trackIdOne, order: 1 },
        { trackId: trackIdTwo, order: 2 },
    ],
    ...overrides,
});

const loadReleaseScheduleService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Album.js", () => ({
        default: mockAlbumModel,
    }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/ReleaseSchedule.js", () => ({
        default: mockReleaseScheduleModel,
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));
    jest.unstable_mockModule(
        "../../src/services/notification/notificationAuto.service.js",
        () => mockNotificationService
    );

    return import("../../src/services/artist.releaseSchedule.service.js");
};

describe("artistReleaseScheduleService album track synchronization", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-08-02T00:00:00.000Z"));

        mockAlbumModel.updateMany.mockResolvedValue({ modifiedCount: 1 });
        mockAlbumModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
        mockReleaseScheduleModel.bulkWrite.mockResolvedValue({ modifiedCount: 1 });
        mockTrackModel.bulkWrite.mockResolvedValue({ modifiedCount: 2 });
        mockTrackModel.updateMany.mockResolvedValue({ modifiedCount: 2 });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("uses the album schedule for album tracks that are not released", async () => {
        const scheduledAt = new Date("2026-08-10T00:00:00.000Z");
        const album = createAlbum();
        const schedule = {
            _id: scheduleId,
            type: "album",
            targetId: albumId,
            artistId,
            scheduledAt,
            status: "scheduled",
            releasedAt: null,
        };

        mockArtistModel.findOne.mockReturnValue(
            createSelectLeanQuery({ _id: artistId, name: "Artist" })
        );
        mockAlbumModel.findOne.mockReturnValue(createLeanQuery(album));
        mockReleaseScheduleModel.findOne.mockReturnValue(createLeanQuery(null));
        mockReleaseScheduleModel.create.mockResolvedValue(schedule);

        const { default: service } = await loadReleaseScheduleService();

        await service.createMyReleaseSchedule(userId, {
            type: "album",
            targetId: albumId,
            publishMode: "scheduled",
            scheduledAt,
        });

        expect(mockTrackModel.updateMany).toHaveBeenCalledWith(
            {
                _id: { $in: [trackIdOne, trackIdTwo] },
                releaseStatus: { $ne: "released" },
                activeStatus: { $ne: "blocked" },
            },
            {
                $set: {
                    releaseDate: scheduledAt,
                    releaseStatus: "scheduled",
                    releasedAt: null,
                    activeStatus: "hidden",
                },
            }
        );
    });

    test("releases eligible unreleased tracks at the album scheduled time", async () => {
        const scheduledAt = new Date("2026-08-01T00:00:00.000Z");
        const album = createAlbum({ releaseDate: scheduledAt });
        const dueSchedule = {
            _id: scheduleId,
            type: "album",
            targetId: albumId,
            artistId,
            scheduledAt,
        };

        mockReleaseScheduleModel.find.mockReturnValue(
            createSelectLeanQuery([dueSchedule])
        );
        mockAlbumModel.find.mockReturnValue(createSelectLeanQuery([album]));

        const { publishDueReleaseSchedules } = await loadReleaseScheduleService();

        const result = await publishDueReleaseSchedules();

        expect(mockTrackModel.bulkWrite).toHaveBeenCalledWith([
            {
                updateMany: {
                    filter: {
                        _id: { $in: [trackIdOne, trackIdTwo] },
                        approvalStatus: "approved",
                        activeStatus: { $ne: "blocked" },
                        releaseStatus: { $ne: "released" },
                    },
                    update: {
                        $set: {
                            activeStatus: "active",
                            releaseDate: scheduledAt,
                            releaseStatus: "released",
                            releasedAt: scheduledAt,
                            hiddenReason: "",
                            hiddenAt: null,
                        },
                    },
                },
            },
        ]);
        expect(mockReleaseScheduleModel.bulkWrite).toHaveBeenCalledWith([
            {
                updateOne: {
                    filter: {
                        _id: scheduleId,
                        status: "scheduled",
                    },
                    update: {
                        $set: {
                            status: "released",
                            releasedAt: scheduledAt,
                        },
                    },
                },
            },
        ]);
        expect(result).toEqual({ updatedCount: 1 });
    });
});
