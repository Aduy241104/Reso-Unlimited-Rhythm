import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockTrackModel = {
    findOne: jest.fn(),
};

const mockSubscriptionModel = {
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
        default: mockSubscriptionModel,
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

const createTrackPlaybackDoc = (audioFiles) => ({
    _id: "507f1f77bcf86cd799439151",
    title: "Playback Track",
    duration: 230,
    avatar: "track.png",
    coverImage: ["cover.png"],
    releaseDate: new Date("2026-07-01T00:00:00.000Z"),
    stats: { totalPlay: 1234 },
    lyricsStatic: "Playback lyrics",
    lyricsSyncUrl: "https://example.com/playback.lrc",
    audioFiles,
    artist_artistId: {
        _id: "507f1f77bcf86cd799439251",
        name: "Playback Artist",
        avatar: "artist.png",
        coverImage: "artist-cover.png",
    },
    album_albumId: {
        _id: "507f1f77bcf86cd799439351",
        title: "Playback Album",
        coverImage: "album.png",
    },
});

describe("Play Song - trackService.getTrackPlayback", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns only the basic 128kbps mp4 stream for non-premium users", async () => {
        const { trackService } = await loadTrackService();

        mockTrackModel.findOne.mockReturnValue(
            createAwaitableQuery(
                createTrackPlaybackDoc([
                    { url: "https://cdn.example.com/basic.mp4", format: "mp4", bitrate: 128 },
                    { url: "https://cdn.example.com/lossless.flac", format: "flac", bitrate: 1000 },
                ])
            )
        );
        mockSubscriptionModel.findOne.mockReturnValue(createAwaitableQuery(null));

        const result = await trackService.getTrackPlayback(
            "507f1f77bcf86cd799439151",
            {
                id: "507f1f77bcf86cd799439451",
                subscription: { isPremium: false, premiumEndDate: null },
            }
        );

        expect(result.playback).toEqual({
            accessLevel: "basic",
            plan: null,
            defaultAudio: {
                url: "https://cdn.example.com/basic.mp4",
                format: "mp4",
                bitrate: 128,
            },
            audioFiles: [
                {
                    url: "https://cdn.example.com/basic.mp4",
                    format: "mp4",
                    bitrate: 128,
                },
            ],
        });
    });

    test("returns all valid streams and the highest bitrate by default for premium users", async () => {
        const { trackService } = await loadTrackService();

        mockTrackModel.findOne.mockReturnValue(
            createAwaitableQuery(
                createTrackPlaybackDoc([
                    { url: "https://cdn.example.com/basic.mp4", format: "mp4", bitrate: 128 },
                    { url: "https://cdn.example.com/hq.aac", format: "aac", bitrate: 320 },
                    { url: "https://cdn.example.com/lossless.flac", format: "flac", bitrate: 1000 },
                ])
            )
        );
        mockSubscriptionModel.findOne.mockReturnValue(
            createAwaitableQuery({
                planId: {
                    _id: "507f1f77bcf86cd799439551",
                    name: "Premium Plus",
                    price: 99000,
                    features: ["LOSSLESS_AUDIO"],
                    status: "active",
                },
            })
        );

        const result = await trackService.getTrackPlayback(
            "507f1f77bcf86cd799439151",
            {
                id: "507f1f77bcf86cd799439452",
                subscription: { isPremium: true, premiumEndDate: "2099-01-01T00:00:00.000Z" },
            }
        );

        expect(result.playback.accessLevel).toBe("premium");
        expect(result.playback.plan).toEqual({
            id: "507f1f77bcf86cd799439551",
            name: "Premium Plus",
        });
        expect(result.playback.defaultAudio).toEqual({
            url: "https://cdn.example.com/lossless.flac",
            format: "flac",
            bitrate: 1000,
        });
        expect(result.playback.audioFiles).toHaveLength(3);
    });

    test("throws 404 when the track has no playable audio file at all", async () => {
        const { trackService } = await loadTrackService();

        mockTrackModel.findOne.mockReturnValue(
            createAwaitableQuery(
                createTrackPlaybackDoc([{ url: "", format: "mp4", bitrate: 128 }])
            )
        );

        await expect(
            trackService.getTrackPlayback("507f1f77bcf86cd799439151", null)
        ).rejects.toMatchObject({
            message: "Track does not have any audio file.",
            statusCode: 404,
        });
    });

    test("falls back to the first valid audio stream when no mp4 128kbps file exists", async () => {
        const { trackService } = await loadTrackService();

        mockTrackModel.findOne.mockReturnValue(
            createAwaitableQuery(
                createTrackPlaybackDoc([
                    { url: "https://cdn.example.com/premium.flac", format: "flac", bitrate: 1000 },
                ])
            )
        );
        mockSubscriptionModel.findOne.mockReturnValue(createAwaitableQuery(null));

        const result = await trackService.getTrackPlayback(
            "507f1f77bcf86cd799439151",
            {
                id: "507f1f77bcf86cd799439453",
                subscription: { isPremium: false, premiumEndDate: null },
            }
        );

        expect(result.playback).toEqual({
            accessLevel: "basic",
            plan: null,
            defaultAudio: {
                url: "https://cdn.example.com/premium.flac",
                format: "flac",
                bitrate: 1000,
            },
            audioFiles: [
                {
                    url: "https://cdn.example.com/premium.flac",
                    format: "flac",
                    bitrate: 1000,
                },
            ],
        });
    });

    test("throws 400 when track id is invalid", async () => {
        const { trackService } = await loadTrackService();

        await expect(trackService.getTrackPlayback("bad-id", null)).rejects.toMatchObject({
            message: "Track id is invalid.",
            statusCode: 400,
            details: { field: "id" },
        });
    });
});
