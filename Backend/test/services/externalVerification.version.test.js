import mongoose from "mongoose";
import { jest } from "@jest/globals";

const trackId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();

const query = (value) => {
    const chain = {
        select: jest.fn(() => chain),
        lean: jest.fn(async () => value),
    };
    return chain;
};

const track = (overrides = {}) => ({
    _id: trackId,
    approvalStatus: "pending",
    artist_artistId: artistId,
    title: "Test track",
    duration: 180,
    audioVersion: 1,
    submissionVersion: 1,
    copyrightVersion: 1,
    evidenceVersion: 1,
    copyright: {
        primaryCopyrightType: "original",
        copyrightOwner: "Artist A",
        recordingOwner: "Artist A",
        declarationAccepted: true,
        rightsConfirmed: true,
    },
    ...overrides,
});

const fingerprint = {
    status: "completed",
    rawFingerprint: [1, 2, 3],
    fingerprintHash: "fp-v1",
    duration: 180,
    audioVersion: 1,
};

const loadAcoustId = async (trackSnapshots, registry, update) => {
    const mockTrack = { findById: jest.fn() };
    const mockFingerprint = { findOne: jest.fn(() => query(fingerprint)) };
    const mockRegistry = {
        findOne: jest.fn(() => query(registry)),
        findOneAndUpdate: update,
    };
    const mockArtist = { findById: jest.fn(() => query({ name: "Artist A" })) };

    trackSnapshots.forEach((snapshot) => mockTrack.findById.mockReturnValueOnce(query(snapshot)));
    jest.resetModules();
    jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: mockTrack }));
    jest.unstable_mockModule("../../src/models/AudioFingerprint.js", () => ({ default: mockFingerprint }));
    jest.unstable_mockModule("../../src/models/CopyrightRegistry.js", () => ({ default: mockRegistry }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: mockArtist }));

    const service = await import("../../src/services/external/acoustid.service.js");
    return { service, mockRegistry };
};

const loadMusicBrainz = async (trackSnapshots, registry, update) => {
    const mockTrack = { findById: jest.fn() };
    const mockFingerprint = { findOne: jest.fn(() => query(fingerprint)) };
    const mockRegistry = {
        findOne: jest.fn(() => query(registry)),
        findOneAndUpdate: update,
    };
    const mockArtist = { findById: jest.fn(() => query({ name: "Artist A" })) };

    trackSnapshots.forEach((snapshot) => mockTrack.findById.mockReturnValueOnce(query(snapshot)));
    jest.resetModules();
    jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: mockTrack }));
    jest.unstable_mockModule("../../src/models/AudioFingerprint.js", () => ({ default: mockFingerprint }));
    jest.unstable_mockModule("../../src/models/CopyrightRegistry.js", () => ({ default: mockRegistry }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: mockArtist }));

    const service = await import("../../src/services/external/musicbrainz.service.js");
    return { service, mockRegistry };
};

describe("external verification stale-version guards", () => {
    test("AcoustID v1 result is not persisted after the track moves to v2", async () => {
        const update = jest.fn().mockResolvedValue({});
        const v1 = track();
        const v2 = track({ audioVersion: 2, submissionVersion: 2, copyrightVersion: 2, evidenceVersion: 2 });
        const { service, mockRegistry } = await loadAcoustId([v1, v1, v2], null, update);

        const result = await service.runAcoustIdVerification(trackId, {
            request: jest.fn().mockResolvedValue({ status: "ok", results: [] }),
            rateLimit: false,
            reevaluate: false,
        });

        expect(result).toMatchObject({ status: "skipped", reason: "stale_version" });
        expect(mockRegistry.findOneAndUpdate).toHaveBeenCalledTimes(1);
        expect(mockRegistry.findOneAndUpdate.mock.calls[0][1].$set.acoustIdResult.status).toBe("pending");
        expect(mockRegistry.findOneAndUpdate.mock.calls[0][1].$set.acoustIdResult.audioVersion).toBe(1);
    });

    test("MusicBrainz v1 result is not persisted after the track moves to v2", async () => {
        const update = jest.fn().mockResolvedValue({});
        const v1 = track({ title: "" });
        const v2 = track({ title: "Changed track", audioVersion: 2, submissionVersion: 2, copyrightVersion: 2, evidenceVersion: 2 });
        const { service, mockRegistry } = await loadMusicBrainz([v1, v2], null, update);

        const result = await service.runMusicBrainzVerification(trackId, { reevaluate: false });

        expect(result).toMatchObject({ status: "skipped", reason: "stale_version" });
        expect(mockRegistry.findOneAndUpdate).not.toHaveBeenCalled();
    });
});
