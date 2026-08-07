import mongoose from "mongoose";
import { jest } from "@jest/globals";

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const trackId = new mongoose.Types.ObjectId();

const mockUserModel = {
    findById: jest.fn(),
};

const mockArtistModel = {
    findOne: jest.fn(),
};

const mockTrackModel = {
    findOne: jest.fn(),
};

const mockUpdateArtistTrack = jest.fn();
const mockSubmitArtistTrack = jest.fn();
const mockAssertArtistCanCreateTrack = jest.fn();
const mockAssertTrackEditableByArtist = jest.fn();
const mockUploadToCloudinary = jest.fn();
const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();

const loadArtistLyricsService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/User.js", () => ({
        default: mockUserModel,
    }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));
    jest.unstable_mockModule(
        "../../src/services/Track/artist/artist.track.service.js",
        () => ({
            default: {
                updateArtistTrack: mockUpdateArtistTrack,
                submitArtistTrack: mockSubmitArtistTrack,
            },
        })
    );
    jest.unstable_mockModule(
        "../../src/services/Track/track.draft.validation.js",
        () => ({
            assertArtistCanCreateTrack: mockAssertArtistCanCreateTrack,
        })
    );
    jest.unstable_mockModule(
        "../../src/services/Track/track.submit.validation.js",
        () => ({
            assertTrackEditableByArtist: mockAssertTrackEditableByArtist,
        })
    );
    jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
        uploadToCloudinary: mockUploadToCloudinary,
    }));
    jest.unstable_mockModule("fs/promises", () => ({
        default: {
            mkdir: mockMkdir,
            writeFile: mockWriteFile,
        },
    }));

    return import("../../src/services/Lyrics/artist.lyrics.service.js");
};

describe("artist lyrics moderation workflow", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUserModel.findById.mockResolvedValue({ _id: userId, role: "artist" });
        mockArtistModel.findOne.mockResolvedValue({ _id: artistId, activeStatus: "active" });
        mockMkdir.mockResolvedValue(undefined);
        mockWriteFile.mockResolvedValue(undefined);
    });

    test("routes static lyrics on an approved track to pendingUpdate", async () => {
        const track = {
            _id: trackId,
            approvalStatus: "approved",
            lyricsStatic: "Lời đang phát hành",
            save: jest.fn(),
        };
        const pendingResult = {
            _id: trackId,
            approvalStatus: "approved",
            lyricsStatic: "Lời đang phát hành",
            pendingUpdate: {
                status: "pending",
                data: { lyricsStatic: "Lời cập nhật" },
            },
        };

        mockTrackModel.findOne.mockResolvedValue(track);
        mockUpdateArtistTrack.mockResolvedValue(pendingResult);

        const { default: lyricsService } = await loadArtistLyricsService();
        const result = await lyricsService.addStaticLyrics(
            userId,
            trackId,
            "Lời cập nhật"
        );

        expect(mockUpdateArtistTrack).toHaveBeenCalledWith(userId, trackId, {
            lyricsStatic: "Lời cập nhật",
        });
        expect(mockSubmitArtistTrack).not.toHaveBeenCalled();
        expect(track.save).not.toHaveBeenCalled();
        expect(track.approvalStatus).toBe("approved");
        expect(result).toBe(pendingResult);
    });

    test("routes synchronized lyrics on an approved track to pendingUpdate", async () => {
        const track = {
            _id: trackId,
            title: "Bài hát thử nghiệm",
            approvalStatus: "approved",
            lyricsSyncUrl: "https://cdn.example.com/current.lrc",
            save: jest.fn(),
        };
        const lyricsFile = {
            buffer: Buffer.from("[00:01.00]Lời cập nhật"),
        };
        const pendingResult = {
            _id: trackId,
            approvalStatus: "approved",
            lyricsSyncUrl: track.lyricsSyncUrl,
            pendingUpdate: {
                status: "pending",
                data: { lyricsSyncUrl: "https://cdn.example.com/pending.lrc" },
            },
        };

        mockTrackModel.findOne.mockResolvedValue(track);
        mockUploadToCloudinary.mockResolvedValue({
            secure_url: "https://cdn.example.com/pending.lrc",
        });
        mockUpdateArtistTrack.mockResolvedValue(pendingResult);

        const { default: lyricsService } = await loadArtistLyricsService();
        const result = await lyricsService.updateSyncLyrics(
            userId,
            trackId,
            lyricsFile
        );

        expect(mockAssertArtistCanCreateTrack).toHaveBeenCalled();
        expect(mockAssertTrackEditableByArtist).toHaveBeenCalledWith(track);
        expect(mockUpdateArtistTrack).toHaveBeenCalledWith(userId, trackId, {
            lyricsSyncUrl: "https://cdn.example.com/pending.lrc",
        });
        expect(mockSubmitArtistTrack).not.toHaveBeenCalled();
        expect(track.save).not.toHaveBeenCalled();
        expect(track.approvalStatus).toBe("approved");
        expect(result).toBe(pendingResult);
    });

    test("resubmits a rejected track after saving its lyrics", async () => {
        const track = {
            _id: trackId,
            approvalStatus: "rejected",
        };
        const submittedResult = {
            _id: trackId,
            approvalStatus: "pending",
        };

        mockTrackModel.findOne.mockResolvedValue(track);
        mockUpdateArtistTrack.mockResolvedValue({
            _id: trackId,
            approvalStatus: "rejected",
        });
        mockSubmitArtistTrack.mockResolvedValue(submittedResult);

        const { default: lyricsService } = await loadArtistLyricsService();
        const result = await lyricsService.addStaticLyrics(userId, trackId, "Lời mới");

        expect(mockSubmitArtistTrack).toHaveBeenCalledWith(userId, trackId);
        expect(result).toBe(submittedResult);
    });
});
