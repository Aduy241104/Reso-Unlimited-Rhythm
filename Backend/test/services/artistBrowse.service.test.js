import { jest } from "@jest/globals";

const mockArtistModel = {
    findOne: jest.fn(),
};

const mockArtistStatModel = {
    findOne: jest.fn(),
};

const mockAlbumModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
};

const mockTrackModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
};

const mockReleaseScheduleModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
};

const mockMongoose = {
    Types: {
        ObjectId: {
            isValid: jest.fn(),
        },
    },
};

const createArtist = (overrides = {}) => ({
    _id: "artist-123",
    userId: "user-123",
    name: "Test Artist",
    bio: "Artist bio",
    avatar: "avatar.jpg",
    coverImage: "cover.jpg",
    socialLinks: [],
    stats: {
        followers: 100,
        totalStreams: 1000,
    },
    activeStatus: "active",
    ...overrides,
});

const createAlbum = (overrides = {}) => ({
    _id: "album-123",
    artistId: "artist-123",
    title: "Test Album",
    coverImage: "album-cover.jpg",
    releaseDate: new Date("2026-05-01"),
    status: "active",
    totalPlays: 500,
    trackList: ["track-1", "track-2"],
    ...overrides,
});

const createTrack = (overrides = {}) => ({
    _id: "track-123",
    artist_artistId: "artist-123",
    title: "Test Track",
    duration: 240,
    avatar: "track-avatar.jpg",
    coverImage: ["track-cover.jpg"],
    stats: {
        totalPlay: 100,
    },
    releaseDate: new Date("2026-05-02"),
    activeStatus: "active",
    approvalStatus: "approved",
    album_albumId: {
        _id: "album-123",
        title: "Test Album",
        coverImage: "album-cover.jpg",
        releaseDate: new Date("2026-05-01"),
    },
    ...overrides,
});

const createReleaseSchedule = (overrides = {}) => ({
    _id: "schedule-123",
    artistId: "artist-123",
    type: "album",
    targetId: "album-123",
    scheduledAt: new Date("2026-06-01"),
    releasedAt: null,
    status: "scheduled",
    ...overrides,
});

const createQueryChain = (resolvedValue) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
});

const loadArtistService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("mongoose", () => ({
        default: mockMongoose,
    }));

    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));

    jest.unstable_mockModule("../../src/models/ArtistStat.js", () => ({
        default: mockArtistStatModel,
    }));

    jest.unstable_mockModule("../../src/models/Album.js", () => ({
        default: mockAlbumModel,
    }));

    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));

    jest.unstable_mockModule(
        "../../src/models/ReleaseSchedule.js",
        () => ({
            default: mockReleaseScheduleModel,
        })
    );

    const [{ default: artistService }] = await Promise.all([
        import(
            "../../src/services/artistBrowse/artistBrowse.service.js"
        ),
    ]);

    return {
        artistService,
    };
};

describe("artistService.getArtistProfile", () => {
    let artistService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockMongoose.Types.ObjectId.isValid.mockReturnValue(true);

        ({ artistService } = await loadArtistService());
    });

    test("returns artist profile successfully", async () => {
        const artist = createArtist();
        const album = createAlbum();
        const track = createTrack();

        mockArtistModel.findOne.mockReturnValue({
            lean: jest.fn().mockResolvedValue(artist),
        });

        mockArtistStatModel.findOne.mockReturnValue({
            lean: jest.fn().mockResolvedValue({
                totalFollowers: 200,
                monthlyListeners: 500,
            }),
        });

        mockAlbumModel.find.mockReturnValue(
            createQueryChain([album])
        );

        mockTrackModel.find.mockReturnValue(
            createQueryChain([track])
        );

        const result = await artistService.getArtistProfile(
            "artist-123"
        );

        expect(mockArtistModel.findOne).toHaveBeenCalledWith({
            _id: "artist-123",
            activeStatus: "active",
        });

        expect(result.artist.name).toBe("Test Artist");

        expect(result.albums).toHaveLength(1);

        expect(result.tracks).toHaveLength(1);
    });

    test("throws 400 when artist id is invalid", async () => {
        mockMongoose.Types.ObjectId.isValid.mockReturnValue(false);

        await expect(
            artistService.getArtistProfile("invalid-id")
        ).rejects.toMatchObject({
            message: "Artist id is invalid.",
            statusCode: 400,
        });
    });

    test("throws 404 when artist does not exist", async () => {
        mockArtistModel.findOne.mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
        });

        await expect(
            artistService.getArtistProfile("artist-123")
        ).rejects.toMatchObject({
            message: "Artist not found.",
            statusCode: 404,
        });
    });
});

describe("artistService.getArtistTracks", () => {
    let artistService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockMongoose.Types.ObjectId.isValid.mockReturnValue(true);

        ({ artistService } = await loadArtistService());

        mockArtistModel.findOne.mockReturnValue({
            lean: jest.fn().mockResolvedValue(createArtist()),
        });
    });

    test("returns paginated tracks", async () => {
        const track = createTrack();

        mockTrackModel.find.mockReturnValue(
            createQueryChain([track])
        );

        mockTrackModel.countDocuments.mockResolvedValue(1);

        const result = await artistService.getArtistTracks(
            "artist-123",
            {
                page: "1",
                limit: "10",
            }
        );

        expect(result.tracks).toHaveLength(1);

        expect(result.pagination).toEqual({
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
        });
    });

    test("limits maximum pagination limit to 50", async () => {
        mockTrackModel.find.mockReturnValue(
            createQueryChain([])
        );

        mockTrackModel.countDocuments.mockResolvedValue(0);

        const result = await artistService.getArtistTracks(
            "artist-123",
            {
                limit: "100",
            }
        );

        expect(result.pagination.limit).toBe(50);
    });
});

describe("artistService.getArtistAlbums", () => {
    let artistService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockMongoose.Types.ObjectId.isValid.mockReturnValue(true);

        ({ artistService } = await loadArtistService());

        mockArtistModel.findOne.mockReturnValue({
            lean: jest.fn().mockResolvedValue(createArtist()),
        });
    });

    test("returns paginated albums", async () => {
        const album = createAlbum();

        mockAlbumModel.find.mockReturnValue(
            createQueryChain([album])
        );

        mockAlbumModel.countDocuments.mockResolvedValue(1);

        const result = await artistService.getArtistAlbums(
            "artist-123",
            {
                page: "1",
                limit: "10",
            }
        );

        expect(result.albums).toHaveLength(1);

        expect(result.pagination).toEqual({
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
        });
    });
});

describe("artistService.getArtistComingReleases", () => {
    let artistService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockMongoose.Types.ObjectId.isValid.mockReturnValue(true);

        ({ artistService } = await loadArtistService());

        mockArtistModel.findOne.mockReturnValue({
            lean: jest.fn().mockResolvedValue(createArtist()),
        });
    });

    test("returns coming releases successfully", async () => {
        const schedule = createReleaseSchedule();

        const album = createAlbum();

        mockReleaseScheduleModel.find.mockReturnValue(
            createQueryChain([schedule])
        );

        mockReleaseScheduleModel.countDocuments.mockResolvedValue(1);

        mockAlbumModel.find.mockReturnValue({
            lean: jest.fn().mockResolvedValue([album]),
        });

        mockTrackModel.find.mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
        });

        const result =
            await artistService.getArtistComingReleases(
                "artist-123",
                {
                    page: "1",
                    limit: "10",
                }
            );

        expect(result.comingReleases).toHaveLength(1);

        expect(result.pagination).toEqual({
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
        });
    });
});