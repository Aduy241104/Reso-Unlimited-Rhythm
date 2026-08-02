import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockUserFindById = jest.fn();
const mockArtistFindOne = jest.fn();
const mockGenreCountDocuments = jest.fn();
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

jest.unstable_mockModule("../../src/models/Album.js", () => ({
    default: { findById: jest.fn() },
}));

jest.unstable_mockModule("../../src/models/Genre.js", () => ({
    default: { countDocuments: mockGenreCountDocuments },
}));

jest.unstable_mockModule("../../src/models/ReleaseSchedule.js", () => ({
    default: { exists: jest.fn() },
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
const trackId = new mongoose.Types.ObjectId();
const genreId = new mongoose.Types.ObjectId();

const createSubmittableTrack = () => ({
    _id: trackId,
    title: "Ready to submit",
    artist_artistId: artistId,
    genreIds: [genreId],
    audioFiles: [
        {
            url: "https://example.com/original.mp3",
            format: "mp3",
            bitrate: 320,
            label: "original",
            priority: 1,
        },
    ],
    duration: 180,
    avatar: "https://example.com/avatar.jpg",
    coverImage: [],
    lyricsStatic: "Lyrics",
    activeStatus: "draft",
    approvalStatus: "draft",
    rejectReason: "Old reason",
    moderation: {},
    copyright: {
        copyrightOwner: "Artist",
        recordingOwner: "Artist",
        declarationAccepted: true,
        isOriginal: true,
        isCover: false,
        isRemix: false,
        usesSample: false,
        usesLicensedBeat: false,
    },
    save: jest.fn(async function save() {
        return this;
    }),
});

const expectAppError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe("UT-78 submitArtistTrack", () => {
    let track;

    beforeEach(() => {
        jest.clearAllMocks();
        track = createSubmittableTrack();
        mockUserFindById.mockResolvedValue({ _id: userId, role: "artist" });
        mockArtistFindOne.mockResolvedValue({
            _id: artistId,
            activeStatus: "active",
        });
        mockTrackFindOne.mockResolvedValue(track);
        mockTrackFindById.mockImplementation(() => createPopulateQuery(track));
        mockGenreCountDocuments.mockResolvedValue(1);
    });

    test("UTCID01 - submits a valid artist track successfully", async () => {
        const result = await artistTrackService.submitArtistTrack(userId, trackId);

        expect(track.approvalStatus).toBe("pending");
        expect(track.activeStatus).toBe("draft");
        expect(track.rejectReason).toBe("");
        expect(track.moderation.submittedAt).toBeInstanceOf(Date);
        expect(track.save).toHaveBeenCalledTimes(1);
        expect(result).toBe(track);
    });

    test("UTCID02 - throws 400 when track ID is invalid", async () => {
        await expectAppError(
            artistTrackService.submitArtistTrack(userId, "invalid-id"),
            "Track id is invalid.",
            400
        );

        expect(mockTrackFindOne).not.toHaveBeenCalled();
    });

    test("UTCID03 - throws 404 when authenticated user is not found", async () => {
        mockUserFindById.mockResolvedValue(null);

        await expectAppError(
            artistTrackService.submitArtistTrack("invalid-user-id", trackId),
            "User not found.",
            404
        );

        expect(mockArtistFindOne).not.toHaveBeenCalled();
    });

    test("UTCID04 - throws 404 when track is missing or not owned by artist", async () => {
        mockTrackFindOne.mockResolvedValue(null);

        await expectAppError(
            artistTrackService.submitArtistTrack(userId, trackId),
            "Track not found or you do not have permission.",
            404
        );

        expect(track.save).not.toHaveBeenCalled();
    });
});
