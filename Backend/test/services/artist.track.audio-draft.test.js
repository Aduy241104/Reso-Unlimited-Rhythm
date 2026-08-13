import mongoose from "mongoose";
import { jest } from "@jest/globals";

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const trackId = new mongoose.Types.ObjectId();

const mockUser = { findById: jest.fn() };
const mockArtist = { findOne: jest.fn() };
const mockTrack = {
    findOne: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
};
const mockGenre = { countDocuments: jest.fn() };
const mockScheduleTrackAudioFingerprint = jest.fn();
const mockProcessTrackAudioFingerprint = jest.fn();
const mockEvaluateAutomaticTrackModeration = jest.fn();
const mockRunAcoustIdVerification = jest.fn();
const mockInvalidateTrackAudioVersionState = jest.fn();
const mockDeleteCloudinaryAssetsByUrls = jest.fn();

const loadArtistTrackService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/User.js", () => ({ default: mockUser }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: mockArtist }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: mockTrack }));
    jest.unstable_mockModule("../../src/models/Album.js", () => ({ default: {} }));
    jest.unstable_mockModule("../../src/models/Genre.js", () => ({ default: mockGenre }));
    jest.unstable_mockModule("../../src/models/ReleaseSchedule.js", () => ({ default: {} }));
    jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
        deleteCloudinaryAssetsByUrls: mockDeleteCloudinaryAssetsByUrls,
    }));
    jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
        uploadEvidenceBuffer: jest.fn(),
    }));
    jest.unstable_mockModule("../../src/services/fingerprint/audioFingerprint.job.js", () => ({
        processTrackAudioFingerprint: mockProcessTrackAudioFingerprint,
        scheduleTrackAudioFingerprint: mockScheduleTrackAudioFingerprint,
    }));
    jest.unstable_mockModule("../../src/services/fingerprint/automaticTrackModeration.service.js", () => ({
        evaluateAutomaticTrackModeration: mockEvaluateAutomaticTrackModeration,
    }));
    jest.unstable_mockModule("../../src/services/fingerprint/fingerprint.lifecycle.service.js", () => ({
        cleanupTrackFingerprintLifecycle: jest.fn(),
        invalidateTrackAudioVersionState: mockInvalidateTrackAudioVersionState,
    }));
    jest.unstable_mockModule("../../src/services/external/musicbrainz.service.js", () => ({
        runMusicBrainzVerification: jest.fn(),
    }));
    jest.unstable_mockModule("../../src/services/external/acoustid.service.js", () => ({
        runAcoustIdVerification: mockRunAcoustIdVerification,
    }));

    return import("../../src/services/Track/artist/artist.track.service.js");
};

describe("artist draft audio update", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUser.findById.mockResolvedValue({ _id: userId, role: "artist" });
        mockArtist.findOne.mockResolvedValue({ _id: artistId, activeStatus: "active" });
        mockDeleteCloudinaryAssetsByUrls.mockResolvedValue(undefined);
        mockInvalidateTrackAudioVersionState.mockResolvedValue(undefined);
        mockGenre.countDocuments.mockResolvedValue(1);
        mockProcessTrackAudioFingerprint.mockResolvedValue({ status: "completed", reused: true });
        mockEvaluateAutomaticTrackModeration.mockResolvedValue({ status: "auto_clear", decision: "auto_clear" });
        mockRunAcoustIdVerification.mockResolvedValue({ status: "not_found" });

        const emptyTrackQuery = {
            select: jest.fn(),
            lean: jest.fn().mockResolvedValue([]),
        };
        emptyTrackQuery.select.mockReturnValue(emptyTrackQuery);
        mockTrack.find.mockReturnValue(emptyTrackQuery);
    });

    test("persists a draft audio replacement even when fingerprint scheduling fails", async () => {
        const track = {
            _id: trackId,
            artist_artistId: artistId,
            approvalStatus: "draft",
            activeStatus: "draft",
            isDeleted: false,
            title: "Demo",
            versionTitle: "",
            description: "",
            tags: [],
            genreIds: [],
            audioFiles: [{
                url: "https://cdn.example.com/old.mp3",
                format: "mp3",
                bitrate: 128,
                label: "original",
                priority: 5,
            }],
            duration: 10,
            avatar: "",
            coverImage: [],
            lyricsStatic: "",
            lyricsSyncUrl: "",
            copyright: null,
            submissionVersion: 1,
            audioVersion: 1,
            copyrightVersion: 1,
            evidenceVersion: 1,
            pendingUpdate: { status: "none", data: null },
            fingerprintScreening: {
                status: "flagged",
                audioHash: "OLD",
                audioVersion: 1,
                fingerprintId: new mongoose.Types.ObjectId(),
                matchedTrackId: new mongoose.Types.ObjectId(),
                enforcementEvidenceId: new mongoose.Types.ObjectId(),
                highestSimilarity: 0.99,
                riskLevel: "high",
                exactDuplicate: true,
                completedAt: new Date(),
            },
            save: jest.fn().mockResolvedValue(undefined),
        };

        const populatedQuery = { populate: jest.fn() };
        let populateCount = 0;
        populatedQuery.populate.mockImplementation(() => {
            populateCount += 1;
            return populateCount === 5 ? Promise.resolve(track) : populatedQuery;
        });

        mockTrack.findOne.mockResolvedValue(track);
        mockTrack.findById.mockReturnValue(populatedQuery);
        const eventOrder = [];
        mockInvalidateTrackAudioVersionState.mockImplementation(async () => {
            eventOrder.push("invalidate-start");
            await Promise.resolve();
            eventOrder.push("invalidate-end");
        });
        mockScheduleTrackAudioFingerprint.mockReset();
        mockScheduleTrackAudioFingerprint
            .mockImplementationOnce(async () => {
                eventOrder.push("schedule");
                throw new Error("fpcalc unavailable");
            })
            .mockImplementationOnce(async () => {
                eventOrder.push("schedule");
                return { scheduled: true };
            });

        const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
        try {
            const { default: artistTrackService } = await loadArtistTrackService();
            const result = await artistTrackService.updateArtistTrack(userId, trackId, {
                audioFiles: [{
                    url: "https://cdn.example.com/new.mp3",
                    format: "mp3",
                    bitrate: 192,
                    label: "original",
                    priority: 5,
                }],
                audioAnalysis: { duration: 12, sourceAudioHash: "NEW" },
            });

            expect(result.approvalStatus).toBe("draft");
            expect(track.approvalStatus).toBe("draft");
            expect(track.pendingUpdate.status).toBe("none");
            expect(track.audioVersion).toBe(2);
            expect(track.fingerprintScreening).toMatchObject({
                status: "pending",
                audioHash: "",
                audioVersion: 2,
                fingerprintId: null,
                matchedTrackId: null,
                enforcementEvidenceId: null,
                highestSimilarity: 0,
                riskLevel: "none",
                exactDuplicate: false,
                completedAt: null,
            });
            expect(track.save).toHaveBeenCalled();
            expect(mockInvalidateTrackAudioVersionState).toHaveBeenCalledWith(trackId, {
                audioVersion: 2,
                submissionVersion: 2,
            });
            expect(mockScheduleTrackAudioFingerprint).toHaveBeenCalledWith(trackId, {
                sourceAudioHash: "NEW",
                sourceAudio: null,
                audioVersion: 2,
            });
            expect(eventOrder.slice(0, 3)).toEqual([
                "invalidate-start",
                "invalidate-end",
                "schedule",
            ]);
            expect(track.save.mock.invocationCallOrder[0])
                .toBeLessThan(mockScheduleTrackAudioFingerprint.mock.invocationCallOrder[0]);
            expect(consoleError).toHaveBeenCalledWith(
                "Audio fingerprint scheduling after track save failed:",
                "fpcalc unavailable"
            );

            const secondPopulatedQuery = { populate: jest.fn() };
            let secondPopulateCount = 0;
            secondPopulatedQuery.populate.mockImplementation(() => {
                secondPopulateCount += 1;
                return secondPopulateCount === 5 ? Promise.resolve(track) : secondPopulatedQuery;
            });
            mockTrack.findById.mockReturnValue(secondPopulatedQuery);
            mockScheduleTrackAudioFingerprint.mockResolvedValue({ scheduled: true });

            await artistTrackService.updateArtistTrack(userId, trackId, {
                audioFiles: [{
                    url: "https://cdn.example.com/newer.mp3",
                    format: "mp3",
                    bitrate: 256,
                    label: "original",
                    priority: 5,
                }],
                audioAnalysis: { duration: 14, sourceAudioHash: "NEWER" },
            });

            expect(track.audioVersion).toBe(3);
            expect(mockScheduleTrackAudioFingerprint).toHaveBeenLastCalledWith(trackId, {
                sourceAudioHash: "NEWER",
                sourceAudio: null,
                audioVersion: 3,
            });
        } finally {
            consoleError.mockRestore();
        }
    });

    test("does not return submit success when automatic moderation rejects an exact duplicate", async () => {
        const track = {
            _id: trackId,
            artist_artistId: artistId,
            approvalStatus: "draft",
            activeStatus: "draft",
            isDeleted: false,
            title: "Duplicate demo",
            versionTitle: "",
            description: "",
            tags: [],
            genreIds: [new mongoose.Types.ObjectId()],
            audioFiles: [{
                url: "https://cdn.example.com/duplicate.mp3",
                format: "mp3",
                bitrate: 192,
                label: "original",
                priority: 5,
            }],
            duration: 10,
            avatar: "",
            coverImage: ["https://cdn.example.com/cover.jpg"],
            lyricsStatic: "",
            lyricsSyncUrl: "",
            copyright: {
                copyrightOwner: "Nguyen Van A",
                recordingOwner: "Nguyen Van A",
                composer: "Nguyen Van A",
                primaryCopyrightType: "original",
                isOriginal: true,
                rightsConfirmed: true,
                declarationAccepted: true,
                copyrightEvidenceDocuments: [{
                    documentId: "evidence-1",
                    type: "copyright_certificate",
                    version: 1,
                    originalName: "proof.pdf",
                    mimeType: "application/pdf",
                    size: 1024,
                    storageUrl: "https://example.com/proof.pdf",
                    sha256: "a".repeat(64),
                    uploadStatus: "uploaded",
                }],
            },
            submissionVersion: 1,
            audioVersion: 1,
            pendingUpdate: { status: "none", data: null },
            fingerprintScreening: { status: "completed", audioVersion: 1 },
            moderation: {},
            save: jest.fn().mockResolvedValue(undefined),
        };

        mockTrack.findOne.mockResolvedValue(track);
        mockEvaluateAutomaticTrackModeration.mockResolvedValue({
            status: "auto_reject",
            decision: "auto_reject",
            reasonCodes: ["SAME_ARTIST_EXACT_DUPLICATE"],
        });

        const { default: artistTrackService } = await loadArtistTrackService();

        await expect(artistTrackService.submitArtistTrack(userId, trackId))
            .rejects.toMatchObject({
                statusCode: 409,
                details: expect.objectContaining({ code: "TRACK_AUTO_REJECTED" }),
            });
        expect(mockProcessTrackAudioFingerprint).toHaveBeenCalledWith(trackId, { audioVersion: 1 });
        expect(mockRunAcoustIdVerification).toHaveBeenCalledWith(trackId, { reevaluate: false });
        expect(mockEvaluateAutomaticTrackModeration).toHaveBeenCalledWith(trackId, { force: true });
    });
});
