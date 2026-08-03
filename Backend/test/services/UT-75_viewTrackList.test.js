import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockTrackFind = jest.fn();
const mockTrackCountDocuments = jest.fn();
const mockFormatTrackManagementDetail = jest.fn((track) => track);

const MockTrack = jest.fn();
MockTrack.find = mockTrackFind;
MockTrack.countDocuments = mockTrackCountDocuments;

let latestQuery;

const createTrackListQuery = (result) => {
    const query = {
        sort: jest.fn(),
        skip: jest.fn(),
        limit: jest.fn(),
        populate: jest.fn(),
        lean: jest.fn(async () => result),
    };
    query.sort.mockReturnValue(query);
    query.skip.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.populate.mockReturnValue(query);
    latestQuery = query;
    return query;
};

jest.unstable_mockModule("../../src/models/User.js", () => ({
    default: { findById: jest.fn() },
}));

jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: { findOne: mockArtistFindOne },
}));

jest.unstable_mockModule("../../src/models/Album.js", () => ({
    default: { findById: jest.fn() },
}));

jest.unstable_mockModule("../../src/models/Genre.js", () => ({
    default: { countDocuments: jest.fn() },
}));

jest.unstable_mockModule("../../src/models/ReleaseSchedule.js", () => ({
    default: { exists: jest.fn() },
}));

jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: MockTrack,
}));

jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
    deleteCloudinaryAssetsByUrls: jest.fn(),
}));

jest.unstable_mockModule("../../src/services/Track/track.helper.js", () => ({
    formatTrackManagementDetail: mockFormatTrackManagementDetail,
}));

const artistTrackService = (
    await import("../../src/services/Track/artist/artist.track.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const tracks = [
    { _id: new mongoose.Types.ObjectId(), title: "Track A" },
    { _id: new mongoose.Types.ObjectId(), title: "Track B" },
];

describe("UT-75 viewTrackList", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        latestQuery = undefined;
        mockArtistFindOne.mockResolvedValue({ _id: artistId });
        mockTrackFind.mockImplementation(() => createTrackListQuery(tracks));
        mockTrackCountDocuments.mockResolvedValue(2);
    });

    test("UTCID01 - returns the first page with default pagination", async () => {
        const result = await artistTrackService.getArtistTracks(userId, {});

        expect(result.tracks).toEqual(tracks);
        expect(result.pagination).toEqual({
            page: 1,
            limit: 50,
            total: 2,
            totalPages: 1,
        });
        expect(latestQuery.skip).toHaveBeenCalledWith(0);
        expect(latestQuery.limit).toHaveBeenCalledWith(50);
    });

    test("UTCID02 - returns page 2 with the correct skip", async () => {
        const result = await artistTrackService.getArtistTracks(userId, {
            page: 2,
        });

        expect(result.pagination.page).toBe(2);
        expect(latestQuery.skip).toHaveBeenCalledWith(50);
    });

    test("UTCID03 - normalizes a negative page to page 1", async () => {
        const result = await artistTrackService.getArtistTracks(userId, {
            page: -1,
        });

        expect(result.pagination.page).toBe(1);
        expect(latestQuery.skip).toHaveBeenCalledWith(0);
    });

    test("UTCID04 - applies limit 50", async () => {
        const result = await artistTrackService.getArtistTracks(userId, {
            limit: 50,
        });

        expect(result.pagination.limit).toBe(50);
        expect(latestQuery.limit).toHaveBeenCalledWith(50);
    });

    test("UTCID05 - normalizes limit 0 to the default limit", async () => {
        const result = await artistTrackService.getArtistTracks(userId, {
            limit: 0,
        });

        expect(result.pagination.limit).toBe(50);
        expect(latestQuery.limit).toHaveBeenCalledWith(50);
    });

    test.each([
        ["UTCID06", "draft"],
        ["UTCID07", "active"],
        ["UTCID08", "hidden"],
        ["UTCID09", "blocked"],
    ])(
        "%s - filters the artist track list by activeStatus=%s",
        async (_id, activeStatus) => {
            await artistTrackService.getArtistTracks(userId, { activeStatus });

            expect(mockTrackFind).toHaveBeenCalledWith({
                artist_artistId: artistId,
                activeStatus,
            });
        }
    );

    test.each([
        ["UTCID10", "draft"],
        ["UTCID11", "pending"],
        ["UTCID12", "approved"],
    ])(
        "%s - filters the artist track list by approvalStatus=%s",
        async (_id, approvalStatus) => {
            await artistTrackService.getArtistTracks(userId, {
                approvalStatus,
            });

            expect(mockTrackFind).toHaveBeenCalledWith({
                artist_artistId: artistId,
                approvalStatus,
            });
        }
    );
});
