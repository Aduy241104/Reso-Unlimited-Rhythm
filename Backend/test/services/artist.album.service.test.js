import mongoose from "mongoose";
import { jest } from "@jest/globals";

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const albumId = new mongoose.Types.ObjectId();
const otherAlbumId = new mongoose.Types.ObjectId();
const trackId = new mongoose.Types.ObjectId();
const secondTrackId = new mongoose.Types.ObjectId();

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
            approvalStatus: "approved",
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
            approvalStatus: "approved",
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

    test("rejects a track that has not been approved", async () => {
        const album = createAlbumDocument();

        mockAlbumModel.findOne.mockResolvedValue(album);
        mockTrackModel.findOne.mockResolvedValue({
            _id: trackId,
            artist_artistId: artistId,
            album_albumId: null,
            approvalStatus: "pending",
        });

        const { default: service } = await loadArtistAlbumService();

        await expect(
            service.addTrackToAlbum(userId, albumId, trackId)
        ).rejects.toMatchObject({
            statusCode: 409,
            details: {
                code: "TRACK_NOT_APPROVED",
            },
        });

        expect(mockTrackModel.updateOne).not.toHaveBeenCalled();
        expect(album.save).not.toHaveBeenCalled();
    });

    test("rejects a duplicate album title for the same artist", async () => {
        const album = createAlbumDocument();

        mockAlbumModel.findOne.mockResolvedValue(album);
        mockAlbumModel.exists.mockResolvedValue({ _id: otherAlbumId });

        const { default: service } = await loadArtistAlbumService();

        await expect(
            service.updateAlbum(userId, albumId, { title: "  ALBUM  " }, null)
        ).rejects.toMatchObject({
            statusCode: 409,
            details: {
                field: "title",
                code: "ALBUM_TITLE_ALREADY_EXISTS",
            },
        });

        expect(mockAlbumModel.exists).toHaveBeenCalledWith({
            artistId,
            isDeleted: { $ne: true },
            title: { $regex: "^ALBUM$", $options: "i" },
            _id: { $ne: albumId },
        });
        expect(album.save).not.toHaveBeenCalled();
    });

    test("requires at least two tracks before an album can be published", async () => {
        const album = createAlbumDocument();
        album.trackList = [{ trackId, order: 1 }];
        mockAlbumModel.findOne.mockResolvedValue(album);

        const { default: service } = await loadArtistAlbumService();

        await expect(
            service.updateAlbum(userId, albumId, { status: "active" }, null)
        ).rejects.toMatchObject({
            statusCode: 400,
            details: {
                field: "status",
            },
        });

        expect(album.save).not.toHaveBeenCalled();
    });

    test("removes a track from a draft album and clears its album assignment", async () => {
        const album = createAlbumDocument();
        album.trackList = [
            { trackId, order: 1 },
            { trackId: secondTrackId, order: 2 },
        ];
        mockAlbumModel.findOne.mockResolvedValue(album);
        mockTrackModel.updateOne.mockResolvedValue({
            matchedCount: 1,
            modifiedCount: 1,
        });

        const { default: service } = await loadArtistAlbumService();

        await service.removeTrackFromAlbum(userId, albumId, trackId);

        expect(mockTrackModel.updateOne).toHaveBeenCalledWith(
            {
                _id: trackId,
                artist_artistId: artistId,
                album_albumId: albumId,
            },
            { $unset: { album_albumId: "" } }
        );
        expect(album.trackList).toEqual([
            { trackId: secondTrackId, order: 1 },
        ]);
        expect(album.save).toHaveBeenCalledTimes(1);
    });

    test("does not remove a track when a released album would have fewer than two tracks", async () => {
        const album = createAlbumDocument();
        album.status = "active";
        album.trackList = [
            { trackId, order: 1 },
            { trackId: secondTrackId, order: 2 },
        ];
        mockAlbumModel.findOne.mockResolvedValue(album);

        const { default: service } = await loadArtistAlbumService();

        await expect(
            service.removeTrackFromAlbum(userId, albumId, trackId)
        ).rejects.toMatchObject({
            statusCode: 409,
            details: {
                field: "trackId",
                code: "RELEASED_ALBUM_MIN_TRACKS_REQUIRED",
            },
        });

        expect(mockTrackModel.updateOne).not.toHaveBeenCalled();
        expect(album.save).not.toHaveBeenCalled();
    });
});
