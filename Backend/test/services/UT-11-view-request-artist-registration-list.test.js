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

describe("View Request artist registration list", () => {
    beforeEach(() => {
        mockArtistRequestModel.countDocuments.mockReset();
        mockArtistRequestModel.find.mockReset();
    });

    test("returns paginated artist registration requests for admin", async () => {
        const adminArtistRequestService = await loadService();
        const findQuery = createAwaitableQuery(
            [
                {
                    _id: "507f1f77bcf86cd799439011",
                    userId: {
                        _id: "507f1f77bcf86cd799439012",
                        email: "artist@example.com",
                    },
                    stageName: "Synth Horizon",
                    avatar: "avatar.jpg",
                    status: "pending",
                    createdAt: new Date("2026-06-01T00:00:00.000Z"),
                },
            ],
            ["populate", "select", "sort", "skip", "limit", "lean"]
        );

        mockArtistRequestModel.countDocuments.mockResolvedValue(1);
        mockArtistRequestModel.find.mockReturnValue(findQuery);

        const result = await adminArtistRequestService.getArtistRequests({
            page: "1",
            limit: "10",
            q: "Synth",
        });

        expect(result.artistRequests).toHaveLength(1);
        expect(result.artistRequests[0]).toMatchObject({
            stageName: "Synth Horizon",
            status: "pending",
        });
        expect(result.meta).toEqual({
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
        });
        expect(mockArtistRequestModel.countDocuments).toHaveBeenCalledWith({
            $or: expect.any(Array),
        });
        expect(findQuery.skip).toHaveBeenCalledWith(0);
        expect(findQuery.limit).toHaveBeenCalledWith(10);
    });

    test("applies the status filter when listing artist registration requests", async () => {
        const adminArtistRequestService = await loadService();

        mockArtistRequestModel.countDocuments.mockResolvedValue(2);
        mockArtistRequestModel.find.mockReturnValue(
            createAwaitableQuery([], ["populate", "select", "sort", "skip", "limit", "lean"])
        );

        await adminArtistRequestService.getArtistRequests({
            status: "approved",
            page: "1",
            limit: "20",
        });

        expect(mockArtistRequestModel.countDocuments).toHaveBeenCalledWith({
            status: "approved",
        });
        expect(mockArtistRequestModel.find).toHaveBeenCalledWith({
            status: "approved",
        });
    });

    test("combines status and search query filters when both are provided", async () => {
        const adminArtistRequestService = await loadService();

        mockArtistRequestModel.countDocuments.mockResolvedValue(0);
        mockArtistRequestModel.find.mockReturnValue(
            createAwaitableQuery([], ["populate", "select", "sort", "skip", "limit", "lean"])
        );

        await adminArtistRequestService.getArtistRequests({
            status: "pending",
            q: "  horizon  ",
        });

        expect(mockArtistRequestModel.countDocuments).toHaveBeenCalledWith({
            status: "pending",
            $or: expect.arrayContaining([
                { stageName: expect.any(RegExp) },
                { bio: expect.any(RegExp) },
                { "identityInfo.fullName": expect.any(RegExp) },
                { "identityInfo.idNumber": expect.any(RegExp) },
            ]),
        });
    });

    test("falls back to default page and limit when pagination input is non-numeric or zero", async () => {
        const adminArtistRequestService = await loadService();
        const findQuery = createAwaitableQuery(
            [],
            ["populate", "select", "sort", "skip", "limit", "lean"]
        );

        mockArtistRequestModel.countDocuments.mockResolvedValue(0);
        mockArtistRequestModel.find.mockReturnValue(findQuery);

        const result = await adminArtistRequestService.getArtistRequests({
            page: "0",
            limit: "abc",
        });

        expect(result.meta).toEqual({
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
        });
        expect(findQuery.skip).toHaveBeenCalledWith(0);
        expect(findQuery.limit).toHaveBeenCalledWith(20);
    });

    test("returns empty data when no artist registration requests are found", async () => {
        const adminArtistRequestService = await loadService();

        mockArtistRequestModel.countDocuments.mockResolvedValue(0);
        mockArtistRequestModel.find.mockReturnValue(
            createAwaitableQuery([], ["populate", "select", "sort", "skip", "limit", "lean"])
        );

        const result = await adminArtistRequestService.getArtistRequests({
            page: "1",
            limit: "10",
        });

        expect(result).toEqual({
            artistRequests: [],
            meta: {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
            },
        });
    });

});
