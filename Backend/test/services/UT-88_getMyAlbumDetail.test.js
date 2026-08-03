import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockAlbumFindOne = jest.fn();
const mockTrackFind = jest.fn();
const mockEnrichAlbumWithTotalDuration = jest.fn();
const mockFormatAlbumDetail = jest.fn((album) => album);

const MockAlbum = jest.fn();
MockAlbum.findOne = mockAlbumFindOne;
const MockTrack = jest.fn();
MockTrack.find = mockTrackFind;

const createAlbumQuery = (result) => {
    const query = { populate: jest.fn(), lean: jest.fn(async () => result) };
    query.populate.mockReturnValue(query);
    return query;
};

const createTrackQuery = (result) => {
    const query = {
        select: jest.fn(),
        populate: jest.fn(),
        lean: jest.fn(async () => result),
    };
    query.select.mockReturnValue(query);
    query.populate.mockReturnValue(query);
    return query;
};

jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: { findOne: mockArtistFindOne },
}));
jest.unstable_mockModule("../../src/models/Album.js", () => ({ default: MockAlbum }));
jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: MockTrack }));
jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
    uploadToCloudinary: jest.fn(),
    deleteCloudinaryAssetByUrl: jest.fn(),
}));
jest.unstable_mockModule("../../src/services/album/album.helper.js", () => ({
    formatAlbumItem: jest.fn((album) => album),
    formatAlbumDetail: mockFormatAlbumDetail,
}));
jest.unstable_mockModule("../../src/services/album/album.sync.js", () => ({
    enrichAlbumWithTotalDuration: mockEnrichAlbumWithTotalDuration,
    enrichAlbumsWithTotalDuration: jest.fn(),
    syncAlbumTotalDuration: jest.fn(),
}));

const artistAlbumService = (
    await import("../../src/services/artist/artist.album.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const albumId = new mongoose.Types.ObjectId();
const trackId = new mongoose.Types.ObjectId();

const createAlbum = (trackList = [{ trackId: { _id: trackId, duration: 180 }, order: 1 }]) => ({
    _id: albumId,
    title: "Album Detail",
    artistId: { _id: artistId, name: "Artist" },
    trackList,
    totalDuration: 0,
});

const expectAppError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe("UT-88 getMyAlbumDetail", () => {
    let album;

    beforeEach(() => {
        jest.clearAllMocks();
        album = createAlbum();
        mockArtistFindOne.mockResolvedValue({ _id: artistId });
        mockAlbumFindOne.mockImplementation(() => createAlbumQuery(album));
        mockTrackFind.mockImplementation(() => createTrackQuery([]));
        mockEnrichAlbumWithTotalDuration.mockImplementation(async (item) => {
            item.totalDuration = (item.trackList || []).reduce(
                (sum, entry) => sum + Number(entry.trackId?.duration || 0),
                0
            );
        });
    });

    test("UTCID01 - returns complete album detail and calculated duration", async () => {
        const result = await artistAlbumService.getMyAlbumDetail(userId, albumId);

        expect(result).toBe(album);
        expect(result.totalDuration).toBe(180);
        expect(mockFormatAlbumDetail).toHaveBeenCalledWith(album);
    });

    test("UTCID02 - returns an empty track list with zero duration", async () => {
        album = createAlbum([]);
        mockAlbumFindOne.mockImplementation(() => createAlbumQuery(album));

        const result = await artistAlbumService.getMyAlbumDetail(userId, albumId);

        expect(result.trackList).toEqual([]);
        expect(result.totalDuration).toBe(0);
    });

    test("UTCID03 - throws 400 for an invalid album ID", async () => {
        await expectAppError(
            artistAlbumService.getMyAlbumDetail(userId, "invalid-id"),
            "Album id is invalid.",
            400
        );
    });

    test("UTCID04 - throws 404 when album is missing", async () => {
        mockAlbumFindOne.mockImplementation(() => createAlbumQuery(null));

        await expectAppError(
            artistAlbumService.getMyAlbumDetail(userId, albumId),
            "Album not found.",
            404
        );
    });

    test("UTCID05 - appends orphan tracks after listed tracks", async () => {
        const orphanId = new mongoose.Types.ObjectId();
        mockTrackFind.mockImplementation(() =>
            createTrackQuery([{ _id: orphanId, title: "Orphan", duration: 90 }])
        );

        const result = await artistAlbumService.getMyAlbumDetail(userId, albumId);

        expect(result.trackList).toHaveLength(2);
        expect(result.trackList[1]).toMatchObject({ order: 2 });
        expect(result.trackList[1].trackId._id).toBe(orphanId);
        expect(result.totalDuration).toBe(270);
    });

    test("UTCID06 - excludes null references from the orphan lookup", async () => {
        album = createAlbum([
            { trackId: null, order: 1 },
            { trackId: { _id: trackId, duration: 180 }, order: 2 },
        ]);
        mockAlbumFindOne.mockImplementation(() => createAlbumQuery(album));

        await artistAlbumService.getMyAlbumDetail(userId, albumId);

        expect(mockTrackFind).toHaveBeenCalledWith({
            album_albumId: albumId,
            _id: { $nin: [trackId] },
        });
    });

    test("UTCID07 - throws 404 when artist profile does not exist", async () => {
        mockArtistFindOne.mockResolvedValue(null);

        await expectAppError(
            artistAlbumService.getMyAlbumDetail(userId, albumId),
            "Artist profile not found for this account.",
            404
        );
    });
});
