import Track from "../../src/models/Track.js";
import {
    getRequiredAudioReviewSeconds,
    getReviewTarget,
    hashReviewSnapshotValue,
    hasCompletedAudioReview,
    hasReviewedStaticLyrics,
} from "../../src/services/track/moderationReview.service.js";

describe("moderation review snapshot hashing", () => {
    test("caps the configured listening threshold at the review target duration", () => {
        expect(getRequiredAudioReviewSeconds({ configuredSeconds: 15, duration: 8 })).toBe(8);
        expect(getRequiredAudioReviewSeconds({ configuredSeconds: 15, duration: 30 })).toBe(15);
    });

    test("uses pending audio and duration as the review target", () => {
        const track = new Track({
            title: "Pending audio target",
            artist_artistId: "6a44d1972c39caf158e3734d",
            duration: 240,
            audioVersion: 1,
            pendingUpdate: {
                status: "pending",
                audioVersion: 2,
                submissionVersion: 3,
                data: {
                    title: "Pending audio target",
                    duration: 6,
                    audioFiles: [{ url: "https://example.test/pending.mp3", format: "mp3", bitrate: 128 }],
                },
            },
        });
        expect(getReviewTarget(track)).toMatchObject({
            source: "pending_update",
            versions: { audio: 2, submission: 3 },
            target: { duration: 6 },
        });
    });

    test("hashes a Mongoose copyright subdocument without following its parent cycle", () => {
        const track = new Track({
            title: "Review snapshot test",
            artist_artistId: "6a44d1972c39caf158e3734d",
            duration: 180,
            copyright: {
                copyrightOwner: "Nguyen Van A",
                recordingOwner: "Nguyen Van A",
                composer: "Nguyen Van A",
                primaryCopyrightType: "original",
                isOriginal: true,
                rightsConfirmed: true,
                declarationAccepted: true,
            },
        });

        expect(() => hashReviewSnapshotValue(track.copyright)).not.toThrow();
        expect(hashReviewSnapshotValue(track.copyright)).toMatch(/^[a-f0-9]{64}$/);
        expect(hashReviewSnapshotValue(track.copyright)).toBe(
            hashReviewSnapshotValue(track.copyright.toObject())
        );
    });

    test("handles a circular plain object deterministically", () => {
        const value = { owner: "Nguyen Van A" };
        value.self = value;

        expect(hashReviewSnapshotValue(value)).toBe(hashReviewSnapshotValue(value));
    });

    test("completes audio review at the listening threshold without requiring playback to end", () => {
        const review = {
            audioListenedSeconds: 15,
            events: [
                { type: "OPEN_AUDIO" },
                { type: "AUDIO_PLAY_STARTED" },
            ],
        };

        expect(hasCompletedAudioReview({
            review,
            audioRequired: true,
            minimumAudioSeconds: 15,
        })).toBe(true);
    });

    test("keeps audio review incomplete before the listening threshold", () => {
        const review = {
            audioListenedSeconds: 14,
            events: [
                { type: "OPEN_AUDIO" },
                { type: "AUDIO_PLAY_STARTED" },
                { type: "AUDIO_REVIEWED" },
            ],
        };

        expect(hasCompletedAudioReview({
            review,
            audioRequired: true,
            minimumAudioSeconds: 15,
        })).toBe(false);
    });

    test("does not require a static-lyrics event when the track only has LRC", () => {
        expect(hasReviewedStaticLyrics({
            review: { events: [{ type: "OPEN_LRC" }] },
            lyricsStatic: "",
        })).toBe(true);
    });

    test("requires the static-lyrics event when static lyrics exist", () => {
        expect(hasReviewedStaticLyrics({
            review: { events: [] },
            lyricsStatic: "A lyric line",
        })).toBe(false);
        expect(hasReviewedStaticLyrics({
            review: { events: [{ type: "OPEN_LYRICS" }] },
            lyricsStatic: "A lyric line",
        })).toBe(true);
    });
});
