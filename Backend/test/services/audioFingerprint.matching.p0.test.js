import mongoose from "mongoose";
import { jest } from "@jest/globals";
import AudioFingerprintMatchModel from "../../src/models/AudioFingerprintMatch.js";

const lowerId = new mongoose.Types.ObjectId();
const higherId = new mongoose.Types.ObjectId();

const mockTrack = {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
};
const mockAudioFingerprint = {
    findOne: jest.fn(),
    find: jest.fn(),
};
const mockCopyrightRegistry = { find: jest.fn() };
const mockAudioFingerprintMatch = { findOneAndUpdate: jest.fn() };

const query = (value) => {
    const chain = {
        select: jest.fn(() => chain),
        lean: jest.fn(async () => (typeof value === "function" ? value() : value)),
        sort: jest.fn(() => chain),
        limit: jest.fn(() => chain),
    };
    return chain;
};

const track = (id, audioVersion = 1) => ({
    _id: id,
    artist_artistId: new mongoose.Types.ObjectId(),
    approvalStatus: "pending",
    activeStatus: "active",
    isDeleted: false,
    audioVersion,
    duration: 120,
    title: `Track ${String(id)}`,
});

const fingerprint = (trackId, { status = "completed", hash = "SAME", audioVersion = 1 } = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    trackId,
    algorithm: "chromaprint",
    algorithmVersion: "chromaprint-v1",
    status,
    matchingScope: "active",
    sourceAudioHash: hash,
    audioVersion,
    duration: 120,
    rawFingerprint: [1, 2, 3],
});

const loadMatching = async () => {
    jest.resetModules();
    jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: mockTrack }));
    jest.unstable_mockModule("../../src/models/AudioFingerprint.js", () => ({ default: mockAudioFingerprint }));
    jest.unstable_mockModule("../../src/models/AudioFingerprintMatch.js", () => ({ default: mockAudioFingerprintMatch }));
    jest.unstable_mockModule("../../src/models/CopyrightRegistry.js", () => ({ default: mockCopyrightRegistry }));
    return import("../../src/services/fingerprint/audioFingerprint.matching.service.js");
};

describe("audio fingerprint matching P0 invariants", () => {
    let matching;

    beforeEach(async () => {
        jest.clearAllMocks();
        matching = await loadMatching();
        mockCopyrightRegistry.find.mockReturnValue(query([]));
        mockAudioFingerprintMatch.findOneAndUpdate.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
    });

    test("canonicalizes IDs and versions when caller source is the larger ID", async () => {
        const sourceTrack = track(higherId, 2);
        const matchedTrack = track(lowerId, 1);
        const sourceFingerprint = fingerprint(higherId, { audioVersion: 2 });
        const matchedFingerprint = fingerprint(lowerId, { audioVersion: 1 });

        mockTrack.findById.mockImplementation((id) => query(
            String(id) === String(higherId) ? sourceTrack : matchedTrack
        ));
        mockAudioFingerprint.findOne.mockImplementation((filter) => query(
            String(filter.trackId) === String(higherId) ? sourceFingerprint : matchedFingerprint
        ));

        await matching.recordExactFileDuplicateMatch({
            sourceTrackId: higherId,
            matchedTrackId: lowerId,
            sourceAudioVersion: 2,
            matchedAudioVersion: 1,
        });

        const [filter, update] = mockAudioFingerprintMatch.findOneAndUpdate.mock.calls[0];
        expect(filter).toMatchObject({
            sourceTrackId: String(lowerId),
            matchedTrackId: String(higherId),
            sourceAudioVersion: 1,
            matchedAudioVersion: 2,
        });
        expect(update.$set).toMatchObject({
            sourceAudioVersion: 1,
            matchedAudioVersion: 2,
        });
    });

    test("exact duplicate self-verifies completed active fingerprints and equal hashes", async () => {
        const sourceTrack = track(lowerId, 1);
        const matchedTrack = track(higherId, 1);
        mockTrack.findById.mockImplementation((id) => query(
            String(id) === String(lowerId) ? sourceTrack : matchedTrack
        ));
        mockAudioFingerprint.findOne.mockImplementation((filter) => query(
            String(filter.trackId) === String(lowerId)
                ? fingerprint(lowerId, { hash: "HASH-A" })
                : fingerprint(higherId, { hash: "HASH-B" })
        ));

        await expect(matching.recordExactFileDuplicateMatch({
            sourceTrackId: lowerId,
            matchedTrackId: higherId,
        })).resolves.toBeNull();
        expect(mockAudioFingerprintMatch.findOneAndUpdate).not.toHaveBeenCalled();
    });

    test("rebuild does not increment exactMatches when exact-match verification returns null", async () => {
        const sourceTrack = track(lowerId, 1);
        const matchedTrack = track(higherId, 1);
        const sourceFingerprint = fingerprint(lowerId, { hash: "HASH-A" });
        const invalidCandidate = fingerprint(higherId, { hash: "HASH-A", status: "failed" });

        mockAudioFingerprint.findOne.mockImplementation((filter) => query(
            String(filter.trackId) === String(lowerId) ? sourceFingerprint : invalidCandidate
        ));
        mockAudioFingerprint.find.mockReturnValueOnce(query([invalidCandidate])).mockReturnValueOnce(query([]));
        mockTrack.findOne.mockReturnValue(query(sourceTrack));
        mockTrack.find.mockReturnValue(query([matchedTrack]));
        mockCopyrightRegistry.find.mockReturnValue(query([]));

        const result = await matching.rebuildMatchesForTrack(lowerId);

        expect(result).toMatchObject({ exactMatches: 0 });
        expect(mockAudioFingerprintMatch.findOneAndUpdate).not.toHaveBeenCalled();
    });

    test("versioned match identity keeps an old match historical instead of resurrecting it", async () => {
        const sourceTrack = track(lowerId, 2);
        const matchedTrack = track(higherId, 1);
        mockTrack.findById.mockImplementation((id) => query(
            String(id) === String(lowerId) ? sourceTrack : matchedTrack
        ));
        const fingerprints = [
            fingerprint(lowerId, { audioVersion: 1 }),
            fingerprint(higherId, { audioVersion: 1 }),
            fingerprint(lowerId, { audioVersion: 2 }),
            fingerprint(higherId, { audioVersion: 1 }),
        ];
        mockAudioFingerprint.findOne.mockImplementation(() => query(fingerprints.shift()));

        await matching.recordExactFileDuplicateMatch({
            sourceTrackId: lowerId,
            matchedTrackId: higherId,
            sourceAudioVersion: 1,
            matchedAudioVersion: 1,
        });
        await matching.recordExactFileDuplicateMatch({
            sourceTrackId: lowerId,
            matchedTrackId: higherId,
            sourceAudioVersion: 2,
            matchedAudioVersion: 1,
        });

        expect(mockAudioFingerprintMatch.findOneAndUpdate).toHaveBeenCalledTimes(2);
        expect(mockAudioFingerprintMatch.findOneAndUpdate.mock.calls[0][0]).toMatchObject({
            sourceAudioVersion: 1,
            matchedAudioVersion: 1,
        });
        expect(mockAudioFingerprintMatch.findOneAndUpdate.mock.calls[1][0]).toMatchObject({
            sourceAudioVersion: 2,
            matchedAudioVersion: 1,
        });
        expect(AudioFingerprintMatchModel.schema.indexes().some(([keys, options]) =>
            options?.unique === true &&
            keys.sourceAudioVersion === 1 &&
            keys.matchedAudioVersion === 1
        )).toBe(true);
    });
});
