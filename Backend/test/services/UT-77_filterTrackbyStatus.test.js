import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockTrackFind = jest.fn();
const mockTrackCountDocuments = jest.fn();

const MockTrack = jest.fn();
MockTrack.find = mockTrackFind;
MockTrack.countDocuments = mockTrackCountDocuments;

const createTrackListQuery = () => {
    const query = {
        sort: jest.fn(),
        skip: jest.fn(),
        limit: jest.fn(),
        populate: jest.fn(),
        lean: jest.fn(async () => []),
    };
    query.sort.mockReturnValue(query);
    query.skip.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.populate.mockReturnValue(query);
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
    formatTrackManagementDetail: jest.fn((track) => track),
}));

const artistTrackService = (
    await import("../../src/services/Track/artist/artist.track.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();

describe("UT-77 filterTrackbyStatus", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockArtistFindOne.mockResolvedValue({ _id: artistId });
        mockTrackFind.mockImplementation(() => createTrackListQuery());
        mockTrackCountDocuments.mockResolvedValue(0);
    });

    test.each([
        ["UTCID01", "draft"],
        ["UTCID02", "active"],
        ["UTCID03", "hidden"],
        ["UTCID04", "blocked"],
    ])("%s - filters tracks by activeStatus=%s", async (_id, activeStatus) => {
        const result = await artistTrackService.getArtistTracks(userId, {
            activeStatus,
        });

        expect(mockTrackFind).toHaveBeenCalledWith({
            artist_artistId: artistId,
            activeStatus,
        });
        expect(result.tracks).toEqual([]);
    });

    test.each([
        ["UTCID05", "draft"],
        ["UTCID06", "pending"],
        ["UTCID07", "approved"],
        ["UTCID08", "rejected"],
    ])(
        "%s - filters tracks by approvalStatus=%s",
        async (_id, approvalStatus) => {
            const result = await artistTrackService.getArtistTracks(userId, {
                approvalStatus,
            });

            expect(mockTrackFind).toHaveBeenCalledWith({
                artist_artistId: artistId,
                approvalStatus,
            });
            expect(result.tracks).toEqual([]);
        }
    );
});
