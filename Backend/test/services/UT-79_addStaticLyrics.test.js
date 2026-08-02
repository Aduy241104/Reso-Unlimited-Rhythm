import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockUserFindById = jest.fn();
const mockArtistFindOne = jest.fn();
const mockTrackFindOne = jest.fn();
const mockTrackFindById = jest.fn();
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
    uploadToCloudinary: jest.fn(),
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

const createTrack = (approvalStatus = "pending") => ({
    _id: trackId,
    title: "Shape of You",
    artist_artistId: artistId,
    lyricsStatic: "",
    approvalStatus,
    save: jest.fn(async function save() {
        return this;
    }),
});

const expectAppError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe("UT-79 addStaticLyrics", () => {
    let track;

    beforeEach(() => {
        jest.clearAllMocks();
        track = createTrack();
        mockUserFindById.mockResolvedValue({ _id: userId, role: "artist" });
        mockArtistFindOne.mockResolvedValue({ _id: artistId });
        mockTrackFindOne.mockResolvedValue(track);
        mockTrackFindById.mockImplementation(() => createPopulateQuery(track));
    });

    test("UTCID01 - adds static lyrics to a pending track", async () => {
        const result = await lyricService.addStaticLyrics(
            userId,
            trackId,
            "Hello world lyrics"
        );

        expect(track.lyricsStatic).toBe("Hello world lyrics");
        expect(track.approvalStatus).toBe("pending");
        expect(track.save).toHaveBeenCalledTimes(1);
        expect(result).toBe(track);
    });

    test("UTCID02 - accepts empty static lyrics", async () => {
        await lyricService.addStaticLyrics(userId, trackId, "");

        expect(track.lyricsStatic).toBe("");
        expect(track.save).toHaveBeenCalledTimes(1);
    });

    test("UTCID03 - moves an approved track back to pending review", async () => {
        track = createTrack("approved");
        mockTrackFindOne.mockResolvedValue(track);
        mockTrackFindById.mockImplementation(() => createPopulateQuery(track));

        await lyricService.addStaticLyrics(userId, trackId, "Modified lyrics");

        expect(track.approvalStatus).toBe("pending");
    });

    test("UTCID04 - throws 404 when user does not exist", async () => {
        mockUserFindById.mockResolvedValue(null);

        await expectAppError(
            lyricService.addStaticLyrics(userId, trackId, "Lyrics"),
            "User not found.",
            404
        );
    });

    test("UTCID05 - throws 403 when user is not an artist", async () => {
        mockUserFindById.mockResolvedValue({ _id: userId, role: "user" });

        await expectAppError(
            lyricService.addStaticLyrics(userId, trackId, "Lyrics"),
            "Only artists can update lyrics.",
            403
        );
    });

    test("UTCID06 - throws 404 when artist profile does not exist", async () => {
        mockArtistFindOne.mockResolvedValue(null);

        await expectAppError(
            lyricService.addStaticLyrics(userId, trackId, "Lyrics"),
            "Artist profile not found.",
            404
        );
    });

    test("UTCID07 - throws 400 when track ID is invalid", async () => {
        await expectAppError(
            lyricService.addStaticLyrics(userId, "invalid-id", "Lyrics"),
            "Track id is invalid.",
            400
        );
    });

    test("UTCID08 - throws 404 when track is missing or not owned by artist", async () => {
        mockTrackFindOne.mockResolvedValue(null);

        await expectAppError(
            lyricService.addStaticLyrics(userId, trackId, "Lyrics"),
            "Track not found or you do not have permission to update it.",
            404
        );
    });

    test("UTCID09 - moves a rejected track back to pending review", async () => {
        track = createTrack("rejected");
        mockTrackFindOne.mockResolvedValue(track);
        mockTrackFindById.mockImplementation(() => createPopulateQuery(track));

        const result = await lyricService.addStaticLyrics(
            userId,
            trackId,
            "Corrected lyrics"
        );

        expect(track.lyricsStatic).toBe("Corrected lyrics");
        expect(track.approvalStatus).toBe("pending");
        expect(result).toBe(track);
    });
});
