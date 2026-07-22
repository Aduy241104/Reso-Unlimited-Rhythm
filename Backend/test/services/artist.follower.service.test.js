import { jest } from "@jest/globals";

const mockArtistFollowerHelpers = {
    countArtistFollowers: jest.fn(),
    findArtistByUserId: jest.fn(),
    findArtistFollowers: jest.fn(),
    getArtistDailyFollowerGrowth: jest.fn(),
    getArtistMonthlyFollowerGrowth: jest.fn(),
};

const createObjectId = (value) => ({
    toString: () => value,
});

const createArtist = (overrides = {}) => ({
    _id: createObjectId("68761a10a123456789200001"),
    name: "Aurora Lane",
    ...overrides,
});

const createFollowerInteraction = (overrides = {}) => ({
    userId: {
        _id: createObjectId("68761a10a123456789300001"),
        profile: {
            fullName: "Sky Bloom",
        },
        avatar: "sky-bloom.jpg",
    },
    createdAt: new Date("2026-07-01T10:00:00.000Z"),
    ...overrides,
});

const buildFollowFilter = (artistId) => ({
    targetType: "Artist",
    targetId: artistId,
    action: "follow",
});

const loadArtistFollowerService = async () => {
    jest.resetModules();

    jest.unstable_mockModule(
        "../../src/services/artist/artist.follower.service.helper.js",
        () => ({
            countArtistFollowers:
                mockArtistFollowerHelpers.countArtistFollowers,
            findArtistByUserId:
                mockArtistFollowerHelpers.findArtistByUserId,
            findArtistFollowers:
                mockArtistFollowerHelpers.findArtistFollowers,
            getArtistDailyFollowerGrowth:
                mockArtistFollowerHelpers.getArtistDailyFollowerGrowth,
            getArtistMonthlyFollowerGrowth:
                mockArtistFollowerHelpers.getArtistMonthlyFollowerGrowth,
        })
    );

    const [
        artistFollowerServiceModule,
        { AppError },
    ] = await Promise.all([
        import("../../src/services/artist/artist.follower.service.js"),
        import("../../src/utils/AppError.js"),
    ]);

    return {
        artistFollowerService: artistFollowerServiceModule.default,
        AppError,
    };
};

describe("artistFollowerService.getArtistFollowers", () => {
    let artistFollowerService;
    let AppError;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockArtistFollowerHelpers.findArtistByUserId.mockResolvedValue(
            createArtist()
        );
        mockArtistFollowerHelpers.findArtistFollowers.mockResolvedValue([]);
        mockArtistFollowerHelpers.countArtistFollowers.mockResolvedValue(0);
        mockArtistFollowerHelpers.getArtistDailyFollowerGrowth.mockResolvedValue(
            []
        );
        mockArtistFollowerHelpers.getArtistMonthlyFollowerGrowth.mockResolvedValue(
            []
        );

        ({ artistFollowerService, AppError } =
            await loadArtistFollowerService());
    });

    test("throws 401 when the user is unauthorized", async () => {
        const request = artistFollowerService.getArtistFollowers(null);

        await expect(request).rejects.toMatchObject({
            message: "Unauthorized.",
            statusCode: 401,
            details: null,
        });

        await expect(request).rejects.toBeInstanceOf(AppError);

        expect(
            mockArtistFollowerHelpers.findArtistByUserId
        ).not.toHaveBeenCalled();
    });

    test("throws 404 when the logged-in user does not have an artist profile", async () => {
        mockArtistFollowerHelpers.findArtistByUserId.mockResolvedValue(null);

        await expect(
            artistFollowerService.getArtistFollowers(
                "68761a10a123456789100001"
            )
        ).rejects.toMatchObject({
            message: "Artist not found.",
            statusCode: 404,
            details: {
                field: "artistId",
            },
        });

        expect(
            mockArtistFollowerHelpers.findArtistByUserId
        ).toHaveBeenCalledWith("68761a10a123456789100001");
        expect(
            mockArtistFollowerHelpers.findArtistFollowers
        ).not.toHaveBeenCalled();
    });

    test("returns followers, pagination, and growth statistics with explicit pagination", async () => {
        const artist = createArtist();
        const filter = buildFollowFilter(artist._id);
        const followers = [
            createFollowerInteraction(),
            createFollowerInteraction({
                userId: {
                    _id: createObjectId("68761a10a123456789300002"),
                    profile: {
                        fullName: "Neon River",
                    },
                    avatar: "neon-river.jpg",
                },
                createdAt: new Date("2026-07-02T12:00:00.000Z"),
            }),
        ];
        const dailyGrowth = [
            {
                date: "2026-07-01",
                count: 1,
            },
        ];
        const monthlyGrowth = [
            {
                month: "2026-07",
                count: 2,
            },
        ];

        mockArtistFollowerHelpers.findArtistByUserId.mockResolvedValue(artist);
        mockArtistFollowerHelpers.findArtistFollowers.mockResolvedValue(
            followers
        );
        mockArtistFollowerHelpers.countArtistFollowers.mockResolvedValue(5);
        mockArtistFollowerHelpers.getArtistDailyFollowerGrowth.mockResolvedValue(
            dailyGrowth
        );
        mockArtistFollowerHelpers.getArtistMonthlyFollowerGrowth.mockResolvedValue(
            monthlyGrowth
        );

        const result = await artistFollowerService.getArtistFollowers(
            "68761a10a123456789100001",
            {
                page: "2",
                limit: "2",
            }
        );

        expect(
            mockArtistFollowerHelpers.findArtistByUserId
        ).toHaveBeenCalledWith("68761a10a123456789100001");
        expect(
            mockArtistFollowerHelpers.findArtistFollowers
        ).toHaveBeenCalledWith(filter, {
            skip: 2,
            limit: 2,
        });
        expect(
            mockArtistFollowerHelpers.countArtistFollowers
        ).toHaveBeenCalledWith(filter);
        expect(
            mockArtistFollowerHelpers.getArtistDailyFollowerGrowth
        ).toHaveBeenCalledWith(filter);
        expect(
            mockArtistFollowerHelpers.getArtistMonthlyFollowerGrowth
        ).toHaveBeenCalledWith(filter);

        expect(result).toEqual({
            artist: {
                artistId: "68761a10a123456789200001",
                name: "Aurora Lane",
            },
            followers: {
                items: [
                    {
                        userId: "68761a10a123456789300001",
                        fullName: "Sky Bloom",
                        avatar: "sky-bloom.jpg",
                        followedAt: followers[0].createdAt,
                    },
                    {
                        userId: "68761a10a123456789300002",
                        fullName: "Neon River",
                        avatar: "neon-river.jpg",
                        followedAt: followers[1].createdAt,
                    },
                ],
                pagination: {
                    page: 2,
                    limit: 2,
                    totalItems: 5,
                    totalPages: 3,
                },
            },
            statistics: {
                dailyGrowth,
                monthlyGrowth,
            },
        });
    });

    test("uses default pagination values and returns zero total pages when there are no followers", async () => {
        const artist = createArtist();
        const filter = buildFollowFilter(artist._id);

        mockArtistFollowerHelpers.findArtistByUserId.mockResolvedValue(artist);
        mockArtistFollowerHelpers.findArtistFollowers.mockResolvedValue([]);
        mockArtistFollowerHelpers.countArtistFollowers.mockResolvedValue(0);

        const result = await artistFollowerService.getArtistFollowers(
            "68761a10a123456789100001",
            {
                page: "0",
                limit: "not-a-number",
            }
        );

        expect(
            mockArtistFollowerHelpers.findArtistFollowers
        ).toHaveBeenCalledWith(filter, {
            skip: 0,
            limit: 10,
        });

        expect(result).toEqual({
            artist: {
                artistId: "68761a10a123456789200001",
                name: "Aurora Lane",
            },
            followers: {
                items: [],
                pagination: {
                    page: 1,
                    limit: 10,
                    totalItems: 0,
                    totalPages: 0,
                },
            },
            statistics: {
                dailyGrowth: [],
                monthlyGrowth: [],
            },
        });
    });

    test("caps the maximum limit and filters malformed follower records while applying fallback values", async () => {
        const artist = createArtist({
            _id: createObjectId("68761a10a123456789200099"),
            name: "",
        });
        const filter = buildFollowFilter(artist._id);
        const followers = [
            createFollowerInteraction({
                userId: null,
            }),
            createFollowerInteraction({
                userId: {
                    _id: createObjectId("68761a10a123456789300099"),
                    profile: {},
                    avatar: "",
                },
                createdAt: null,
            }),
        ];

        mockArtistFollowerHelpers.findArtistByUserId.mockResolvedValue(artist);
        mockArtistFollowerHelpers.findArtistFollowers.mockResolvedValue(
            followers
        );
        mockArtistFollowerHelpers.countArtistFollowers.mockResolvedValue(1);

        const result = await artistFollowerService.getArtistFollowers(
            "68761a10a123456789100001",
            {
                page: "2.9",
                limit: "100",
            }
        );

        expect(
            mockArtistFollowerHelpers.findArtistFollowers
        ).toHaveBeenCalledWith(filter, {
            skip: 50,
            limit: 50,
        });

        expect(result).toEqual({
            artist: {
                artistId: "68761a10a123456789200099",
                name: "",
            },
            followers: {
                items: [
                    {
                        userId: "68761a10a123456789300099",
                        fullName: "",
                        avatar: "",
                        followedAt: null,
                    },
                ],
                pagination: {
                    page: 2,
                    limit: 50,
                    totalItems: 1,
                    totalPages: 1,
                },
            },
            statistics: {
                dailyGrowth: [],
                monthlyGrowth: [],
            },
        });
    });

    test("propagates artist lookup failures", async () => {
        const error = new Error("Artist lookup failed.");

        mockArtistFollowerHelpers.findArtistByUserId.mockRejectedValue(error);

        await expect(
            artistFollowerService.getArtistFollowers(
                "68761a10a123456789100001"
            )
        ).rejects.toBe(error);

        expect(
            mockArtistFollowerHelpers.findArtistFollowers
        ).not.toHaveBeenCalled();
    });

    test("propagates follower list query failures", async () => {
        const artist = createArtist();
        const filter = buildFollowFilter(artist._id);
        const error = new Error("Follower list read failed.");

        mockArtistFollowerHelpers.findArtistByUserId.mockResolvedValue(artist);
        mockArtistFollowerHelpers.findArtistFollowers.mockRejectedValue(error);

        await expect(
            artistFollowerService.getArtistFollowers(
                "68761a10a123456789100001"
            )
        ).rejects.toBe(error);

        expect(
            mockArtistFollowerHelpers.findArtistFollowers
        ).toHaveBeenCalledWith(filter, {
            skip: 0,
            limit: 10,
        });
        expect(
            mockArtistFollowerHelpers.countArtistFollowers
        ).toHaveBeenCalledWith(filter);
        expect(
            mockArtistFollowerHelpers.getArtistDailyFollowerGrowth
        ).toHaveBeenCalledWith(filter);
        expect(
            mockArtistFollowerHelpers.getArtistMonthlyFollowerGrowth
        ).toHaveBeenCalledWith(filter);
    });

    test("propagates follower count failures", async () => {
        const artist = createArtist();
        const error = new Error("Follower count failed.");

        mockArtistFollowerHelpers.findArtistByUserId.mockResolvedValue(artist);
        mockArtistFollowerHelpers.countArtistFollowers.mockRejectedValue(error);

        await expect(
            artistFollowerService.getArtistFollowers(
                "68761a10a123456789100001"
            )
        ).rejects.toBe(error);
    });

    test("propagates daily growth failures", async () => {
        const artist = createArtist();
        const error = new Error("Daily growth failed.");

        mockArtistFollowerHelpers.findArtistByUserId.mockResolvedValue(artist);
        mockArtistFollowerHelpers.getArtistDailyFollowerGrowth.mockRejectedValue(
            error
        );

        await expect(
            artistFollowerService.getArtistFollowers(
                "68761a10a123456789100001"
            )
        ).rejects.toBe(error);
    });

    test("propagates monthly growth failures", async () => {
        const artist = createArtist();
        const error = new Error("Monthly growth failed.");

        mockArtistFollowerHelpers.findArtistByUserId.mockResolvedValue(artist);
        mockArtistFollowerHelpers.getArtistMonthlyFollowerGrowth.mockRejectedValue(
            error
        );

        await expect(
            artistFollowerService.getArtistFollowers(
                "68761a10a123456789100001"
            )
        ).rejects.toBe(error);
    });
});
