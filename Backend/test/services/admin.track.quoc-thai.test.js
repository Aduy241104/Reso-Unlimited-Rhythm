import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockTrackModel = {
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
};
const mockArtistModel = { findById: jest.fn() };
const mockUserModel = { findById: jest.fn() };
const mockNotificationModel = { create: jest.fn() };
const mockAudioFingerprintModel = { find: jest.fn(), findOne: jest.fn() };
const mockScheduleTrackAudioFingerprint = jest.fn();
const mockAssertReviewCanApprove = jest.fn().mockResolvedValue(undefined);
const mockGetMusicBrainzResultForTrack = jest.fn().mockResolvedValue(null);
const mockGetAcoustIdResultForTrack = jest.fn().mockResolvedValue(null);
const mockRecordAuditEvent = jest.fn().mockResolvedValue(undefined);

const loadService = async () => {
    jest.resetModules();
    jest.unstable_mockModule("../../src/models/Album.js", () => ({ default: {} }));
    jest.unstable_mockModule("../../src/models/Genre.js", () => ({ default: {} }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: mockTrackModel }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: mockArtistModel }));
    jest.unstable_mockModule("../../src/models/User.js", () => ({ default: mockUserModel }));
    jest.unstable_mockModule("../../src/models/Notification.js", () => ({
        default: mockNotificationModel,
    }));
    jest.unstable_mockModule("../../src/models/AudioFingerprint.js", () => ({
        default: mockAudioFingerprintModel,
    }));
    jest.unstable_mockModule("../../src/services/fingerprint/audioFingerprint.job.js", () => ({
        scheduleTrackAudioFingerprint: mockScheduleTrackAudioFingerprint,
    }));
    jest.unstable_mockModule("../../src/services/fingerprint/fingerprint.lifecycle.service.js", () => ({
        activeFingerprintScopeFilter: jest.fn(() => ({})),
    }));
    jest.unstable_mockModule("../../src/services/fingerprint/fingerprintSimilarity.service.js", () => ({
        compareFingerprints: jest.fn(),
    }));
    jest.unstable_mockModule("../../src/services/track/moderationReview.service.js", () => ({
        assertReviewCanApprove: mockAssertReviewCanApprove,
    }));
    jest.unstable_mockModule("../../src/services/external/musicbrainz.service.js", () => ({
        getMusicBrainzResultForTrack: mockGetMusicBrainzResultForTrack,
    }));
    jest.unstable_mockModule("../../src/services/external/acoustid.service.js", () => ({
        getAcoustIdResultForTrack: mockGetAcoustIdResultForTrack,
    }));
    jest.unstable_mockModule("../../src/services/audit/auditLog.service.js", () => ({
        recordAuditEvent: mockRecordAuditEvent,
    }));
    jest.unstable_mockModule("../../src/services/track/track.rejection.js", () => ({
        hashTrackMutableData: jest.fn(() => "hash"),
    }));

    return (await import("../../src/services/track/admin/admin.track.service.js")).default;
};

const queryWith = (value) => {
    const query = {};
    query.select = jest.fn().mockReturnValue(query);
    query.sort = jest.fn().mockReturnValue(query);
    query.limit = jest.fn().mockReturnValue(query);
    query.populate = jest.fn().mockReturnValue(query);
    query.lean = jest.fn().mockResolvedValue(value);
    query.then = (resolve, reject) => Promise.resolve(value).then(resolve, reject);
    return query;
};

const makeTrack = (overrides = {}) => {
    const track = {
        _id: new mongoose.Types.ObjectId(),
        title: "Test Track",
        versionTitle: "",
        description: "",
        tags: [],
        genreIds: [],
        audioFiles: [],
        duration: 180,
        avatar: "",
        coverImage: [],
        lyricsStatic: "",
        lyricsSyncUrl: "",
        copyright: null,
        artist_artistId: new mongoose.Types.ObjectId(),
        album_albumId: null,
        approvalStatus: "pending",
        activeStatus: "active",
        pendingUpdate: { status: "none", data: null },
        isDeleted: false,
        submissionVersion: 1,
        audioVersion: 1,
        copyrightVersion: 1,
        evidenceVersion: 1,
        stats: { totalLike: 0, totalPlay: 0 },
        moderation: {},
        save: jest.fn().mockResolvedValue(undefined),
        populate: jest.fn(),
        ...overrides,
    };
    track.populate.mockResolvedValue(track);
    return track;
};

const setupDetailFlow = (track) => {
    mockTrackModel.findById
        .mockReturnValueOnce(track)
        .mockReturnValueOnce(queryWith(track));
    mockAudioFingerprintModel.findOne.mockReturnValue(queryWith(null));
    mockArtistModel.findById.mockReturnValue(queryWith(null));
};

beforeEach(() => {
    jest.clearAllMocks();
    mockTrackModel.find.mockReset();
    mockTrackModel.findById.mockReset();
    mockTrackModel.countDocuments.mockReset();
    mockArtistModel.findById.mockReset();
    mockUserModel.findById.mockReset();
    mockAudioFingerprintModel.find.mockReset();
    mockAudioFingerprintModel.findOne.mockReset();
    mockNotificationModel.create.mockReset();
    mockAssertReviewCanApprove.mockResolvedValue(undefined);
    mockGetMusicBrainzResultForTrack.mockResolvedValue(null);
    mockGetAcoustIdResultForTrack.mockResolvedValue(null);
    mockRecordAuditEvent.mockResolvedValue(undefined);
});

describe("adminTrackService.updateTrackVisibility", () => {
    test("UT-107 - TC01 - hides a track and returns the updated track", async () => {
        const service = await loadService();
        const track = makeTrack();
        setupDetailFlow(track);

        const result = await service.updateTrackVisibility(
            track._id,
            { action: "hide", hiddenReason: "policy violation" },
            new mongoose.Types.ObjectId()
        );

        expect(track.activeStatus).toBe("hidden");
        expect(track.hiddenReason).toBe("policy violation");
        expect(track.save).toHaveBeenCalledTimes(1);
        expect(result.id).toBe(String(track._id));
    });

    test("UT-107 - TC02 - unhides a track and returns the updated track", async () => {
        const service = await loadService();
        const track = makeTrack({ activeStatus: "hidden", hiddenReason: "old reason" });
        setupDetailFlow(track);

        const result = await service.updateTrackVisibility(
            track._id,
            { action: "unhide", hiddenReason: "" },
            new mongoose.Types.ObjectId()
        );

        expect(track.activeStatus).toBe("active");
        expect(track.hiddenReason).toBe("");
        expect(result.id).toBe(String(track._id));
    });

    test("UT-107 - TC03 - passes the hide result error to the caller", async () => {
        const service = await loadService();
        const track = makeTrack();
        setupDetailFlow(track);

        await expect(
            service.updateTrackVisibility(
                track._id,
                { action: "hide", hiddenReason: "rule" },
                new mongoose.Types.ObjectId()
            )
        ).rejects.toMatchObject({ statusCode: 500 });
    });

    test("UT-107 - TC04 - returns an updated track for an empty action", async () => {
        const service = await loadService();
        const track = makeTrack();
        setupDetailFlow(track);

        await expect(
            service.updateTrackVisibility(
                track._id,
                { action: "", hiddenReason: "" },
                new mongoose.Types.ObjectId()
            )
        ).resolves.toMatchObject({ id: String(track._id) });
    });
});

describe("adminTrackService.updateTrackApprovalStatus", () => {
    test("UT-108 - TC01 - approves a pending track", async () => {
        const service = await loadService();
        const track = makeTrack({ approvalStatus: "pending" });
        setupDetailFlow(track);
        mockUserModel.findById.mockReturnValue(queryWith({ email: "admin@example.com", role: "admin" }));

        const result = await service.updateTrackApprovalStatus(
            track._id,
            { status: "approved", rejectReason: "" },
            new mongoose.Types.ObjectId()
        );

        expect(track.approvalStatus).toBe("approved");
        expect(track.rejectReason).toBe("");
        expect(track.save).toHaveBeenCalled();
        expect(result.id).toBe(String(track._id));
    });

    test("UT-108 - TC02 - rejects a track with the Excel reject reason", async () => {
        const service = await loadService();
        const track = makeTrack({ approvalStatus: "pending" });
        setupDetailFlow(track);
        mockUserModel.findById.mockReturnValue(queryWith({ email: "admin@example.com", role: "admin" }));

        await expect(
            service.updateTrackApprovalStatus(
                track._id,
                { status: "rejected", rejectReason: "copyright" },
                new mongoose.Types.ObjectId()
            )
        ).resolves.toMatchObject({ id: String(track._id) });
    });

    test("UT-108 - TC03 - approves the boundary input", async () => {
        const service = await loadService();
        const track = makeTrack({ approvalStatus: "pending" });
        setupDetailFlow(track);
        mockUserModel.findById.mockReturnValue(queryWith({ email: "admin@example.com", role: "admin" }));

        await expect(
            service.updateTrackApprovalStatus(
                track._id,
                { status: "approved", rejectReason: "" },
                new mongoose.Types.ObjectId()
            )
        ).resolves.toMatchObject({ id: String(track._id) });
    });

    test("UT-108 - TC04 - passes the missing reject reason error to the caller", async () => {
        const service = await loadService();
        const track = makeTrack({ approvalStatus: "pending" });
        setupDetailFlow(track);
        mockUserModel.findById.mockReturnValue(queryWith({ email: "admin@example.com", role: "admin" }));

        await expect(
            service.updateTrackApprovalStatus(
                track._id,
                { status: "approved" },
                new mongoose.Types.ObjectId()
            )
        ).rejects.toMatchObject({ statusCode: 500 });
    });
});
