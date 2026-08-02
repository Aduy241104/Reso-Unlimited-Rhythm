import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockTrackModel = {
    findOne: jest.fn(),
};

const loadTrackService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));
    jest.unstable_mockModule("../../src/models/TrackDailyRanking.js", () => ({
        default: { findOne: jest.fn() },
    }));
    jest.unstable_mockModule("../../src/models/TrackMonthlyRanking.js", () => ({
        default: { findOne: jest.fn() },
    }));
    jest.unstable_mockModule("../../src/models/Subscription.js", () => ({
        default: { findOne: jest.fn() },
    }));
    jest.unstable_mockModule("../../src/config/redisConfig.js", () => ({
        default: { isOpen: false, get: jest.fn(), setEx: jest.fn() },
    }));
    jest.unstable_mockModule(
        "../../src/services/analytics/trackStatAggregation.service.js",
        () => ({
            getAnalyticsTimezone: () => "UTC",
        })
    );

    const { default: trackService } = await import(
        "../../src/services/track/track.service.js"
    );

    return { trackService };
};

describe("View Track Details - trackService.getTrackDetail", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns formatted track detail with artist, album, genres, and lyrics", async () => {
        const { trackService } = await loadTrackService();
        mockTrackModel.findOne.mockReturnValue(
            createAwaitableQuery({
                _id: "507f1f77bcf86cd799439131",
                title: "Detail Track",
                duration: 240,
                avatar: "track.png",
                coverImage: ["cover.png"],
                releaseDate: new Date("2026-07-10T00:00:00.000Z"),
                releaseStatus: "released",
                releasedAt: new Date("2026-07-10T00:00:00.000Z"),
                activeStatus: "active",
                approvalStatus: "approved",
                stats: { totalPlay: 321 },
                lyricsStatic: "Some lyrics",
                lyricsSyncUrl: "https://example.com/detail.lrc",
                artist_artistId: {
                    _id: "507f1f77bcf86cd799439231",
                    name: "Track Artist",
                    avatar: "artist.png",
                    coverImage: "artist-cover.png",
                },
                album_albumId: {
                    _id: "507f1f77bcf86cd799439331",
                    title: "Track Album",
                    coverImage: "album.png",
                },
                genreIds: [
                    {
                        _id: "507f1f77bcf86cd799439431",
                        name: "Pop",
                        image: "pop.png",
                    },
                ],
            })
        );

        const result = await trackService.getTrackDetail(
            "507f1f77bcf86cd799439131"
        );

        expect(mockTrackModel.findOne).toHaveBeenCalledWith(
            expect.objectContaining({
                _id: "507f1f77bcf86cd799439131",
                activeStatus: "active",
                approvalStatus: "approved",
                $or: expect.any(Array),
            })
        );
        expect(result).toEqual(expect.objectContaining({
            id: "507f1f77bcf86cd799439131",
            title: "Detail Track",
            duration: 240,
            avatar: "track.png",
            coverImage: ["cover.png"],
            releaseDate: new Date("2026-07-10T00:00:00.000Z"),
            releaseStatus: "released",
            releasedAt: new Date("2026-07-10T00:00:00.000Z"),
            stats: { totalPlay: 321 },
            artist: expect.objectContaining({
                id: "507f1f77bcf86cd799439231",
                name: "Track Artist",
            }),
            album: expect.objectContaining({
                id: "507f1f77bcf86cd799439331",
                title: "Track Album",
            }),
            genres: [
                {
                    id: "507f1f77bcf86cd799439431",
                    name: "Pop",
                    image: "pop.png",
                },
            ],
            lyrics: {
                static: "Some lyrics",
                syncUrl: "https://example.com/detail.lrc",
            },
            isFavorite: false,
            favoritedAt: null,
        }));
    });

    test("throws 400 when track id is invalid", async () => {
        const { trackService } = await loadTrackService();

        await expect(trackService.getTrackDetail("bad-id")).rejects.toMatchObject({
            message: "Track id is invalid.",
            statusCode: 400,
            details: { field: "id" },
        });
    });

    test("throws 404 when track is not found", async () => {
        const { trackService } = await loadTrackService();
        mockTrackModel.findOne.mockReturnValue(createAwaitableQuery(null));

        await expect(
            trackService.getTrackDetail("507f1f77bcf86cd799439132")
        ).rejects.toMatchObject({
            message: "Track not found.",
            statusCode: 404,
        });
    });

    test("propagates database errors while loading track detail", async () => {
        const { trackService } = await loadTrackService();
        mockTrackModel.findOne.mockImplementation(() => {
            throw new Error("track database unavailable");
        });

        await expect(
            trackService.getTrackDetail("507f1f77bcf86cd799439133")
        ).rejects.toThrow("track database unavailable");
    });
});
