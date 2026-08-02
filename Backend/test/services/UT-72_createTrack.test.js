import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockUserFindById = jest.fn();
const mockArtistFindOne = jest.fn();
const mockAlbumFindById = jest.fn();
const mockGenreCountDocuments = jest.fn();
const mockReleaseScheduleExists = jest.fn();
const mockTrackFindById = jest.fn();
const mockFormatTrackManagementDetail = jest.fn((track) => track);

let lastCreatedTrack;

const MockTrack = jest.fn(function MockTrackDocument(data) {
    Object.assign(this, data);
    this._id = new mongoose.Types.ObjectId();
    this.save = jest.fn(async () => this);
    lastCreatedTrack = this;
});

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

jest.unstable_mockModule("../../src/models/Album.js", () => ({
    default: { findById: mockAlbumFindById },
}));

jest.unstable_mockModule("../../src/models/Genre.js", () => ({
    default: { countDocuments: mockGenreCountDocuments },
}));

jest.unstable_mockModule("../../src/models/ReleaseSchedule.js", () => ({
    default: { exists: mockReleaseScheduleExists },
}));

jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: MockTrack,
}));

jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
    deleteCloudinaryAssetsByUrls: jest.fn(),
}));

jest.unstable_mockModule("../../src/services/Track/track.helper.js", () => ({
    formatTrackManagementDetail: mockFormatTrackManagementDetail,
}));

const artistTrackService = (
    await import("../../src/services/Track/artist/artist.track.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const genreId = new mongoose.Types.ObjectId();

const validUser = { _id: userId, role: "artist" };
const validArtist = {
    _id: artistId,
    activeStatus: "active",
};

const validAudioFile = {
    url: "https://res.cloudinary.com/reso/audio/upload/sample.mp3",
    format: "mp3",
    bitrate: 320,
    label: "original",
    priority: 1,
};

const validAudioPayload = {
    title: "Test Track",
    audioFiles: [validAudioFile],
    audioAnalysis: { duration: 180 },
};

const expectAppError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe("UT-72 createTrack", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        lastCreatedTrack = undefined;

        mockUserFindById.mockResolvedValue(validUser);
        mockArtistFindOne.mockResolvedValue(validArtist);
        mockGenreCountDocuments.mockResolvedValue(1);
        mockTrackFindById.mockImplementation(() =>
            createPopulateQuery(lastCreatedTrack)
        );
    });

    test("UTCID01 - throws 400 when title is empty", async () => {
        await expectAppError(
            artistTrackService.createTrack(userId, { ...validAudioPayload, title: "   " }),
            "Title is required.",
            400
        );

        expect(MockTrack).not.toHaveBeenCalled();
    });

    test("UTCID02 - throws 400 when extracted audio duration is not greater than zero", async () => {
        await expectAppError(
            artistTrackService.createTrack(userId, {
                ...validAudioPayload,
                audioAnalysis: { duration: 0 },
            }),
            "Duration must be extracted from the uploaded audio file.",
            400
        );

        expect(MockTrack).not.toHaveBeenCalled();
    });

    test("UTCID03 - throws 400 when an audio file does not contain a valid URL", async () => {
        await expectAppError(
            artistTrackService.createTrack(userId, {
                ...validAudioPayload,
                audioFiles: [{ ...validAudioFile, url: "" }],
            }),
            "Audio file URL must be a valid http(s) URL.",
            400
        );

        expect(MockTrack).not.toHaveBeenCalled();
    });

    test("UTCID04 - throws 400 when genre IDs are invalid", async () => {
        await expectAppError(
            artistTrackService.createTrack(userId, {
                ...validAudioPayload,
                genreIds: ["invalid-genre-id"],
            }),
            "One or more genre IDs are invalid.",
            400
        );

        expect(mockGenreCountDocuments).not.toHaveBeenCalled();
        expect(MockTrack).not.toHaveBeenCalled();
    });

    test("UTCID05 - throws 404 when user does not exist", async () => {
        mockUserFindById.mockResolvedValue(null);

        await expectAppError(
            artistTrackService.createTrack(userId, validAudioPayload),
            "User not found.",
            404
        );

        expect(mockArtistFindOne).not.toHaveBeenCalled();
    });

    test("UTCID06 - throws 403 when user is not an artist", async () => {
        mockUserFindById.mockResolvedValue({ _id: userId, role: "user" });

        await expectAppError(
            artistTrackService.createTrack(userId, validAudioPayload),
            "Only artists can create tracks.",
            403
        );

        expect(mockArtistFindOne).not.toHaveBeenCalled();
    });

    test("UTCID07 - throws 404 when artist profile does not exist", async () => {
        mockArtistFindOne.mockResolvedValue(null);

        await expectAppError(
            artistTrackService.createTrack(userId, validAudioPayload),
            "Artist profile not found. Please complete your artist profile first.",
            404
        );

        expect(MockTrack).not.toHaveBeenCalled();
    });

    test("UTCID08 - throws 403 when artist account is blocked", async () => {
        mockArtistFindOne.mockResolvedValue({
            ...validArtist,
            activeStatus: "blocked",
        });

        await expectAppError(
            artistTrackService.createTrack(userId, validAudioPayload),
            "Your artist account has been blocked. Cannot create tracks.",
            403
        );

        expect(MockTrack).not.toHaveBeenCalled();
    });

    test("UTCID09 - creates a minimal draft track", async () => {
        const result = await artistTrackService.createTrack(userId, {
            title: "  Minimal Draft  ",
        });

        expect(lastCreatedTrack.save).toHaveBeenCalledTimes(1);
        expect(result).toBe(lastCreatedTrack);
        expect(lastCreatedTrack).toMatchObject({
            title: "Minimal Draft",
            artist_artistId: artistId,
            album_albumId: null,
            audioFiles: [],
            duration: 0,
            activeStatus: "draft",
            approvalStatus: "draft",
            releaseStatus: "unreleased",
        });
    });

    test("UTCID10 - creates a draft with normalized audio information", async () => {
        await artistTrackService.createTrack(userId, validAudioPayload);

        expect(lastCreatedTrack).toMatchObject({
            title: "Test Track",
            duration: 180,
            audioFiles: [validAudioFile],
            stats: { totalLike: 0, totalPlay: 0 },
        });
        expect(mockTrackFindById).toHaveBeenCalledWith(lastCreatedTrack._id);
    });

    test("UTCID11 - validates existing active genres and stores their ObjectIds", async () => {
        await artistTrackService.createTrack(userId, {
            ...validAudioPayload,
            genreIds: [genreId.toString()],
        });

        expect(mockGenreCountDocuments).toHaveBeenCalledTimes(1);
        expect(lastCreatedTrack.genreIds).toHaveLength(1);
        expect(lastCreatedTrack.genreIds[0].equals(genreId)).toBe(true);
    });

    test("UTCID12 - returns the formatted newly created draft with optional information", async () => {
        const payload = {
            ...validAudioPayload,
            versionTitle: " Acoustic ",
            description: "  Draft description  ",
            tags: [" acoustic ", "demo"],
            avatar: "https://example.com/avatar.jpg",
            coverImage: ["https://example.com/cover.jpg"],
            lyricsStatic: "Test lyrics",
            lyricsSyncUrl: "https://example.com/lyrics.lrc",
        };

        const result = await artistTrackService.createTrack(userId, payload);

        expect(mockFormatTrackManagementDetail).toHaveBeenCalledWith(
            lastCreatedTrack
        );
        expect(result).toBe(lastCreatedTrack);
        expect(lastCreatedTrack).toMatchObject({
            versionTitle: "Acoustic",
            description: "Draft description",
            tags: ["acoustic", "demo"],
            avatar: payload.avatar,
            coverImage: payload.coverImage,
            lyricsStatic: payload.lyricsStatic,
            lyricsSyncUrl: payload.lyricsSyncUrl,
            releaseDate: null,
            releasedAt: null,
        });
    });
});
