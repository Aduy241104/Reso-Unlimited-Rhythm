import mongoose from "mongoose";
import { jest } from "@jest/globals";

const trackId = new mongoose.Types.ObjectId();
const fingerprintId = new mongoose.Types.ObjectId();

const mockTrack = {
    findOne: jest.fn(),
    exists: jest.fn(),
    updateOne: jest.fn(),
};
const mockAudioFingerprint = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
};
const mockCopyrightRegistry = { findOneAndUpdate: jest.fn() };
const mockFingerprintAudioSource = jest.fn();
const mockGetFingerprintEngineStatus = jest.fn();
const mockRebuildMatchesForTrack = jest.fn();
const mockEvaluateAutomaticTrackModeration = jest.fn();
const mockRunAcoustIdVerification = jest.fn();
const mockRunMusicBrainzVerification = jest.fn();

const query = (value) => {
    const chain = {
        select: jest.fn(() => chain),
        lean: jest.fn(async () => (typeof value === "function" ? value() : value)),
        sort: jest.fn(() => chain),
        limit: jest.fn(() => chain),
    };
    return chain;
};

const currentTrackSnapshot = () => ({
    _id: trackId,
    isDeleted: false,
    approvalStatus: "pending",
    audioVersion: 1,
    audioFiles: [{ label: "original", url: "https://cdn.test/v1.mp3" }],
});

const currentFingerprintSnapshot = () => ({
    _id: fingerprintId,
    trackId,
    algorithm: "chromaprint",
    algorithmVersion: "chromaprint-v1",
    status: "pending",
    audioVersion: 1,
    sourceAudioHash: "V1",
    retryCount: 0,
});

const loadJob = async () => {
    jest.resetModules();
    jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: mockTrack }));
    jest.unstable_mockModule("../../src/models/AudioFingerprint.js", () => ({ default: mockAudioFingerprint }));
    jest.unstable_mockModule("../../src/models/CopyrightRegistry.js", () => ({ default: mockCopyrightRegistry }));
    jest.unstable_mockModule("../../src/services/fingerprint/audioFingerprint.service.js", () => ({
        fingerprintAudioSource: mockFingerprintAudioSource,
        getFingerprintEngineStatus: mockGetFingerprintEngineStatus,
        sanitizeFingerprintError: (error) => String(error?.message || error),
    }));
    jest.unstable_mockModule("../../src/services/fingerprint/audioFingerprint.matching.service.js", () => ({
        rebuildMatchesForTrack: mockRebuildMatchesForTrack,
    }));
    jest.unstable_mockModule("../../src/services/fingerprint/automaticTrackModeration.service.js", () => ({
        evaluateAutomaticTrackModeration: mockEvaluateAutomaticTrackModeration,
    }));
    jest.unstable_mockModule("../../src/services/external/acoustid.service.js", () => ({
        runAcoustIdVerification: mockRunAcoustIdVerification,
    }));
    jest.unstable_mockModule("../../src/services/external/musicbrainz.service.js", () => ({
        runMusicBrainzVerification: mockRunMusicBrainzVerification,
    }));
    return import("../../src/services/fingerprint/audioFingerprint.job.js");
};

describe("audio fingerprint P0 version guards", () => {
    let job;

    beforeEach(async () => {
        jest.clearAllMocks();
        process.env.FINGERPRINT_ENABLED = "true";
        mockTrack.findOne.mockReturnValue(query(currentTrackSnapshot));
        mockTrack.exists.mockResolvedValue(true);
        mockTrack.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
        mockAudioFingerprint.findOne.mockReturnValue(query(currentFingerprintSnapshot));
        mockAudioFingerprint.findOneAndUpdate.mockImplementation((filter, update) => {
            if (update?.$inc) {
                return Promise.resolve({ ...currentFingerprintSnapshot(), status: "processing" });
            }
            return Promise.resolve({ ...currentFingerprintSnapshot(), ...update?.$set });
        });
        mockAudioFingerprint.updateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });
        mockAudioFingerprint.deleteOne.mockResolvedValue({ deletedCount: 0 });
        mockGetFingerprintEngineStatus.mockResolvedValue({ available: true, version: "test" });
        mockFingerprintAudioSource.mockResolvedValue({
            algorithm: "chromaprint",
            algorithmVersion: "chromaprint-v1",
            rawFingerprint: [1, 2, 3],
            fingerprintHash: "FP-V1",
            sourceAudioHash: "V1",
            sourceAudioFormat: "mp3",
            duration: 10,
        });
        mockRebuildMatchesForTrack.mockResolvedValue({ exactMatches: 0, similarityMatches: 0 });
        mockEvaluateAutomaticTrackModeration.mockResolvedValue({ status: "clean" });
        mockRunAcoustIdVerification.mockResolvedValue({ status: "not_found" });
        mockRunMusicBrainzVerification.mockResolvedValue({ status: "not_found" });
        job = await loadJob();
    });

    test("stale v1 success cannot complete or trigger registry/matching/moderation for v2", async () => {
        let claimed = false;
        mockAudioFingerprint.findOneAndUpdate.mockImplementation((filter, update) => {
            if (update?.$inc) {
                claimed = true;
                return Promise.resolve({ ...currentFingerprintSnapshot(), status: "processing" });
            }
            // The v2 invalidation/claim has replaced the record before the
            // stale v1 worker reaches its completion CAS.
            return Promise.resolve(claimed ? null : currentFingerprintSnapshot());
        });

        const result = await job.processTrackAudioFingerprint(trackId, {
            audioVersion: 1,
            sourceAudioHash: "V1",
        });

        expect(result).toMatchObject({ status: "skipped", reason: "stale_audio_version" });
        expect(mockCopyrightRegistry.findOneAndUpdate).not.toHaveBeenCalled();
        expect(mockRebuildMatchesForTrack).not.toHaveBeenCalled();
        expect(mockEvaluateAutomaticTrackModeration).not.toHaveBeenCalled();
        expect(mockRunAcoustIdVerification).not.toHaveBeenCalled();
    });

    test("stale v1 failure/unavailable uses a versioned CAS and does not mark v2 failed", async () => {
        mockAudioFingerprint.findOneAndUpdate.mockImplementation((filter, update) => {
            if (update?.$inc) return Promise.resolve({ ...currentFingerprintSnapshot(), status: "processing" });
            return Promise.resolve(currentFingerprintSnapshot());
        });
        mockFingerprintAudioSource.mockRejectedValueOnce(Object.assign(new Error("worker failed"), { code: "fingerprint_failed" }));

        const result = await job.processTrackAudioFingerprint(trackId, {
            audioVersion: 1,
            sourceAudioHash: "V1",
        });

        expect(result).toMatchObject({ status: "failed", errorCode: "fingerprint_failed" });
        expect(mockAudioFingerprint.updateOne).toHaveBeenCalledWith(
            expect.objectContaining({ status: "processing", audioVersion: 1, sourceAudioHash: "V1" }),
            expect.any(Object)
        );
        expect(mockTrack.updateOne.mock.calls.at(-1)[0]).toEqual(
            expect.objectContaining({ audioVersion: 1 })
        );
    });

    test("Track screening write is version guarded and reports zero match for stale v1", async () => {
        mockTrack.updateOne
            .mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 })
            .mockResolvedValueOnce({ matchedCount: 0, modifiedCount: 0 });

        const result = await job.processTrackAudioFingerprint(trackId, {
            audioVersion: 1,
            sourceAudioHash: "V1",
        });

        expect(result).toMatchObject({ status: "skipped", reason: "stale_audio_version" });
        expect(mockTrack.updateOne.mock.calls[1][0]).toEqual(
            expect.objectContaining({ audioVersion: 1 })
        );
        expect(mockCopyrightRegistry.findOneAndUpdate).not.toHaveBeenCalled();
        expect(mockRebuildMatchesForTrack).not.toHaveBeenCalled();
    });

    test("approved live audio stays authoritative while pending audio fingerprinting is deferred", async () => {
        mockTrack.findOne.mockReturnValue(query({
            _id: trackId,
            isDeleted: false,
            approvalStatus: "approved",
            audioVersion: 1,
            pendingUpdate: {
                status: "pending",
                audioVersion: 2,
                data: { audioFiles: [{ label: "original", url: "https://cdn.test/v2.mp3" }] },
            },
        }));

        const result = await job.scheduleTrackAudioFingerprint(trackId, {
            audioVersion: 2,
            sourceAudioHash: "V2",
            sourceAudio: { url: "https://cdn.test/v2.mp3" },
        });

        expect(result).toMatchObject({ scheduled: false, reason: "pending_update_fingerprint_deferred" });
        expect(mockAudioFingerprint.findOneAndUpdate).not.toHaveBeenCalled();
        expect(mockTrack.updateOne).not.toHaveBeenCalled();
    });

    test("reused completed fingerprint rebuilds matches before pending moderation", async () => {
        mockAudioFingerprint.findOne.mockReturnValue(query({
            ...currentFingerprintSnapshot(),
            status: "completed",
        }));
        mockAudioFingerprint.findOneAndUpdate.mockResolvedValue({
            ...currentFingerprintSnapshot(),
            status: "completed",
        });

        const result = await job.processTrackAudioFingerprint(trackId, {
            audioVersion: 1,
            sourceAudioHash: "V1",
        });

        expect(result).toMatchObject({ status: "completed", reused: true });
        expect(mockRebuildMatchesForTrack).toHaveBeenCalledWith(trackId);
        expect(mockRunAcoustIdVerification).toHaveBeenCalledWith(trackId, { reevaluate: false });
        expect(mockRunMusicBrainzVerification).toHaveBeenCalledWith(trackId, { reevaluate: false });
        expect(mockEvaluateAutomaticTrackModeration).toHaveBeenCalledWith(trackId, { fingerprintReady: true, force: true });
        expect(mockFingerprintAudioSource).not.toHaveBeenCalled();
    });
});
