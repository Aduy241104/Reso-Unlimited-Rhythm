import mongoose from "mongoose";
import { jest } from "@jest/globals";

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const existingTrackId = new mongoose.Types.ObjectId();

const mockUser = { findById: jest.fn() };
const mockArtist = { findOne: jest.fn() };
const mockGenre = { countDocuments: jest.fn() };
const mockScheduleTrackAudioFingerprint = jest.fn();
const mockTrackSave = jest.fn();

const MockTrack = jest.fn(function Track(data) {
    Object.assign(this, data);
    this._id = new mongoose.Types.ObjectId();
    this.save = mockTrackSave;
});

MockTrack.findOne = jest.fn();
MockTrack.find = jest.fn();
MockTrack.findById = jest.fn();

const chainFindOne = (result) => {
    const query = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(result),
    };
    MockTrack.findOne.mockReturnValue(query);
    return query;
};

const loadArtistTrackService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/User.js", () => ({ default: mockUser }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: mockArtist }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: MockTrack }));
    jest.unstable_mockModule("../../src/models/Album.js", () => ({ default: {} }));
    jest.unstable_mockModule("../../src/models/Genre.js", () => ({ default: mockGenre }));
    jest.unstable_mockModule("../../src/models/ReleaseSchedule.js", () => ({ default: {} }));
    jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
        deleteCloudinaryAssetsByUrls: jest.fn(),
    }));
    jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
        uploadEvidenceBuffer: jest.fn(),
    }));
    jest.unstable_mockModule("../../src/services/fingerprint/audioFingerprint.job.js", () => ({
        processTrackAudioFingerprint: jest.fn(),
        scheduleTrackAudioFingerprint: mockScheduleTrackAudioFingerprint,
    }));
    jest.unstable_mockModule("../../src/services/fingerprint/automaticTrackModeration.service.js", () => ({
        evaluateAutomaticTrackModeration: jest.fn(),
    }));
    jest.unstable_mockModule("../../src/services/fingerprint/fingerprint.lifecycle.service.js", () => ({
        cleanupTrackFingerprintLifecycle: jest.fn(),
        invalidateTrackAudioVersionState: jest.fn(),
    }));
    jest.unstable_mockModule("../../src/services/external/musicbrainz.service.js", () => ({
        runMusicBrainzVerification: jest.fn(),
    }));
    jest.unstable_mockModule("../../src/services/external/acoustid.service.js", () => ({
        runAcoustIdVerification: jest.fn(),
    }));

    return import("../../src/services/Track/artist/artist.track.service.js");
};

describe("artist track create duplicate preflight", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        MockTrack.mockClear();
        mockUser.findById.mockResolvedValue({ _id: userId, role: "artist" });
        mockArtist.findOne.mockResolvedValue({ _id: artistId, activeStatus: "active" });
        mockGenre.countDocuments.mockResolvedValue(1);
        mockTrackSave.mockResolvedValue(undefined);
    });

    test("checks title/version before audio validation and fingerprint scheduling", async () => {
        chainFindOne({
            _id: existingTrackId,
            title: "Existing Song",
            versionTitle: "Remix",
        });

        const { default: artistTrackService } = await loadArtistTrackService();

        await expect(
            artistTrackService.createTrack(userId, {
                title: "Existing Song",
                versionTitle: " Remix ",
                audioFiles: [
                    {
                        url: "not-a-valid-url",
                        format: "mp3",
                        bitrate: 128,
                        label: "original",
                        priority: 5,
                    },
                ],
                audioAnalysis: { duration: 120 },
            })
        ).rejects.toMatchObject({
            statusCode: 409,
            details: expect.objectContaining({
                code: "TRACK_TITLE_VERSION_EXISTS",
            }),
        });

        expect(MockTrack.findOne).toHaveBeenCalledWith({
            artist_artistId: artistId,
            title: "Existing Song",
            versionTitle: "Remix",
            isDeleted: { $ne: true },
        });
        expect(MockTrack).not.toHaveBeenCalled();
        expect(mockGenre.countDocuments).not.toHaveBeenCalled();
        expect(mockTrackSave).not.toHaveBeenCalled();
        expect(mockScheduleTrackAudioFingerprint).not.toHaveBeenCalled();
    });
});
