import mongoose from "mongoose";
import { jest } from "@jest/globals";

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const albumId = new mongoose.Types.ObjectId();
const otherAlbumId = new mongoose.Types.ObjectId();
const trackId = new mongoose.Types.ObjectId();

const mockAlbumModel = {
    exists: jest.fn(),
    findOne: jest.fn(),
};

const mockArtistModel = {
    findOne: jest.fn(),
};

const mockReleaseScheduleModel = {
    exists: jest.fn(),
};

const mockTrackModel = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
};

const mockSyncAlbumTotalDuration = jest.fn();

const createAlbumDocument = () => {
    const album = {
        _id: albumId,
        artistId,
        title: "Album",
        status: "draft",
        trackList: [],
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn(),
        toObject: jest.fn(),
    };

    album.populate.mockResolvedValue(album);
    album.toObject.mockReturnValue(album);
    return album;
};

const loadArtistAlbumService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Album.js", () => ({
        default: mockAlbumModel,
    }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/ReleaseSchedule.js", () => ({
        default: mockReleaseScheduleModel,
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));
    jest.unstable_mockModule("../../src/services/album/album.helper.js", () => ({
        formatAlbumDetail: jest.fn((album) => album),
        formatAlbumItem: jest.fn((album) => album),
    }));
    jest.unstable_mockModule("../../src/services/album/album.sync.js", () => ({
        enrichAlbumWithTotalDuration: jest.fn(),
        enrichAlbumsWithTotalDuration: jest.fn(),
        syncAlbumTotalDuration: mockSyncAlbumTotalDuration,
    }));
    jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
        deleteCloudinaryAssetByUrl: jest.fn(),
        uploadToCloudinary: jest.fn(),
    }));

    return import("../../src/services/artist/artist.album.service.js");
};

describe("artistAlbumService track assignment", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockArtistModel.findOne.mockResolvedValue({ _id: artistId });
        mockAlbumModel.exists.mockResolvedValue(null);
        mockSyncAlbumTotalDuration.mockResolvedValue(undefined);
    });

    test("sets album_albumId when adding an unassigned track", async () => {
        const album = createAlbumDocument();
        const track = {
            _id: trackId,
            artist_artistId: artistId,
            album_albumId: null,
        };

        mockAlbumModel.findOne.mockResolvedValue(album);
        mockTrackModel.findOne.mockResolvedValue(track);
        mockTrackModel.updateOne.mockResolvedValue({
            matchedCount: 1,
            modifiedCount: 1,
        });

        const { default: service } = await loadArtistAlbumService();

        await service.addTrackToAlbum(userId, albumId, trackId);

        expect(mockTrackModel.updateOne).toHaveBeenCalledWith(
            expect.objectContaining({
                _id: trackId,
                artist_artistId: artistId,
            }),
            { $set: { album_albumId: albumId } }
        );
        expect(album.trackList).toHaveLength(1);
        expect(album.trackList[0]).toMatchObject({
            trackId,
            order: 1,
        });
        expect(album.save).toHaveBeenCalledTimes(1);
    });

    test("rejects a track that already belongs to another album", async () => {
        const album = createAlbumDocument();

        mockAlbumModel.findOne.mockResolvedValue(album);
        mockTrackModel.findOne.mockResolvedValue({
            _id: trackId,
            artist_artistId: artistId,
            album_albumId: otherAlbumId,
        });

        const { default: service } = await loadArtistAlbumService();

        await expect(
            service.addTrackToAlbum(userId, albumId, trackId)
        ).rejects.toMatchObject({
            statusCode: 409,
            details: {
                code: "TRACK_ALREADY_ASSIGNED_TO_ALBUM",
            },
        });

        expect(mockTrackModel.updateOne).not.toHaveBeenCalled();
        expect(album.save).not.toHaveBeenCalled();
    });
});
