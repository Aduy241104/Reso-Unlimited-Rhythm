import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockUserFindById = jest.fn();
const mockArtistFindOne = jest.fn();
const mockTrackFindOne = jest.fn();
const mockTrackFindById = jest.fn();
const mockUploadToCloudinary = jest.fn();
const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();
const mockFormatTrackManagementDetail = jest.fn((track) => track);

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
    formatTrackManagementDetail: mockFormatTrackManagementDetail,
}));

const lyricService = (
    await import("../../src/services/Lyrics/artist.lyrics.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const trackId = new mongoose.Types.ObjectId();
const lyricsBuffer = Buffer.from("[00:10.00]Hello");
const lyricsFile = { originalname: "shape-of-you.lrc", buffer: lyricsBuffer };

const createTrack = (approvalStatus = "pending") => ({
    _id: trackId,
    title: "Shape of You",
    artist_artistId: artistId,
    lyricsSyncUrl: "",
    approvalStatus,
    save: jest.fn(async function save() {
        return this;
    }),
});

const expectAppError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe("UT-80 addSyncLyrics", () => {
    let track;

    beforeEach(() => {
        jest.clearAllMocks();
        track = createTrack();
        mockUserFindById.mockResolvedValue({ _id: userId, role: "artist" });
        mockArtistFindOne.mockResolvedValue({ _id: artistId });
        mockTrackFindOne.mockResolvedValue(track);
        mockTrackFindById.mockImplementation(() => createPopulateQuery(track));
        mockUploadToCloudinary.mockResolvedValue({
            secure_url: "https://cloudinary.example/new-lyrics.lrc",
        });
        mockMkdir.mockResolvedValue(undefined);
        mockWriteFile.mockResolvedValue(undefined);
    });

    test("UTCID01 - uploads synchronized lyrics for a pending track", async () => {
        const result = await lyricService.updateSyncLyrics(
            userId,
            trackId,
            lyricsFile
        );

        expect(mockUploadToCloudinary).toHaveBeenCalledWith(
            lyricsBuffer,
            "tracks/lyrics/sync",
            "raw"
        );
        expect(track.lyricsSyncUrl).toBe(
            "https://cloudinary.example/new-lyrics.lrc"
        );
        expect(track.approvalStatus).toBe("pending");
        expect(track.save).toHaveBeenCalledTimes(1);
        expect(result).toBe(track);
    });

    test("UTCID02 - moves an approved track back to pending review", async () => {
        track = createTrack("approved");
        mockTrackFindOne.mockResolvedValue(track);
        mockTrackFindById.mockImplementation(() => createPopulateQuery(track));

        await lyricService.updateSyncLyrics(userId, trackId, lyricsFile);

        expect(track.approvalStatus).toBe("pending");
    });

    test("UTCID03 - still saves the track when local LRC copy fails", async () => {
        mockWriteFile.mockRejectedValueOnce(new Error("Disk unavailable"));
        const consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        const result = await lyricService.updateSyncLyrics(
            userId,
            trackId,
            lyricsFile
        );

        expect(consoleError).toHaveBeenCalled();
        expect(track.save).toHaveBeenCalledTimes(1);
        expect(result).toBe(track);
        consoleError.mockRestore();
    });

    test("UTCID04 - throws 400 when lyrics file is not provided", async () => {
        await expectAppError(
            lyricService.updateSyncLyrics(userId, trackId, null),
            "No lyrics file provided.",
            400
        );

        expect(mockUploadToCloudinary).not.toHaveBeenCalled();
    });

    test("UTCID05 - throws 404 when user does not exist", async () => {
        mockUserFindById.mockResolvedValue(null);

        await expectAppError(
            lyricService.updateSyncLyrics(userId, trackId, lyricsFile),
            "User not found.",
            404
        );
    });

    test("UTCID06 - throws 403 when user is not an artist", async () => {
        mockUserFindById.mockResolvedValue({ _id: userId, role: "user" });

        await expectAppError(
            lyricService.updateSyncLyrics(userId, trackId, lyricsFile),
            "Only artists can update lyrics.",
            403
        );
    });

    test("UTCID07 - throws 404 when artist profile does not exist", async () => {
        mockArtistFindOne.mockResolvedValue(null);

        await expectAppError(
            lyricService.updateSyncLyrics(userId, trackId, lyricsFile),
            "Artist profile not found.",
            404
        );
    });

    test("UTCID08 - throws 400 when track ID is invalid", async () => {
        await expectAppError(
            lyricService.updateSyncLyrics(userId, "invalid-id", lyricsFile),
            "Track id is invalid.",
            400
        );
    });
});
