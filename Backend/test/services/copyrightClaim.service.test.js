import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockClaimModel = {
    findOne: jest.fn(),
    create: jest.fn(),
};
const mockTrackModel = { findOne: jest.fn() };
const mockArtistModel = { findOne: jest.fn() };
const mockUserModel = { findById: jest.fn() };
const mockRegistryModel = { findOneAndUpdate: jest.fn() };
const mockAuditModel = { findOne: jest.fn() };

const loadService = async () => {
    jest.resetModules();
    jest.unstable_mockModule("../../src/models/CopyrightClaim.js", () => ({ default: mockClaimModel }));
    jest.unstable_mockModule("../../src/models/CopyrightRegistry.js", () => ({ default: mockRegistryModel }));
    jest.unstable_mockModule("../../src/models/AuditLog.js", () => ({ default: mockAuditModel }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: mockTrackModel }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: mockArtistModel }));
    jest.unstable_mockModule("../../src/models/User.js", () => ({ default: mockUserModel }));
    return (await import("../../src/services/copyright/copyrightClaim.service.js")).default;
};

const id = () => new mongoose.Types.ObjectId();
const selectLean = (value) => ({
    select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(value) }),
});

describe("copyright claim workflow", () => {
    beforeEach(() => jest.clearAllMocks());

    test("submits a claim without auto-changing content approval", async () => {
        const service = await loadService();
        const trackId = id();
        const claimantId = id();
        const ownerUserId = id();
        const ownerArtistId = id();
        const track = {
            _id: trackId,
            artist_artistId: { _id: ownerArtistId, userId: ownerUserId, isDeleted: false },
        };
        const created = {
            _id: id(),
            toObject: () => ({
                _id: "claim-1",
                trackId,
                claimantUserId: claimantId,
                evidence: [],
                response: {},
                appeal: {},
            }),
        };

        mockTrackModel.findOne.mockReturnValue({
            populate: jest.fn().mockResolvedValue(track),
        });
        mockClaimModel.findOne.mockReturnValue(selectLean(null));
        mockUserModel.findById.mockReturnValue(selectLean({ _id: claimantId, role: "user" }));
        mockArtistModel.findOne.mockReturnValue(selectLean(null));
        mockClaimModel.create.mockResolvedValue(created);

        const result = await service.createClaim(claimantId, {
            trackId: trackId.toString(),
            statement: "I own the recording and can provide the original contract.",
            claimType: "ownership",
        });

        expect(result._id).toBe("claim-1");
        expect(mockClaimModel.create).toHaveBeenCalledWith(expect.objectContaining({
            trackId,
            claimantUserId: claimantId,
            respondentUserId: ownerUserId,
            status: "submitted",
        }));
    });

    test("allows only the respondent rights holder to answer", async () => {
        const service = await loadService();
        const respondentId = id();
        const save = jest.fn().mockResolvedValue(undefined);
        const claim = {
            respondentUserId: respondentId,
            claimantUserId: id(),
            status: "submitted",
            response: {},
            save,
            toObject: () => ({ evidence: [], response: {}, appeal: {} }),
        };
        mockClaimModel.findOne.mockResolvedValue(claim);

        await expect(service.respondToClaim(respondentId, id(), {
            statement: "The uploaded track is my original recording and the claim is incorrect.",
        })).resolves.toBeTruthy();
        expect(save).toHaveBeenCalled();
        expect(claim.status).toBe("responded");
    });
});
