import mongoose from "mongoose";
import { jest } from "@jest/globals";

const trackId = new mongoose.Types.ObjectId();

const query = (value) => {
    const chain = {
        select: jest.fn(() => chain),
        sort: jest.fn(() => chain),
        limit: jest.fn(() => chain),
        lean: jest.fn(async () => value),
    };
    return chain;
};

const track = {
    _id: trackId,
    isDeleted: false,
    approvalStatus: "pending",
    audioVersion: 1,
    submissionVersion: 1,
    copyrightVersion: 1,
    evidenceVersion: 1,
    artist_artistId: new mongoose.Types.ObjectId(),
    title: "Test track",
    duration: 180,
    audioFiles: [{ label: "original", url: "https://cdn.test/audio.mp3" }],
    copyright: {
        copyrightOwner: "Artist A",
        recordingOwner: "Artist A",
        composer: "Artist A",
        primaryCopyrightType: "original",
        rightsConfirmed: true,
        declarationAccepted: true,
        copyrightEvidenceDocuments: [{
            documentId: "proof-1",
            type: "copyright_certificate",
            originalName: "proof.pdf",
            mimeType: "application/pdf",
            size: 1024,
            uploadStatus: "uploaded",
            storageUrl: "https://cdn.test/proof.pdf",
            sha256: "a".repeat(64),
        }],
    },
    moderation: {
        automatic: {
            decision: "auto_clear",
            priority: 30,
            reasonCodes: ["FINGERPRINT_CLEAN", "COPYRIGHT_DECLARATION_VALID"],
            riskLevel: "none",
            audioVersion: 1,
            submissionVersion: 1,
            copyrightVersion: 1,
            evidenceVersion: 1,
        },
    },
    fingerprintScreening: { status: "passed" },
    set(path, value) {
        if (path === "moderation.automatic") this.moderation.automatic = value;
    },
    save: jest.fn(async function save() { return this; }),
};

const mockTrack = {
    findOne: jest.fn(),
    exists: jest.fn(),
};
const mockAudioFingerprint = {
    findOne: jest.fn(),
    find: jest.fn(),
};
const mockAudioFingerprintMatch = { find: jest.fn() };
const mockBlocklist = { findOne: jest.fn() };
const mockRegistry = { findOne: jest.fn() };
const mockRecordAuditEvent = jest.fn();

const loadService = async () => {
    jest.resetModules();
    jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: mockTrack }));
    jest.unstable_mockModule("../../src/models/AudioFingerprint.js", () => ({ default: mockAudioFingerprint }));
    jest.unstable_mockModule("../../src/models/AudioFingerprintMatch.js", () => ({ default: mockAudioFingerprintMatch }));
    jest.unstable_mockModule("../../src/models/CopyrightFingerprintBlocklist.js", () => ({ default: mockBlocklist }));
    jest.unstable_mockModule("../../src/models/CopyrightRegistry.js", () => ({ default: mockRegistry }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: { findById: jest.fn() } }));
    jest.unstable_mockModule("../../src/models/Notification.js", () => ({ default: { create: jest.fn() } }));
    jest.unstable_mockModule("../../src/config/socket.js", () => ({ getIO: jest.fn() }));
    jest.unstable_mockModule("../../src/services/audit/auditLog.service.js", () => ({ recordAuditEvent: mockRecordAuditEvent }));
    jest.unstable_mockModule("../../src/services/fingerprint/audioFingerprint.matching.service.js", () => ({
        recordExactFileDuplicateMatch: jest.fn(),
    }));
    jest.unstable_mockModule("../../src/services/fingerprint/fingerprint.lifecycle.service.js", () => ({
        activeFingerprintScopeFilter: () => ({ matchingScope: { $in: ["active", null] } }),
        retainTrackFingerprintForEnforcement: jest.fn(),
    }));
    return import("../../src/services/fingerprint/automaticTrackModeration.service.js");
};

describe("automatic moderation re-assessment", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRecordAuditEvent.mockResolvedValue(undefined);
        mockTrack.findOne.mockResolvedValue(track);
        mockTrack.exists.mockResolvedValue(true);
        mockAudioFingerprint.findOne.mockReturnValue(query({
            status: "completed",
            audioVersion: 1,
            sourceAudioHash: "hash-v1",
        }));
        mockAudioFingerprint.find.mockReturnValue(query([]));
        mockAudioFingerprintMatch.find.mockReturnValue(query([]));
        mockBlocklist.findOne.mockReturnValue(query(null));
        mockRegistry.findOne.mockReturnValue(query({
            acoustIdResult: {
                status: "possible_match",
                decision: "review_required",
                score: 0.93,
                match: { mbid: null },
                musicBrainzRecordingIds: [],
                comparison: { artistMatch: null },
                reasonCodes: ["ACOUSTID_HIGH_SCORE_WITHOUT_IDENTITY"],
                audioVersion: 1,
                submissionVersion: 1,
                copyrightVersion: 1,
                evidenceVersion: 1,
            },
            externalResult: {
                status: "possible_match",
                confidence: 0.61,
                metadataSimilarity: 0.61,
                comparison: { titleMatch: 1, artistMatch: 0, durationMatch: 1 },
                flags: ["external_metadata_conflict"],
                reasonCodes: ["MUSICBRAINZ_ARTIST_MISMATCH", "MUSICBRAINZ_METADATA_CONFLICT"],
                audioVersion: 1,
                submissionVersion: 1,
                copyrightVersion: 1,
                evidenceVersion: 1,
            },
        }));
    });

    test("replaces a persisted AUTO_CLEAR when provider conflict arrives for the same version", async () => {
        const { evaluateAutomaticTrackModeration } = await loadService();

        const result = await evaluateAutomaticTrackModeration(trackId);

        expect(result).toMatchObject({ decision: "manual_review", status: "manual_review" });
        expect(track.moderation.automatic).toMatchObject({
            decision: "manual_review",
            riskLevel: "medium",
        });
        expect(track.moderation.automatic.reasonCodes).toEqual(expect.arrayContaining([
            "ACOUSTID_HIGH_SCORE_WITHOUT_IDENTITY",
            "MUSICBRAINZ_ARTIST_MISMATCH",
            "MUSICBRAINZ_METADATA_CONFLICT",
        ]));
        expect(track.save).toHaveBeenCalled();
    });
});
