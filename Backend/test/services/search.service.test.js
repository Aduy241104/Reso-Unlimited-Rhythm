import { jest } from "@jest/globals";

const mockAlbumModel = {
    find: jest.fn(),
};
const mockArtistModel = {
    find: jest.fn(),
};
const mockTrackModel = {
    find: jest.fn(),
};

const createPopulateQuery = (result) => ({
    select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(result),
            }),
        }),
    }),
});

const createLeanQuery = (result) => ({
    select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(result),
        }),
    }),
});

const loadSearchService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Album.js", () => ({
        default: mockAlbumModel,
    }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));

    const { default: searchService } = await import(
        "../../src/services/search/search.service.js"
    );

    return { searchService };
};

describe("searchService artist active status filtering", () => {
    beforeEach(() => {
        mockAlbumModel.find.mockReset();
        mockArtistModel.find.mockReset();
        mockTrackModel.find.mockReset();
    });

    test("searchSongs only returns songs from active artists", async () => {
        const { searchService } = await loadSearchService();

        mockTrackModel.find.mockReturnValue(
            createPopulateQuery([
                {
                    _id: "song-1",
                    title: "Mua Dem",
                    versionTitle: "",
                    avatar: "song-1.jpg",
                    coverImage: ["cover-1.jpg"],
                    createdAt: "2026-08-01T00:00:00.000Z",
                    artist_artistId: { _id: "artist-1", activeStatus: "active" },
                },
                {
                    _id: "song-2",
                    title: "Mua Roi",
                    versionTitle: "",
                    avatar: "song-2.jpg",
                    coverImage: ["cover-2.jpg"],
                    createdAt: "2026-08-02T00:00:00.000Z",
                    artist_artistId: null,
                },
            ])
        );

        const result = await searchService.searchSongs({ q: "mua" });

        expect(result.items).toEqual([
            {
                _id: "song-1",
                title: "Mua Dem",
                versionTitle: "",
                avatar: "song-1.jpg",
                coverImage: ["cover-1.jpg"],
                createdAt: "2026-08-01T00:00:00.000Z",
            },
        ]);
    });

    test("searchAlbums only returns albums from active artists", async () => {
        const { searchService } = await loadSearchService();

        mockAlbumModel.find.mockReturnValue(
            createPopulateQuery([
                {
                    _id: "album-1",
                    title: "Summer Nights",
                    coverImage: "album-1.jpg",
                    createdAt: "2026-08-01T00:00:00.000Z",
                    artistId: { _id: "artist-1", activeStatus: "active" },
                },
                {
                    _id: "album-2",
                    title: "Summer Rain",
                    coverImage: "album-2.jpg",
                    createdAt: "2026-08-02T00:00:00.000Z",
                    artistId: null,
                },
            ])
        );

        const result = await searchService.searchAlbums({ q: "summer" });

        expect(result.items).toEqual([
            {
                _id: "album-1",
                title: "Summer Nights",
                coverImage: "album-1.jpg",
                createdAt: "2026-08-01T00:00:00.000Z",
            },
        ]);
    });

    test("searchAll filters songs and albums by artist active status", async () => {
        const { searchService } = await loadSearchService();

        mockTrackModel.find.mockReturnValue(
            createPopulateQuery([
                {
                    _id: "song-1",
                    title: "Hello Summer",
                    versionTitle: "",
                    avatar: "song-1.jpg",
                    coverImage: ["cover-1.jpg"],
                    createdAt: "2026-08-01T00:00:00.000Z",
                    artist_artistId: { _id: "artist-1", activeStatus: "active" },
                },
                {
                    _id: "song-2",
                    title: "Hello Rain",
                    versionTitle: "",
                    avatar: "song-2.jpg",
                    coverImage: ["cover-2.jpg"],
                    createdAt: "2026-08-02T00:00:00.000Z",
                    artist_artistId: null,
                },
            ])
        );
        mockArtistModel.find.mockReturnValue(
            createLeanQuery([
                {
                    _id: "artist-1",
                    name: "Hello Band",
                    avatar: "artist-1.jpg",
                    createdAt: "2026-08-01T00:00:00.000Z",
                },
            ])
        );
        mockAlbumModel.find.mockReturnValue(
            createPopulateQuery([
                {
                    _id: "album-1",
                    title: "Hello Album",
                    coverImage: "album-1.jpg",
                    createdAt: "2026-08-01T00:00:00.000Z",
                    artistId: { _id: "artist-1", activeStatus: "active" },
                },
                {
                    _id: "album-2",
                    title: "Hello Hidden",
                    coverImage: "album-2.jpg",
                    createdAt: "2026-08-02T00:00:00.000Z",
                    artistId: null,
                },
            ])
        );

        const result = await searchService.searchAll({ q: "hello" });

        expect(result).toEqual({
            songs: [
                {
                    _id: "song-1",
                    title: "Hello Summer",
                    versionTitle: "",
                    avatar: "song-1.jpg",
                    coverImage: ["cover-1.jpg"],
                    createdAt: "2026-08-01T00:00:00.000Z",
                },
            ],
            artists: [
                {
                    _id: "artist-1",
                    name: "Hello Band",
                    avatar: "artist-1.jpg",
                    createdAt: "2026-08-01T00:00:00.000Z",
                },
            ],
            albums: [
                {
                    _id: "album-1",
                    title: "Hello Album",
                    coverImage: "album-1.jpg",
                    createdAt: "2026-08-01T00:00:00.000Z",
                },
            ],
        });
    });
});
