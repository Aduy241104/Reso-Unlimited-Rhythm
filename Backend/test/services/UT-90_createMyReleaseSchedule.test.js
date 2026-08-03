import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockTrackFindOne = jest.fn();
const mockTrackUpdateOne = jest.fn();
const mockAlbumFindOne = jest.fn();
const mockAlbumUpdateOne = jest.fn();
const mockScheduleFindOne = jest.fn();
const mockScheduleExists = jest.fn();
const mockScheduleCreate = jest.fn();
const mockUpcomingNotification = jest.fn();
const mockNewReleaseNotification = jest.fn();

const query = (result) => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
});

jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: { findOne: mockArtistFindOne },
}));
jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: { findOne: mockTrackFindOne, updateOne: mockTrackUpdateOne, find: jest.fn() },
}));
jest.unstable_mockModule("../../src/models/Album.js", () => ({
    default: { findOne: mockAlbumFindOne, updateOne: mockAlbumUpdateOne, find: jest.fn() },
}));
jest.unstable_mockModule("../../src/models/ReleaseSchedule.js", () => ({
    default: {
        findOne: mockScheduleFindOne,
        exists: mockScheduleExists,
        create: mockScheduleCreate,
        find: jest.fn(),
    },
}));
jest.unstable_mockModule(
    "../../src/services/notification/notificationAuto.service.js",
    () => ({
        createNewReleaseNotificationForArtistFollowers: mockNewReleaseNotification,
        createUpcomingReleaseNotificationForArtistFollowers: mockUpcomingNotification,
    })
);
jest.unstable_mockModule(
    "../../src/services/artistBrowse/artistBrowse.helper.js",
    () => ({
        normalizePositiveInteger: (value, fallback) => {
            const parsed = Number.parseInt(value, 10);
            return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
        },
        formatArtistComingRelease: ({ schedule, target }) => ({
            id: String(schedule._id),
            type: schedule.type,
            targetId: String(schedule.targetId),
            status: schedule.status,
            scheduledAt: schedule.scheduledAt,
            releasedAt: schedule.releasedAt || null,
            target,
        }),
    })
);

const releaseService = (
    await import("../../src/services/artist.releaseSchedule.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const trackId = new mongoose.Types.ObjectId();
const albumId = new mongoose.Types.ObjectId();

const artist = { _id: artistId, name: "Artist" };
const approvedTrack = {
    _id: trackId,
    title: "Track",
    artist_artistId: artistId,
    approvalStatus: "approved",
    activeStatus: "hidden",
    releaseStatus: "unreleased",
    releasedAt: null,
};
const validAlbum = {
    _id: albumId,
    title: "Album",
    artistId,
    status: "draft",
    trackList: [{ trackId: new mongoose.Types.ObjectId() }, { trackId }],
};

describe("UT-90 createMyReleaseSchedule", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockArtistFindOne.mockReturnValue(query(artist));
        mockTrackFindOne.mockReturnValue(query(approvedTrack));
        mockAlbumFindOne.mockReturnValue(query(validAlbum));
        mockScheduleExists.mockResolvedValue(false);
        mockScheduleFindOne.mockReturnValue(query(null));
        mockScheduleCreate.mockImplementation(async (data) => ({
            _id: new mongoose.Types.ObjectId(),
            ...data,
        }));
        mockTrackUpdateOne.mockResolvedValue({ modifiedCount: 1 });
        mockAlbumUpdateOne.mockResolvedValue({ modifiedCount: 1 });
        mockUpcomingNotification.mockResolvedValue(undefined);
        mockNewReleaseNotification.mockResolvedValue(undefined);
    });

    test("UTCID01 - creates a scheduled track release", async () => {
        const scheduledAt = "2026-07-20T10:00:00.000Z";
        const result = await releaseService.createMyReleaseSchedule(userId, {
            publishMode: "scheduled",
            type: "track",
            targetId: trackId,
            scheduledAt,
        });

        expect(result.releaseSchedule.status).toBe("scheduled");
        expect(mockScheduleCreate).toHaveBeenCalledWith(
            expect.objectContaining({ type: "track", targetId: trackId, status: "scheduled" })
        );
        expect(mockTrackUpdateOne).toHaveBeenCalled();
        expect(mockUpcomingNotification).toHaveBeenCalled();
    });

    test("UTCID02 - creates an immediate released track schedule", async () => {
        const result = await releaseService.createMyReleaseSchedule(userId, {
            publishMode: "immediate",
            type: "track",
            targetId: trackId,
        });

        expect(result.releaseSchedule.status).toBe("released");
        expect(mockTrackUpdateOne).toHaveBeenCalledTimes(2);
        expect(mockNewReleaseNotification).toHaveBeenCalled();
    });

    test("UTCID03 - creates a scheduled album release", async () => {
        const result = await releaseService.createMyReleaseSchedule(userId, {
            publishMode: "scheduled",
            type: "album",
            targetId: albumId,
            scheduledAt: "2026-07-20T10:00:00.000Z",
        });

        expect(result.releaseSchedule.type).toBe("album");
        expect(result.releaseSchedule.status).toBe("scheduled");
        expect(mockAlbumUpdateOne).toHaveBeenCalled();
    });

    test("UTCID04 - throws 404 when artist profile does not exist", async () => {
        mockArtistFindOne.mockReturnValue(query(null));

        await expect(
            releaseService.createMyReleaseSchedule(userId, {
                type: "track",
                targetId: trackId,
                scheduledAt: "2026-07-20T10:00:00.000Z",
            })
        ).rejects.toMatchObject({ message: "Artist profile not found.", statusCode: 404 });
    });

    test("UTCID05 - throws 404 when track target is missing", async () => {
        mockTrackFindOne.mockReturnValue(query(null));

        await expect(
            releaseService.createMyReleaseSchedule(userId, {
                type: "track",
                targetId: trackId,
                scheduledAt: "2026-07-20T10:00:00.000Z",
            })
        ).rejects.toMatchObject({ message: "Track not found for this artist.", statusCode: 404 });
    });

    test("UTCID06 - throws 409 when track is not approved", async () => {
        mockTrackFindOne.mockReturnValue(query({ ...approvedTrack, approvalStatus: "pending" }));

        await expect(
            releaseService.createMyReleaseSchedule(userId, {
                type: "track",
                targetId: trackId,
                scheduledAt: "2026-07-20T10:00:00.000Z",
            })
        ).rejects.toMatchObject({
            message: "Track must be approved before it can be released.",
            statusCode: 409,
        });
    });

    test("UTCID07 - throws 400 when scheduled date is invalid", async () => {
        await expect(
            releaseService.createMyReleaseSchedule(userId, {
                type: "track",
                targetId: trackId,
                scheduledAt: "invalid-date",
            })
        ).rejects.toMatchObject({ message: "Scheduled date is invalid.", statusCode: 400 });
    });

    test("UTCID08 - throws 409 when a scheduled release already exists", async () => {
        mockScheduleFindOne.mockReturnValue(query({ _id: new mongoose.Types.ObjectId() }));

        await expect(
            releaseService.createMyReleaseSchedule(userId, {
                type: "track",
                targetId: trackId,
                scheduledAt: "2026-07-20T10:00:00.000Z",
            })
        ).rejects.toMatchObject({
            message: "A scheduled release already exists for this item.",
            statusCode: 409,
        });
    });
});
