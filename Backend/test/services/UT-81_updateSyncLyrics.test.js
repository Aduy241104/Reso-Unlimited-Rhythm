import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockUserFindById = jest.fn();
const mockArtistFindOne = jest.fn();
const mockTrackFindOne = jest.fn();
const mockTrackFindById = jest.fn();
const mockUploadToCloudinary = jest.fn();
const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();

const MockTrack = jest.fn();
MockTrack.findOne = mockTrackFindOne;
MockTrack.findById = mockTrackFindById;

const createPopulateQuery = (result) => {
    const query = {
        populate: jest.fn(),
        then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    };
    query.populate.mockReturnValue(query);
    return query;
};

jest.unstable_mockModule("fs/promises", () => ({
    default: { mkdir: mockMkdir, writeFile: mockWriteFile },
}));

jest.unstable_mockModule("../../src/models/User.js", () => ({
    default: { findById: mockUserFindById },
}));

jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: { findOne: mockArtistFindOne },
}));

jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: MockTrack,
}));

jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
    uploadToCloudinary: mockUploadToCloudinary,
}));

jest.unstable_mockModule("../../src/services/Track/track.helper.js", () => ({
    formatTrackManagementDetail: jest.fn((track) => track),
}));

const lyricService = (
    await import("../../src/services/Lyrics/artist.lyrics.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const trackId = new mongoose.Types.ObjectId();
const newLyricsBuffer = Buffer.from("[00:10.00]New updated lyrics content");
const newLyricsFile = { originalname: "updated.lrc", buffer: newLyricsBuffer };

const createTrack = (approvalStatus = "pending") => ({
    _id: trackId,
    title: "Shape of You",
    artist_artistId: artistId,
    lyricsSyncUrl: "https://cloudinary.example/old-lyrics.lrc",
    approvalStatus,
    save: jest.fn(async function save() {
        return this;
    }),
});

const expectAppError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe("UT-81 updateSyncLyrics", () => {
    let track;

    beforeEach(() => {
        jest.clearAllMocks();
        track = createTrack();
        mockUserFindById.mockResolvedValue({ _id: userId, role: "artist" });
        mockArtistFindOne.mockResolvedValue({ _id: artistId });
        mockTrackFindOne.mockResolvedValue(track);
        mockTrackFindById.mockImplementation(() => createPopulateQuery(track));
        mockUploadToCloudinary.mockResolvedValue({
            secure_url: "https://cloudinary.example/updated-lyrics.lrc",
        });
        mockMkdir.mockResolvedValue(undefined);
        mockWriteFile.mockResolvedValue(undefined);
    });

    test("UTCID01 - replaces synchronized lyrics and remains pending", async () => {
        const result = await lyricService.updateSyncLyrics(
            userId,
            trackId,
            newLyricsFile
        );

        expect(mockUploadToCloudinary).toHaveBeenCalledWith(
            newLyricsBuffer,
            "tracks/lyrics/sync",
            "raw"
        );
        expect(track.lyricsSyncUrl).toBe(
            "https://cloudinary.example/updated-lyrics.lrc"
        );
        expect(track.approvalStatus).toBe("pending");
        expect(track.save).toHaveBeenCalledTimes(1);
        expect(result).toBe(track);
    });

    test("UTCID02 - moves an approved track back to pending review", async () => {
        track = createTrack("approved");
        mockTrackFindOne.mockResolvedValue(track);
        mockTrackFindById.mockImplementation(() => createPopulateQuery(track));

        await lyricService.updateSyncLyrics(userId, trackId, newLyricsFile);

        expect(track.approvalStatus).toBe("pending");
    });

    test("UTCID03 - throws 404 when user does not exist", async () => {
        mockUserFindById.mockResolvedValue(null);

        await expectAppError(
            lyricService.updateSyncLyrics(userId, trackId, newLyricsFile),
            "User not found.",
            404
        );
    });

    test("UTCID04 - throws 403 when user is not an artist", async () => {
        mockUserFindById.mockResolvedValue({ _id: userId, role: "user" });

        await expectAppError(
            lyricService.updateSyncLyrics(userId, trackId, newLyricsFile),
            "Only artists can update lyrics.",
            403
        );
    });

    test("UTCID05 - throws 404 when artist profile does not exist", async () => {
        mockArtistFindOne.mockResolvedValue(null);

        await expectAppError(
            lyricService.updateSyncLyrics(userId, trackId, newLyricsFile),
            "Artist profile not found.",
            404
        );
    });

    test("UTCID06 - throws 400 when track ID is invalid", async () => {
        await expectAppError(
            lyricService.updateSyncLyrics(userId, "invalid-id", newLyricsFile),
            "Track id is invalid.",
            400
        );
    });

    test("UTCID07 - throws 404 when track is missing or not owned by artist", async () => {
        mockTrackFindOne.mockResolvedValue(null);

        await expectAppError(
            lyricService.updateSyncLyrics(userId, trackId, newLyricsFile),
            "Track not found or you do not have permission to update it.",
            404
        );
    });
});
