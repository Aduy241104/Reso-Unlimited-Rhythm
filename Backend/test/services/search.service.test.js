import { jest } from "@jest/globals";

const mockTrackModel = {
    find: jest.fn(),
};

const mockArtistModel = {
    find: jest.fn(),
};

const mockAlbumModel = {
    find: jest.fn(),
};

const mockSearchHelper = {
    buildAlbumsSearchFilter: jest.fn(),
    buildArtistsSearchFilter: jest.fn(),
    buildPaginationMeta: jest.fn(),
    buildSongsSearchFilter: jest.fn(),
    isSearchTextMatched: jest.fn(),
    normalizePagination: jest.fn(),
    normalizeSearchKeyword: jest.fn(),
};

const createSong = (overrides = {}) => ({
    _id: "68761a10a123456789100001",
    title: "Midnight Echo",
    avatar: "midnight-echo.jpg",
    coverImage: ["midnight-echo-cover.jpg"],
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    ...overrides,
});

const createArtist = (overrides = {}) => ({
    _id: "68761a10a123456789200001",
    name: "Aurora Lane",
    avatar: "aurora-lane.jpg",
    createdAt: new Date("2026-05-15T00:00:00.000Z"),
    ...overrides,
});

const createAlbum = (overrides = {}) => ({
    _id: "68761a10a123456789300001",
    title: "Golden Lights",
    coverImage: "golden-lights.jpg",
    createdAt: new Date("2026-04-20T00:00:00.000Z"),
    ...overrides,
});

const createQueryChain = (resolvedValue) => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
});

const loadSearchService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));

    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));

    jest.unstable_mockModule("../../src/models/Album.js", () => ({
        default: mockAlbumModel,
    }));

    jest.unstable_mockModule(
        "../../src/services/search/search.service.helper.js",
        () => ({
            buildAlbumsSearchFilter:
                mockSearchHelper.buildAlbumsSearchFilter,
            buildArtistsSearchFilter:
                mockSearchHelper.buildArtistsSearchFilter,
            buildPaginationMeta: mockSearchHelper.buildPaginationMeta,
            buildSongsSearchFilter:
                mockSearchHelper.buildSongsSearchFilter,
            isSearchTextMatched: mockSearchHelper.isSearchTextMatched,
            normalizePagination: mockSearchHelper.normalizePagination,
            normalizeSearchKeyword:
                mockSearchHelper.normalizeSearchKeyword,
        })
    );

    const [{ default: searchService }] = await Promise.all([
        import("../../src/services/search/search.service.js"),
    ]);

    return {
        searchService,
    };
};

describe("searchService.searchSongs", () => {
    let searchService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockSearchHelper.normalizeSearchKeyword.mockImplementation(
            (q) => {
                if (typeof q !== "string") {
                    return "";
                }

                return q.trim();
            }
        );

        mockSearchHelper.buildSongsSearchFilter.mockImplementation(
            (keyword) => {
                if (!keyword) {
                    return null;
                }

                return {
                    activeStatus: "active",
                    approvalStatus: "approved",
                };
            }
        );

        mockSearchHelper.buildArtistsSearchFilter.mockImplementation(
            (keyword) => {
                if (!keyword) {
                    return null;
                }

                return {
                    activeStatus: "active",
                };
            }
        );

        mockSearchHelper.buildAlbumsSearchFilter.mockImplementation(
            (keyword) => {
                if (!keyword) {
                    return null;
                }

                return {
                    status: "active",
                };
            }
        );

        mockSearchHelper.normalizePagination.mockImplementation(
            (query = {}, defaultLimit = 10, maxLimit = 20) => {
                const rawPage = Number(query.page);
                const rawLimit = Number(query.limit);
                const page = Math.max(1, rawPage || 1);
                const limit = Math.min(
                    Math.max(1, rawLimit || defaultLimit),
                    maxLimit
                );
                const skip = (page - 1) * limit;

                return {
                    page,
                    limit,
                    skip,
                };
            }
        );

        mockSearchHelper.buildPaginationMeta.mockImplementation(
            (page, limit, totalItems) => ({
                page,
                limit,
                totalItems,
                totalPages: Math.max(1, Math.ceil(totalItems / limit)),
                hasNextPage:
                    page <
                    Math.max(1, Math.ceil(totalItems / limit)),
                hasPrevPage: page > 1,
            })
        );

        mockSearchHelper.isSearchTextMatched.mockImplementation(
            (source, keyword) => {
                if (typeof source !== "string") {
                    return false;
                }

                return source
                    .toLowerCase()
                    .includes(String(keyword).toLowerCase());
            }
        );

        ({ searchService } = await loadSearchService());
    });

    test("returns paginated songs successfully", async () => {
        const query = {
            q: "echo",
            page: "2",
            limit: "1",
        };

        const songs = [
            createSong(),
            createSong({
                _id: "68761a10a123456789100002",
                title: "Echoes of Summer",
                createdAt: new Date("2026-05-28T00:00:00.000Z"),
            }),
            createSong({
                _id: "68761a10a123456789100003",
                title: "Neon Lights",
                createdAt: new Date("2026-05-25T00:00:00.000Z"),
            }),
        ];

        const queryChain = createQueryChain(songs);

        mockTrackModel.find.mockReturnValue(queryChain);

        const result = await searchService.searchSongs(query);

        expect(mockSearchHelper.normalizeSearchKeyword).toHaveBeenCalledWith(
            "echo"
        );

        expect(mockSearchHelper.buildSongsSearchFilter).toHaveBeenCalledWith(
            "echo"
        );

        expect(mockSearchHelper.normalizePagination).toHaveBeenCalledWith(
            query
        );

        expect(mockTrackModel.find).toHaveBeenCalledWith({
            activeStatus: "active",
            approvalStatus: "approved",
        });

        expect(queryChain.select).toHaveBeenCalledWith(
            "_id title avatar coverImage createdAt"
        );

        expect(queryChain.sort).toHaveBeenCalledWith({
            createdAt: -1,
        });

        expect(mockSearchHelper.isSearchTextMatched).toHaveBeenNthCalledWith(
            1,
            songs[0].title,
            "echo"
        );

        expect(mockSearchHelper.isSearchTextMatched).toHaveBeenNthCalledWith(
            2,
            songs[1].title,
            "echo"
        );

        expect(mockSearchHelper.isSearchTextMatched).toHaveBeenNthCalledWith(
            3,
            songs[2].title,
            "echo"
        );

        expect(mockSearchHelper.buildPaginationMeta).toHaveBeenCalledWith(
            2,
            1,
            2
        );

        expect(result).toEqual({
            items: [songs[1]],
            pagination: {
                page: 2,
                limit: 1,
                totalItems: 2,
                totalPages: 2,
                hasNextPage: false,
                hasPrevPage: true,
            },
        });
    });

    test("returns empty result when search keyword is invalid", async () => {
        const query = {
            q: "   ",
            page: "1",
            limit: "10",
        };

        const result = await searchService.searchSongs(query);

        expect(mockSearchHelper.normalizeSearchKeyword).toHaveBeenCalledWith(
            "   "
        );

        expect(mockSearchHelper.buildSongsSearchFilter).toHaveBeenCalledWith(
            ""
        );

        expect(mockSearchHelper.normalizePagination).toHaveBeenCalledWith(
            query
        );

        expect(mockSearchHelper.buildPaginationMeta).toHaveBeenCalledWith(
            1,
            10,
            0
        );

        expect(mockTrackModel.find).not.toHaveBeenCalled();

        expect(result).toEqual({
            items: [],
            pagination: {
                page: 1,
                limit: 10,
                totalItems: 0,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
            },
        });
    });
});

describe("searchService.searchArtists", () => {
    let searchService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockSearchHelper.normalizeSearchKeyword.mockImplementation(
            (q) => {
                if (typeof q !== "string") {
                    return "";
                }

                return q.trim();
            }
        );

        mockSearchHelper.buildSongsSearchFilter.mockImplementation(
            (keyword) => {
                if (!keyword) {
                    return null;
                }

                return {
                    activeStatus: "active",
                    approvalStatus: "approved",
                };
            }
        );

        mockSearchHelper.buildArtistsSearchFilter.mockImplementation(
            (keyword) => {
                if (!keyword) {
                    return null;
                }

                return {
                    activeStatus: "active",
                };
            }
        );

        mockSearchHelper.buildAlbumsSearchFilter.mockImplementation(
            (keyword) => {
                if (!keyword) {
                    return null;
                }

                return {
                    status: "active",
                };
            }
        );

        mockSearchHelper.normalizePagination.mockImplementation(
            (query = {}, defaultLimit = 10, maxLimit = 20) => {
                const rawPage = Number(query.page);
                const rawLimit = Number(query.limit);
                const page = Math.max(1, rawPage || 1);
                const limit = Math.min(
                    Math.max(1, rawLimit || defaultLimit),
                    maxLimit
                );
                const skip = (page - 1) * limit;

                return {
                    page,
                    limit,
                    skip,
                };
            }
        );

        mockSearchHelper.buildPaginationMeta.mockImplementation(
            (page, limit, totalItems) => ({
                page,
                limit,
                totalItems,
                totalPages: Math.max(1, Math.ceil(totalItems / limit)),
                hasNextPage:
                    page <
                    Math.max(1, Math.ceil(totalItems / limit)),
                hasPrevPage: page > 1,
            })
        );

        mockSearchHelper.isSearchTextMatched.mockImplementation(
            (source, keyword) => {
                if (typeof source !== "string") {
                    return false;
                }

                return source
                    .toLowerCase()
                    .includes(String(keyword).toLowerCase());
            }
        );

        ({ searchService } = await loadSearchService());
    });

    test("returns matching artists successfully", async () => {
        const query = {
            q: "aurora",
            page: "1",
            limit: "10",
        };

        const artists = [
            createArtist(),
            createArtist({
                _id: "68761a10a123456789200002",
                name: "Northern Aurora",
            }),
            createArtist({
                _id: "68761a10a123456789200003",
                name: "Silver Waves",
            }),
        ];

        const queryChain = createQueryChain(artists);

        mockArtistModel.find.mockReturnValue(queryChain);

        const result = await searchService.searchArtists(query);

        expect(mockSearchHelper.buildArtistsSearchFilter).toHaveBeenCalledWith(
            "aurora"
        );

        expect(mockArtistModel.find).toHaveBeenCalledWith({
            activeStatus: "active",
        });

        expect(queryChain.select).toHaveBeenCalledWith(
            "_id name avatar createdAt"
        );

        expect(queryChain.sort).toHaveBeenCalledWith({
            createdAt: -1,
        });

        expect(mockSearchHelper.buildPaginationMeta).toHaveBeenCalledWith(
            1,
            10,
            2
        );

        expect(result).toEqual({
            items: [artists[0], artists[1]],
            pagination: {
                page: 1,
                limit: 10,
                totalItems: 2,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
            },
        });
    });

    test("returns empty result when no artist filter is built", async () => {
        const query = {};

        const result = await searchService.searchArtists(query);

        expect(mockSearchHelper.normalizeSearchKeyword).toHaveBeenCalledWith(
            undefined
        );

        expect(mockSearchHelper.buildArtistsSearchFilter).toHaveBeenCalledWith(
            ""
        );

        expect(mockSearchHelper.buildPaginationMeta).toHaveBeenCalledWith(
            1,
            10,
            0
        );

        expect(mockArtistModel.find).not.toHaveBeenCalled();

        expect(result).toEqual({
            items: [],
            pagination: {
                page: 1,
                limit: 10,
                totalItems: 0,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
            },
        });
    });
});

describe("searchService.searchAlbums", () => {
    let searchService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockSearchHelper.normalizeSearchKeyword.mockImplementation(
            (q) => {
                if (typeof q !== "string") {
                    return "";
                }

                return q.trim();
            }
        );

        mockSearchHelper.buildSongsSearchFilter.mockImplementation(
            (keyword) => {
                if (!keyword) {
                    return null;
                }

                return {
                    activeStatus: "active",
                    approvalStatus: "approved",
                };
            }
        );

        mockSearchHelper.buildArtistsSearchFilter.mockImplementation(
            (keyword) => {
                if (!keyword) {
                    return null;
                }

                return {
                    activeStatus: "active",
                };
            }
        );

        mockSearchHelper.buildAlbumsSearchFilter.mockImplementation(
            (keyword) => {
                if (!keyword) {
                    return null;
                }

                return {
                    status: "active",
                };
            }
        );

        mockSearchHelper.normalizePagination.mockImplementation(
            (query = {}, defaultLimit = 10, maxLimit = 20) => {
                const rawPage = Number(query.page);
                const rawLimit = Number(query.limit);
                const page = Math.max(1, rawPage || 1);
                const limit = Math.min(
                    Math.max(1, rawLimit || defaultLimit),
                    maxLimit
                );
                const skip = (page - 1) * limit;

                return {
                    page,
                    limit,
                    skip,
                };
            }
        );

        mockSearchHelper.buildPaginationMeta.mockImplementation(
            (page, limit, totalItems) => ({
                page,
                limit,
                totalItems,
                totalPages: Math.max(1, Math.ceil(totalItems / limit)),
                hasNextPage:
                    page <
                    Math.max(1, Math.ceil(totalItems / limit)),
                hasPrevPage: page > 1,
            })
        );

        mockSearchHelper.isSearchTextMatched.mockImplementation(
            (source, keyword) => {
                if (typeof source !== "string") {
                    return false;
                }

                return source
                    .toLowerCase()
                    .includes(String(keyword).toLowerCase());
            }
        );

        ({ searchService } = await loadSearchService());
    });

    test("returns paginated albums successfully", async () => {
        const query = {
            q: "golden",
            page: "1",
            limit: "1",
        };

        const albums = [
            createAlbum(),
            createAlbum({
                _id: "68761a10a123456789300002",
                title: "Golden Horizon",
            }),
            createAlbum({
                _id: "68761a10a123456789300003",
                title: "Blue Nights",
            }),
        ];

        const queryChain = createQueryChain(albums);

        mockAlbumModel.find.mockReturnValue(queryChain);

        const result = await searchService.searchAlbums(query);

        expect(mockSearchHelper.buildAlbumsSearchFilter).toHaveBeenCalledWith(
            "golden"
        );

        expect(mockAlbumModel.find).toHaveBeenCalledWith({
            status: "active",
        });

        expect(queryChain.select).toHaveBeenCalledWith(
            "_id title coverImage createdAt"
        );

        expect(queryChain.sort).toHaveBeenCalledWith({
            createdAt: -1,
        });

        expect(mockSearchHelper.buildPaginationMeta).toHaveBeenCalledWith(
            1,
            1,
            2
        );

        expect(result).toEqual({
            items: [albums[0]],
            pagination: {
                page: 1,
                limit: 1,
                totalItems: 2,
                totalPages: 2,
                hasNextPage: true,
                hasPrevPage: false,
            },
        });
    });

    test("returns empty result when no album matches keyword", async () => {
        const query = {
            q: "golden",
        };

        const albums = [
            createAlbum({
                title: "Blue Nights",
            }),
        ];

        const queryChain = createQueryChain(albums);

        mockAlbumModel.find.mockReturnValue(queryChain);

        const result = await searchService.searchAlbums(query);

        expect(mockSearchHelper.isSearchTextMatched).toHaveBeenCalledWith(
            "Blue Nights",
            "golden"
        );

        expect(mockSearchHelper.buildPaginationMeta).toHaveBeenCalledWith(
            1,
            10,
            0
        );

        expect(result).toEqual({
            items: [],
            pagination: {
                page: 1,
                limit: 10,
                totalItems: 0,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
            },
        });
    });
});

describe("searchService.searchAll", () => {
    let searchService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockSearchHelper.normalizeSearchKeyword.mockImplementation(
            (q) => {
                if (typeof q !== "string") {
                    return "";
                }

                return q.trim();
            }
        );

        mockSearchHelper.buildSongsSearchFilter.mockImplementation(
            (keyword) => {
                if (!keyword) {
                    return null;
                }

                return {
                    activeStatus: "active",
                    approvalStatus: "approved",
                };
            }
        );

        mockSearchHelper.buildArtistsSearchFilter.mockImplementation(
            (keyword) => {
                if (!keyword) {
                    return null;
                }

                return {
                    activeStatus: "active",
                };
            }
        );

        mockSearchHelper.buildAlbumsSearchFilter.mockImplementation(
            (keyword) => {
                if (!keyword) {
                    return null;
                }

                return {
                    status: "active",
                };
            }
        );

        mockSearchHelper.normalizePagination.mockImplementation(
            (query = {}, defaultLimit = 10, maxLimit = 20) => {
                const rawPage = Number(query.page);
                const rawLimit = Number(query.limit);
                const page = Math.max(1, rawPage || 1);
                const limit = Math.min(
                    Math.max(1, rawLimit || defaultLimit),
                    maxLimit
                );
                const skip = (page - 1) * limit;

                return {
                    page,
                    limit,
                    skip,
                };
            }
        );

        mockSearchHelper.buildPaginationMeta.mockImplementation(
            (page, limit, totalItems) => ({
                page,
                limit,
                totalItems,
                totalPages: Math.max(1, Math.ceil(totalItems / limit)),
                hasNextPage:
                    page <
                    Math.max(1, Math.ceil(totalItems / limit)),
                hasPrevPage: page > 1,
            })
        );

        mockSearchHelper.isSearchTextMatched.mockImplementation(
            (source, keyword) => {
                if (typeof source !== "string") {
                    return false;
                }

                return source
                    .toLowerCase()
                    .includes(String(keyword).toLowerCase());
            }
        );

        ({ searchService } = await loadSearchService());
    });

    test("returns search results across all types successfully", async () => {
        const query = {
            q: "love",
        };

        const songs = Array.from({ length: 7 }, (_, index) =>
            createSong({
                _id: `68761a10a12345678910000${index + 1}`,
                title: `Love Song ${index + 1}`,
            })
        );

        const artists = Array.from({ length: 7 }, (_, index) =>
            createArtist({
                _id: `68761a10a12345678920000${index + 1}`,
                name: `Love Artist ${index + 1}`,
            })
        );

        const albums = Array.from({ length: 7 }, (_, index) =>
            createAlbum({
                _id: `68761a10a12345678930000${index + 1}`,
                title: `Love Album ${index + 1}`,
            })
        );

        const songsQueryChain = createQueryChain(songs);
        const artistsQueryChain = createQueryChain(artists);
        const albumsQueryChain = createQueryChain(albums);

        mockTrackModel.find.mockReturnValue(songsQueryChain);
        mockArtistModel.find.mockReturnValue(artistsQueryChain);
        mockAlbumModel.find.mockReturnValue(albumsQueryChain);

        const result = await searchService.searchAll(query);

        expect(mockSearchHelper.buildSongsSearchFilter).toHaveBeenCalledWith(
            "love"
        );

        expect(mockSearchHelper.buildArtistsSearchFilter).toHaveBeenCalledWith(
            "love"
        );

        expect(mockSearchHelper.buildAlbumsSearchFilter).toHaveBeenCalledWith(
            "love"
        );

        expect(mockTrackModel.find).toHaveBeenCalledWith({
            activeStatus: "active",
            approvalStatus: "approved",
        });

        expect(mockArtistModel.find).toHaveBeenCalledWith({
            activeStatus: "active",
        });

        expect(mockAlbumModel.find).toHaveBeenCalledWith({
            status: "active",
        });

        expect(songsQueryChain.select).toHaveBeenCalledWith(
            "_id title avatar coverImage createdAt"
        );

        expect(artistsQueryChain.select).toHaveBeenCalledWith(
            "_id name avatar createdAt"
        );

        expect(albumsQueryChain.select).toHaveBeenCalledWith(
            "_id title coverImage createdAt"
        );

        expect(result.songs).toEqual(songs.slice(0, 6));
        expect(result.artists).toEqual(artists.slice(0, 6));
        expect(result.albums).toEqual(albums.slice(0, 6));
    });

    test("returns empty result when keyword is missing", async () => {
        const result = await searchService.searchAll({
            q: "   ",
        });

        expect(mockSearchHelper.normalizeSearchKeyword).toHaveBeenCalledWith(
            "   "
        );

        expect(mockSearchHelper.buildSongsSearchFilter).not.toHaveBeenCalled();
        expect(
            mockSearchHelper.buildArtistsSearchFilter
        ).not.toHaveBeenCalled();
        expect(mockSearchHelper.buildAlbumsSearchFilter).not.toHaveBeenCalled();

        expect(mockTrackModel.find).not.toHaveBeenCalled();
        expect(mockArtistModel.find).not.toHaveBeenCalled();
        expect(mockAlbumModel.find).not.toHaveBeenCalled();

        expect(result).toEqual({
            songs: [],
            artists: [],
            albums: [],
        });
    });
});
