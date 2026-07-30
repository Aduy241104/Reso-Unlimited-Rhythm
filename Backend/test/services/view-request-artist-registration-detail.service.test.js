import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const requestId = "507f1f77bcf86cd799439011";

const mockArtistRequestModel = { findById: jest.fn() };
const mockArtistModel = {};
const mockUserModel = {};

const loadService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/ArtistRequest.js", () => ({
        default: mockArtistRequestModel,
    }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/User.js", () => ({
        default: mockUserModel,
    }));

    const { default: adminArtistRequestService } = await import(
        "../../src/services/artist/admin.artistRequest.service.js"
    );

    return adminArtistRequestService;
};

describe("View Request artist registration detail", () => {
    beforeEach(() => {
        mockArtistRequestModel.findById.mockReset();
    });

    test("returns the registration request detail when the id is valid", async () => {
        const adminArtistRequestService = await loadService();

        const findByIdQuery = createAwaitableQuery(
            {
                _id: requestId,
                stageName: "Synth Horizon",
                status: "pending",
                userId: {
                    _id: "507f1f77bcf86cd799439012",
                    email: "artist@example.com",
                },
            },
            ["populate", "lean"]
        );
        mockArtistRequestModel.findById.mockReturnValue(findByIdQuery);

        const result = await adminArtistRequestService.getArtistRequestDetail(
            requestId
        );

        expect(result).toMatchObject({
            _id: requestId,
            stageName: "Synth Horizon",
            status: "pending",
        });
        expect(mockArtistRequestModel.findById).toHaveBeenCalledWith(requestId);
        expect(findByIdQuery.populate).toHaveBeenNthCalledWith(
            1,
            "userId",
            "_id email role activeStatus profile.fullName avatar"
        );
        expect(findByIdQuery.populate).toHaveBeenNthCalledWith(
            2,
            "reviewedBy",
            "_id email profile.fullName avatar"
        );
    });

    test("throws 400 when the registration request id is invalid", async () => {
        const adminArtistRequestService = await loadService();

        await expect(
            adminArtistRequestService.getArtistRequestDetail("bad-id")
        ).rejects.toMatchObject({
            message: "Artist request id is invalid.",
            statusCode: 400,
        });

        expect(mockArtistRequestModel.findById).not.toHaveBeenCalled();
    });

    test("throws 404 when the registration request id does not exist", async () => {
        const adminArtistRequestService = await loadService();

        mockArtistRequestModel.findById.mockReturnValue(
            createAwaitableQuery(null, ["populate", "lean"])
        );

        await expect(
            adminArtistRequestService.getArtistRequestDetail(requestId)
        ).rejects.toMatchObject({
            message: "Artist request not found.",
            statusCode: 404,
        });

        expect(mockArtistRequestModel.findById).toHaveBeenCalledWith(requestId);
    });
});
