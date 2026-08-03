import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

process.env.SUPPRESS_JEST_WARNINGS = "1";

const mockArtistRequestModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
};

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

describe("Filter registration request by status", () => {
    beforeEach(() => {
        mockArtistRequestModel.countDocuments.mockReset();
        mockArtistRequestModel.find.mockReset();
    });

    test("applies the requested status filter to artist registration queries", async () => {
        const adminArtistRequestService = await loadService();

        mockArtistRequestModel.countDocuments.mockResolvedValue(1);
        mockArtistRequestModel.find.mockReturnValue(
            createAwaitableQuery(
                [
                    {
                        _id: "507f1f77bcf86cd799439011",
                        stageName: "Synth Horizon",
                        status: "pending",
                    },
                ],
                ["populate", "select", "sort", "skip", "limit", "lean"]
            )
        );

        await adminArtistRequestService.getArtistRequests({
            status: "pending",
            page: "1",
            limit: "10",
        });

        expect(mockArtistRequestModel.countDocuments).toHaveBeenCalledWith({
            status: "pending",
        });
        expect(mockArtistRequestModel.find).toHaveBeenCalledWith({
            status: "pending",
        });
    });
});
