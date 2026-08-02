import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockAlbumFind = jest.fn();
const mockAlbumCountDocuments = jest.fn();
const mockEnrichAlbumsWithTotalDuration = jest.fn();
const mockFormatAlbumItem = jest.fn((album) => album);

const MockAlbum = jest.fn();
MockAlbum.find = mockAlbumFind;
MockAlbum.countDocuments = mockAlbumCountDocuments;

let latestQuery;

const createAlbumListQuery = (result) => {
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
    enrichAlbumsWithTotalDuration: mockEnrichAlbumsWithTotalDuration,
    syncAlbumTotalDuration: jest.fn(),
}));

const artistAlbumService = (
    await import("../../src/services/artist/artist.album.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const albums = [
    { _id: new mongoose.Types.ObjectId(), title: "Summer Vibes", status: "active" },
    { _id: new mongoose.Types.ObjectId(), title: "Updated Album", status: "hidden" },
];

const expectAppError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe("UT-87 getMyAlbums", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        latestQuery = undefined;
        mockArtistFindOne.mockResolvedValue({ _id: artistId });
        mockAlbumFind.mockImplementation(() => createAlbumListQuery(albums));
        mockAlbumCountDocuments.mockResolvedValue(12);
        mockEnrichAlbumsWithTotalDuration.mockResolvedValue(undefined);
    });

    test("UTCID01 - returns page 1 with limit 10 and pagination", async () => {
        const result = await artistAlbumService.getMyAlbums(userId, {
            page: 1,
            limit: 10,
        });

        expect(result.albums).toEqual(albums);
        expect(result.pagination).toEqual({
            page: 1,
            limit: 10,
            total: 12,
            totalPages: 2,
        });
        expect(latestQuery.skip).toHaveBeenCalledWith(0);
        expect(latestQuery.limit).toHaveBeenCalledWith(10);
        expect(mockEnrichAlbumsWithTotalDuration).toHaveBeenCalledWith(albums);
    });

    test("UTCID02 - returns an empty list with zero pages", async () => {
        mockAlbumFind.mockImplementation(() => createAlbumListQuery([]));
        mockAlbumCountDocuments.mockResolvedValue(0);

        const result = await artistAlbumService.getMyAlbums(userId, {
            page: 1,
            limit: 10,
        });

        expect(result.albums).toEqual([]);
        expect(result.pagination.totalPages).toBe(0);
    });

    test("UTCID03 - applies page 2 and limit 5", async () => {
        const result = await artistAlbumService.getMyAlbums(userId, {
            page: 2,
            limit: 5,
        });

        expect(result.pagination).toMatchObject({ page: 2, limit: 5 });
        expect(latestQuery.skip).toHaveBeenCalledWith(5);
        expect(latestQuery.limit).toHaveBeenCalledWith(5);
    });

    test("UTCID04 - normalizes page 0 and limit 0 to defaults", async () => {
        const result = await artistAlbumService.getMyAlbums(userId, {
            page: 0,
            limit: 0,
        });

        expect(result.pagination).toMatchObject({ page: 1, limit: 10 });
    });

    test("UTCID05 - normalizes non-numeric pagination to defaults", async () => {
        const result = await artistAlbumService.getMyAlbums(userId, {
            page: "abc",
            limit: "abc",
        });

        expect(result.pagination).toMatchObject({ page: 1, limit: 10 });
    });

    test("UTCID06 - caps requested limit 100 at 50", async () => {
        mockAlbumCountDocuments.mockResolvedValue(60);

        const result = await artistAlbumService.getMyAlbums(userId, {
            limit: 100,
        });

        expect(result.pagination).toEqual({
            page: 1,
            limit: 50,
            total: 60,
            totalPages: 2,
        });
        expect(latestQuery.limit).toHaveBeenCalledWith(50);
    });

    test("UTCID07 - throws 404 when artist profile does not exist", async () => {
        mockArtistFindOne.mockResolvedValue(null);

        await expectAppError(
            artistAlbumService.getMyAlbums(userId, {}),
            "Artist profile not found for this account.",
            404
        );

        expect(mockAlbumFind).not.toHaveBeenCalled();
    });

    test("UTCID08 - uses default pagination when query is omitted", async () => {
        const result = await artistAlbumService.getMyAlbums(userId);

        expect(result.pagination).toMatchObject({
            page: 1,
            limit: 10,
            total: 12,
            totalPages: 2,
        });
        expect(mockAlbumFind).toHaveBeenCalledWith({ artistId });
    });
});
