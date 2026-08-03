import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockAlbumModel = {
    aggregate: jest.fn(),
};

const mockArtistModel = {
    collection: {
        name: "artists",
    },
};

const mockTrackModel = {
    collection: {
        name: "tracks",
    },
};

const mockInteractionModel = {
    collection: {
        name: "interactions",
    },
};

const mockEnrichAlbumsWithTotalDuration = jest.fn();

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
        enrichAlbumsWithTotalDuration: mockEnrichAlbumsWithTotalDuration,
    }));

    const { default: albumService } = await import(
        "../../src/services/album/album.service.js"
    );

    return { albumService };
};

describe("View New Releases - albumService.getAlbumList", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns active albums as release-sorted items with pagination", async () => {
        const { albumService } = await loadAlbumService();
        // Arrange
        const aggregatedAlbums = [
            {
                _id: "507f1f77bcf86cd799439111",
                title: "Latest Album",
                coverImage: "latest.png",
                releaseDate: new Date("2026-07-01T00:00:00.000Z"),
                status: "active",
                totalDuration: 4200,
                trackList: [{ trackId: "t1" }, { trackId: "t2" }],
                artistId: {
                    _id: "507f1f77bcf86cd799439211",
                    name: "Artist A",
                    avatar: "a.png",
                    coverImage: "cover-a.png",
                },
                createdAt: new Date("2026-07-01T00:00:00.000Z"),
                updatedAt: new Date("2026-07-02T00:00:00.000Z"),
            },
        ];
        mockAlbumModel.aggregate.mockResolvedValue([
            {
                albums: aggregatedAlbums,
                metadata: [{ total: 11 }],
            },
        ]);

        // Act
        const result = await albumService.getAlbumList({
            page: "2",
            limit: "5",
            criteria: "new_release",
        });

        // Assert
        const pipeline = mockAlbumModel.aggregate.mock.calls[0][0];
        expect(pipeline[0].$match).toEqual({
            status: "active",
            $or: expect.any(Array),
        });
        expect(pipeline[pipeline.length - 1].$facet.albums).toEqual([
            {
                $sort: {
                    releaseDate: -1,
                    albumFollowCount: -1,
                    totalTrackPlays: -1,
                    createdAt: -1,
                    _id: -1,
                },
            },
            { $skip: 5 },
            { $limit: 5 },
        ]);
        expect(mockEnrichAlbumsWithTotalDuration).toHaveBeenCalledWith(
            aggregatedAlbums
        );
        expect(result).toEqual({
            albums: [
                expect.objectContaining({
                    id: "507f1f77bcf86cd799439111",
                    title: "Latest Album",
                    trackCount: 2,
                    artist: expect.objectContaining({
                        id: "507f1f77bcf86cd799439211",
                        name: "Artist A",
                    }),
                }),
            ],
            pagination: {
                page: 2,
                limit: 5,
                total: 11,
                totalPages: 3,
                criteria: "new_release",
            },
        });
    });

    test("falls back to default page and caps limit at 50", async () => {
        const { albumService } = await loadAlbumService();

        // Arrange
        mockAlbumModel.aggregate.mockResolvedValue([
            {
                albums: [],
                metadata: [{ total: 0 }],
            },
        ]);

        // Act
        const result = await albumService.getAlbumList({
            page: "0",
            limit: "999",
        });

        // Assert
        const pipeline = mockAlbumModel.aggregate.mock.calls[0][0];
        expect(pipeline[pipeline.length - 1].$facet.albums).toEqual([
            {
                $sort: {
                    isUpcoming: 1,
                    rankingScore: -1,
                    releaseDate: -1,
                    createdAt: -1,
                    _id: -1,
                },
            },
            { $skip: 0 },
            { $limit: 50 },
        ]);
        expect(result.pagination).toEqual({
            page: 1,
            limit: 50,
            total: 0,
            totalPages: 0,
            criteria: "featured",
        });
    });
});
