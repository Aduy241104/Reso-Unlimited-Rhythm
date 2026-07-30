import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockPlaylistModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
};

const loadPlaylistService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Playlist.js", () => ({
        default: mockPlaylistModel,
    }));

    const { default: playlistService } = await import(
        "../../src/services/Playlist/playlist.service.js"
    );

    return { playlistService };
};

describe("View System Playlist - playlistService.getSystemPlaylists", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns only visible system playlists with pagination", async () => {
        const { playlistService } = await loadPlaylistService();
        const playlists = [
            {
                _id: "507f1f77bcf86cd799439121",
                title: "System Mix",
                description: "Editorial selection",
                type: "system",
                coverImage: "cover.png",
                isPublic: true,
                isHidden: false,
                trackCount: 8,
                totalDuration: 1900,
                createdAt: new Date("2026-07-01T00:00:00.000Z"),
            },
        ];
        const playlistQuery = createAwaitableQuery(playlists);
        mockPlaylistModel.find.mockReturnValue(playlistQuery);
        mockPlaylistModel.countDocuments.mockResolvedValue(4);

        const result = await playlistService.getSystemPlaylists({
            page: "1",
            limit: "2",
        });

        expect(mockPlaylistModel.find).toHaveBeenCalledWith({
            type: "system",
            isHidden: false,
        });
        expect(playlistQuery.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
        expect(playlistQuery.limit).toHaveBeenCalledWith(2);
        expect(result).toEqual({
            playlists,
            pagination: {
                page: 1,
                limit: 2,
                total: 4,
                totalPages: 2,
            },
        });
    });

    test("caps requested limit at 50 and handles empty results", async () => {
        const { playlistService } = await loadPlaylistService();
        const playlistQuery = createAwaitableQuery([]);
        mockPlaylistModel.find.mockReturnValue(playlistQuery);
        mockPlaylistModel.countDocuments.mockResolvedValue(0);

        const result = await playlistService.getSystemPlaylists({
            page: "-2",
            limit: "100",
        });

        expect(playlistQuery.skip).toHaveBeenCalledWith(0);
        expect(playlistQuery.limit).toHaveBeenCalledWith(50);
        expect(result.pagination).toEqual({
            page: 1,
            limit: 50,
            total: 0,
            totalPages: 0,
        });
    });
});
