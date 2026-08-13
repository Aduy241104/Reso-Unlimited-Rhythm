import {
    compareFingerprints,
    frameSimilarity,
    popcount32,
} from "../../src/services/fingerprint/fingerprintSimilarity.service.js";

describe("fingerprint similarity", () => {
    test("uses unsigned 32-bit Hamming distance", () => {
        expect(popcount32(0xffffffff)).toBe(32);
        expect(frameSimilarity(0, 0)).toBe(1);
        expect(frameSimilarity(0, 0xffffffff)).toBe(0);
    });

    test("detects aligned identical fingerprint frames", () => {
        const result = compareFingerprints([1, 2, 3, 4], [1, 2, 3, 4], {
            durationA: 40,
            durationB: 40,
        });

        expect(result).toMatchObject({
            similarityScore: 1,
            overlapRatio: 1,
            classification: "high",
            bestOffset: 0,
        });
    });

    test("finds a bounded offset and reports trimmed overlap", () => {
        const result = compareFingerprints([10, 11, 12], [99, 10, 11, 12, 100], {
            durationA: 30,
            durationB: 50,
            alignmentWindow: 3,
        });

        expect(result).toMatchObject({
            similarityScore: 1,
            overlapRatio: 1,
            classification: "high",
            bestOffset: 1,
        });
        expect(result.overlapSeconds).toBe(30);
    });

    test("does not classify unrelated frames as a match", () => {
        const result = compareFingerprints(
            new Array(20).fill(0),
            new Array(20).fill(0xffffffff),
            { durationA: 20, durationB: 20 }
        );

        expect(result.classification).toBe("none");
        expect(result.similarityScore).toBe(0);
    });
});
