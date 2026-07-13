import {
    formatTrackPlayback,
    getValidAudioFiles,
} from "../../src/services/Track/track.helper.js";

describe("track playback helper", () => {
    test("keeps audio metadata and exposes the 128kbps mp3 stream to basic listeners", () => {
        const track = {
            _id: "507f1f77bcf86cd799439011",
            title: "Demo Track",
            duration: 180,
            avatar: "https://example.com/avatar.jpg",
            coverImage: ["https://example.com/cover.jpg"],
            releaseDate: new Date("2026-06-29T00:00:00.000Z"),
            stats: {
                totalLike: 10,
                totalPlay: 20,
            },
            lyricsStatic: "line 1",
            lyricsSyncUrl: "https://example.com/demo.lrc",
            audioFiles: [
                {
                    url: "https://example.com/audio-original.mp3",
                    format: "mp3",
                    bitrate: 320,
                    label: "original",
                    priority: 5,
                },
                {
                    url: "https://example.com/audio-high.mp3",
                    format: "mp3",
                    bitrate: 320,
                    label: "high",
                    priority: 4,
                },
                {
                    url: "https://example.com/audio-medium.mp3",
                    format: "mp3",
                    bitrate: 192,
                    label: "medium",
                    priority: 3,
                },
                {
                    url: "https://example.com/audio-low.mp3",
                    format: "mp3",
                    bitrate: 128,
                    label: "low",
                    priority: 2,
                },
                {
                    url: "https://example.com/audio-lowest.mp3",
                    format: "mp3",
                    bitrate: 96,
                    label: "lowest",
                    priority: 1,
                },
            ],
        };

        const validAudioFiles = getValidAudioFiles(track.audioFiles);
        const playback = formatTrackPlayback(track, validAudioFiles, {
            isPremium: false,
            plan: null,
        });

        expect(validAudioFiles).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    label: "low",
                    priority: 2,
                    bitrate: 128,
                    format: "mp3",
                }),
            ])
        );

        expect(playback.playback.accessLevel).toBe("basic");
        expect(playback.playback.defaultAudio).toEqual(
            expect.objectContaining({
                url: "https://example.com/audio-low.mp3",
                bitrate: 128,
                format: "mp3",
                label: "low",
            })
        );
        expect(playback.playback.audioFiles).toHaveLength(1);
        expect(playback.playback.audioFiles[0].url).toBe(
            "https://example.com/audio-low.mp3"
        );
        expect(playback.lyrics.syncUrl).toBe("https://example.com/demo.lrc");
    });
});
