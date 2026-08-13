const DEFAULT_ALIGNMENT_WINDOW = 100;
const DEFAULT_REVIEW_THRESHOLD = 0.72;
const DEFAULT_HIGH_THRESHOLD = 0.88;
const DEFAULT_MIN_OVERLAP_RATIO = 0.65;

const toUnsigned32 = (value) => Number(value) >>> 0;

export const popcount32 = (value) => {
    let current = toUnsigned32(value);
    let count = 0;
    while (current !== 0) {
        current = (current & (current - 1)) >>> 0;
        count += 1;
    }
    return count;
};

export const frameSimilarity = (left, right) =>
    1 - popcount32(toUnsigned32(left) ^ toUnsigned32(right)) / 32;

const getNumberEnv = (name, fallback, min, max) => {
    const value = Number(process.env[name]);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
};

export const getFingerprintComparisonConfig = () => ({
    alignmentWindow: Math.round(getNumberEnv("FINGERPRINT_ALIGNMENT_WINDOW", DEFAULT_ALIGNMENT_WINDOW, 0, 500)),
    reviewThreshold: getNumberEnv("FINGERPRINT_REVIEW_THRESHOLD", DEFAULT_REVIEW_THRESHOLD, 0, 1),
    highThreshold: getNumberEnv("FINGERPRINT_HIGH_THRESHOLD", DEFAULT_HIGH_THRESHOLD, 0, 1),
    minOverlapRatio: getNumberEnv("FINGERPRINT_MIN_OVERLAP_RATIO", DEFAULT_MIN_OVERLAP_RATIO, 0, 1),
});

export const compareFingerprints = (fingerprintA = [], fingerprintB = [], options = {}) => {
    const first = fingerprintA.map(toUnsigned32).filter(Number.isFinite);
    const second = fingerprintB.map(toUnsigned32).filter(Number.isFinite);
    if (first.length === 0 || second.length === 0) return null;

    const config = { ...getFingerprintComparisonConfig(), ...options };
    let best = null;

    for (let offset = -config.alignmentWindow; offset <= config.alignmentWindow; offset += 1) {
        const firstStart = Math.max(0, -offset);
        const secondStart = Math.max(0, offset);
        const overlapFrames = Math.min(first.length - firstStart, second.length - secondStart);
        if (overlapFrames <= 0) continue;

        let totalSimilarity = 0;
        for (let index = 0; index < overlapFrames; index += 1) {
            totalSimilarity += frameSimilarity(first[firstStart + index], second[secondStart + index]);
        }

        const overlapRatio = overlapFrames / Math.min(first.length, second.length);
        const similarityScore = totalSimilarity / overlapFrames;
        if (!best || similarityScore * overlapRatio > best.similarityScore * best.overlapRatio) {
            best = { similarityScore, overlapFrames, overlapRatio, bestOffset: offset };
        }
    }

    if (!best) return null;

    const durationA = Number(options.durationA || 0);
    const durationB = Number(options.durationB || 0);
    const frameDuration = Math.min(
        durationA > 0 ? durationA / first.length : 1,
        durationB > 0 ? durationB / second.length : 1
    );
    const overlapSeconds = best.overlapFrames * frameDuration;
    const durationDifference = Math.abs(durationA - durationB);
    const effectiveOverlapRatio = durationA > 0 && durationB > 0
        ? Math.min(1, overlapSeconds / Math.min(durationA, durationB))
        : best.overlapRatio;

    const thresholdPass = effectiveOverlapRatio >= config.minOverlapRatio;
    const classification = !thresholdPass || best.similarityScore < config.reviewThreshold
        ? "none"
        : best.similarityScore >= config.highThreshold
            ? "high"
            : "review";

    return {
        similarityScore: Number(best.similarityScore.toFixed(6)),
        overlapScore: Number(best.similarityScore.toFixed(6)),
        overlapSeconds: Number(overlapSeconds.toFixed(3)),
        overlapRatio: Number(effectiveOverlapRatio.toFixed(6)),
        durationDifference: Number(durationDifference.toFixed(3)),
        bestOffset: best.bestOffset,
        classification,
    };
};

export default {
    popcount32,
    frameSimilarity,
    compareFingerprints,
    getFingerprintComparisonConfig,
};
