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

describe("View Sync Lyrics - trackService.getTrackDetail", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("exposes both static and synced lyrics in track detail", async () => {
        const { trackService } = await loadTrackService();
        mockTrackModel.findOne.mockReturnValue(
            createAwaitableQuery({
                _id: "507f1f77bcf86cd799439141",
                title: "Lyric Track",
                duration: 200,
                avatar: "lyric.png",
                coverImage: [],
                releaseDate: null,
                stats: {},
                lyricsStatic: "Line 1\nLine 2",
                lyricsSyncUrl: "https://example.com/lyrics/lyric-track.lrc",
                artist_artistId: null,
                album_albumId: null,
                genreIds: [],
            })
        );

        const result = await trackService.getTrackDetail(
            "507f1f77bcf86cd799439141"
        );

        expect(result.lyrics).toEqual({
            static: "Line 1\nLine 2",
            syncUrl: "https://example.com/lyrics/lyric-track.lrc",
        });
    });

    test("keeps syncUrl empty when the track only has static lyrics", async () => {
        const { trackService } = await loadTrackService();
        mockTrackModel.findOne.mockReturnValue(
            createAwaitableQuery({
                _id: "507f1f77bcf86cd799439142",
                title: "Static Only Track",
                duration: 195,
                avatar: "static.png",
                coverImage: [],
                releaseDate: null,
                stats: {},
                lyricsStatic: "Only static lyrics",
                lyricsSyncUrl: "",
                artist_artistId: null,
                album_albumId: null,
                genreIds: [],
            })
        );

        const result = await trackService.getTrackDetail(
            "507f1f77bcf86cd799439142"
        );

        expect(result.lyrics).toEqual({
            static: "Only static lyrics",
            syncUrl: "",
        });
    });
});
