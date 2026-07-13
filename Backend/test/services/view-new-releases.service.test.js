import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockAlbumModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
};

const mockEnrichAlbumsWithTotalDuration = jest.fn();

const loadAlbumService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Album.js", () => ({
        default: mockAlbumModel,
    }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: { findOne: jest.fn() },
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: { find: jest.fn() },
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
        const albums = [
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

        const albumQuery = createAwaitableQuery(albums);
        mockAlbumModel.find.mockReturnValue(albumQuery);
        mockAlbumModel.countDocuments.mockResolvedValue(11);

        const result = await albumService.getAlbumList({
            page: "2",
            limit: "5",
        });

        expect(mockAlbumModel.find).toHaveBeenCalledWith({ status: "active" });
        expect(albumQuery.sort).toHaveBeenCalledWith({
            releaseDate: -1,
            totalDuration: -1,
            createdAt: -1,
            _id: -1,
        });
        expect(albumQuery.skip).toHaveBeenCalledWith(5);
        expect(albumQuery.limit).toHaveBeenCalledWith(5);
        expect(mockEnrichAlbumsWithTotalDuration).toHaveBeenCalledWith(albums);
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
            },
        });
    });

    test("falls back to default page and caps limit at 50", async () => {
        const { albumService } = await loadAlbumService();
        const albumQuery = createAwaitableQuery([]);
        mockAlbumModel.find.mockReturnValue(albumQuery);
        mockAlbumModel.countDocuments.mockResolvedValue(0);

        const result = await albumService.getAlbumList({
            page: "0",
            limit: "999",
        });

        expect(albumQuery.skip).toHaveBeenCalledWith(0);
        expect(albumQuery.limit).toHaveBeenCalledWith(50);
        expect(result.pagination).toEqual({
            page: 1,
            limit: 50,
            total: 0,
            totalPages: 0,
        });
    });
});
