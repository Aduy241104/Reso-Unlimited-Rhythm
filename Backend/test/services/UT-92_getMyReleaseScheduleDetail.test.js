import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockScheduleFind = jest.fn();
const mockScheduleFindOne = jest.fn();
const mockTrackFindOne = jest.fn();
const mockAlbumFindOne = jest.fn();

const query = (result) => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
});

jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: { findOne: mockArtistFindOne } }));
jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: { findOne: mockTrackFindOne, find: jest.fn(), updateMany: jest.fn() },
}));
jest.unstable_mockModule("../../src/models/Album.js", () => ({
    default: { findOne: mockAlbumFindOne, find: jest.fn(), updateMany: jest.fn() },
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
const artist = { _id: artistId, name: "Artist" };

describe("UT-92 getMyReleaseScheduleDetail", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockArtistFindOne.mockReturnValue(query(artist));
        mockScheduleFind.mockReturnValue(query([]));
        mockScheduleFindOne.mockReturnValue(query({
            _id: scheduleId,
            artistId,
            type: "track",
            targetId: trackId,
            status: "scheduled",
            createdAt: new Date("2026-07-01"),
            updatedAt: new Date("2026-07-02"),
        }));
        mockTrackFindOne.mockReturnValue(query({ _id: trackId, title: "Track" }));
        mockAlbumFindOne.mockReturnValue(query({ _id: albumId, title: "Album" }));
    });

    test("UTCID01 - returns track release schedule detail", async () => {
        const result = await releaseService.getMyReleaseScheduleDetail(userId, scheduleId);

        expect(result.artist).toEqual({ id: artistId.toString(), name: "Artist" });
        expect(result.releaseSchedule).toMatchObject({ type: "track", status: "scheduled" });
        expect(result.releaseSchedule.target._id).toBe(trackId);
    });

    test("UTCID02 - returns album release schedule detail", async () => {
        mockScheduleFindOne.mockReturnValue(query({
            _id: scheduleId,
            artistId,
            type: "album",
            targetId: albumId,
            status: "scheduled",
        }));

        const result = await releaseService.getMyReleaseScheduleDetail(userId, scheduleId);

        expect(result.releaseSchedule.type).toBe("album");
        expect(result.releaseSchedule.target._id).toBe(albumId);
    });

    test("UTCID03 - throws 404 when release schedule is missing", async () => {
        mockScheduleFindOne.mockReturnValue(query(null));

        await expect(
            releaseService.getMyReleaseScheduleDetail(userId, new mongoose.Types.ObjectId())
        ).rejects.toMatchObject({ message: "Release schedule not found.", statusCode: 404 });
    });
});
