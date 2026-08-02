import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockTrackFindOne = jest.fn();
const mockFormatTrackManagementDetail = jest.fn((track) => track);

const MockTrack = jest.fn();
MockTrack.findOne = mockTrackFindOne;

const createLeanPopulateQuery = (result) => {
    const query = {
        populate: jest.fn(),
        lean: jest.fn(async () => result),
    };
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
    formatTrackManagementDetail: mockFormatTrackManagementDetail,
}));

const artistTrackService = (
    await import("../../src/services/Track/artist/artist.track.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const trackId = new mongoose.Types.ObjectId();
const trackDetail = {
    _id: trackId,
    title: "Track detail",
    artist_artistId: { _id: artistId, name: "Artist" },
    genreIds: [],
};

const expectAppError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe("UT-76 getArtistTrackDetail", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockArtistFindOne.mockResolvedValue({ _id: artistId });
        mockTrackFindOne.mockImplementation(() =>
            createLeanPopulateQuery(trackDetail)
        );
    });

    test("UTCID01 - returns complete detail for an owned track", async () => {
        const result = await artistTrackService.getArtistTrackDetail(
            userId,
            trackId
        );

        expect(mockTrackFindOne).toHaveBeenCalledWith({
            _id: trackId,
            artist_artistId: artistId,
        });
        expect(mockFormatTrackManagementDetail).toHaveBeenCalledWith(trackDetail);
        expect(result).toBe(trackDetail);
    });

    test("UTCID02 - throws 400 when track ID is invalid", async () => {
        await expectAppError(
            artistTrackService.getArtistTrackDetail(userId, "invalid-id"),
            "Track id is invalid.",
            400
        );

        expect(mockTrackFindOne).not.toHaveBeenCalled();
    });

    test("UTCID03 - throws 404 when no artist profile matches the user ID", async () => {
        mockArtistFindOne.mockResolvedValue(null);

        await expectAppError(
            artistTrackService.getArtistTrackDetail(
                "invalid-user-id",
                trackId
            ),
            "Artist profile not found.",
            404
        );

        expect(mockTrackFindOne).not.toHaveBeenCalled();
    });

    test("UTCID04 - throws 404 when track is missing or not owned by artist", async () => {
        mockTrackFindOne.mockImplementation(() =>
            createLeanPopulateQuery(null)
        );

        await expectAppError(
            artistTrackService.getArtistTrackDetail(userId, trackId),
            "Track not found or you do not have permission to view it.",
            404
        );
    });
});
