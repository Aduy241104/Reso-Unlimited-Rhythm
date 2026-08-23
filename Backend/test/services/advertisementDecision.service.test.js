import { calculateAnalytics, chooseWeightedAd, excludeRecentlyPlayedAds, filterEligibleAds, normalizeSafeUrl } from "../../src/services/advertisement/advertisement.service.js";

describe("advertisement decision engine", () => {
    const audioAd = (overrides = {}) => ({
        _id: "64b000000000000000000001",
        type: "audio",
        priority: 1,
        targeting: { countries: [], genres: [], placements: [] },
        frequencyCap: { maxPerHour: 4, minTracksBetweenAds: 3, minMinutesBetweenAds: 8 },
        ...overrides,
    });

    test("requires the configured track and minute cooldown", () => {
        const now = Date.now();
        const ad = audioAd();
        expect(filterEligibleAds([ad], { impressions: [], tracksSinceAudio: 2, lastAudioAt: 0, recentAdIds: [] }, { country: "", genreIds: [], placement: "between_tracks" }, now)).toHaveLength(0);
        expect(filterEligibleAds([ad], { impressions: [], tracksSinceAudio: 3, lastAudioAt: now - 2 * 60000, recentAdIds: [] }, { country: "", genreIds: [], placement: "between_tracks" }, now)).toHaveLength(0);
        expect(filterEligibleAds([ad], { impressions: [], tracksSinceAudio: 3, lastAudioAt: now - 9 * 60000, recentAdIds: [] }, { country: "", genreIds: [], placement: "between_tracks" }, now)).toHaveLength(1);
    });

    test("never allows an audio advertisement before three track transitions", () => {
        const now = Date.now();
        const ad = audioAd({ frequencyCap: { maxPerHour: 4, minTracksBetweenAds: 0, minMinutesBetweenAds: 0 } });
        const context = { country: "", genreIds: [], placement: "between_tracks" };

        expect(filterEligibleAds([ad], { impressions: [], tracksSinceAudio: 2, lastAudioAt: 0, recentAdIds: [] }, context, now)).toHaveLength(0);
        expect(filterEligibleAds([ad], { impressions: [], tracksSinceAudio: 3, lastAudioAt: 0, recentAdIds: [] }, context, now)).toHaveLength(1);
    });

    test("allows a pre-roll advertisement without waiting for track transitions", () => {
        const now = Date.now();
        const ad = audioAd({ frequencyCap: { maxPerHour: 4, minTracksBetweenAds: 3, minMinutesBetweenAds: 8 } });

        expect(filterEligibleAds(
            [ad],
            { impressions: [], tracksSinceAudio: 0, lastAudioAt: now, recentAdIds: [] },
            { country: "", genreIds: [], placement: "before_track" },
            now,
        )).toHaveLength(1);
    });

    test("does not suppress a pre-roll when the same ad was recently played", () => {
        const now = Date.now();
        const ad = audioAd({ frequencyCap: { maxPerHour: 4, minTracksBetweenAds: 3, minMinutesBetweenAds: 8 } });

        expect(filterEligibleAds(
            [ad],
            { impressions: [], tracksSinceAudio: 0, lastAudioAt: now, recentAdIds: [String(ad._id)] },
            { country: "", genreIds: [], placement: "before_track" },
            now,
        )).toHaveLength(1);
    });

    test("enforces per-ad hourly impression cap", () => {
        const now = Date.now();
        const ad = audioAd({ frequencyCap: { maxPerHour: 2, minTracksBetweenAds: 0, minMinutesBetweenAds: 0 } });
        const state = { tracksSinceAudio: 10, lastAudioAt: 0, impressions: [{ adId: String(ad._id), type: "audio", at: now - 1000 }, { adId: String(ad._id), type: "audio", at: now - 2000 }] };
        expect(filterEligibleAds([ad], state, { country: "", genreIds: [], placement: "" }, now)).toHaveLength(0);
    });

    test("honors country, genre and placement targeting", () => {
        const ad = audioAd({ targeting: { countries: ["VN"], genres: ["64b000000000000000000099"], placements: ["between_tracks"] }, frequencyCap: { maxPerHour: 4, minTracksBetweenAds: 0, minMinutesBetweenAds: 0 } });
        const state = { tracksSinceAudio: 10, lastAudioAt: 0, impressions: [] };
        expect(filterEligibleAds([ad], state, { country: "VN", genreIds: ["64b000000000000000000099"], placement: "between_tracks" })).toHaveLength(1);
        expect(filterEligibleAds([ad], state, { country: "US", genreIds: ["64b000000000000000000099"], placement: "between_tracks" })).toHaveLength(0);
    });

    test("uses weighted priority without changing candidate objects", () => {
        const low = audioAd({ _id: "low", priority: 1 });
        const high = audioAd({ _id: "high", priority: 9 });
        expect(chooseWeightedAd([low, high], () => 0.05)).toBe(low);
        expect(chooseWeightedAd([low, high], () => 0.5)).toBe(high);
    });

    test("returns no candidate for an empty pool and handles non-positive weights", () => {
        expect(chooseWeightedAd([], () => 0)).toBeNull();
        const only = audioAd({ priority: 0 });
        expect(chooseWeightedAd([only], () => 0.99)).toBe(only);
    });

    test("avoids recent advertisements while another candidate exists", () => {
        const first = audioAd({ _id: "first" });
        const second = audioAd({ _id: "second" });
        expect(excludeRecentlyPlayedAds([first, second], ["first"])).toEqual([second]);
        expect(excludeRecentlyPlayedAds([first], ["first"])).toEqual([first]);
    });

    test("calculates CTR and audio completion rate without divide-by-zero", () => {
        expect(calculateAnalytics({ impression: 10, click: 2, complete: 3, skip: 1 })).toMatchObject({ ctr: 20, completionRate: 75 });
        expect(calculateAnalytics({})).toMatchObject({ ctr: 0, completionRate: 0 });
    });

    test("rejects javascript and data URLs", () => {
        expect(() => normalizeSafeUrl("javascript:alert(1)", { required: true })).toThrow();
        expect(() => normalizeSafeUrl("data:text/html,test", { required: true })).toThrow();
        expect(normalizeSafeUrl("https://example.com/banner.jpg", { required: true })).toBe("https://example.com/banner.jpg");
    });
});
