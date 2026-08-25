import { jest } from "@jest/globals";

const playlistId = "507f1f77bcf86cd799439011";

const mockPlaylistModel = {
    findOne: jest.fn(),
};

const createPlaylistQuery = (result) => ({
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
});

const loadPlaylistService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Playlist.js", () => ({
        default: mockPlaylistModel,
    }));

    return import("../../src/services/Playlist/playlist.service.js");
};

describe("playlistService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("does not return tracks whose artist is not public in user playlist details", async () => {
        const { default: playlistService } = await loadPlaylistService();
        const visibleTrackId = "507f1f77bcf86cd799439021";
        const blockedTrackId = "507f1f77bcf86cd799439022";
        const playlist = {
            _id: playlistId,
            title: "System playlist",
            type: "system",
            isPublic: true,
            isHidden: false,
            tracks: [
                {
                    order: 1,
                    trackId: {
                        _id: visibleTrackId,
                        title: "Visible track",
                        duration: 180,
                        artist_artistId: {
                            _id: "507f1f77bcf86cd799439031",
                            name: "Visible artist",
                        },
                    },
                },
                {
                    order: 2,
                    trackId: {
                        _id: blockedTrackId,
                        title: "Blocked artist track",
                        duration: 200,
                        artist_artistId: null,
                    },
                },
            ],
        };
        const query = createPlaylistQuery(playlist);
        mockPlaylistModel.findOne.mockReturnValue(query);

        const result = await playlistService.getPlaylistDetail(playlistId);

        expect(result.tracks).toHaveLength(1);
        expect(result.tracks[0].trackId).toBe(visibleTrackId);
        expect(query.populate.mock.calls[1][0]).toMatchObject({
            path: "tracks.trackId",
        });
        expect(query.populate.mock.calls[1][0].populate).toContainEqual(expect.objectContaining({
            path: "artist_artistId",
            match: {
                activeStatus: "active",
                isDeleted: { $ne: true },
            },
        }));
    });
});
