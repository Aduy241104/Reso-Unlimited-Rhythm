import { jest } from "@jest/globals";

const mockInteractionModel = {
    create: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
};

const mockFavoriteHelper = {
    buildFavoriteTracksFilter: jest.fn(),
    buildTrackFavoriteFilter: jest.fn(),
    getTrackFavoriteInteraction: jest.fn(),
    getTrackOrThrow: jest.fn(),
    validateTrackId: jest.fn(),
};

const createTrack = (overrides = {}) => ({
    _id: {
        toString: () => "68761a10a123456789100001",
    },
    title: "Midnight Echo",
    avatar: "midnight-echo.jpg",
    coverImage: ["midnight-echo-cover.jpg"],
    duration: 214,
    artist_artistId: {
        _id: {
            toString: () => "68761a10a123456789200001",
        },
        artistName: "Aurora Lane",
        name: "Aurora Lane",
        profile: {
            fullName: "Aurora Lane",
        },
        avatar: "aurora-avatar.jpg",
    },
    album_albumId: {
        _id: {
            toString: () => "68761a10a123456789300001",
        },
        title: "Golden Lights",
        coverImage: "golden-lights.jpg",
    },
    ...overrides,
});

const createInteraction = (overrides = {}) => ({
    _id: "68761a10a123456789400001",
    userId: "68761a10a123456789500001",
    targetType: "Track",
    targetId: createTrack(),
    action: "like",
    createdAt: new Date("2026-07-01T10:00:00.000Z"),
    ...overrides,
});

const createQueryChain = (resolvedValue) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
});

const loadFavoriteService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Interaction.js", () => ({
        default: mockInteractionModel,
    }));

    jest.unstable_mockModule(
        "../../src/services/userFavorite/user.favorite.service.helper.js",
        () => ({
            buildFavoriteTracksFilter:
                mockFavoriteHelper.buildFavoriteTracksFilter,
            buildTrackFavoriteFilter:
                mockFavoriteHelper.buildTrackFavoriteFilter,
            getTrackFavoriteInteraction:
                mockFavoriteHelper.getTrackFavoriteInteraction,
            getTrackOrThrow: mockFavoriteHelper.getTrackOrThrow,
            validateTrackId: mockFavoriteHelper.validateTrackId,
        })
    );

    const [{ default: favoriteService }] = await Promise.all([
        import("../../src/services/userFavorite/user.favorite.service.js"),
    ]);

    return {
        favoriteService,
    };
};

describe("favoriteService.addTrackToFavorite", () => {
    let favoriteService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockFavoriteHelper.validateTrackId.mockImplementation(
            (trackId) => trackId
        );

        mockFavoriteHelper.getTrackOrThrow.mockResolvedValue({
            _id: "68761a10a123456789100001",
        });

        mockFavoriteHelper.getTrackFavoriteInteraction.mockResolvedValue(
            null
        );

        mockFavoriteHelper.buildTrackFavoriteFilter.mockImplementation(
            (userId, trackId) => ({
                userId,
                targetType: "Track",
                targetId: trackId,
                action: "like",
            })
        );

        ({ favoriteService } = await loadFavoriteService());
    });

    test("returns favorite status when track is added successfully", async () => {
        const result = await favoriteService.addTrackToFavorite(
            "68761a10a123456789500001",
            "68761a10a123456789100001"
        );

        expect(mockFavoriteHelper.validateTrackId).toHaveBeenCalledWith(
            "68761a10a123456789100001"
        );

        expect(mockFavoriteHelper.getTrackOrThrow).toHaveBeenCalledWith(
            "68761a10a123456789100001"
        );

        expect(
            mockFavoriteHelper.getTrackFavoriteInteraction
        ).toHaveBeenCalledWith(
            "68761a10a123456789500001",
            "68761a10a123456789100001"
        );

        expect(mockFavoriteHelper.buildTrackFavoriteFilter).toHaveBeenCalledWith(
            "68761a10a123456789500001",
            "68761a10a123456789100001"
        );

        expect(mockInteractionModel.create).toHaveBeenCalledWith({
            userId: "68761a10a123456789500001",
            targetType: "Track",
            targetId: "68761a10a123456789100001",
            action: "like",
        });

        expect(result).toEqual({
            isFavorite: true,
        });
    });

    test("returns favorite status when interaction already exists", async () => {
        mockFavoriteHelper.getTrackFavoriteInteraction.mockResolvedValue({
            _id: "68761a10a123456789400001",
        });

        const result = await favoriteService.addTrackToFavorite(
            "68761a10a123456789500001",
            "68761a10a123456789100001"
        );

        expect(mockInteractionModel.create).not.toHaveBeenCalled();

        expect(result).toEqual({
            isFavorite: true,
        });
    });

    test("returns favorite status when create hits duplicate key error", async () => {
        mockInteractionModel.create.mockRejectedValue({
            code: 11000,
        });

        const result = await favoriteService.addTrackToFavorite(
            "68761a10a123456789500001",
            "68761a10a123456789100001"
        );

        expect(result).toEqual({
            isFavorite: true,
        });
    });

    test("throws 401 when user is unauthorized", async () => {
        await expect(
            favoriteService.addTrackToFavorite(
                null,
                "68761a10a123456789100001"
            )
        ).rejects.toMatchObject({
            message: "Unauthorized.",
            statusCode: 401,
        });

        expect(mockFavoriteHelper.validateTrackId).not.toHaveBeenCalled();
    });

    test("throws validation error when track id is invalid", async () => {
        mockFavoriteHelper.validateTrackId.mockImplementation(() => {
            const error = new Error("Track id is invalid.");
            error.statusCode = 400;
            throw error;
        });

        await expect(
            favoriteService.addTrackToFavorite(
                "68761a10a123456789500001",
                "abc123"
            )
        ).rejects.toMatchObject({
            message: "Track id is invalid.",
            statusCode: 400,
        });

        expect(mockFavoriteHelper.getTrackOrThrow).not.toHaveBeenCalled();
    });

    test("throws 404 when track is not found", async () => {
        mockFavoriteHelper.getTrackOrThrow.mockRejectedValue({
            message: "Track not found.",
            statusCode: 404,
        });

        await expect(
            favoriteService.addTrackToFavorite(
                "68761a10a123456789500001",
                "68761a10a123456789100099"
            )
        ).rejects.toMatchObject({
            message: "Track not found.",
            statusCode: 404,
        });

        expect(
            mockFavoriteHelper.getTrackFavoriteInteraction
        ).not.toHaveBeenCalled();
    });

    test("throws database error when creating interaction fails", async () => {
        const error = new Error("Database write failed.");

        mockInteractionModel.create.mockRejectedValue(error);

        await expect(
            favoriteService.addTrackToFavorite(
                "68761a10a123456789500001",
                "68761a10a123456789100001"
            )
        ).rejects.toBe(error);
    });
});

describe("favoriteService.removeTrackFromFavorite", () => {
    let favoriteService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockFavoriteHelper.validateTrackId.mockImplementation(
            (trackId) => trackId
        );

        mockFavoriteHelper.getTrackOrThrow.mockResolvedValue({
            _id: "68761a10a123456789100001",
        });

        mockFavoriteHelper.buildTrackFavoriteFilter.mockImplementation(
            (userId, trackId) => ({
                userId,
                targetType: "Track",
                targetId: trackId,
                action: "like",
            })
        );

        ({ favoriteService } = await loadFavoriteService());
    });

    test("returns unfavorite status when track is removed successfully", async () => {
        const result = await favoriteService.removeTrackFromFavorite(
            "68761a10a123456789500001",
            "68761a10a123456789100001"
        );

        expect(mockFavoriteHelper.validateTrackId).toHaveBeenCalledWith(
            "68761a10a123456789100001"
        );

        expect(mockFavoriteHelper.getTrackOrThrow).toHaveBeenCalledWith(
            "68761a10a123456789100001"
        );

        expect(mockFavoriteHelper.buildTrackFavoriteFilter).toHaveBeenCalledWith(
            "68761a10a123456789500001",
            "68761a10a123456789100001"
        );

        expect(mockInteractionModel.deleteOne).toHaveBeenCalledWith({
            userId: "68761a10a123456789500001",
            targetType: "Track",
            targetId: "68761a10a123456789100001",
            action: "like",
        });

        expect(result).toEqual({
            isFavorite: false,
        });
    });

    test("throws 401 when user is unauthorized", async () => {
        await expect(
            favoriteService.removeTrackFromFavorite(
                "",
                "68761a10a123456789100001"
            )
        ).rejects.toMatchObject({
            message: "Unauthorized.",
            statusCode: 401,
        });

        expect(mockFavoriteHelper.validateTrackId).not.toHaveBeenCalled();
    });

    test("throws validation error when track id is invalid", async () => {
        mockFavoriteHelper.validateTrackId.mockImplementation(() => {
            const error = new Error("Track id is invalid.");
            error.statusCode = 400;
            throw error;
        });

        await expect(
            favoriteService.removeTrackFromFavorite(
                "68761a10a123456789500001",
                "abc123"
            )
        ).rejects.toMatchObject({
            message: "Track id is invalid.",
            statusCode: 400,
        });
    });

    test("throws 404 when track is not found", async () => {
        mockFavoriteHelper.getTrackOrThrow.mockRejectedValue({
            message: "Track not found.",
            statusCode: 404,
        });

        await expect(
            favoriteService.removeTrackFromFavorite(
                "68761a10a123456789500001",
                "68761a10a123456789100099"
            )
        ).rejects.toMatchObject({
            message: "Track not found.",
            statusCode: 404,
        });

        expect(mockInteractionModel.deleteOne).not.toHaveBeenCalled();
    });

    test("throws database error when deleting interaction fails", async () => {
        const error = new Error("Delete failed.");

        mockInteractionModel.deleteOne.mockRejectedValue(error);

        await expect(
            favoriteService.removeTrackFromFavorite(
                "68761a10a123456789500001",
                "68761a10a123456789100001"
            )
        ).rejects.toBe(error);
    });
});

describe("favoriteService.getTrackFavoriteStatus", () => {
    let favoriteService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockFavoriteHelper.validateTrackId.mockImplementation(
            (trackId) => trackId
        );

        mockFavoriteHelper.getTrackFavoriteInteraction.mockResolvedValue(
            null
        );

        ({ favoriteService } = await loadFavoriteService());
    });

    test("returns true when track is favorited", async () => {
        mockFavoriteHelper.getTrackFavoriteInteraction.mockResolvedValue({
            _id: "68761a10a123456789400001",
        });

        const result = await favoriteService.getTrackFavoriteStatus(
            "68761a10a123456789500001",
            "68761a10a123456789100001"
        );

        expect(mockFavoriteHelper.validateTrackId).toHaveBeenCalledWith(
            "68761a10a123456789100001"
        );

        expect(
            mockFavoriteHelper.getTrackFavoriteInteraction
        ).toHaveBeenCalledWith(
            "68761a10a123456789500001",
            "68761a10a123456789100001"
        );

        expect(result).toEqual({
            isFavorite: true,
        });
    });

    test("returns false when track is not favorited", async () => {
        const result = await favoriteService.getTrackFavoriteStatus(
            "68761a10a123456789500001",
            "68761a10a123456789100001"
        );

        expect(result).toEqual({
            isFavorite: false,
        });
    });

    test("throws 401 when user is unauthorized", async () => {
        await expect(
            favoriteService.getTrackFavoriteStatus(
                undefined,
                "68761a10a123456789100001"
            )
        ).rejects.toMatchObject({
            message: "Unauthorized.",
            statusCode: 401,
        });

        expect(mockFavoriteHelper.validateTrackId).not.toHaveBeenCalled();
    });

    test("throws validation error when track id is invalid", async () => {
        mockFavoriteHelper.validateTrackId.mockImplementation(() => {
            const error = new Error("Track id is invalid.");
            error.statusCode = 400;
            throw error;
        });

        await expect(
            favoriteService.getTrackFavoriteStatus(
                "68761a10a123456789500001",
                "abc123"
            )
        ).rejects.toMatchObject({
            message: "Track id is invalid.",
            statusCode: 400,
        });
    });

    test("throws database error when reading favorite interaction fails", async () => {
        const error = new Error("Read failed.");

        mockFavoriteHelper.getTrackFavoriteInteraction.mockRejectedValue(
            error
        );

        await expect(
            favoriteService.getTrackFavoriteStatus(
                "68761a10a123456789500001",
                "68761a10a123456789100001"
            )
        ).rejects.toBe(error);
    });
});

describe("favoriteService.getFavoriteTracks", () => {
    let favoriteService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockFavoriteHelper.buildFavoriteTracksFilter.mockImplementation(
            (userId) => ({
                userId,
                targetType: "Track",
                action: "like",
            })
        );

        ({ favoriteService } = await loadFavoriteService());
    });

    test("returns favorite tracks with pagination successfully", async () => {
        const interactions = [
            createInteraction(),
            createInteraction({
                _id: "68761a10a123456789400002",
                targetId: createTrack({
                    _id: {
                        toString: () => "68761a10a123456789100002",
                    },
                    title: "Summer Rain",
                    avatar: "",
                    coverImage: ["summer-rain-cover.jpg"],
                    artist_artistId: {
                        _id: {
                            toString: () => "68761a10a123456789200002",
                        },
                        artistName: "",
                        name: "Luna Hart",
                        profile: {
                            fullName: "Luna Hart",
                        },
                    },
                    album_albumId: null,
                }),
            }),
        ];

        const queryChain = createQueryChain(interactions);

        mockInteractionModel.countDocuments.mockResolvedValue(2);
        mockInteractionModel.find.mockReturnValue(queryChain);

        const result = await favoriteService.getFavoriteTracks(
            "68761a10a123456789500001",
            {
                page: "2",
                limit: "1",
            }
        );

        expect(mockFavoriteHelper.buildFavoriteTracksFilter).toHaveBeenCalledWith(
            "68761a10a123456789500001"
        );

        expect(mockInteractionModel.countDocuments).toHaveBeenCalledWith({
            userId: "68761a10a123456789500001",
            targetType: "Track",
            action: "like",
        });

        expect(mockInteractionModel.find).toHaveBeenCalledWith({
            userId: "68761a10a123456789500001",
            targetType: "Track",
            action: "like",
        });

        expect(queryChain.sort).toHaveBeenCalledWith({
            createdAt: -1,
        });

        expect(queryChain.skip).toHaveBeenCalledWith(1);

        expect(queryChain.limit).toHaveBeenCalledWith(1);

        expect(queryChain.populate).toHaveBeenCalledWith({
            path: "targetId",
            select: "title avatar coverImage duration artist_artistId album_albumId",
            populate: [
                {
                    path: "artist_artistId",
                    select: "artistName name profile.fullName avatar",
                },
                {
                    path: "album_albumId",
                    select: "title coverImage",
                },
            ],
        });

        expect(result).toEqual({
            items: [
                {
                    id: "68761a10a123456789100001",
                    title: "Midnight Echo",
                    avatar: "midnight-echo.jpg",
                    duration: 214,
                    favoritedAt: interactions[0].createdAt,
                    artist: {
                        id: "68761a10a123456789200001",
                        name: "Aurora Lane",
                    },
                    album: {
                        id: "68761a10a123456789300001",
                        title: "Golden Lights",
                    },
                },
                {
                    id: "68761a10a123456789100002",
                    title: "Summer Rain",
                    avatar: "summer-rain-cover.jpg",
                    duration: 214,
                    favoritedAt: interactions[1].createdAt,
                    artist: {
                        id: "68761a10a123456789200002",
                        name: "Luna Hart",
                    },
                    album: null,
                },
            ],
            pagination: {
                page: 2,
                limit: 1,
                totalItems: 2,
                totalPages: 2,
                hasNextPage: false,
                hasPreviousPage: true,
            },
        });
    });

    test("returns empty items when there are no favorite tracks", async () => {
        const queryChain = createQueryChain([]);

        mockInteractionModel.countDocuments.mockResolvedValue(0);
        mockInteractionModel.find.mockReturnValue(queryChain);

        const result = await favoriteService.getFavoriteTracks(
            "68761a10a123456789500001"
        );

        expect(queryChain.skip).toHaveBeenCalledWith(0);
        expect(queryChain.limit).toHaveBeenCalledWith(20);

        expect(result).toEqual({
            items: [],
            pagination: {
                page: 1,
                limit: 20,
                totalItems: 0,
                totalPages: 0,
                hasNextPage: false,
                hasPreviousPage: false,
            },
        });
    });

    test("filters out interactions with missing tracks and applies pagination bounds", async () => {
        const interactions = [
            createInteraction({
                targetId: null,
            }),
            createInteraction({
                _id: "68761a10a123456789400003",
                targetId: createTrack({
                    _id: {
                        toString: () => "68761a10a123456789100003",
                    },
                    avatar: "",
                    coverImage: [],
                    artist_artistId: {
                        _id: {
                            toString: () => "68761a10a123456789200003",
                        },
                        artistName: "",
                        name: "",
                        profile: {
                            fullName: "Sky Bloom",
                        },
                    },
                    album_albumId: null,
                }),
            }),
        ];

        const queryChain = createQueryChain(interactions);

        mockInteractionModel.countDocuments.mockResolvedValue(1);
        mockInteractionModel.find.mockReturnValue(queryChain);

        const result = await favoriteService.getFavoriteTracks(
            "68761a10a123456789500001",
            {
                page: "0",
                limit: "100",
            }
        );

        expect(queryChain.skip).toHaveBeenCalledWith(0);
        expect(queryChain.limit).toHaveBeenCalledWith(50);

        expect(result).toEqual({
            items: [
                {
                    id: "68761a10a123456789100003",
                    title: "Midnight Echo",
                    avatar: "",
                    duration: 214,
                    favoritedAt: interactions[1].createdAt,
                    artist: {
                        id: "68761a10a123456789200003",
                        name: "Sky Bloom",
                    },
                    album: null,
                },
            ],
            pagination: {
                page: 1,
                limit: 50,
                totalItems: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
            },
        });
    });

    test("throws 401 when user is unauthorized", async () => {
        await expect(
            favoriteService.getFavoriteTracks(null)
        ).rejects.toMatchObject({
            message: "Unauthorized.",
            statusCode: 401,
        });

        expect(mockFavoriteHelper.buildFavoriteTracksFilter).not.toHaveBeenCalled();
    });

    test("throws database error when counting favorite tracks fails", async () => {
        const error = new Error("Count failed.");

        mockInteractionModel.countDocuments.mockRejectedValue(error);

        await expect(
            favoriteService.getFavoriteTracks(
                "68761a10a123456789500001"
            )
        ).rejects.toBe(error);
    });

    test("throws database error when reading favorite tracks fails", async () => {
        const error = new Error("Read failed.");
        const queryChain = createQueryChain([]);

        queryChain.lean.mockRejectedValue(error);

        mockInteractionModel.countDocuments.mockResolvedValue(1);
        mockInteractionModel.find.mockReturnValue(queryChain);

        await expect(
            favoriteService.getFavoriteTracks(
                "68761a10a123456789500001"
            )
        ).rejects.toBe(error);
    });
});
