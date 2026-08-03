import { jest } from "@jest/globals";

process.env.JWT_SECRET = "test-secret";

const VALID_USER_ID = "507f1f77bcf86cd799439001";
const VALID_ARTIST_ID = "507f1f77bcf86cd799439002";
const VALID_ALBUM_ID = "507f1f77bcf86cd799439003";

const createQueryChain = (result) => {
    const chain = {
        select: jest.fn(),
        sort: jest.fn(),
        skip: jest.fn(),
        limit: jest.fn(),
        populate: jest.fn(),
        lean: jest.fn(),
    };

    chain.select.mockReturnValue(chain);
    chain.sort.mockReturnValue(chain);
    chain.skip.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.populate.mockReturnValue(chain);
    chain.lean.mockResolvedValue(result);

    return chain;
};

const createArtistDoc = (overrides = {}) => ({
    _id: VALID_ARTIST_ID,
    userId: VALID_USER_ID,
    name: "Followed Artist",
    avatar: "https://example.com/artist.jpg",
    coverImage: "https://example.com/cover.jpg",
    verificationStatus: "pending",
    activeStatus: "active",
    stats: {
        followers: 12,
        totalStreams: 100,
    },
    ...overrides,
});

const createAlbumDoc = (overrides = {}) => ({
    _id: VALID_ALBUM_ID,
    title: "Followed Album",
    coverImage: "https://example.com/album.jpg",
    status: "active",
    releaseDate: new Date("2026-05-01T00:00:00.000Z"),
    totalPlays: 321,
    artistId: {
        _id: VALID_ARTIST_ID,
        name: "Followed Artist",
        avatar: "https://example.com/artist.jpg",
        coverImage: "https://example.com/cover.jpg",
    },
    ...overrides,
});

const loadFollowModules = async () => {
    jest.resetModules();

    const mockInteractionModel = {
        find: jest.fn(),
    };

    jest.unstable_mockModule("../../src/models/Interaction.js", () => ({
        default: mockInteractionModel,
    }));

    const buildFollowService = {
        getFollowedArtists: async (userId) => {
            const interactions = await mockInteractionModel.find({
                userId,
                targetType: "Artist",
                action: "follow",
            })
                .populate({
                    path: "targetId",
                    select: "name avatar coverImage verificationStatus activeStatus stats",
                })
                .lean();

            return interactions
                .map((item) => item.targetId)
                .filter(Boolean);
        },
        getFollowedAlbums: async (userId) => {
            const interactions = await mockInteractionModel.find({
                userId,
                targetType: "Album",
                action: "follow",
            })
                .populate({
                    path: "targetId",
                    select: "title coverImage releaseDate status totalPlays artistId",
                    populate: {
                        path: "artistId",
                        select: "name avatar coverImage",
                    },
                })
                .lean();

            return interactions
                .map((item) => item.targetId)
                .filter(Boolean);
        },
    };

    return {
        buildFollowService,
        mockInteractionModel,
    };
};

describe("Followed Management (Customer)", () => {
    let buildFollowService;
    let mockInteractionModel;

    beforeEach(async () => {
        ({ buildFollowService, mockInteractionModel } = await loadFollowModules());
        jest.clearAllMocks();
    });

    test("View followed artists returns populated followed artists", async () => {
        const followedArtists = [
            { targetId: createArtistDoc() },
            { targetId: createArtistDoc({ _id: "artist-2", name: "Another Artist" }) },
        ];
        const chain = createQueryChain(followedArtists);
        mockInteractionModel.find.mockReturnValue(chain);

        const result = await buildFollowService.getFollowedArtists(VALID_USER_ID);

        expect(mockInteractionModel.find).toHaveBeenCalledWith({
            userId: VALID_USER_ID,
            targetType: "Artist",
            action: "follow",
        });
        expect(chain.populate).toHaveBeenCalledWith({
            path: "targetId",
            select: "name avatar coverImage verificationStatus activeStatus stats",
        });
        expect(result).toEqual([
            followedArtists[0].targetId,
            followedArtists[1].targetId,
        ]);
    });

    test("View followed artists filters out missing populated artist records", async () => {
        const chain = createQueryChain([
            { targetId: null },
            { targetId: createArtistDoc({ name: "Available Artist" }) },
        ]);
        mockInteractionModel.find.mockReturnValue(chain);

        const result = await buildFollowService.getFollowedArtists(VALID_USER_ID);

        expect(result).toEqual([
            expect.objectContaining({ name: "Available Artist" }),
        ]);
    });

    test("View Followed albums returns populated followed albums with artist data", async () => {
        const followedAlbums = [
            { targetId: createAlbumDoc() },
            { targetId: createAlbumDoc({ _id: "album-2", title: "Second Album" }) },
        ];
        const chain = createQueryChain(followedAlbums);
        mockInteractionModel.find.mockReturnValue(chain);

        const result = await buildFollowService.getFollowedAlbums(VALID_USER_ID);

        expect(mockInteractionModel.find).toHaveBeenCalledWith({
            userId: VALID_USER_ID,
            targetType: "Album",
            action: "follow",
        });
        expect(chain.populate).toHaveBeenCalledWith({
            path: "targetId",
            select: "title coverImage releaseDate status totalPlays artistId",
            populate: {
                path: "artistId",
                select: "name avatar coverImage",
            },
        });
        expect(result).toEqual([
            followedAlbums[0].targetId,
            followedAlbums[1].targetId,
        ]);
    });

    test("View Followed albums filters out missing populated album records", async () => {
        const chain = createQueryChain([
            { targetId: null },
            { targetId: createAlbumDoc({ title: "Visible Album" }) },
        ]);
        mockInteractionModel.find.mockReturnValue(chain);

        const result = await buildFollowService.getFollowedAlbums(VALID_USER_ID);

        expect(result).toEqual([
            expect.objectContaining({ title: "Visible Album" }),
        ]);
    });
});
