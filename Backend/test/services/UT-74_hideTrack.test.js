import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import mongoose from "mongoose";

const mockArtistFindOne = jest.fn();
const mockTrackFindOne = jest.fn();
const mockTrackFindById = jest.fn();
const mockReleaseScheduleExists = jest.fn();
const mockFormatTrackManagementDetail = jest.fn((track) => track);

const MockTrack = jest.fn();
MockTrack.findOne = mockTrackFindOne;
MockTrack.findById = mockTrackFindById;

const createLeanPopulateQuery = (result) => {
    const query = {
        populate: jest.fn(),
        lean: jest.fn(async () => result),
    };
    query.populate.mockReturnValue(query);
    return query;
};

jest.unstable_mockModule("../../src/models/User.js", () => ({
    default: { findById: jest.fn() },
}));

jest.unstable_mockModule("../../src/models/Artist.js", () => ({
    default: { findOne: mockArtistFindOne },
}));

jest.unstable_mockModule("../../src/models/Album.js", () => ({
    default: { findById: jest.fn() },
}));

jest.unstable_mockModule("../../src/models/Genre.js", () => ({
    default: { countDocuments: jest.fn() },
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
const trackId = new mongoose.Types.ObjectId();

const createTrack = (overrides = {}) => ({
    _id: trackId,
    artist_artistId: artistId,
    activeStatus: "active",
    approvalStatus: "approved",
    releaseStatus: "unreleased",
    hiddenReason: "Previous reason",
    hiddenAt: null,
    previousActiveStatusBeforeArtistHide: null,
    save: jest.fn(async function save() {
        return this;
    }),
    ...overrides,
});

const expectAppError = async (promise, message, statusCode) => {
    await expect(promise).rejects.toMatchObject({ message, statusCode });
};

describe("UT-74 hideTrack", () => {
    let track;

    beforeEach(() => {
        jest.clearAllMocks();
        track = createTrack();
        mockArtistFindOne.mockResolvedValue({ _id: artistId });
        mockTrackFindOne.mockResolvedValue(track);
        mockTrackFindById.mockImplementation(() =>
            createLeanPopulateQuery(track)
        );
        mockReleaseScheduleExists.mockResolvedValue(false);
    });

    test("UTCID01 - changes an active track to hidden", async () => {
        const result = await artistTrackService.hideArtistTrack(userId, trackId);

        expect(track.activeStatus).toBe("hidden");
        expect(track.previousActiveStatusBeforeArtistHide).toBe("active");
        expect(track.hiddenReason).toBe("");
        expect(track.hiddenAt).toBeInstanceOf(Date);
        expect(track.save).toHaveBeenCalledTimes(1);
        expect(result).toBe(track);
    });

    test("UTCID02 - throws 400 when track ID is invalid", async () => {
        await expectAppError(
            artistTrackService.hideArtistTrack(userId, "invalid-id"),
            "Track id is invalid.",
            400
        );

        expect(mockTrackFindOne).not.toHaveBeenCalled();
    });

    test("UTCID03 - keeps an already hidden track hidden", async () => {
        track = createTrack({
            activeStatus: "hidden",
            previousActiveStatusBeforeArtistHide: "active",
        });
        mockTrackFindOne.mockResolvedValue(track);
        mockTrackFindById.mockImplementation(() =>
            createLeanPopulateQuery(track)
        );

        await artistTrackService.hideArtistTrack(userId, trackId);

        expect(track.activeStatus).toBe("hidden");
        expect(track.previousActiveStatusBeforeArtistHide).toBe("active");
        expect(track.save).toHaveBeenCalledTimes(1);
    });

    test("UTCID04 - hides a rejected draft track", async () => {
        track = createTrack({
            activeStatus: "draft",
            approvalStatus: "rejected",
        });
        mockTrackFindOne.mockResolvedValue(track);
        mockTrackFindById.mockImplementation(() =>
            createLeanPopulateQuery(track)
        );

        await artistTrackService.hideArtistTrack(userId, trackId);

        expect(track.activeStatus).toBe("hidden");
        expect(track.approvalStatus).toBe("rejected");
        expect(track.previousActiveStatusBeforeArtistHide).toBe("draft");
    });

    test("UTCID05 - throws 404 when track does not exist", async () => {
        mockTrackFindOne.mockResolvedValue(null);

        await expectAppError(
            artistTrackService.hideArtistTrack(userId, trackId),
            "Track not found or you do not have permission to update it.",
            404
        );
    });

    test("UTCID06 - throws 404 when track does not belong to the artist", async () => {
        mockTrackFindOne.mockResolvedValue(null);

        await expectAppError(
            artistTrackService.hideArtistTrack(userId, trackId),
            "Track not found or you do not have permission to update it.",
            404
        );

        expect(mockTrackFindOne).toHaveBeenCalledWith({
            _id: trackId,
            artist_artistId: artistId,
        });
    });
});
