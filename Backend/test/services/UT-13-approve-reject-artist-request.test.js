import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const artistRequestId = "507f1f77bcf86cd799439011";
const adminUserId = "507f1f77bcf86cd799439012";
const requestUserId = "507f1f77bcf86cd799439013";
const artistId = "507f1f77bcf86cd799439014";

const mockArtistModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    deleteOne: jest.fn(),
};
const mockArtistRequestModel = { findById: jest.fn() };
const mockUserModel = { findById: jest.fn() };

const createArtistRequestDocument = () => ({
    _id: artistRequestId,
    userId: requestUserId,
    stageName: "Synth Horizon",
    bio: "Electronic duo",
    avatar: "avatar.jpg",
    socialLinks: {
        facebook: "fb",
        instagram: "ig",
        youtube: "yt",
    },
    status: "pending",
    rejectReason: "",
    review: {
        toObject: () => ({
            adminNote: "",
            checklist: {},
        }),
    },
    reviewedBy: null,
    reviewedAt: null,
    markModified: jest.fn(),
    save: jest.fn().mockResolvedValue(true),
});

const createUserDocument = () => ({
    _id: requestUserId,
    role: "user",
    save: jest.fn().mockResolvedValue(true),
});

const approvedChecklist = {
    profileComplete: true,
    identityVerified: true,
    hasMusicActivity: true,
    socialLinksValid: true,
    noImpersonation: true,
    acceptedCopyrightPolicy: true,
};

const loadService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/ArtistRequest.js", () => ({
        default: mockArtistRequestModel,
    }));
    jest.unstable_mockModule("../../src/models/User.js", () => ({
        default: mockUserModel,
    }));

    const { default: adminArtistRequestService } = await import(
        "../../src/services/artist/admin.artistRequest.service.js"
    );

    return adminArtistRequestService;
};

describe("Approve/reject request", () => {
    beforeEach(() => {
        mockArtistModel.findOne.mockReset();
        mockArtistModel.create.mockReset();
        mockArtistModel.findById.mockReset();
        mockArtistModel.deleteOne.mockReset();
        mockArtistRequestModel.findById.mockReset();
        mockUserModel.findById.mockReset();
    });

    test("throws 400 when the artist request id is invalid", async () => {
        const adminArtistRequestService = await loadService();

        await expect(
            adminArtistRequestService.reviewArtistRequest(
                "bad-id",
                { status: "approved", checklist: approvedChecklist },
                adminUserId
            )
        ).rejects.toMatchObject({
            message: "Artist request id is invalid.",
            statusCode: 400,
        });

        expect(mockArtistRequestModel.findById).not.toHaveBeenCalled();
    });

    test("throws 404 when the artist request does not exist", async () => {
        const adminArtistRequestService = await loadService();

        mockArtistRequestModel.findById.mockResolvedValue(null);

        await expect(
            adminArtistRequestService.reviewArtistRequest(
                artistRequestId,
                { status: "approved", checklist: approvedChecklist },
                adminUserId
            )
        ).rejects.toMatchObject({
            message: "Artist request not found.",
            statusCode: 404,
        });

        expect(mockArtistModel.create).not.toHaveBeenCalled();
    });

    test("throws 409 when the artist request has already been approved", async () => {
        const adminArtistRequestService = await loadService();
        const artistRequestDocument = createArtistRequestDocument();
        artistRequestDocument.status = "approved";

        mockArtistRequestModel.findById.mockResolvedValue(artistRequestDocument);

        await expect(
            adminArtistRequestService.reviewArtistRequest(
                artistRequestId,
                { status: "approved", checklist: approvedChecklist },
                adminUserId
            )
        ).rejects.toMatchObject({
            message:
                "This artist request has already been approved and cannot be reviewed again.",
            statusCode: 409,
        });

        expect(mockArtistModel.create).not.toHaveBeenCalled();
        expect(artistRequestDocument.save).not.toHaveBeenCalled();
    });

    test("approves a pending artist registration request and creates artist profile", async () => {
        const adminArtistRequestService = await loadService();
        const artistRequestDocument = createArtistRequestDocument();
        const userDocument = createUserDocument();

        mockArtistRequestModel.findById
            .mockReturnValueOnce(artistRequestDocument)
            .mockReturnValueOnce(
                createAwaitableQuery(
                    {
                        _id: artistRequestId,
                        status: "approved",
                        reviewedBy: { _id: adminUserId },
                    },
                    ["populate", "lean"]
                )
            );
        mockUserModel.findById.mockResolvedValue(userDocument);
        mockArtistModel.findOne.mockReturnValue(
            createAwaitableQuery(null, ["lean"])
        );
        mockArtistModel.create.mockResolvedValue({ _id: artistId });
        mockArtistModel.findById.mockReturnValue(
            createAwaitableQuery(
                {
                    _id: artistId,
                    name: "Synth Horizon",
                    userId: { _id: requestUserId },
                },
                ["populate", "lean"]
            )
        );

        const result = await adminArtistRequestService.reviewArtistRequest(
            artistRequestId,
            {
                status: "approved",
                adminNote: "Looks good",
                checklist: approvedChecklist,
            },
            adminUserId
        );

        expect(result.artistRequest).toMatchObject({
            _id: artistRequestId,
            status: "approved",
        });
        expect(result.artist).toMatchObject({
            _id: artistId,
            name: "Synth Horizon",
        });
        expect(mockArtistModel.create).toHaveBeenCalledWith({
            userId: requestUserId,
            name: "Synth Horizon",
            bio: "Electronic duo",
            avatar: "avatar.jpg",
            socialLinks: {
                facebook: "fb",
                instagram: "ig",
                youtube: "yt",
            },
            activeStatus: "active",
        });
        expect(userDocument.role).toBe("artist");
        expect(userDocument.save).toHaveBeenCalledTimes(1);
        expect(artistRequestDocument.status).toBe("approved");
        expect(artistRequestDocument.markModified).toHaveBeenCalledWith("review");
        expect(artistRequestDocument.save).toHaveBeenCalledTimes(1);
    });

    test("rejects a pending artist registration request and returns updated request detail", async () => {
        const adminArtistRequestService = await loadService();
        const artistRequestDocument = createArtistRequestDocument();

        mockArtistRequestModel.findById
            .mockReturnValueOnce(artistRequestDocument)
            .mockReturnValueOnce(
                createAwaitableQuery(
                    {
                        _id: artistRequestId,
                        status: "rejected",
                        rejectReason: "Missing proof",
                    },
                    ["populate", "lean"]
                )
            );

        const result = await adminArtistRequestService.reviewArtistRequest(
            artistRequestId,
            {
                status: "rejected",
                rejectReason: "  Missing proof  ",
                checklist: {},
            },
            adminUserId
        );

        expect(result.artistRequest).toMatchObject({
            _id: artistRequestId,
            status: "rejected",
            rejectReason: "Missing proof",
        });
        expect(result.artist).toBeNull();
        expect(artistRequestDocument.status).toBe("rejected");
        expect(artistRequestDocument.rejectReason).toBe("Missing proof");
        expect(mockArtistModel.create).not.toHaveBeenCalled();
        expect(artistRequestDocument.save).toHaveBeenCalledTimes(1);
    });

    test("throws 400 when approving without a fully accepted checklist", async () => {
        const adminArtistRequestService = await loadService();
        const artistRequestDocument = createArtistRequestDocument();

        mockArtistRequestModel.findById.mockResolvedValue(artistRequestDocument);

        await expect(
            adminArtistRequestService.reviewArtistRequest(
                artistRequestId,
                {
                    status: "approved",
                    checklist: {
                        ...approvedChecklist,
                        socialLinksValid: false,
                    },
                },
                adminUserId
            )
        ).rejects.toMatchObject({
            message:
                "All review checklist items must be accepted before approving this artist request.",
            statusCode: 400,
        });

        expect(mockUserModel.findById).not.toHaveBeenCalled();
        expect(mockArtistModel.findOne).not.toHaveBeenCalled();
        expect(mockArtistModel.create).not.toHaveBeenCalled();
    });

    test("throws 404 when the request user does not exist during approval", async () => {
        const adminArtistRequestService = await loadService();
        const artistRequestDocument = createArtistRequestDocument();

        mockArtistRequestModel.findById.mockResolvedValue(artistRequestDocument);
        mockUserModel.findById.mockResolvedValue(null);
        mockArtistModel.findOne.mockReturnValue(createAwaitableQuery(null, ["lean"]));

        await expect(
            adminArtistRequestService.reviewArtistRequest(
                artistRequestId,
                {
                    status: "approved",
                    checklist: approvedChecklist,
                },
                adminUserId
            )
        ).rejects.toMatchObject({
            message: "User for this artist request was not found.",
            statusCode: 404,
        });

        expect(mockArtistModel.create).not.toHaveBeenCalled();
        expect(artistRequestDocument.save).not.toHaveBeenCalled();
    });

    test("throws 409 when an artist profile already exists for the request user", async () => {
        const adminArtistRequestService = await loadService();
        const artistRequestDocument = createArtistRequestDocument();
        const userDocument = createUserDocument();

        mockArtistRequestModel.findById.mockResolvedValue(artistRequestDocument);
        mockUserModel.findById.mockResolvedValue(userDocument);
        mockArtistModel.findOne.mockReturnValue(
            createAwaitableQuery({ _id: artistId }, ["lean"])
        );

        await expect(
            adminArtistRequestService.reviewArtistRequest(
                artistRequestId,
                {
                    status: "approved",
                    checklist: approvedChecklist,
                },
                adminUserId
            )
        ).rejects.toMatchObject({
            message: "An artist profile already exists for this user.",
            statusCode: 409,
        });

        expect(mockArtistModel.create).not.toHaveBeenCalled();
        expect(userDocument.save).not.toHaveBeenCalled();
        expect(artistRequestDocument.save).not.toHaveBeenCalled();
    });

});
