import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockAlbumFindOne = jest.fn();
const mockSyncAlbumTotalDuration = jest.fn();

const MockAlbum = jest.fn();
MockAlbum.findOne = mockAlbumFindOne;

jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: { findOne: mockArtistFindOne },
}));

jest.unstable_mockModule("../../src/models/Album.js", () => ({
    default: MockAlbum,
}));

jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: { find: jest.fn(), findOne: jest.fn() },
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
const firstTrackId = new mongoose.Types.ObjectId();
const removedTrackId = new mongoose.Types.ObjectId();
const thirdTrackId = new mongoose.Types.ObjectId();

const createAlbum = (overrides = {}) => ({
    _id: albumId,
    title: "Album",
    artistId,
    status: "draft",
    trackList: [
        { trackId: firstTrackId, order: 2 },
        { trackId: removedTrackId, order: 5 },
        { trackId: thirdTrackId, order: 9 },
    ],
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
            status: this.status,
            trackList: this.trackList,
        };
    }),
    ...overrides,
});

const expectAppError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe("UT-86 removeTrackFromAlbum", () => {
    let album;

    beforeEach(() => {
        jest.clearAllMocks();
        album = createAlbum();
        mockArtistFindOne.mockResolvedValue({ _id: artistId });
        mockAlbumFindOne.mockResolvedValue(album);
        mockSyncAlbumTotalDuration.mockResolvedValue(undefined);
    });

    test("UTCID01 - removes the selected track", async () => {
        const result = await artistAlbumService.removeTrackFromAlbum(
            userId,
            albumId,
            removedTrackId
        );

        expect(album.trackList.map((item) => item.trackId)).toEqual([
            firstTrackId,
            thirdTrackId,
        ]);
        expect(mockSyncAlbumTotalDuration).toHaveBeenCalledWith(album);
        expect(album.save).toHaveBeenCalledTimes(1);
        expect(result.trackList).toHaveLength(2);
    });

    test("UTCID02 - reorders remaining tracks and demotes undersized active album", async () => {
        album = createAlbum({
            status: "active",
            trackList: [
                { trackId: firstTrackId, order: 4 },
                { trackId: removedTrackId, order: 8 },
            ],
        });
        mockAlbumFindOne.mockResolvedValue(album);

        await artistAlbumService.removeTrackFromAlbum(
            userId,
            albumId,
            removedTrackId
        );

        expect(album.trackList).toEqual([{ trackId: firstTrackId, order: 1 }]);
        expect(album.status).toBe("draft");
    });

    test("UTCID03 - throws 400 for an invalid album ID", async () => {
        await expectAppError(
            artistAlbumService.removeTrackFromAlbum(userId, "invalid-id", removedTrackId),
            "Album id is invalid.",
            400
        );
    });

    test("UTCID04 - throws 400 for an invalid track ID", async () => {
        await expectAppError(
            artistAlbumService.removeTrackFromAlbum(userId, albumId, "invalid-id"),
            "Track id is invalid.",
            400
        );
    });

    test("UTCID05 - throws 404 when album is missing or not owned", async () => {
        mockAlbumFindOne.mockResolvedValue(null);

        await expectAppError(
            artistAlbumService.removeTrackFromAlbum(userId, albumId, removedTrackId),
            "Album not found.",
            404
        );
    });

    test("UTCID06 - throws 404 when track is not in album", async () => {
        const absentTrackId = new mongoose.Types.ObjectId();

        await expectAppError(
            artistAlbumService.removeTrackFromAlbum(userId, albumId, absentTrackId),
            "Track is not in this album.",
            404
        );

        expect(album.save).not.toHaveBeenCalled();
    });

    test("UTCID07 - throws 404 when artist profile does not exist", async () => {
        mockArtistFindOne.mockResolvedValue(null);

        await expectAppError(
            artistAlbumService.removeTrackFromAlbum(userId, albumId, removedTrackId),
            "Artist profile not found for this account.",
            404
        );

        expect(mockAlbumFindOne).not.toHaveBeenCalled();
    });
});
