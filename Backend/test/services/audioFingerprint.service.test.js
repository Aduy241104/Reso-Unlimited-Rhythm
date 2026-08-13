import {
    fingerprintAudioSource,
    generateAudioFingerprint,
    hashAudioBuffer,
} from "../../src/services/fingerprint/audioFingerprint.service.js";

describe("audio fingerprint service safety and hashing", () => {
    test("hashes upload bytes with SHA-256", () => {
        expect(hashAudioBuffer(Buffer.from("reso-audio"))).toBe(
            "c10314d9d67c0833730e2822d4da95d2686c5722b08d351f29e2c041515b76ed"
        );
    });

    test("rejects non-backend audio URLs before downloading", async () => {
        await expect(fingerprintAudioSource({ sourceUrl: "file:///etc/passwd" }))
            .rejects.toMatchObject({ code: "source_not_allowed" });
    });

    test("requires a backend-controlled absolute path", async () => {
        await expect(generateAudioFingerprint("relative/audio.mp3"))
            .rejects.toThrow("absolute backend-controlled path");
    });
});
