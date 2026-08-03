import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockUploadToCloudinary = jest.fn();
const mockDeleteCloudinaryAssetByUrl = jest.fn();
const mockFormatAlbumItem = jest.fn((album) => album);

let lastCreatedAlbum;

const MockAlbum = jest.fn(function MockAlbumDocument(data) {
    Object.assign(this, data);
    this._id = new mongoose.Types.ObjectId();
    this.save = jest.fn(async () => this);
    this.populate = jest.fn(async () => this);
    this.toObject = jest.fn(() => ({
        _id: this._id,
        title: this.title,
        artistId: this.artistId,
        coverImage: this.coverImage,
        releaseDate: this.releaseDate,
        status: this.status,
        trackList: this.trackList,
    }));
    lastCreatedAlbum = this;
});

MockAlbum.find = jest.fn();
MockAlbum.findOne = jest.fn();
MockAlbum.countDocuments = jest.fn();

const MockTrack = jest.fn();
MockTrack.find = jest.fn();
MockTrack.findOne = jest.fn();

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
const coverFile = {
    originalname: "cover.png",
    buffer: Buffer.from("album-cover"),
};

const expectAppError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe("UT-82 createAlbum", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        lastCreatedAlbum = undefined;
        mockArtistFindOne.mockResolvedValue({ _id: artistId, name: "Artist" });
        mockUploadToCloudinary.mockResolvedValue({
            secure_url: "https://cloudinary.example/album-cover.png",
        });
    });

    test("UTCID01 - creates an album with an empty track list", async () => {
        const result = await artistAlbumService.createAlbum(userId, {
            title: "New Album",
        });

        expect(lastCreatedAlbum).toMatchObject({
            title: "New Album",
            artistId,
            coverImage: "",
            releaseDate: null,
            status: "draft",
            trackList: [],
        });
        expect(lastCreatedAlbum.save).toHaveBeenCalledTimes(1);
        expect(result.title).toBe("New Album");
    });

    test("UTCID02 - trims the album title", async () => {
        await artistAlbumService.createAlbum(userId, {
            title: "  Trimmed Album  ",
        });

        expect(lastCreatedAlbum.title).toBe("Trimmed Album");
    });

    test("UTCID03 - throws 400 when album title is missing", async () => {
        await expectAppError(
            artistAlbumService.createAlbum(userId, {}),
            "Album title is required.",
            400
        );

        expect(MockAlbum).not.toHaveBeenCalled();
    });

    test("UTCID04 - throws 400 when album title only contains whitespace", async () => {
        await expectAppError(
            artistAlbumService.createAlbum(userId, { title: "   " }),
            "Album title is required.",
            400
        );

        expect(MockAlbum).not.toHaveBeenCalled();
    });

    test("UTCID05 - throws 404 when artist profile does not exist", async () => {
        mockArtistFindOne.mockResolvedValue(null);

        await expectAppError(
            artistAlbumService.createAlbum(userId, { title: "New Album" }),
            "Artist profile not found for this account.",
            404
        );

        expect(MockAlbum).not.toHaveBeenCalled();
    });

    test("UTCID06 - uploads and stores an album cover", async () => {
        await artistAlbumService.createAlbum(
            userId,
            { title: "Album With Cover" },
            coverFile
        );

        expect(mockUploadToCloudinary).toHaveBeenCalledWith(
            coverFile.buffer,
            "albums/cover",
            "image"
        );
        expect(lastCreatedAlbum.coverImage).toBe(
            "https://cloudinary.example/album-cover.png"
        );
    });

    test("UTCID07 - throws 500 when cover upload fails", async () => {
        mockUploadToCloudinary.mockRejectedValue(new Error("Upload failed"));
        const consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        await expectAppError(
            artistAlbumService.createAlbum(
                userId,
                { title: "Album With Broken Cover" },
                coverFile
            ),
            "Failed to upload cover image. Please try again.",
            500
        );

        expect(consoleError).toHaveBeenCalled();
        expect(MockAlbum).not.toHaveBeenCalled();
        consoleError.mockRestore();
    });

    test("UTCID08 - creates a draft album with an explicit release date", async () => {
        const releaseDate = "2027-06-06T00:00:00.000Z";

        const result = await artistAlbumService.createAlbum(userId, {
            title: "Scheduled Album",
            releaseDate,
            status: "hidden",
        });

        expect(lastCreatedAlbum).toMatchObject({
            title: "Scheduled Album",
            releaseDate,
            status: "draft",
            trackList: [],
        });
        expect(result.status).toBe("draft");
    });
});
