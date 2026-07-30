import { jest } from "@jest/globals";

const mockGenreModel = {
    find: jest.fn(),
    findOne: jest.fn(),
};

const mockTrackModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
};

const mockMongoose = {
    Types: {
        ObjectId: {
            isValid: jest.fn(),
        },
    },
};

const createGenre = (overrides = {}) => ({
    _id: "68761a10a123456789000001",
    name: "Pop",
    isActive: true,
    ...overrides,
});

const createTrack = (overrides = {}) => ({
    _id: "68761a10a123456789100001",
    title: "Shining Nights",
    artist_artistId: {
        _id: "68761a10a123456789200001",
        name: "Aurora Lane",
        avatar: "aurora-avatar.jpg",
        coverImage: "aurora-cover.jpg",
    },
    album_albumId: "68761a10a123456789300001",
    duration: 214,
    versionTitle: "Original Mix",
    avatar: "track-avatar.jpg",
    coverImage: ["track-cover.jpg"],
    stats: {
        totalPlay: 1280,
    },
    releaseDate: new Date("2026-06-20T00:00:00.000Z"),
    activeStatus: "active",
    approvalStatus: "approved",
    ...overrides,
});

const createQueryChain = (resolvedValue) => ({
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
});

const loadGenreService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("mongoose", () => ({
        default: mockMongoose,
    }));

    jest.unstable_mockModule("../../src/models/Genre.js", () => ({
        default: mockGenreModel,
    }));

    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));

    const [{ default: genreService }] = await Promise.all([
        import("../../src/services/userGenre/user.genre.service.js"),
    ]);

    return {
        genreService,
    };
};

describe("genreService.getGenreList", () => {
    let genreService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockMongoose.Types.ObjectId.isValid.mockReturnValue(true);

        ({ genreService } = await loadGenreService());
    });

    test("should return active genres sorted by name", async () => {
        const genres = [
            createGenre(),
            createGenre({
                _id: "68761a10a123456789000002",
                name: "Rock",
            }),
        ];

        const queryChain = createQueryChain(genres);

        mockGenreModel.find.mockReturnValue(queryChain);

        const result = await genreService.getGenreList();

        expect(mockGenreModel.find).toHaveBeenCalledWith({
            isActive: true,
        });

        expect(queryChain.sort).toHaveBeenCalledWith({
            name: 1,
        });

        expect(result).toEqual(genres);
    });

    test("should return an empty array when no active genres exist", async () => {
        const queryChain = createQueryChain([]);

        mockGenreModel.find.mockReturnValue(queryChain);

        const result = await genreService.getGenreList();

        expect(mockGenreModel.find).toHaveBeenCalledWith({
            isActive: true,
        });

        expect(queryChain.sort).toHaveBeenCalledWith({
            name: 1,
        });

        expect(result).toEqual([]);
    });
});

describe("genreService.getGenreTracksByGenreId", () => {
    let genreService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockMongoose.Types.ObjectId.isValid.mockReturnValue(true);

        ({ genreService } = await loadGenreService());
    });

    test("should return genre detail with tracks", async () => {
        const genreId = "68761a10a123456789000001";
        const genre = createGenre();
        const track = createTrack();
        const queryChain = createQueryChain([track]);

        mockGenreModel.findOne.mockReturnValue({
            lean: jest.fn().mockResolvedValue(genre),
        });

        mockTrackModel.countDocuments.mockResolvedValue(2);
        mockTrackModel.find.mockReturnValue(queryChain);

        const result = await genreService.getGenreTracksByGenreId(
            genreId,
            {
                page: "2",
                limit: "1",
            }
        );

        expect(mockMongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(
            genreId
        );

        expect(mockGenreModel.findOne).toHaveBeenCalledWith({
            _id: genreId,
            isActive: true,
        });

        expect(mockTrackModel.countDocuments).toHaveBeenCalledWith({
            genreIds: genreId,
            activeStatus: "active",
            approvalStatus: "approved",
        });

        expect(mockTrackModel.find).toHaveBeenCalledWith({
            genreIds: genreId,
            activeStatus: "active",
            approvalStatus: "approved",
        });

        expect(queryChain.select).toHaveBeenCalledWith(
            "title artist_artistId album_albumId duration versionTitle avatar coverImage stats releaseDate activeStatus approvalStatus"
        );

        expect(queryChain.populate).toHaveBeenCalledWith({
            path: "artist_artistId",
            select: "name avatar coverImage",
        });

        expect(queryChain.sort).toHaveBeenCalledWith({
            releaseDate: -1,
            createdAt: -1,
        });

        expect(queryChain.skip).toHaveBeenCalledWith(1);

        expect(queryChain.limit).toHaveBeenCalledWith(1);

        expect(result).toEqual({
            genre,
            tracks: [track],
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

    test("should return genre detail with an empty track list", async () => {
        const genreId = "68761a10a123456789000001";
        const genre = createGenre();
        const queryChain = createQueryChain([]);

        mockGenreModel.findOne.mockReturnValue({
            lean: jest.fn().mockResolvedValue(genre),
        });

        mockTrackModel.countDocuments.mockResolvedValue(0);
        mockTrackModel.find.mockReturnValue(queryChain);

        const result = await genreService.getGenreTracksByGenreId(
            genreId
        );

        expect(mockTrackModel.countDocuments).toHaveBeenCalledWith({
            genreIds: genreId,
            activeStatus: "active",
            approvalStatus: "approved",
        });

        expect(mockTrackModel.find).toHaveBeenCalledWith({
            genreIds: genreId,
            activeStatus: "active",
            approvalStatus: "approved",
        });

        expect(queryChain.skip).toHaveBeenCalledWith(0);

        expect(queryChain.limit).toHaveBeenCalledWith(24);

        expect(result).toEqual({
            genre,
            tracks: [],
            pagination: {
                page: 1,
                limit: 24,
                totalItems: 0,
                totalPages: 0,
                hasNextPage: false,
                hasPrevPage: false,
            },
        });
    });

    test("should throw AppError (400) when genre id is invalid", async () => {
        mockMongoose.Types.ObjectId.isValid.mockReturnValue(false);

        await expect(
            genreService.getGenreTracksByGenreId("abc123")
        ).rejects.toMatchObject({
            message: "Genre id is invalid.",
            statusCode: 400,
        });

        expect(mockGenreModel.findOne).not.toHaveBeenCalled();
        expect(mockTrackModel.countDocuments).not.toHaveBeenCalled();
        expect(mockTrackModel.find).not.toHaveBeenCalled();
    });

    test("should throw AppError (404) when genre is not found", async () => {
        const genreId = "68761a10a123456789000099";

        mockGenreModel.findOne.mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
        });

        await expect(
            genreService.getGenreTracksByGenreId(genreId)
        ).rejects.toMatchObject({
            message: "Genre not found.",
            statusCode: 404,
        });

        expect(mockGenreModel.findOne).toHaveBeenCalledWith({
            _id: genreId,
            isActive: true,
        });

        expect(mockTrackModel.countDocuments).not.toHaveBeenCalled();
        expect(mockTrackModel.find).not.toHaveBeenCalled();
    });
});
