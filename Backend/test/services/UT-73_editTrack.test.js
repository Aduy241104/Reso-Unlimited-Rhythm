import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockUserFindById = jest.fn();
const mockArtistFindOne = jest.fn();
const mockAlbumFindById = jest.fn();
const mockGenreCountDocuments = jest.fn();
const mockReleaseScheduleExists = jest.fn();
const mockTrackFindOne = jest.fn();
const mockTrackFindById = jest.fn();
const mockDeleteCloudinaryAssetsByUrls = jest.fn();
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
    deleteCloudinaryAssetsByUrls: mockDeleteCloudinaryAssetsByUrls,
}));

jest.unstable_mockModule("../../src/services/Track/track.helper.js", () => ({
    formatTrackManagementDetail: mockFormatTrackManagementDetail,
}));

const artistTrackService = (
    await import("../../src/services/Track/artist/artist.track.service.js")
).default;

const userId = new mongoose.Types.ObjectId();
const artistId = new mongoose.Types.ObjectId();
const trackId = new mongoose.Types.ObjectId();
const albumId = new mongoose.Types.ObjectId();
const genreId = new mongoose.Types.ObjectId();

const validUser = { _id: userId, role: "artist" };
const validArtist = { _id: artistId, activeStatus: "active" };

const oldAudioFile = {
    url: "https://example.com/old.mp3",
    format: "mp3",
    bitrate: 128,
    label: "original",
    priority: 0,
};

const newAudioFile = {
    url: "https://example.com/new.mp3",
    format: "mp3",
    bitrate: 320,
    label: "original",
    priority: 1,
};

const createTrackDocument = (overrides = {}) => ({
    _id: trackId,
    title: "Old title",
    versionTitle: "",
    description: "Old description",
    tags: ["old"],
    artist_artistId: artistId,
    album_albumId: albumId,
    genreIds: [],
    audioFiles: [oldAudioFile],
    duration: 120,
    avatar: "https://example.com/old-avatar.jpg",
    coverImage: ["https://example.com/old-cover.jpg"],
    lyricsStatic: "Old lyrics",
    lyricsSyncUrl: "https://example.com/old-lyrics.lrc",
    copyright: null,
    releaseDate: new Date("2026-01-01T00:00:00.000Z"),
    activeStatus: "active",
    approvalStatus: "draft",
    pendingUpdate: {
        status: "none",
        data: null,
        changedFields: [],
    },
    save: jest.fn(async function save() {
        return this;
    }),
    ...overrides,
});

const expectAppError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe("UT-73 editTrack", () => {
    let track;

    beforeEach(() => {
        jest.clearAllMocks();
        track = createTrackDocument();

        mockUserFindById.mockResolvedValue(validUser);
        mockArtistFindOne.mockResolvedValue(validArtist);
        mockTrackFindOne.mockResolvedValue(track);
        mockTrackFindById.mockImplementation(() => createPopulateQuery(track));
        mockGenreCountDocuments.mockResolvedValue(1);
        mockDeleteCloudinaryAssetsByUrls.mockResolvedValue(undefined);
    });

    test("UTCID01 - throws 404 when user does not exist", async () => {
        mockUserFindById.mockResolvedValue(null);

        await expectAppError(
            artistTrackService.updateArtistTrack(userId, trackId, { title: "New title" }),
            "User not found.",
            404
        );

        expect(mockArtistFindOne).not.toHaveBeenCalled();
    });

    test("UTCID02 - throws 403 when user is not an artist", async () => {
        mockUserFindById.mockResolvedValue({ _id: userId, role: "user" });

        await expectAppError(
            artistTrackService.updateArtistTrack(userId, trackId, { title: "New title" }),
            "Only artists can update tracks.",
            403
        );

        expect(mockArtistFindOne).not.toHaveBeenCalled();
    });

    test("UTCID03 - throws 404 when artist profile does not exist", async () => {
        mockArtistFindOne.mockResolvedValue(null);

        await expectAppError(
            artistTrackService.updateArtistTrack(userId, trackId, { title: "New title" }),
            "Artist profile not found.",
            404
        );

        expect(mockTrackFindOne).not.toHaveBeenCalled();
    });

    test("UTCID04 - throws 403 when artist account is blocked", async () => {
        mockArtistFindOne.mockResolvedValue({ ...validArtist, activeStatus: "blocked" });

        await expectAppError(
            artistTrackService.updateArtistTrack(userId, trackId, { title: "New title" }),
            "Your artist account has been blocked. Cannot create tracks.",
            403
        );

        expect(track.save).not.toHaveBeenCalled();
    });

    test("UTCID05 - throws 400 when track ID is invalid", async () => {
        await expectAppError(
            artistTrackService.updateArtistTrack(userId, "invalid-track-id", { title: "New title" }),
            "Track id is invalid.",
            400
        );

        expect(mockTrackFindOne).not.toHaveBeenCalled();
    });

    test("UTCID06 - updates the track title and returns the updated track", async () => {
        const result = await artistTrackService.updateArtistTrack(
            userId,
            trackId,
            { title: "  New title  " }
        );

        expect(track.title).toBe("New title");
        expect(track.save).toHaveBeenCalledTimes(1);
        expect(result).toBe(track);
    });

    test("UTCID07 - updates duration from audio analysis", async () => {
        await artistTrackService.updateArtistTrack(userId, trackId, {
            audioFiles: [newAudioFile],
            audioAnalysis: { duration: 240 },
        });

        expect(track.duration).toBe(240);
    });

    test("UTCID08 - updates and normalizes audio files", async () => {
        await artistTrackService.updateArtistTrack(userId, trackId, {
            audioFiles: [{ ...newAudioFile, format: "MP3", label: "ORIGINAL" }],
            audioAnalysis: { duration: 200 },
        });

        expect(track.audioFiles).toEqual([newAudioFile]);
        expect(mockDeleteCloudinaryAssetsByUrls).toHaveBeenCalledWith([
            oldAudioFile.url,
        ]);
    });

    test("UTCID09 - updates validated genre IDs", async () => {
        await artistTrackService.updateArtistTrack(userId, trackId, {
            genreIds: [genreId.toString()],
        });

        expect(mockGenreCountDocuments).toHaveBeenCalledTimes(1);
        expect(track.genreIds).toHaveLength(1);
        expect(track.genreIds[0].equals(genreId)).toBe(true);
    });

    test("UTCID10 - updates multiple editable fields", async () => {
        await artistTrackService.updateArtistTrack(userId, trackId, {
            title: "Multiple fields",
            versionTitle: " Remix ",
            description: "  Updated description  ",
            tags: [" remix ", "new"],
            avatar: "https://example.com/new-avatar.jpg",
        });

        expect(track).toMatchObject({
            title: "Multiple fields",
            versionTitle: "Remix",
            description: "Updated description",
            tags: ["remix", "new"],
            avatar: "https://example.com/new-avatar.jpg",
        });
    });

    test("UTCID11 - stores approved-track edits in pendingUpdate", async () => {
        track = createTrackDocument({ approvalStatus: "approved" });
        mockTrackFindOne.mockResolvedValue(track);
        mockTrackFindById.mockImplementation(() => createPopulateQuery(track));

        await artistTrackService.updateArtistTrack(userId, trackId, {
            title: "Title awaiting review",
        });

        expect(track.title).toBe("Old title");
        expect(track.approvalStatus).toBe("approved");
        expect(track.pendingUpdate).toMatchObject({
            status: "pending",
            changedFields: ["title"],
            data: { title: "Title awaiting review" },
        });
    });

    test("UTCID12 - directly updates a rejected track", async () => {
        track = createTrackDocument({ approvalStatus: "rejected" });
        mockTrackFindOne.mockResolvedValue(track);
        mockTrackFindById.mockImplementation(() => createPopulateQuery(track));

        await artistTrackService.updateArtistTrack(userId, trackId, {
            title: "Corrected rejected track",
        });

        expect(track.title).toBe("Corrected rejected track");
        expect(track.approvalStatus).toBe("rejected");
        expect(track.pendingUpdate.status).toBe("none");
    });

    test("UTCID13 - ignores album_albumId because editTrack does not currently support album updates", async () => {
        await artistTrackService.updateArtistTrack(userId, trackId, {
            album_albumId: "invalid-album-id",
        });

        expect(mockAlbumFindById).not.toHaveBeenCalled();
        expect(track.album_albumId).toBe(albumId);
        expect(track.save).toHaveBeenCalledTimes(1);
    });

    test("UTCID14 - updates lyrics and cover while leaving releaseDate unchanged", async () => {
        const originalReleaseDate = track.releaseDate;

        await artistTrackService.updateArtistTrack(userId, trackId, {
            lyricsStatic: "Updated lyrics",
            lyricsSyncUrl: "https://example.com/new-lyrics.lrc",
            coverImage: ["https://example.com/new-cover.jpg"],
            releaseDate: "2027-01-01",
        });

        expect(track.lyricsStatic).toBe("Updated lyrics");
        expect(track.lyricsSyncUrl).toBe("https://example.com/new-lyrics.lrc");
        expect(track.coverImage).toEqual(["https://example.com/new-cover.jpg"]);
        expect(track.releaseDate).toBe(originalReleaseDate);
    });

    test("UTCID15 - throws 404 when track does not exist or is not owned by artist", async () => {
        mockTrackFindOne.mockResolvedValue(null);

        await expectAppError(
            artistTrackService.updateArtistTrack(userId, trackId, { title: "New title" }),
            "Track not found or you do not have permission to update it.",
            404
        );

        expect(track.save).not.toHaveBeenCalled();
    });
});
