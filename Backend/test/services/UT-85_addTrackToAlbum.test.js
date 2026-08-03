import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockAlbumFindOne = jest.fn();
const mockTrackFindOne = jest.fn();
const mockSyncAlbumTotalDuration = jest.fn();

const MockAlbum = jest.fn();
MockAlbum.findOne = mockAlbumFindOne;

const MockTrack = jest.fn();
MockTrack.findOne = mockTrackFindOne;

jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: { findOne: mockArtistFindOne },
}));

jest.unstable_mockModule("../../src/models/Album.js", () => ({
    default: MockAlbum,
}));

jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: MockTrack,
}));

jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
    uploadToCloudinary: jest.fn(),
    deleteCloudinaryAssetByUrl: jest.fn(),
}));

jest.unstable_mockModule("../../src/services/album/album.helper.js", () => ({
    formatAlbumItem: jest.fn((album) => album),
    formatAlbumDetail: jest.fn((album) => album),
}));

jest.unstable_mockModule("../../src/services/album/album.sync.js", () => ({
    enrichAlbumWithTotalDuration: jest.fn(),
    enrichAlbumsWithTotalDuration: jest.fn(),
    syncAlbumTotalDuration: mockSyncAlbumTotalDuration,
}));

const artistAlbumService = (
    await import("../../src/services/artist/artist.album.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const albumId = new mongoose.Types.ObjectId();
const trackId = new mongoose.Types.ObjectId();

const createAlbum = (trackList = []) => ({
    _id: albumId,
    title: "Album",
    artistId,
    status: "draft",
    trackList,
    save: jest.fn(async function save() {
        return this;
    }),
    populate: jest.fn(async function populate() {
        return this;
    }),
    toObject: jest.fn(function toObject() {
        return {
            _id: this._id,
            title: this.title,
            trackList: this.trackList,
            status: this.status,
        };
    }),
});

const expectAppError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe("UT-85 addTrackToAlbum", () => {
    let album;

    beforeEach(() => {
        jest.clearAllMocks();
        album = createAlbum();
        mockArtistFindOne.mockResolvedValue({ _id: artistId });
        mockAlbumFindOne.mockResolvedValue(album);
        mockTrackFindOne.mockResolvedValue({
            _id: trackId,
            artist_artistId: artistId,
        });
        mockSyncAlbumTotalDuration.mockResolvedValue(undefined);
    });

    test("UTCID01 - adds a track to an empty album", async () => {
        const result = await artistAlbumService.addTrackToAlbum(
            userId,
            albumId,
            trackId
        );

        expect(album.trackList).toHaveLength(1);
        expect(album.trackList[0].trackId.equals(trackId)).toBe(true);
        expect(album.trackList[0].order).toBe(1);
        expect(mockSyncAlbumTotalDuration).toHaveBeenCalledWith(album);
        expect(album.save).toHaveBeenCalledTimes(1);
        expect(result.trackList).toHaveLength(1);
    });

    test("UTCID02 - adds the track after the current maximum order", async () => {
        album = createAlbum([
            { trackId: new mongoose.Types.ObjectId(), order: 1 },
            { trackId: new mongoose.Types.ObjectId(), order: 4 },
        ]);
        mockAlbumFindOne.mockResolvedValue(album);

        await artistAlbumService.addTrackToAlbum(userId, albumId, trackId);

        expect(album.trackList[2].order).toBe(5);
    });

    test("UTCID03 - throws 400 for an invalid album ID", async () => {
        await expectAppError(
            artistAlbumService.addTrackToAlbum(userId, "invalid-id", trackId),
            "Album id is invalid.",
            400
        );
    });

    test("UTCID04 - throws 400 for an invalid track ID", async () => {
        await expectAppError(
            artistAlbumService.addTrackToAlbum(userId, albumId, "invalid-id"),
            "Track id is invalid.",
            400
        );
    });

    test("UTCID05 - throws 404 when album is missing or not owned", async () => {
        mockAlbumFindOne.mockResolvedValue(null);

        await expectAppError(
            artistAlbumService.addTrackToAlbum(userId, albumId, trackId),
            "Album not found.",
            404
        );
    });

    test("UTCID06 - throws 404 when track is missing or not owned", async () => {
        mockTrackFindOne.mockResolvedValue(null);

        await expectAppError(
            artistAlbumService.addTrackToAlbum(userId, albumId, trackId),
            "Track not found or does not belong to you.",
            404
        );
    });

    test("UTCID07 - throws 400 when track already exists in album", async () => {
        album = createAlbum([{ trackId, order: 1 }]);
        mockAlbumFindOne.mockResolvedValue(album);

        await expectAppError(
            artistAlbumService.addTrackToAlbum(userId, albumId, trackId),
            "This track is already in the album.",
            400
        );

        expect(mockSyncAlbumTotalDuration).not.toHaveBeenCalled();
        expect(album.save).not.toHaveBeenCalled();
    });
});
