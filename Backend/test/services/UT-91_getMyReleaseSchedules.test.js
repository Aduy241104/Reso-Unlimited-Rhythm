import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockScheduleFind = jest.fn();
const mockScheduleCount = jest.fn();
const mockTrackFind = jest.fn();
const mockAlbumFind = jest.fn();

let listedSchedules;
let listQuery;

const basicQuery = (result) => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
});

const pagedQuery = (result) => {
    const query = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(result),
    };
    listQuery = query;
    return query;
};

jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: { findOne: mockArtistFindOne },
}));
jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: { find: mockTrackFind, updateMany: jest.fn(), updateOne: jest.fn() },
}));
jest.unstable_mockModule("../../src/models/Album.js", () => ({
    default: { find: mockAlbumFind, updateMany: jest.fn(), updateOne: jest.fn() },
}));
jest.unstable_mockModule("../../src/models/ReleaseSchedule.js", () => ({
    default: {
        find: mockScheduleFind,
        countDocuments: mockScheduleCount,
        bulkWrite: jest.fn(),
    },
}));
jest.unstable_mockModule(
    "../../src/services/notification/notificationAuto.service.js",
    () => ({
        createNewReleaseNotificationForArtistFollowers: jest.fn(),
        createUpcomingReleaseNotificationForArtistFollowers: jest.fn(),
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
            status: schedule.status,
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

const trackSchedule = {
    _id: new mongoose.Types.ObjectId(),
    artistId,
    type: "track",
    targetId: trackId,
    status: "scheduled",
    scheduledAt: new Date("2026-12-01T00:00:00.000Z"),
};

describe("UT-91 getMyReleaseSchedules", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        listedSchedules = [trackSchedule];
        mockArtistFindOne.mockReturnValue(basicQuery(artist));
        mockScheduleFind.mockImplementation((filter) =>
            filter?.scheduledAt?.$lte ? basicQuery([]) : pagedQuery(listedSchedules)
        );
        mockScheduleCount.mockResolvedValue(1);
        mockTrackFind.mockReturnValue(
            basicQuery([{ _id: trackId, title: "Track", artist_artistId: artistId }])
        );
        mockAlbumFind.mockReturnValue(basicQuery([]));
    });

    test("UTCID01 - returns upcoming scheduled tracks with pagination", async () => {
        const result = await releaseService.getMyReleaseSchedules(userId, {
            page: 1,
            limit: 10,
            scope: "upcoming",
            status: "scheduled",
            type: "track",
        });

        expect(result.releaseSchedules).toHaveLength(1);
        expect(result.pagination).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
        expect(result.filters).toEqual({ scope: "upcoming", status: "scheduled", type: "track" });
    });

    test("UTCID02 - applies page 2 and limit 5", async () => {
        mockScheduleCount.mockResolvedValue(8);

        const result = await releaseService.getMyReleaseSchedules(userId, {
            page: 2,
            limit: 5,
        });

        expect(listQuery.skip).toHaveBeenCalledWith(5);
        expect(listQuery.limit).toHaveBeenCalledWith(5);
        expect(result.pagination.totalPages).toBe(2);
    });

    test("UTCID03 - returns album schedules for all scope", async () => {
        listedSchedules = [{
            _id: new mongoose.Types.ObjectId(),
            artistId,
            type: "album",
            targetId: albumId,
            status: "scheduled",
        }];
        mockAlbumFind.mockReturnValue(
            basicQuery([{ _id: albumId, title: "Album", artistId }])
        );

        const result = await releaseService.getMyReleaseSchedules(userId, {
            scope: "all",
            type: "album",
        });

        expect(result.releaseSchedules[0].type).toBe("album");
        expect(result.filters).toEqual({ scope: "all", status: null, type: "album" });
    });

    test("UTCID04 - applies the released status filter", async () => {
        listedSchedules = [];
        mockScheduleCount.mockResolvedValue(0);

        const result = await releaseService.getMyReleaseSchedules(userId, {
            scope: "all",
            status: "released",
        });

        expect(result.filters.status).toBe("released");
        expect(result.releaseSchedules).toEqual([]);
    });

    test("UTCID05 - returns an empty list with zero pages", async () => {
        listedSchedules = [];
        mockScheduleCount.mockResolvedValue(0);

        const result = await releaseService.getMyReleaseSchedules(userId, {});

        expect(result.releaseSchedules).toEqual([]);
        expect(result.pagination.totalPages).toBe(0);
    });

    test("UTCID06 - throws 404 when artist profile does not exist", async () => {
        mockArtistFindOne.mockReturnValue(basicQuery(null));

        await expect(releaseService.getMyReleaseSchedules(userId, {})).rejects.toMatchObject({
            message: "Artist profile not found.",
            statusCode: 404,
        });
    });
});
