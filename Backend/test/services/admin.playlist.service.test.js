import { jest } from "@jest/globals";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const playlistId = "507f1f77bcf86cd799439011";
const approvedTrackId = "507f1f77bcf86cd799439021";
const pendingTrackId = "507f1f77bcf86cd799439022";

const mockPlaylistDocument = () => ({
    _id: playlistId,
    type: "system",
    tracks: [],
    trackCount: 0,
    totalDuration: 0,
    markModified: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
});

const mockPlaylistModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
};

const mockTrackModel = {
    findOne: jest.fn(),
    find: jest.fn(),
};

const createSelectLeanQuery = (result) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(result),
    }),
});

const createPlaylistDetail = () => ({
    id: playlistId,
    tracks: [],
});

const loadAdminPlaylistService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Playlist.js", () => ({
        default: mockPlaylistModel,
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));
    jest.unstable_mockModule("../../src/services/Playlist/playlist.service.js", () => ({
        default: {
            getPlaylistDetail: jest.fn().mockResolvedValue(createPlaylistDetail()),
        },
    }));
    jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
        uploadImageBuffer: jest.fn(),
        deleteImageByPublicId: jest.fn(),
    }));
    jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
        extractPublicIdFromUrl: jest.fn(),
    }));

    return import("../../src/services/Playlist/admin.playlist.service.js");
};

describe("adminPlaylistService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("only accepts approved visible tracks when adding one track", async () => {
        const { default: adminPlaylistService } = await loadAdminPlaylistService();
        const playlist = mockPlaylistDocument();

        mockTrackModel.findOne.mockReturnValue(createSelectLeanQuery({ _id: approvedTrackId }));
        mockPlaylistModel.findOne.mockResolvedValue(playlist);
        mockTrackModel.find.mockReturnValue(createSelectLeanQuery([{ _id: approvedTrackId, duration: 180 }]));

        await adminPlaylistService.addTrackToSystemPlaylist(playlistId, approvedTrackId);

        expect(mockTrackModel.findOne).toHaveBeenCalledWith({
            _id: approvedTrackId,
            approvalStatus: "approved",
            activeStatus: { $nin: ["blocked", "hidden"] },
            isDeleted: { $ne: true },
        });
        expect(playlist.tracks).toHaveLength(1);
    });

    test("filters pending tracks out of batch adds", async () => {
        const { default: adminPlaylistService } = await loadAdminPlaylistService();
        const playlist = mockPlaylistDocument();

        mockTrackModel.find
            .mockReturnValueOnce(createSelectLeanQuery([{ _id: approvedTrackId }]))
            .mockReturnValueOnce(createSelectLeanQuery([{ _id: approvedTrackId, duration: 180 }]));
        mockPlaylistModel.findOne.mockResolvedValue(playlist);

        const result = await adminPlaylistService.addTracksToSystemPlaylistBatch(playlistId, [
            approvedTrackId,
            pendingTrackId,
        ]);

        const batchFilter = mockTrackModel.find.mock.calls[0][0];
        expect(batchFilter).toMatchObject({
            approvalStatus: "approved",
            activeStatus: { $nin: ["blocked", "hidden"] },
            isDeleted: { $ne: true },
        });
        expect(batchFilter._id.$in.map(String)).toEqual([approvedTrackId, pendingTrackId]);
        expect(playlist.tracks.map((entry) => String(entry.trackId))).toEqual([approvedTrackId]);
        expect(result.addedCount).toBe(1);
    });
});
