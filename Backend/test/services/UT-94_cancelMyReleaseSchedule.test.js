import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockScheduleFind = jest.fn();
const mockScheduleFindOne = jest.fn();
const mockTrackFindOne = jest.fn();
const mockTrackUpdateOne = jest.fn();

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
    default: { findOne: jest.fn(), find: jest.fn(), updateOne: jest.fn(), updateMany: jest.fn() },
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

const createSchedule = (status = "scheduled") => ({
    _id: scheduleId,
    artistId,
    type: "track",
    targetId: trackId,
    status,
    scheduledAt: new Date("2026-08-10T10:00:00.000Z"),
    releasedAt: null,
    save: jest.fn(async function save() { return this; }),
});

describe("UT-94 cancelMyReleaseSchedule", () => {
    let schedule;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-15T00:00:00.000Z"));
        schedule = createSchedule();
        mockArtistFindOne.mockReturnValue(query({ _id: artistId, name: "Artist" }));
        mockScheduleFind.mockReturnValue(query([]));
        mockScheduleFindOne
            .mockReturnValueOnce(query(schedule))
            .mockReturnValueOnce(query(null));
        mockTrackFindOne.mockReturnValue(query({
            _id: trackId,
            title: "Track",
            releaseDate: schedule.scheduledAt,
        }));
        mockTrackUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    });

    afterEach(() => jest.useRealTimers());

    test("UTCID01 - cancels a scheduled release and returns artist information", async () => {
        const result = await releaseService.cancelMyReleaseSchedule(userId, scheduleId);

        expect(schedule.status).toBe("cancelled");
        expect(schedule.releasedAt).toBeNull();
        expect(schedule.save).toHaveBeenCalledTimes(1);
        expect(result.artist).toEqual({ id: artistId.toString(), name: "Artist" });
        expect(result.releaseSchedule.status).toBe("cancelled");
        expect(mockTrackUpdateOne).toHaveBeenCalled();
    });

    test("UTCID02 - throws 404 when release schedule is missing", async () => {
        mockScheduleFindOne.mockReset();
        mockScheduleFindOne.mockReturnValue(query(null));

        await expect(
            releaseService.cancelMyReleaseSchedule(userId, new mongoose.Types.ObjectId())
        ).rejects.toMatchObject({ message: "Release schedule not found.", statusCode: 404 });
    });

    test("UTCID03 - throws 409 when schedule is already cancelled", async () => {
        schedule = createSchedule("cancelled");
        mockScheduleFindOne.mockReset();
        mockScheduleFindOne.mockReturnValue(query(schedule));

        await expect(
            releaseService.cancelMyReleaseSchedule(userId, scheduleId)
        ).rejects.toMatchObject({
            message: "Release schedule has already been cancelled.",
            statusCode: 409,
        });
    });
});
