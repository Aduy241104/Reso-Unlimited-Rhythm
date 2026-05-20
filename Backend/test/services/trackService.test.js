import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import mongoose from "mongoose";

// Mock các dependencies
jest.unstable_mockModule("../../src/models/User.js", () => ({
    default: {
        findById: jest.fn(),
    },
}));

jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: {
        findOne: jest.fn(),
    },
}));

jest.unstable_mockModule("../../src/models/Album.js", () => ({
    default: {
        findById: jest.fn(),
    },
}));

jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: jest.fn(),
}));

jest.unstable_mockModule("../../src/utils/AppError.js", () => ({
    AppError: class AppError extends Error {
        constructor(message, statusCode, details) {
            super(message);
            this.statusCode = statusCode;
            this.details = details;
            this.name = "AppError";
        }
    },
}));

jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
    deleteCloudinaryAssetsByUrls: jest.fn(),
}));

jest.unstable_mockModule("../../src/services/Track/track.helper.js", () => ({
    formatTrackManagementDetail: jest.fn((track) => track),
}));

// Import sau khi mock
const User = (await import("../../src/models/User.js")).default;
const Artist = (await import("../../src/models/Artist.js")).default;
const Album = (await import("../../src/models/Album.js")).default;
const Track = (await import("../../src/models/Track.js")).default;
const artistTrackService = (await import("../../src/services/Track/artist.track.service.js")).default;

describe("Artist Track Service - createTrack", () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockArtistId = new mongoose.Types.ObjectId();
    const mockAlbumId = new mongoose.Types.ObjectId().toString();

    const mockUser = {
        _id: mockUserId,
        role: "artist",
        email: "artist@test.com",
    };

    const mockArtist = {
        _id: mockArtistId,
        userId: mockUserId,
        name: "Test Artist",
        activeStatus: "active",
    };

    const mockTrackData = {
        title: "Test Track",
        audioFiles: [
            {
                url: "https://example.com/audio.mp3",
                format: "mp3",
                bitrate: 320,
                label: "high",
                priority: 2,
            },
        ],
        duration: 180,
        avatar: "https://example.com/avatar.jpg",
        coverImage: ["https://example.com/cover.jpg"],
        genreIds: ["genre-1"],
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should throw error when user not found", async () => {
        User.findById.mockResolvedValue(null);

        await expect(artistTrackService.createTrack(mockUserId, mockTrackData)).rejects.toThrow("User not found");
    });

    test("should throw error when user is not artist", async () => {
        const nonArtistUser = { ...mockUser, role: "user" };
        User.findById.mockResolvedValue(nonArtistUser);

        await expect(artistTrackService.createTrack(mockUserId, mockTrackData)).rejects.toThrow("Only artists can create tracks");
    });

    test("should throw error when artist profile not found", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(null);

        await expect(artistTrackService.createTrack(mockUserId, mockTrackData)).rejects.toThrow("Artist profile not found");
    });

    test("should throw error when artist is blocked", async () => {
        const blockedArtist = { ...mockArtist, activeStatus: "blocked" };
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(blockedArtist);

        await expect(artistTrackService.createTrack(mockUserId, mockTrackData)).rejects.toThrow("Your artist account has been blocked");
    });

    test("should throw error when album id is invalid", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const invalidTrackData = { ...mockTrackData, album_albumId: "invalid-id" };

        await expect(artistTrackService.createTrack(mockUserId, invalidTrackData)).rejects.toThrow("Album id is invalid");
    });

    test("should throw error when album not found", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);
        Album.findById.mockResolvedValue(null);

        const mockTrackInstance = {
            save: jest.fn().mockResolvedValue({
                _id: new mongoose.Types.ObjectId(),
                title: "Test Track",
            }),
        };
        Track.mockImplementation(() => mockTrackInstance);

        const trackDataWithAlbum = { ...mockTrackData, album_albumId: mockAlbumId };

        await expect(artistTrackService.createTrack(mockUserId, trackDataWithAlbum)).rejects.toThrow("Album not found");
    });

    test("should throw error when album does not belong to artist", async () => {
        const differentArtistId = new mongoose.Types.ObjectId();
        const mockAlbum = {
            _id: mockAlbumId,
            artistId: differentArtistId,
            trackList: [],
        };

        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);
        Album.findById.mockResolvedValue(mockAlbum);

        const mockTrackInstance = {
            save: jest.fn().mockResolvedValue({
                _id: new mongoose.Types.ObjectId(),
                title: "Test Track",
            }),
        };
        Track.mockImplementation(() => mockTrackInstance);

        const trackDataWithAlbum = { ...mockTrackData, album_albumId: mockAlbumId };

        await expect(artistTrackService.createTrack(mockUserId, trackDataWithAlbum)).rejects.toThrow("does not belong to your artist profile");
    });

    test("should validate user role is artist", async () => {
        const nonArtistUser = { ...mockUser, role: "admin" };
        User.findById.mockResolvedValue(nonArtistUser);

        await expect(artistTrackService.createTrack(mockUserId, mockTrackData)).rejects.toThrow();

        expect(User.findById).toHaveBeenCalledWith(mockUserId);
    });

    test("should check artist active status", async () => {
        const blockedArtist = { ...mockArtist, activeStatus: "blocked" };
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(blockedArtist);

        await expect(artistTrackService.createTrack(mockUserId, mockTrackData)).rejects.toThrow();

        expect(Artist.findOne).toHaveBeenCalledWith({ userId: mockUserId });
    });
});

// ================== TEST UPDATE TRACK ==================
describe("Artist Track Service - updateArtistTrack", () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockArtistId = new mongoose.Types.ObjectId();
    const mockTrackId = new mongoose.Types.ObjectId().toString();
    const mockAlbumId = new mongoose.Types.ObjectId().toString();

    const mockUser = {
        _id: mockUserId,
        role: "artist",
        email: "artist@test.com",
    };

    const mockArtist = {
        _id: mockArtistId,
        userId: mockUserId,
        name: "Test Artist",
        activeStatus: "active",
    };

    const mockExistingTrack = {
        _id: mockTrackId,
        title: "Old Track Title",
        artist_artistId: mockArtistId,
        album_albumId: null,
        duration: 180,
        audioFiles: [
            {
                url: "https://example.com/old-audio.mp3",
                format: "mp3",
                bitrate: 320,
            },
        ],
        avatar: "https://example.com/old-avatar.jpg",
        coverImage: ["https://example.com/old-cover.jpg"],
        lyricsStatic: "Old lyrics",
        lyricsSyncUrl: "https://example.com/old-lyrics.lrc",
        releaseDate: new Date("2026-01-01"),
        approvalStatus: "draft",
        genreIds: ["genre-1"],
        save: jest.fn(),
    };

    const updateTrackData = {
        title: "Updated Track Title",
        duration: 240,
        audioFiles: [
            {
                url: "https://example.com/new-audio.mp3",
                format: "mp3",
                bitrate: 320,
            },
        ],
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ========== Kiểm tra lỗi khi user không tồn tại ==========
    test("should throw error when user not found during update", async () => {
        User.findById.mockResolvedValue(null);

        await expect(artistTrackService.updateArtistTrack(mockUserId, mockTrackId, updateTrackData)).rejects.toThrow("User not found");
    });

    // ========== Kiểm tra lỗi khi user không phải artist ==========
    test("should throw error when user is not artist during update", async () => {
        const nonArtistUser = { ...mockUser, role: "listener" };
        User.findById.mockResolvedValue(nonArtistUser);

        await expect(artistTrackService.updateArtistTrack(mockUserId, mockTrackId, updateTrackData)).rejects.toThrow("Only artists can update tracks");
    });

    // ========== Kiểm tra lỗi khi artist profile không tìm thấy ==========
    test("should throw error when artist profile not found during update", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(null);

        await expect(artistTrackService.updateArtistTrack(mockUserId, mockTrackId, updateTrackData)).rejects.toThrow("Artist profile not found");
    });

    // ========== Kiểm tra lỗi khi track ID không hợp lệ ==========
    test("should throw error when track id is invalid", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        await expect(artistTrackService.updateArtistTrack(mockUserId, "invalid-track-id", updateTrackData)).rejects.toThrow("Track id is invalid");
    });

    // ========== Kiểm tra lỗi khi track không tìm thấy ==========
    test("should throw error when track not found", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.findOne = jest.fn().mockResolvedValue(null);

        await expect(artistTrackService.updateArtistTrack(mockUserId, mockTrackId, updateTrackData)).rejects.toThrow("Track not found or you do not have permission to update it");
    });

    // ========== Kiểm tra cập nhật tiêu đề track thành công ==========
    test("should update track title successfully", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const trackToUpdate = { ...mockExistingTrack };
        Track.findOne = jest.fn().mockResolvedValue(trackToUpdate);
        Track.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
        });

        const result = await artistTrackService.updateArtistTrack(mockUserId, mockTrackId, {
            title: "New Title",
        });

        expect(trackToUpdate.title).toBe("New Title");
        expect(trackToUpdate.save).toHaveBeenCalled();
        expect(result).toBeDefined();
    });

    // ========== Kiểm tra cập nhật duration track thành công ==========
    test("should update track duration successfully", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const trackToUpdate = { ...mockExistingTrack };
        Track.findOne = jest.fn().mockResolvedValue(trackToUpdate);
        Track.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
        });

        await artistTrackService.updateArtistTrack(mockUserId, mockTrackId, {
            duration: 300,
        });

        expect(trackToUpdate.duration).toBe(300);
        expect(trackToUpdate.save).toHaveBeenCalled();
    });

    // ========== Kiểm tra cập nhật audio files thành công ==========
    test("should update audio files successfully", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const trackToUpdate = { ...mockExistingTrack };
        Track.findOne = jest.fn().mockResolvedValue(trackToUpdate);
        Track.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
        });

        const newAudioFiles = [
            {
                url: "https://example.com/new-audio.mp3",
                format: "mp3",
                bitrate: 192,
                priority: 1,
            },
        ];

        await artistTrackService.updateArtistTrack(mockUserId, mockTrackId, {
            audioFiles: newAudioFiles,
        });

        expect(trackToUpdate.audioFiles).toEqual(expect.arrayContaining([expect.objectContaining({ url: "https://example.com/new-audio.mp3" })]));
        expect(trackToUpdate.save).toHaveBeenCalled();
    });

    // ========== Kiểm tra cập nhật genre IDs thành công ==========
    test("should update genre IDs successfully", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const trackToUpdate = { ...mockExistingTrack };
        Track.findOne = jest.fn().mockResolvedValue(trackToUpdate);
        Track.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
        });

        const newGenreIds = ["genre-2", "genre-3"];

        await artistTrackService.updateArtistTrack(mockUserId, mockTrackId, {
            genreIds: newGenreIds,
        });

        expect(trackToUpdate.genreIds).toEqual(newGenreIds);
        expect(trackToUpdate.save).toHaveBeenCalled();
    });

    // ========== Kiểm tra cập nhật nhiều fields cùng lúc ==========
    test("should update multiple fields successfully", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const trackToUpdate = { ...mockExistingTrack };
        Track.findOne = jest.fn().mockResolvedValue(trackToUpdate);
        Track.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
        });

        const updateData = {
            title: "Updated Title",
            duration: 250,
            avatar: "https://example.com/new-avatar.jpg",
        };

        await artistTrackService.updateArtistTrack(mockUserId, mockTrackId, updateData);

        expect(trackToUpdate.title).toBe("Updated Title");
        expect(trackToUpdate.duration).toBe(250);
        expect(trackToUpdate.avatar).toBe("https://example.com/new-avatar.jpg");
        expect(trackToUpdate.save).toHaveBeenCalled();
    });

    // ========== Kiểm tra thay đổi status từ approved sang pending ==========
    test("should change approval status from approved to pending when updating", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const approvedTrack = { ...mockExistingTrack, approvalStatus: "approved" };
        Track.findOne = jest.fn().mockResolvedValue(approvedTrack);
        Track.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
        });

        await artistTrackService.updateArtistTrack(mockUserId, mockTrackId, {
            title: "Updated Title",
        });

        expect(approvedTrack.approvalStatus).toBe("pending");
        expect(approvedTrack.save).toHaveBeenCalled();
    });

    // ========== Kiểm tra thay đổi status từ rejected sang pending ==========
    test("should change approval status from rejected to pending when updating", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const rejectedTrack = { ...mockExistingTrack, approvalStatus: "rejected" };
        Track.findOne = jest.fn().mockResolvedValue(rejectedTrack);
        Track.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
        });

        await artistTrackService.updateArtistTrack(mockUserId, mockTrackId, {
            duration: 200,
        });

        expect(rejectedTrack.approvalStatus).toBe("pending");
        expect(rejectedTrack.save).toHaveBeenCalled();
    });

    // ========== Kiểm tra lỗi khi chuyển sang album không hợp lệ ==========
    test("should throw error when new album is invalid", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const trackToUpdate = { ...mockExistingTrack };
        Track.findOne = jest.fn().mockResolvedValue(trackToUpdate);

        await expect(artistTrackService.updateArtistTrack(mockUserId, mockTrackId, { album_albumId: "invalid-album-id" })).rejects.toThrow();
    });

    // ========== Kiểm tra cập nhật lyrics thành công ==========
    test("should update lyrics successfully", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const trackToUpdate = { ...mockExistingTrack };
        Track.findOne = jest.fn().mockResolvedValue(trackToUpdate);
        Track.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
        });

        const newLyrics = "New song lyrics here";

        await artistTrackService.updateArtistTrack(mockUserId, mockTrackId, {
            lyricsStatic: newLyrics,
        });

        expect(trackToUpdate.lyricsStatic).toBe(newLyrics);
        expect(trackToUpdate.save).toHaveBeenCalled();
    });

    // ========== Kiểm tra cập nhật cover image thành công ==========
    test("should update cover image successfully", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const trackToUpdate = { ...mockExistingTrack };
        Track.findOne = jest.fn().mockResolvedValue(trackToUpdate);
        Track.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
        });

        const newCoverImages = ["https://example.com/new-cover1.jpg", "https://example.com/new-cover2.jpg"];

        await artistTrackService.updateArtistTrack(mockUserId, mockTrackId, {
            coverImage: newCoverImages,
        });

        expect(trackToUpdate.coverImage).toEqual(newCoverImages);
        expect(trackToUpdate.save).toHaveBeenCalled();
    });

    // ========== Kiểm tra cập nhật release date thành công ==========
    test("should update release date successfully", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const trackToUpdate = { ...mockExistingTrack };
        Track.findOne = jest.fn().mockResolvedValue(trackToUpdate);
        Track.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
        });

        const newReleaseDate = new Date("2026-06-01");

        await artistTrackService.updateArtistTrack(mockUserId, mockTrackId, {
            releaseDate: newReleaseDate,
        });

        expect(trackToUpdate.releaseDate).toEqual(newReleaseDate);
        expect(trackToUpdate.save).toHaveBeenCalled();
    });

    // ========== Kiểm tra không update track của artist khác ==========
    test("should throw error when updating track of different artist", async () => {
        const differentArtistId = new mongoose.Types.ObjectId();
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        // Mock track thuộc artist khác
        Track.findOne = jest.fn().mockResolvedValue(null);

        await expect(artistTrackService.updateArtistTrack(mockUserId, mockTrackId, updateTrackData)).rejects.toThrow("Track not found or you do not have permission to update it");
    });
});

// ================== TEST HIDE TRACK ==================
describe("Artist Track Service - hideArtistTrack", () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockArtistId = new mongoose.Types.ObjectId();
    const mockTrackId = new mongoose.Types.ObjectId().toString();

    const mockArtist = {
        _id: mockArtistId,
        userId: mockUserId,
        name: "Test Artist",
        activeStatus: "active",
    };

    const mockTrack = {
        _id: mockTrackId,
        title: "Test Track",
        artist_artistId: mockArtistId,
        activeStatus: "active",
        save: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ========== Kiểm tra lỗi khi artist profile không tìm thấy ==========
    test("should throw error when artist profile not found", async () => {
        Artist.findOne.mockResolvedValue(null);

        await expect(artistTrackService.hideArtistTrack(mockUserId, mockTrackId, "No reason")).rejects.toThrow("Artist profile not found");
    });

    // ========== Kiểm tra lỗi khi track ID không hợp lệ ==========
    test("should throw error when track id is invalid", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);

        await expect(artistTrackService.hideArtistTrack(mockUserId, "invalid-id", "No reason")).rejects.toThrow("Track id is invalid");
    });

    // ========== Kiểm tra lỗi khi track không tìm thấy ==========
    test("should throw error when track not found", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.findOne = jest.fn().mockResolvedValue(null);

        await expect(artistTrackService.hideArtistTrack(mockUserId, mockTrackId, "No reason")).rejects.toThrow("Track not found or you do not have permission to update it");
    });

    // ========== Kiểm tra ẩn track thành công ==========
    test("should hide track successfully", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.findOne = jest.fn().mockResolvedValue(mockTrack);
        Track.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockTrack),
                    }),
                }),
            }),
        });

        const result = await artistTrackService.hideArtistTrack(mockUserId, mockTrackId, "Not ready to publish");

        expect(mockTrack.activeStatus).toBe("hidden");
        expect(mockTrack.hiddenReason).toBe("Not ready to publish");
        expect(mockTrack.save).toHaveBeenCalled();
        expect(result).toBeDefined();
    });

    // ========== Kiểm tra ẩn track với reason trống ==========
    test("should use default reason when hiding track without reason", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.findOne = jest.fn().mockResolvedValue(mockTrack);
        Track.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockTrack),
                    }),
                }),
            }),
        });

        await artistTrackService.hideArtistTrack(mockUserId, mockTrackId, "");

        expect(mockTrack.activeStatus).toBe("hidden");
        expect(mockTrack.hiddenReason).toBe("Hidden by artist.");
        expect(mockTrack.save).toHaveBeenCalled();
    });

    // ========== Kiểm tra ẩn track lưu thời gian ==========
    test("should set hiddenAt timestamp when hiding track", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.findOne = jest.fn().mockResolvedValue(mockTrack);
        Track.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockTrack),
                    }),
                }),
            }),
        });

        await artistTrackService.hideArtistTrack(mockUserId, mockTrackId, "Test reason");

        expect(mockTrack.hiddenAt).toBeInstanceOf(Date);
        expect(mockTrack.save).toHaveBeenCalled();
    });
});

// ================== TEST DELETE TRACK ==================
describe("Artist Track Service - deleteArtistTrack", () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockArtistId = new mongoose.Types.ObjectId();
    const mockTrackId = new mongoose.Types.ObjectId().toString();
    const mockAlbumId = new mongoose.Types.ObjectId().toString();

    const mockArtist = {
        _id: mockArtistId,
        userId: mockUserId,
        name: "Test Artist",
    };

    const mockTrack = {
        _id: mockTrackId,
        title: "Test Track",
        artist_artistId: mockArtistId,
        album_albumId: mockAlbumId,
        audioFiles: [{ url: "https://example.com/audio.mp3" }],
        avatar: "https://example.com/avatar.jpg",
    };

    const mockAlbum = {
        _id: mockAlbumId,
        trackList: [{ trackId: new mongoose.Types.ObjectId(mockTrackId), order: 1 }],
        save: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ========== Kiểm tra lỗi khi artist profile không tìm thấy ==========
    test("should throw error when artist profile not found for delete", async () => {
        Artist.findOne.mockResolvedValue(null);

        await expect(artistTrackService.deleteArtistTrack(mockUserId, mockTrackId)).rejects.toThrow("Artist profile not found");
    });

    // ========== Kiểm tra lỗi khi track ID không hợp lệ ==========
    test("should throw error when track id is invalid for delete", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);

        await expect(artistTrackService.deleteArtistTrack(mockUserId, "invalid-id")).rejects.toThrow("Track id is invalid");
    });

    // ========== Kiểm tra lỗi khi track không tìm thấy ==========
    test("should throw error when track not found for delete", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.findOne = jest.fn().mockResolvedValue(null);

        await expect(artistTrackService.deleteArtistTrack(mockUserId, mockTrackId)).rejects.toThrow("Track not found or you do not have permission to delete it");
    });

    // ========== Kiểm tra xóa track thành công ==========
    test("should delete track successfully", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.findOne = jest.fn().mockResolvedValue(mockTrack);
        Album.findById.mockResolvedValue(mockAlbum);
        Track.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

        const result = await artistTrackService.deleteArtistTrack(mockUserId, mockTrackId);

        expect(Track.deleteOne).toHaveBeenCalledWith({ _id: mockTrackId, artist_artistId: mockArtistId });
        expect(result).toEqual({ deletedId: mockTrackId });
    });

    // ========== Kiểm tra xóa track và xóa khỏi album ==========
    test("should remove track from album when deleting", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.findOne = jest.fn().mockResolvedValue(mockTrack);
        Album.findById.mockResolvedValue(mockAlbum);
        Track.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

        await artistTrackService.deleteArtistTrack(mockUserId, mockTrackId);

        expect(Album.findById).toHaveBeenCalledWith(mockAlbumId);
        expect(mockAlbum.save).toHaveBeenCalled();
    });
});

// ================== TEST GET TRACK LIST ==================
describe("Artist Track Service - getArtistTracks", () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockArtistId = new mongoose.Types.ObjectId();

    const mockArtist = {
        _id: mockArtistId,
        userId: mockUserId,
        name: "Test Artist",
    };

    const mockTracks = [
        {
            _id: new mongoose.Types.ObjectId(),
            title: "Track 1",
            artist_artistId: mockArtistId,
            activeStatus: "active",
            approvalStatus: "approved",
            createdAt: new Date("2026-05-20"),
        },
        {
            _id: new mongoose.Types.ObjectId(),
            title: "Track 2",
            artist_artistId: mockArtistId,
            activeStatus: "active",
            approvalStatus: "draft",
            createdAt: new Date("2026-05-19"),
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ========== Kiểm tra lỗi khi artist profile không tìm thấy ==========
    test("should throw error when artist profile not found for list", async () => {
        Artist.findOne.mockResolvedValue(null);

        await expect(artistTrackService.getArtistTracks(mockUserId, {})).rejects.toThrow("Artist profile not found");
    });

    // ========== Kiểm tra lấy danh sách track thành công ==========
    test("should get artist tracks successfully", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.find = jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(mockTracks),
        });
        Track.countDocuments = jest.fn().mockResolvedValue(2);

        const result = await artistTrackService.getArtistTracks(mockUserId, {});

        expect(result.tracks).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(50);
    });

    // ========== Kiểm tra filter theo activeStatus ==========
    test("should filter tracks by activeStatus", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.find = jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([mockTracks[0]]),
        });
        Track.countDocuments = jest.fn().mockResolvedValue(1);

        const result = await artistTrackService.getArtistTracks(mockUserId, { activeStatus: "active" });

        expect(result.tracks).toHaveLength(1);
        expect(Track.find).toHaveBeenCalledWith(expect.objectContaining({ activeStatus: "active" }));
    });

    // ========== Kiểm tra filter theo approvalStatus ==========
    test("should filter tracks by approvalStatus", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.find = jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([mockTracks[0]]),
        });
        Track.countDocuments = jest.fn().mockResolvedValue(1);

        const result = await artistTrackService.getArtistTracks(mockUserId, { approvalStatus: "approved" });

        expect(result.tracks).toHaveLength(1);
        expect(Track.find).toHaveBeenCalledWith(expect.objectContaining({ approvalStatus: "approved" }));
    });

    // ========== Kiểm tra tìm kiếm theo từ khóa ==========
    test("should search tracks by title", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.find = jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([mockTracks[0]]),
        });
        Track.countDocuments = jest.fn().mockResolvedValue(1);

        const result = await artistTrackService.getArtistTracks(mockUserId, { q: "Track 1" });

        expect(result.tracks).toHaveLength(1);
        expect(Track.find).toHaveBeenCalledWith(expect.objectContaining({
            title: expect.objectContaining({ $regex: expect.any(String) }),
        }));
    });

    // ========== Kiểm tra pagination ==========
    test("should handle pagination correctly", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.find = jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(mockTracks),
        });
        Track.countDocuments = jest.fn().mockResolvedValue(150);

        const result = await artistTrackService.getArtistTracks(mockUserId, { page: 2, limit: 50 });

        expect(result.pagination.page).toBe(2);
        expect(result.pagination.limit).toBe(50);
        expect(result.pagination.total).toBe(150);
        expect(result.pagination.totalPages).toBe(3);
    });

    // ========== Kiểm tra limit tối đa 100 ==========
    test("should limit results to maximum 100 items per page", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.find = jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(mockTracks),
        });
        Track.countDocuments = jest.fn().mockResolvedValue(2);

        await artistTrackService.getArtistTracks(mockUserId, { limit: 500 });

        expect(Track.find().limit).toHaveBeenCalledWith(100);
    });
});

// ================== TEST GET TRACK DETAIL ==================
describe("Artist Track Service - getArtistTrackDetail", () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockArtistId = new mongoose.Types.ObjectId();
    const mockTrackId = new mongoose.Types.ObjectId().toString();

    const mockArtist = {
        _id: mockArtistId,
        userId: mockUserId,
        name: "Test Artist",
    };

    const mockTrack = {
        _id: mockTrackId,
        title: "Test Track",
        artist_artistId: mockArtistId,
        activeStatus: "active",
        approvalStatus: "approved",
        duration: 180,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ========== Kiểm tra lỗi khi artist profile không tìm thấy ==========
    test("should throw error when artist profile not found for detail", async () => {
        Artist.findOne.mockResolvedValue(null);

        await expect(artistTrackService.getArtistTrackDetail(mockUserId, mockTrackId)).rejects.toThrow("Artist profile not found");
    });

    // ========== Kiểm tra lỗi khi track ID không hợp lệ ==========
    test("should throw error when track id is invalid for detail", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);

        await expect(artistTrackService.getArtistTrackDetail(mockUserId, "invalid-id")).rejects.toThrow("Track id is invalid");
    });

    // ========== Kiểm tra lỗi khi track không tìm thấy ==========
    test("should throw error when track not found for detail", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.findOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(null),
        });

        await expect(artistTrackService.getArtistTrackDetail(mockUserId, mockTrackId)).rejects.toThrow("Track not found or you do not have permission to view it");
    });

    // ========== Kiểm tra lấy chi tiết track thành công ==========
    test("should get track detail successfully", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.findOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(mockTrack),
        });

        const result = await artistTrackService.getArtistTrackDetail(mockUserId, mockTrackId);

        expect(Track.findOne).toHaveBeenCalledWith({
            _id: mockTrackId,
            artist_artistId: mockArtistId,
        });
        expect(result).toBeDefined();
        expect(result).toEqual(mockTrack);
    });

    // ========== Kiểm tra không lấy được track của artist khác ==========
    test("should not get track of different artist", async () => {
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.findOne = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(null),
        });

        await expect(artistTrackService.getArtistTrackDetail(mockUserId, mockTrackId)).rejects.toThrow("Track not found or you do not have permission to view it");
    });
});

// ================== TEST SUBMIT TRACK FOR APPROVAL ==================
describe("Artist Track Service - submitArtistTrack", () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const mockArtistId = new mongoose.Types.ObjectId();
    const mockTrackId = new mongoose.Types.ObjectId().toString();

    const mockUser = {
        _id: mockUserId,
        role: "artist",
        email: "artist@test.com",
    };

    const mockArtist = {
        _id: mockArtistId,
        userId: mockUserId,
        name: "Test Artist",
    };

    const mockTrackDraft = {
        _id: mockTrackId,
        title: "Test Track",
        artist_artistId: mockArtistId,
        approvalStatus: "draft",
        audioFiles: [{ url: "https://example.com/audio.mp3" }],
        save: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ========== Kiểm tra lỗi khi user không tồn tại ==========
    test("should throw error when user not found for submit", async () => {
        User.findById.mockResolvedValue(null);

        await expect(artistTrackService.submitArtistTrack(mockUserId, mockTrackId)).rejects.toThrow("User not found");
    });

    // ========== Kiểm tra lỗi khi user không phải artist ==========
    test("should throw error when user is not artist for submit", async () => {
        const nonArtistUser = { ...mockUser, role: "listener" };
        User.findById.mockResolvedValue(nonArtistUser);

        await expect(artistTrackService.submitArtistTrack(mockUserId, mockTrackId)).rejects.toThrow("Only artists can submit tracks");
    });

    // ========== Kiểm tra lỗi khi artist profile không tìm thấy ==========
    test("should throw error when artist profile not found for submit", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(null);

        await expect(artistTrackService.submitArtistTrack(mockUserId, mockTrackId)).rejects.toThrow("Artist profile not found");
    });

    // ========== Kiểm tra lỗi khi track ID không hợp lệ ==========
    test("should throw error when track id is invalid for submit", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        await expect(artistTrackService.submitArtistTrack(mockUserId, "invalid-id")).rejects.toThrow("Track id is invalid");
    });

    // ========== Kiểm tra lỗi khi track không tìm thấy ==========
    test("should throw error when track not found for submit", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.findOne = jest.fn().mockResolvedValue(null);

        await expect(artistTrackService.submitArtistTrack(mockUserId, mockTrackId)).rejects.toThrow("Track not found or you do not have permission");
    });

    // ========== Kiểm tra lỗi khi track đã submitted ==========
    test("should throw error when track is already pending submission", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const pendingTrack = { ...mockTrackDraft, approvalStatus: "pending" };
        Track.findOne = jest.fn().mockResolvedValue(pendingTrack);

        await expect(artistTrackService.submitArtistTrack(mockUserId, mockTrackId)).rejects.toThrow("Track is already submitted or approved");
    });

    // ========== Kiểm tra lỗi khi track đã được approved ==========
    test("should throw error when track is already approved", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const approvedTrack = { ...mockTrackDraft, approvalStatus: "approved" };
        Track.findOne = jest.fn().mockResolvedValue(approvedTrack);

        await expect(artistTrackService.submitArtistTrack(mockUserId, mockTrackId)).rejects.toThrow("Track is already submitted or approved");
    });

    // ========== Kiểm tra lỗi khi track không có title ==========
    test("should throw error when track has no title for submit", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const noTitleTrack = { ...mockTrackDraft, title: "" };
        Track.findOne = jest.fn().mockResolvedValue(noTitleTrack);

        await expect(artistTrackService.submitArtistTrack(mockUserId, mockTrackId)).rejects.toThrow("Track must have a title and at least one audio file before submitting");
    });

    // ========== Kiểm tra lỗi khi track không có audio file ==========
    test("should throw error when track has no audio files for submit", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const noAudioTrack = { ...mockTrackDraft, audioFiles: [] };
        Track.findOne = jest.fn().mockResolvedValue(noAudioTrack);

        await expect(artistTrackService.submitArtistTrack(mockUserId, mockTrackId)).rejects.toThrow("Track must have a title and at least one audio file before submitting");
    });

    // ========== Kiểm tra submit track thành công ==========
    test("should submit track for approval successfully", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);
        Track.findOne = jest.fn().mockResolvedValue(mockTrackDraft);
        Track.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(mockTrackDraft),
        });

        const result = await artistTrackService.submitArtistTrack(mockUserId, mockTrackId);

        expect(mockTrackDraft.approvalStatus).toBe("pending");
        expect(mockTrackDraft.save).toHaveBeenCalled();
        expect(result).toBeDefined();
    });

    // ========== Kiểm tra submit track từ draft sang pending ==========
    test("should change track status from draft to pending on submit", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const draftTrack = { ...mockTrackDraft, approvalStatus: "draft" };
        Track.findOne = jest.fn().mockResolvedValue(draftTrack);
        Track.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(draftTrack),
        });

        await artistTrackService.submitArtistTrack(mockUserId, mockTrackId);

        expect(draftTrack.approvalStatus).toBe("pending");
        expect(draftTrack.save).toHaveBeenCalled();
    });

    // ========== Kiểm tra submit track từ rejected sang pending ==========
    test("should change track status from rejected to pending on submit", async () => {
        User.findById.mockResolvedValue(mockUser);
        Artist.findOne.mockResolvedValue(mockArtist);

        const rejectedTrack = { ...mockTrackDraft, approvalStatus: "rejected" };
        Track.findOne = jest.fn().mockResolvedValue(rejectedTrack);
        Track.findById = jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(rejectedTrack),
        });

        await artistTrackService.submitArtistTrack(mockUserId, mockTrackId);

        expect(rejectedTrack.approvalStatus).toBe("pending");
        expect(rejectedTrack.save).toHaveBeenCalled();
    });
});
