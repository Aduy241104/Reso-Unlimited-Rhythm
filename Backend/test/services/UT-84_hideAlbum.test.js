import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockAlbumFindOne = jest.fn();
const mockFormatAlbumItem = jest.fn((album) => album);

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
    formatAlbumItem: mockFormatAlbumItem,
    formatAlbumDetail: jest.fn((album) => album),
}));

jest.unstable_mockModule("../../src/services/album/album.sync.js", () => ({
    enrichAlbumWithTotalDuration: jest.fn(),
    enrichAlbumsWithTotalDuration: jest.fn(),
    syncAlbumTotalDuration: jest.fn(),
}));

const artistAlbumService = (
    await import("../../src/services/artist/artist.album.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const albumId = new mongoose.Types.ObjectId();

const createAlbum = (status = "active") => ({
    _id: albumId,
    title: "Album",
    artistId,
    status,
    save: jest.fn(async function save() {
        return this;
    }),
    populate: jest.fn(async function populate() {
        return this;
    }),
    toObject: jest.fn(function toObject() {
        return { _id: this._id, title: this.title, status: this.status };
    }),
});

const expectAppError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe("UT-84 hideAlbum", () => {
    let album;

    beforeEach(() => {
        jest.clearAllMocks();
        album = createAlbum();
        mockArtistFindOne.mockResolvedValue({ _id: artistId });
        mockAlbumFindOne.mockResolvedValue(album);
    });

    test("UTCID01 - changes an active album to hidden", async () => {
        const result = await artistAlbumService.hideAlbum(userId, albumId);

        expect(album.status).toBe("hidden");
        expect(album.save).toHaveBeenCalledTimes(1);
        expect(result.status).toBe("hidden");
    });

    test("UTCID02 - keeps an already hidden album hidden", async () => {
        album = createAlbum("hidden");
        mockAlbumFindOne.mockResolvedValue(album);

        await artistAlbumService.hideAlbum(userId, albumId);

        expect(album.status).toBe("hidden");
        expect(album.save).toHaveBeenCalledTimes(1);
    });

    test("UTCID03 - throws 400 for an invalid album ID", async () => {
        await expectAppError(
            artistAlbumService.hideAlbum(userId, "invalid-id"),
            "Album id is invalid.",
            400
        );
    });

    test("UTCID04 - throws 404 when album is missing or not owned", async () => {
        mockAlbumFindOne.mockResolvedValue(null);

        await expectAppError(
            artistAlbumService.hideAlbum(userId, albumId),
            "Album not found.",
            404
        );
    });

    test("UTCID05 - throws 404 when artist profile does not exist", async () => {
        mockArtistFindOne.mockResolvedValue(null);

        await expectAppError(
            artistAlbumService.hideAlbum(userId, albumId),
            "Artist profile not found for this account.",
            404
        );

        expect(mockAlbumFindOne).not.toHaveBeenCalled();
    });
});
