import {
    buildTranscodePlan,
    parseAudioProbeOutput,
    validateSourceAudioProfile,
} from "../../src/services/audioTranscode.service.js";

describe("audio transcode ingest rules", () => {
    test("parses a high-bitrate mp3 source correctly", () => {
        const probeOutput = `
Input #0, mp3, from 'demo.mp3':
  Duration: 00:03:12.45, start: 0.025057, bitrate: 320 kb/s
  Stream #0:0: Audio: mp3, 44100 Hz, stereo, fltp, 320 kb/s
`;

        const profile = parseAudioProbeOutput(probeOutput, "demo.mp3");

        expect(profile).toMatchObject({
            format: "mp3",
            codec: "mp3",
            bitrate: 320,
            sampleRate: 44100,
            channels: 2,
            isLossless: false,
        });
        expect(profile.duration).toBeCloseTo(192.45, 2);
    });

    test("rejects lossy source files below the ingest bitrate threshold", () => {
        expect(() =>
            validateSourceAudioProfile({
                format: "mp3",
                codec: "mp3",
                bitrate: 192,
                sampleRate: 44100,
                isLossless: false,
            })
        ).toThrow("Lossy source audio must be at least 256 kbps.");
    });

    test("keeps every transcode tier for lossless sources", () => {
        const plan = buildTranscodePlan({
            format: "flac",
            bitrate: 1411,
            sampleRate: 44100,
            isLossless: true,
        });

        expect(plan.map((preset) => preset.label)).toEqual([
            "high",
            "medium",
            "low",
            "lowest",
        ]);
    });

    test("never upscales beyond the lossy source bitrate", () => {
        const plan = buildTranscodePlan({
            format: "m4a",
            bitrate: 256,
            sampleRate: 44100,
            isLossless: false,
        });

        expect(plan.map((preset) => preset.label)).toEqual([
            "medium",
            "low",
            "lowest",
        ]);
    });
});
