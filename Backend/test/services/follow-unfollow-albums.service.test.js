import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockAlbumModel = {
    findOne: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn(),
};

const mockArtistModel = {
    findOne: jest.fn(),
    collection: {
        name: "artists",
    },
};

const mockTrackModel = {
    find: jest.fn(),
    collection: {
        name: "tracks",
    },
};

const mockInteractionModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
    collection: {
        name: "interactions",
    },
};

const loadAlbumService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Album.js", () => ({
        default: mockAlbumModel,
    }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/Interaction.js", () => ({
        default: mockInteractionModel,
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));
    jest.unstable_mockModule("../../src/services/album/album.sync.js", () => ({
        enrichAlbumWithTotalDuration: jest.fn(),
        enrichAlbumsWithTotalDuration: jest.fn(),
    }));

    const { default: albumService } = await import(
        "../../src/services/album/album.service.js"
    );

    return { albumService };
};

const createAlbumLookupQuery = (album = { _id: "507f1f77bcf86cd799439701" }) => ({
    select: jest.fn().mockResolvedValue(album),
});

describe("Follow / Unfollow Albums - albumService follow functions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("followAlbum creates a follow interaction when the album is active and not followed yet", async () => {
        const { albumService } = await loadAlbumService();

        // Arrange
        mockAlbumModel.findOne.mockReturnValue(createAlbumLookupQuery());
        mockInteractionModel.findOne.mockReturnValue(
            createAwaitableQuery(null, ["select", "lean"])
        );
        mockInteractionModel.create.mockResolvedValue({
            _id: "interaction-1",
        });

        // Act
        const result = await albumService.followAlbum(
            "507f1f77bcf86cd799439601",
            "507f1f77bcf86cd799439701"
        );

        // Assert
        expect(mockInteractionModel.create).toHaveBeenCalledWith({
            userId: "507f1f77bcf86cd799439601",
            targetType: "Album",
            targetId: "507f1f77bcf86cd799439701",
            action: "follow",
        });
        expect(result).toEqual({
            albumId: "507f1f77bcf86cd799439701",
            isFollowing: true,
        });
    });

    test("followAlbum returns success when create hits a duplicate-key race condition", async () => {
        const { albumService } = await loadAlbumService();

        // Arrange
        mockAlbumModel.findOne.mockReturnValue(createAlbumLookupQuery());
        mockInteractionModel.findOne.mockReturnValue(
            createAwaitableQuery(null, ["select", "lean"])
        );
        mockInteractionModel.create.mockRejectedValue({ code: 11000 });

        // Act
        const result = await albumService.followAlbum(
            "507f1f77bcf86cd799439602",
            "507f1f77bcf86cd799439701"
        );

        // Assert
        expect(result).toEqual({
            albumId: "507f1f77bcf86cd799439701",
            isFollowing: true,
        });
    });

    test("followAlbum throws 401 when userId is missing", async () => {
        const { albumService } = await loadAlbumService();

        // Arrange
        const missingUserId = null;

        // Act / Assert
        await expect(
            albumService.followAlbum(missingUserId, "507f1f77bcf86cd799439701")
        ).rejects.toMatchObject({
            message: "Unauthorized.",
            statusCode: 401,
        });
        expect(mockAlbumModel.findOne).not.toHaveBeenCalled();
    });

    test("getAlbumFollowStatus returns false when the album exists but no follow interaction is found", async () => {
        const { albumService } = await loadAlbumService();

        // Arrange
        mockAlbumModel.findOne.mockReturnValue(createAlbumLookupQuery());
        mockInteractionModel.findOne.mockReturnValue(
            createAwaitableQuery(null, ["select", "lean"])
        );

        // Act
        const result = await albumService.getAlbumFollowStatus(
            "507f1f77bcf86cd799439603",
            "507f1f77bcf86cd799439701"
        );

        // Assert
        expect(result).toEqual({
            albumId: "507f1f77bcf86cd799439701",
            isFollowing: false,
        });
    });

    test("unfollowAlbum deletes the follow interaction and returns a non-following state", async () => {
        const { albumService } = await loadAlbumService();

        // Arrange
        mockAlbumModel.findOne.mockReturnValue(createAlbumLookupQuery());
        mockInteractionModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

        // Act
        const result = await albumService.unfollowAlbum(
            "507f1f77bcf86cd799439604",
            "507f1f77bcf86cd799439701"
        );

        // Assert
        expect(mockInteractionModel.deleteOne).toHaveBeenCalledWith({
            userId: "507f1f77bcf86cd799439604",
            targetType: "Album",
            targetId: "507f1f77bcf86cd799439701",
            action: "follow",
        });
        expect(result).toEqual({
            albumId: "507f1f77bcf86cd799439701",
            isFollowing: false,
        });
    });

    test("toggleFollowAlbum removes an existing interaction and reports the unfollow action", async () => {
        const { albumService } = await loadAlbumService();

        // Arrange
        mockAlbumModel.findOne.mockReturnValue(createAlbumLookupQuery());
        mockInteractionModel.findOne.mockReturnValue(
            createAwaitableQuery({ _id: "interaction-2" }, ["select", "lean"])
        );
        mockInteractionModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

        // Act
        const result = await albumService.toggleFollowAlbum(
            "507f1f77bcf86cd799439605",
            "507f1f77bcf86cd799439701"
        );

        // Assert
        expect(mockInteractionModel.deleteOne).toHaveBeenCalledWith({
            _id: "interaction-2",
        });
        expect(result).toEqual({
            action: "unfollowed",
            follow: {
                albumId: "507f1f77bcf86cd799439701",
                isFollowing: false,
            },
        });
    });

    test("followAlbum throws 404 when the album cannot be found", async () => {
        const { albumService } = await loadAlbumService();

        // Arrange
        mockAlbumModel.findOne.mockReturnValue(createAlbumLookupQuery(null));

        // Act / Assert
        await expect(
            albumService.followAlbum(
                "507f1f77bcf86cd799439606",
                "507f1f77bcf86cd799439799"
            )
        ).rejects.toMatchObject({
            message: "Album not found.",
            statusCode: 404,
        });
    });
});
