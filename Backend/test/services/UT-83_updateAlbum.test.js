import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockAlbumFindOne = jest.fn();
const mockUploadToCloudinary = jest.fn();
const mockDeleteCloudinaryAssetByUrl = jest.fn();
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
    default: { findOne: jest.fn(), find: jest.fn() },
}));

jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
    uploadToCloudinary: mockUploadToCloudinary,
    deleteCloudinaryAssetByUrl: mockDeleteCloudinaryAssetByUrl,
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
const coverFile = { originalname: "cover.jpg", buffer: Buffer.from("cover") };

const createAlbum = (overrides = {}) => ({
    _id: albumId,
    title: "Old Album",
    artistId,
    coverImage: "https://example.com/old-cover.jpg",
    releaseDate: null,
    status: "draft",
    trackList: [
        { trackId: new mongoose.Types.ObjectId(), order: 1 },
        { trackId: new mongoose.Types.ObjectId(), order: 2 },
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
            artistId: this.artistId,
            coverImage: this.coverImage,
            releaseDate: this.releaseDate,
            status: this.status,
            trackList: this.trackList,
        };
    }),
    ...overrides,
});

const expectAppError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe("UT-83 updateAlbum", () => {
    let album;

    beforeEach(() => {
        jest.clearAllMocks();
        album = createAlbum();
        mockArtistFindOne.mockResolvedValue({ _id: artistId });
        mockAlbumFindOne.mockResolvedValue(album);
        mockUploadToCloudinary.mockResolvedValue({
            secure_url: "https://example.com/new-cover.jpg",
        });
        mockDeleteCloudinaryAssetByUrl.mockResolvedValue(undefined);
    });

    test("UTCID01 - updates all provided album information", async () => {
        const result = await artistAlbumService.updateAlbum(
            userId,
            albumId,
            { title: "Summer Vibes", releaseDate: "2026-06-20", status: "active" },
            coverFile
        );

        expect(album.title).toBe("Summer Vibes");
        expect(album.releaseDate).toEqual(new Date("2026-06-20"));
        expect(album.status).toBe("active");
        expect(album.coverImage).toBe("https://example.com/new-cover.jpg");
        expect(album.save).toHaveBeenCalledTimes(1);
        expect(result.title).toBe("Summer Vibes");
    });

    test("UTCID02 - updates title and status without changing cover", async () => {
        const oldCover = album.coverImage;

        await artistAlbumService.updateAlbum(userId, albumId, {
            title: "Updated Album",
            status: "hidden",
        });

        expect(album.title).toBe("Updated Album");
        expect(album.status).toBe("hidden");
        expect(album.coverImage).toBe(oldCover);
        expect(mockUploadToCloudinary).not.toHaveBeenCalled();
    });

    test("UTCID03 - clears release date when null is provided", async () => {
        album.releaseDate = new Date("2026-06-20");

        await artistAlbumService.updateAlbum(userId, albumId, {
            releaseDate: null,
        });

        expect(album.releaseDate).toBeNull();
    });

    test("UTCID04 - preserves optional fields when payload is empty", async () => {
        const before = {
            title: album.title,
            releaseDate: album.releaseDate,
            status: album.status,
            coverImage: album.coverImage,
        };

        await artistAlbumService.updateAlbum(userId, albumId, {});

        expect(album).toMatchObject(before);
        expect(album.save).toHaveBeenCalledTimes(1);
    });

    test("UTCID05 - throws 400 for a blank title", async () => {
        await expectAppError(
            artistAlbumService.updateAlbum(userId, albumId, { title: "   " }),
            "Album title is required.",
            400
        );

        expect(album.save).not.toHaveBeenCalled();
    });

    test("UTCID06 - throws 400 for an invalid album ID", async () => {
        await expectAppError(
            artistAlbumService.updateAlbum(userId, "invalid-id", {}),
            "Album id is invalid.",
            400
        );

        expect(mockArtistFindOne).not.toHaveBeenCalled();
    });

    test("UTCID07 - throws 404 when album is missing", async () => {
        mockAlbumFindOne.mockResolvedValue(null);

        await expectAppError(
            artistAlbumService.updateAlbum(userId, albumId, {}),
            "Album not found.",
            404
        );
    });

    test("UTCID08 - throws 500 when cover upload fails", async () => {
        mockUploadToCloudinary.mockRejectedValue(new Error("Upload failed"));
        const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

        await expectAppError(
            artistAlbumService.updateAlbum(userId, albumId, {}, coverFile),
            "Failed to upload cover image. Please try again.",
            500
        );

        expect(consoleError).toHaveBeenCalled();
        expect(album.save).not.toHaveBeenCalled();
        consoleError.mockRestore();
    });

    test("UTCID09 - returns 404 when album does not belong to artist", async () => {
        mockAlbumFindOne.mockResolvedValue(null);

        await expectAppError(
            artistAlbumService.updateAlbum(userId, albumId, { title: "Other" }),
            "Album not found.",
            404
        );

        expect(mockAlbumFindOne).toHaveBeenCalledWith({
            _id: albumId,
            artistId,
        });
    });
});
