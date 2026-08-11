import {
    getFingerprintInvalidationFields,
    isReusableFingerprintRecord,
    shouldInvalidateFingerprintRecord,
} from "../../src/services/fingerprint/audioFingerprint.job.js";

describe("audio fingerprint version lifecycle", () => {
    test("does not reuse a completed fingerprint from an older audio version", () => {
        const oldRecord = {
            status: "completed",
            audioVersion: 1,
            sourceAudioHash: "OLD",
            rawFingerprint: [1, 2, 3],
        };

        expect(shouldInvalidateFingerprintRecord(oldRecord, {
            audioVersion: 2,
            sourceAudioHash: "NEW",
        })).toBe(true);
        expect(isReusableFingerprintRecord(oldRecord, {
            audioVersion: 2,
            sourceAudioHash: "NEW",
        })).toBe(false);
    });

    test("invalidates raw and derived fields before processing the new audio", () => {
        expect(getFingerprintInvalidationFields({
            audioVersion: 2,
            sourceAudioHash: "NEW",
        })).toMatchObject({
            status: "pending",
            audioVersion: 2,
            sourceAudioHash: "NEW",
            rawFingerprint: [],
            fingerprintHash: "",
            sourceAudioFormat: "",
            duration: 0,
            processingStartedAt: null,
            generatedAt: null,
            retryCount: 0,
        });
    });

    test("reuses only a completed record with the same version and source hash", () => {
        const current = {
            status: "completed",
            audioVersion: 2,
            sourceAudioHash: "NEW",
        };

        expect(isReusableFingerprintRecord(current, {
            audioVersion: 2,
            sourceAudioHash: "NEW",
        })).toBe(true);
        expect(isReusableFingerprintRecord(current, {
            audioVersion: 2,
            sourceAudioHash: "OTHER",
        })).toBe(false);
    });
});
