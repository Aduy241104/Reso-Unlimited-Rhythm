import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockPlaylistModel = {
    findOne: jest.fn(),
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

describe("playlistService.getPlaylistDetail", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns visible system playlist detail for user role", async () => {
        const { playlistService } = await loadPlaylistService();
        const playlistId = "507f1f77bcf86cd799439121";
        const playlistDoc = {
            _id: playlistId,
            title: "System Mix",
            description: "Editorial selection",
            type: "system",
            coverImage: "cover.png",
            isPublic: false,
            isHidden: false,
            trackCount: 8,
            totalDuration: 1900,
            userId: {
                _id: "507f1f77bcf86cd799439221",
                email: "system@example.com",
                role: "admin",
                profile: { fullName: "System Admin" },
                avatar: "avatar.png",
            },
            tracks: [],
            createdAt: new Date("2026-07-01T00:00:00.000Z"),
            updatedAt: new Date("2026-07-02T00:00:00.000Z"),
        };
        const playlistQuery = createAwaitableQuery(playlistDoc);
        mockPlaylistModel.findOne.mockReturnValue(playlistQuery);

        const result = await playlistService.getPlaylistDetail(playlistId);

        expect(mockPlaylistModel.findOne).toHaveBeenCalledWith({
            _id: playlistId,
            isHidden: false,
            $or: [
                { type: "system" },
                { isPublic: true },
            ],
        });
        expect(result).toEqual(
            expect.objectContaining({
                id: playlistId,
                type: "system",
                isPublic: false,
                isHidden: false,
            })
        );
    });

    test("throws 400 when playlist id is invalid", async () => {
        const { playlistService } = await loadPlaylistService();

        await expect(playlistService.getPlaylistDetail("invalid-id")).rejects.toMatchObject({
            message: "Playlist id is invalid.",
            statusCode: 400,
            details: { field: "id" },
        });
    });

    test("throws 404 when playlist is hidden from user role", async () => {
        const { playlistService } = await loadPlaylistService();
        const playlistId = "507f1f77bcf86cd799439122";
        mockPlaylistModel.findOne.mockReturnValue(createAwaitableQuery(null));

        await expect(playlistService.getPlaylistDetail(playlistId)).rejects.toMatchObject({
            message: "Playlist not found.",
            statusCode: 404,
        });
        expect(mockPlaylistModel.findOne).toHaveBeenCalledWith({
            _id: playlistId,
            isHidden: false,
            $or: [
                { type: "system" },
                { isPublic: true },
            ],
        });
    });

    test("allows admin mode to view a hidden system playlist", async () => {
        const { playlistService } = await loadPlaylistService();
        const playlistId = "507f1f77bcf86cd799439123";
        mockPlaylistModel.findOne.mockReturnValue(
            createAwaitableQuery({
                _id: playlistId,
                title: "Hidden editorial playlist",
                type: "system",
                isPublic: false,
                isHidden: true,
                tracks: [],
            })
        );

        const result = await playlistService.getPlaylistDetail(playlistId, {
            mode: "adminSystem",
        });

        expect(mockPlaylistModel.findOne).toHaveBeenCalledWith({
            _id: playlistId,
            type: "system",
        });
        expect(result).toMatchObject({
            id: playlistId,
            type: "system",
            isHidden: true,
        });
    });
});
