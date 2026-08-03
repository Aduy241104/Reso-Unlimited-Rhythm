import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockScheduleFind = jest.fn();
const mockScheduleFindOne = jest.fn();
const mockTrackFindOne = jest.fn();
const mockTrackUpdateOne = jest.fn();
const mockAlbumFindOne = jest.fn();
const mockAlbumUpdateOne = jest.fn();

const query = (result) => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
});

jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: { findOne: mockArtistFindOne } }));
jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: {
        findOne: mockTrackFindOne,
        find: jest.fn(),
        updateOne: mockTrackUpdateOne,
        updateMany: jest.fn(),
    },
}));
jest.unstable_mockModule("../../src/models/Album.js", () => ({
    default: {
        findOne: mockAlbumFindOne,
        find: jest.fn(),
        updateOne: mockAlbumUpdateOne,
        updateMany: jest.fn(),
    },
}));
jest.unstable_mockModule("../../src/models/ReleaseSchedule.js", () => ({
    default: { find: mockScheduleFind, findOne: mockScheduleFindOne, bulkWrite: jest.fn() },
}));
jest.unstable_mockModule("../../src/services/notification/notificationAuto.service.js", () => ({
    createNewReleaseNotificationForArtistFollowers: jest.fn(),
    createUpcomingReleaseNotificationForArtistFollowers: jest.fn(),
}));
jest.unstable_mockModule("../../src/services/artistBrowse/artistBrowse.helper.js", () => ({
    normalizePositiveInteger: (value, fallback) => Number(value) > 0 ? Number(value) : fallback,
    formatArtistComingRelease: ({ schedule, target }) => ({
        id: String(schedule._id),
        type: schedule.type,
        status: schedule.status,
        scheduledAt: schedule.scheduledAt,
        target,
    }),
}));

const releaseService = (
    await import("../../src/services/artist.releaseSchedule.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const scheduleId = new mongoose.Types.ObjectId();
const trackId = new mongoose.Types.ObjectId();
const albumId = new mongoose.Types.ObjectId();

const createSchedule = (overrides = {}) => ({
    _id: scheduleId,
    artistId,
    type: "track",
    targetId: trackId,
    status: "scheduled",
    scheduledAt: new Date("2026-07-25T10:00:00.000Z"),
    releasedAt: null,
    createdAt: new Date("2026-07-01"),
    updatedAt: new Date("2026-07-02"),
    save: jest.fn(async function save() { return this; }),
    ...overrides,
});

describe("UT-93 updateMyReleaseSchedule", () => {
    let schedule;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-15T00:00:00.000Z"));
        schedule = createSchedule();
        mockArtistFindOne.mockReturnValue(query({ _id: artistId, name: "Artist" }));
        mockScheduleFind.mockReturnValue(query([]));
        mockScheduleFindOne.mockReturnValue(query(schedule));
        mockTrackFindOne.mockReturnValue(query({
            _id: trackId,
            title: "Track",
            releaseStatus: "unreleased",
        }));
        mockAlbumFindOne.mockReturnValue(query({ _id: albumId, title: "Album" }));
        mockTrackUpdateOne.mockResolvedValue({ modifiedCount: 1 });
        mockAlbumUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    });

    afterEach(() => jest.useRealTimers());

    test("UTCID01 - updates a track release schedule date", async () => {
        const result = await releaseService.updateMyReleaseSchedule(userId, scheduleId, {
            scheduledAt: "2026-08-01T10:00:00.000Z",
        });

        expect(schedule.scheduledAt).toEqual(new Date("2026-08-01T10:00:00.000Z"));
        expect(schedule.save).toHaveBeenCalledTimes(1);
        expect(mockTrackUpdateOne).toHaveBeenCalled();
        expect(result.releaseSchedule.type).toBe("track");
    });

    test("UTCID02 - updates an album release schedule date", async () => {
        schedule = createSchedule({ type: "album", targetId: albumId });
        mockScheduleFindOne.mockReturnValue(query(schedule));

        const result = await releaseService.updateMyReleaseSchedule(userId, scheduleId, {
            scheduledAt: "2026-08-01T10:00:00.000Z",
        });

        expect(mockAlbumUpdateOne).toHaveBeenCalled();
        expect(result.releaseSchedule.type).toBe("album");
    });

    test("UTCID03 - throws 404 when release schedule is missing", async () => {
        mockScheduleFindOne.mockReturnValue(query(null));

        await expect(
            releaseService.updateMyReleaseSchedule(userId, scheduleId, {
                scheduledAt: "2026-08-01T10:00:00.000Z",
            })
        ).rejects.toMatchObject({ message: "Release schedule not found.", statusCode: 404 });
    });

    test("UTCID04 - throws 409 when schedule was cancelled", async () => {
        schedule = createSchedule({ status: "cancelled" });
        mockScheduleFindOne.mockReturnValue(query(schedule));

        await expect(
            releaseService.updateMyReleaseSchedule(userId, scheduleId, {
                scheduledAt: "2026-08-01T10:00:00.000Z",
            })
        ).rejects.toMatchObject({
            message: "Cancelled schedules cannot be edited.",
            statusCode: 409,
        });
    });

    test("UTCID05 - throws 400 when new scheduled date is invalid", async () => {
        await expect(
            releaseService.updateMyReleaseSchedule(userId, scheduleId, {
                scheduledAt: "invalid-date",
            })
        ).rejects.toMatchObject({ message: "Scheduled date is invalid.", statusCode: 400 });
    });
});
