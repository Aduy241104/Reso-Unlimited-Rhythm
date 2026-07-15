import { jest } from "@jest/globals";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const albumId = "507f1f77bcf86cd799439011";
const artistId = "507f1f77bcf86cd799439012";
const userId = "507f1f77bcf86cd799439013";
const trackIdOne = "507f1f77bcf86cd799439021";
const trackIdTwo = "507f1f77bcf86cd799439022";

const mockAlbumModel = {
    findById: jest.fn(),
};

const mockArtistModel = {
    collection: {
        name: "artists",
    },
};

const mockNotificationModel = {
    create: jest.fn(),
};

const mockTrackModel = {
    find: jest.fn(),
    bulkWrite: jest.fn(),
};

const createAlbumPopulateQuery = (result) => ({
    populate: jest.fn().mockResolvedValue(result),
});

const createAlbumLeanQuery = (result) => ({
    populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(result),
    }),
});

const createTrackSelectQuery = (result) => ({
    select: jest.fn().mockResolvedValue(result),
});

const createTrackLeanQuery = (result) => ({
    select: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(result),
        }),
    }),
});

const createAlbumTrackList = () => [
    { trackId: trackIdOne, order: 1 },
    { trackId: trackIdTwo, order: 2 },
];

const createAlbumAdminDocument = () => ({
    _id: albumId,
    title: "Signal Bloom",
    status: "active",
    blockedReason: "",
    previousStatusBeforeAdminBlock: null,
    trackList: createAlbumTrackList(),
    artistId: {
        _id: artistId,
        userId,
        name: "Synth Bloom",
    },
    save: jest.fn().mockResolvedValue(undefined),
});

const createAlbumDetailDocument = (overrides = {}) => ({
    _id: albumId,
    title: "Signal Bloom",
    coverImage: "",
    releaseDate: new Date("2026-07-01T00:00:00.000Z"),
    status: "blocked",
    blockedReason: "Policy violation",
    totalDuration: 0,
    trackList: createAlbumTrackList(),
    artistId: {
        _id: artistId,
        name: "Synth Bloom",
        userId: {
            email: "artist@example.com",
        },
        bio: "",
        avatar: "",
        coverImage: "",
        activeStatus: "active",
        blockedReason: "",
        stats: {
            followers: 0,
            totalStreams: 0,
            monthlyListeners: 0,
        },
    },
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-15T00:00:00.000Z"),
    ...overrides,
});

const createAdminAlbumService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Album.js", () => ({
        default: mockAlbumModel,
    }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/Notification.js", () => ({
        default: mockNotificationModel,
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));

    return import("../../src/services/album/admin.album.service.js");
};

describe("adminAlbumService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockNotificationModel.create.mockResolvedValue({
            toObject: () => ({}),
        });
    });

    test("blocks tracks using ids from album trackList", async () => {
        const { default: adminAlbumService } = await createAdminAlbumService();
        const albumDocument = createAlbumAdminDocument();
        const previouslyHiddenAt = new Date("2026-06-20T00:00:00.000Z");

        mockAlbumModel.findById
            .mockReturnValueOnce(createAlbumPopulateQuery(albumDocument))
            .mockReturnValueOnce(
                createAlbumLeanQuery(
                    createAlbumDetailDocument({
                        status: "blocked",
                        blockedReason: "Album policy violation",
                    })
                )
            );

        mockTrackModel.find
            .mockReturnValueOnce(
                createTrackSelectQuery([
                    {
                        _id: trackIdOne,
                        activeStatus: "active",
                        hiddenReason: "",
                        hiddenAt: null,
                        blockedByAlbumId: null,
                    },
                    {
                        _id: trackIdTwo,
                        activeStatus: "hidden",
                        hiddenReason: "Needs review",
                        hiddenAt: previouslyHiddenAt,
                        blockedByAlbumId: null,
                    },
                ])
            )
            .mockReturnValueOnce(createTrackLeanQuery([]));

        mockTrackModel.bulkWrite.mockResolvedValue({ ok: 1 });

        const result = await adminAlbumService.updateAlbumStatusForAdmin(
            albumId,
            {
                action: "block",
                blockedReason: "Album policy violation",
            }
        );

        expect(mockTrackModel.find).toHaveBeenNthCalledWith(1, {
            _id: { $in: [trackIdOne, trackIdTwo] },
        });
        expect(mockTrackModel.find).not.toHaveBeenCalledWith(
            expect.objectContaining({ album_albumId: albumId })
        );
        expect(mockTrackModel.bulkWrite).toHaveBeenCalledTimes(1);
        expect(mockTrackModel.bulkWrite).toHaveBeenCalledWith([
            {
                updateOne: {
                    filter: { _id: trackIdOne },
                    update: {
                        $set: {
                            activeStatus: "blocked",
                            blockedReason: "Album policy violation",
                            hiddenReason: "",
                            hiddenAt: null,
                            blockedByAlbumId: albumId,
                            previousActiveStatusBeforeAlbumBlock: "active",
                            previousHiddenReasonBeforeAlbumBlock: "",
                            previousHiddenAtBeforeAlbumBlock: null,
                        },
                    },
                },
            },
            {
                updateOne: {
                    filter: { _id: trackIdTwo },
                    update: {
                        $set: {
                            activeStatus: "blocked",
                            blockedReason: "Album policy violation",
                            hiddenReason: "",
                            hiddenAt: null,
                            blockedByAlbumId: albumId,
                            previousActiveStatusBeforeAlbumBlock: "hidden",
                            previousHiddenReasonBeforeAlbumBlock: "Needs review",
                            previousHiddenAtBeforeAlbumBlock: previouslyHiddenAt,
                        },
                    },
                },
            },
        ]);
        expect(albumDocument.save).toHaveBeenCalledTimes(1);
        expect(result.status).toBe("blocked");
    });

    test("loads album detail tracks using ids from album trackList", async () => {
        const { default: adminAlbumService } = await createAdminAlbumService();
        const albumDetailDocument = createAlbumDetailDocument({
            trackList: [
                { trackId: trackIdTwo, order: 2 },
                { trackId: trackIdOne, order: 1 },
            ],
        });

        mockAlbumModel.findById.mockReturnValue(
            createAlbumLeanQuery(albumDetailDocument)
        );

        mockTrackModel.find.mockReturnValue(
            createTrackLeanQuery([
                {
                    _id: trackIdTwo,
                    title: "Second Signal",
                    duration: 180,
                    avatar: "",
                    coverImage: [],
                    releaseDate: new Date("2026-07-02T00:00:00.000Z"),
                    approvalStatus: "approved",
                    activeStatus: "active",
                    blockedReason: "",
                    hiddenReason: "",
                    hiddenAt: null,
                    artist_artistId: {
                        _id: artistId,
                        name: "Synth Bloom",
                        avatar: "",
                    },
                    createdAt: new Date("2026-07-03T00:00:00.000Z"),
                    updatedAt: new Date("2026-07-04T00:00:00.000Z"),
                },
                {
                    _id: trackIdOne,
                    title: "First Signal",
                    duration: 200,
                    avatar: "",
                    coverImage: [],
                    releaseDate: new Date("2026-07-01T00:00:00.000Z"),
                    approvalStatus: "approved",
                    activeStatus: "active",
                    blockedReason: "",
                    hiddenReason: "",
                    hiddenAt: null,
                    artist_artistId: {
                        _id: artistId,
                        name: "Synth Bloom",
                        avatar: "",
                    },
                    createdAt: new Date("2026-07-01T00:00:00.000Z"),
                    updatedAt: new Date("2026-07-02T00:00:00.000Z"),
                },
            ])
        );

        const result = await adminAlbumService.getAlbumDetailForAdmin(albumId);

        expect(mockTrackModel.find).toHaveBeenCalledWith({
            _id: { $in: [trackIdTwo, trackIdOne] },
        });
        expect(result.tracks.map((item) => item.track.id)).toEqual([
            trackIdOne,
            trackIdTwo,
        ]);
    });
});
