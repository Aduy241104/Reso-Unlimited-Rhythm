import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";
import { getFingerprintEngineStatus, fingerprintAudioSource } from "../../src/services/fingerprint/audioFingerprint.service.js";
import { compareFingerprints } from "../../src/services/fingerprint/fingerprintSimilarity.service.js";

const engine = await getFingerprintEngineStatus();
const conditionalTest = engine.available ? test : test.skip;

const runFfmpeg = (args) => new Promise((resolve, reject) => {
    const child = spawn(ffmpegStatic, ["-y", "-hide_banner", "-loglevel", "error", ...args], { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(stderr || `ffmpeg exited with ${code}`)));
});

describe("real fpcalc audio fingerprint integration", () => {
    conditionalTest("detects re-encoded/trimmed audio and rejects different synthetic audio", async () => {
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), "reso-fingerprint-test-"));
        const original = path.join(directory, "original.wav");
        const reencoded = path.join(directory, "reencoded.mp3");
        const different = path.join(directory, "different.wav");
        const trimmed = path.join(directory, "trimmed.wav");

        try {
            await runFfmpeg(["-f", "lavfi", "-i", "sine=frequency=440:duration=8", "-ar", "44100", "-ac", "2", original]);
            await runFfmpeg(["-i", original, "-codec:a", "libmp3lame", "-b:a", "128k", reencoded]);
            await runFfmpeg(["-f", "lavfi", "-i", "sine=frequency=880:duration=8", "-ar", "44100", "-ac", "2", different]);
            await runFfmpeg(["-ss", "1", "-t", "6", "-i", original, "-ar", "44100", "-ac", "2", trimmed]);

            const [originalFingerprint, reencodedFingerprint, differentFingerprint, trimmedFingerprint] = await Promise.all([
                fingerprintAudioSource({ audioPath: original }),
                fingerprintAudioSource({ audioPath: reencoded }),
                fingerprintAudioSource({ audioPath: different }),
                fingerprintAudioSource({ audioPath: trimmed }),
            ]);

            expect(originalFingerprint.rawFingerprint.length).toBeGreaterThan(0);
            expect(reencodedFingerprint.rawFingerprint.length).toBeGreaterThan(0);
            expect(originalFingerprint.sourceAudioHash).not.toBe(reencodedFingerprint.sourceAudioHash);

            const reencodedScore = compareFingerprints(
                originalFingerprint.rawFingerprint,
                reencodedFingerprint.rawFingerprint,
                { durationA: originalFingerprint.duration, durationB: reencodedFingerprint.duration }
            );
            const differentScore = compareFingerprints(
                originalFingerprint.rawFingerprint,
                differentFingerprint.rawFingerprint,
                { durationA: originalFingerprint.duration, durationB: differentFingerprint.duration }
            );
            const trimmedScore = compareFingerprints(
                originalFingerprint.rawFingerprint,
                trimmedFingerprint.rawFingerprint,
                { durationA: originalFingerprint.duration, durationB: trimmedFingerprint.duration }
            );

            console.log(JSON.stringify({
                engine: engine.version,
                original: { duration: originalFingerprint.duration, frames: originalFingerprint.rawFingerprint.length },
                reencoded: { duration: reencodedFingerprint.duration, frames: reencodedFingerprint.rawFingerprint.length },
                reencodedScore,
                differentScore,
                trimmedScore,
            }, null, 2));

            expect(reencodedScore?.classification).toMatch(/high|review/);
            expect(trimmedScore?.classification).toMatch(/high|review/);
            expect(differentScore?.classification).toBe("none");
        } finally {
            await fs.rm(directory, { recursive: true, force: true });
        }
    }, 120_000);
});
