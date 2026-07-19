import { jest } from "@jest/globals";

process.env.JWT_SECRET = "test-secret";

const VALID_USER_ID = "507f1f77bcf86cd799439001";
const VALID_ARTIST_ID = "507f1f77bcf86cd799439002";

const createArtistVerificationRequestChain = (result) => {
    const chain = {
        sort: jest.fn(),
        populate: jest.fn(),
        lean: jest.fn(),
    };

    chain.sort.mockReturnValue(chain);
    chain.populate.mockReturnValue(chain);
    chain.lean.mockResolvedValue(result);

    return chain;
};

const createResponse = () => {
    const response = {
        status: jest.fn(),
        json: jest.fn(),
    };

    response.status.mockReturnValue(response);
    response.json.mockReturnValue(response);

    return response;
};

const createVerificationRequest = (overrides = {}) => ({
    _id: "request-1",
    artistId: {
        _id: VALID_ARTIST_ID,
        name: "Pending Artist",
        avatar: "https://example.com/artist.jpg",
        coverImage: "https://example.com/cover.jpg",
        verificationStatus: "pending",
        activeStatus: "active",
    },
    userId: {
        _id: VALID_USER_ID,
        email: "artist@example.com",
        profile: { fullName: "Artist User" },
        avatar: "https://example.com/user.jpg",
        role: "artist",
        activeStatus: "active",
    },
    status: "open",
    note: "Please verify me",
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-02T00:00:00.000Z"),
    ...overrides,
});

const loadArtistRegistrationModules = async () => {
    jest.resetModules();

    const mockArtistVerificationRequestModel = {
        countDocuments: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
    };

    const mockFormatResponse = {
        success: jest.fn(),
    };

    jest.unstable_mockModule("../../src/models/ArtistVerificationRequest.js", () => ({
        default: mockArtistVerificationRequestModel,
    }));
    jest.unstable_mockModule("../../src/utils/formatResponse.js", () => ({
        default: mockFormatResponse,
    }));

    const [{ default: artistController }, { AppError }] = await Promise.all([
        import("../../src/controllers/artist.controller.js"),
        import("../../src/utils/AppError.js"),
    ]);

    const buildArtistRegistrationService = {
        getArtistRegistrationList: async ({ page = 1, limit = 10 } = {}) => {
            const skip = (page - 1) * limit;
            const requests = await mockArtistVerificationRequestModel.find({ status: "open" })
                .sort({ createdAt: -1 })
                .populate("artistId")
                .populate("userId")
                .lean();
            const total = await mockArtistVerificationRequestModel.countDocuments({ status: "open" });

            return {
                requests,
                meta: {
                    page,
                    limit,
                    total,
                    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
                    skip,
                },
            };
        },
        getArtistRegistrationDetail: async (requestId) => {
            const request = await mockArtistVerificationRequestModel.findOne({
                _id: requestId,
                status: "open",
            })
                .populate("artistId")
                .populate("userId")
                .lean();

            if (!request) {
                throw new AppError("Artist registration request not found.", 404);
            }

            return request;
        },
    };

    const buildArtistRegistrationController = {
        viewArtistRegistrationList: async (req, res, next) => {
            try {
                const page = Math.max(1, parseInt(req.query.page) || 1);
                const limit = Math.max(1, parseInt(req.query.limit) || 10);
                const result = await buildArtistRegistrationService.getArtistRegistrationList({ page, limit });
                return mockFormatResponse.success(
                    res,
                    { requests: result.requests },
                    "Artist registration list fetched successfully",
                    result.meta
                );
            } catch (error) {
                next(error);
            }
        },
        viewArtistRegistrationDetail: async (req, res, next) => {
            try {
                const request = await buildArtistRegistrationService.getArtistRegistrationDetail(req.params.id);
                return mockFormatResponse.success(
                    res,
                    { request },
                    "Artist registration detail fetched successfully"
                );
            } catch (error) {
                next(error);
            }
        },
    };

    return {
        artistController,
        AppError,
        mockArtistVerificationRequestModel,
        mockFormatResponse,
        buildArtistRegistrationService,
        buildArtistRegistrationController,
    };
};

describe("Artist Registration Management", () => {
    let artistController;
    let AppError;
    let mockArtistVerificationRequestModel;
    let mockFormatResponse;
    let buildArtistRegistrationService;
    let buildArtistRegistrationController;

    beforeEach(async () => {
        ({
            artistController,
            AppError,
            mockArtistVerificationRequestModel,
            mockFormatResponse,
            buildArtistRegistrationService,
            buildArtistRegistrationController,
        } = await loadArtistRegistrationModules());
        jest.clearAllMocks();
    });

    test("Request artist registration calls service with authenticated user and body", async () => {
        const req = {
            user: { id: VALID_USER_ID },
            body: { note: "Please verify my profile" },
        };
        const res = createResponse();
        const next = jest.fn();

        const serviceSpy = jest.spyOn((await import("../../src/services/artist/artist.service.js")).default, "requestVerificationByUserId")
            .mockResolvedValue({ id: VALID_ARTIST_ID, hasPendingVerificationRequest: true });

        await artistController.requestVerification(req, res, next);

        expect(serviceSpy).toHaveBeenCalledWith(VALID_USER_ID, req.body);
        expect(mockFormatResponse.success).toHaveBeenCalledWith(
            res,
            { artist: { id: VALID_ARTIST_ID, hasPendingVerificationRequest: true } },
            "Verification request submitted successfully"
        );
        expect(next).not.toHaveBeenCalled();
    });

    test("Request artist registration forwards service error to next", async () => {
        const req = {
            user: { id: VALID_USER_ID },
            body: { note: "Duplicate request" },
        };
        const res = createResponse();
        const next = jest.fn();
        const serviceError = new Error("already pending");

        const serviceSpy = jest.spyOn((await import("../../src/services/artist/artist.service.js")).default, "requestVerificationByUserId")
            .mockRejectedValue(serviceError);

        await artistController.requestVerification(req, res, next);

        expect(serviceSpy).toHaveBeenCalledWith(VALID_USER_ID, req.body);
        expect(next).toHaveBeenCalledWith(serviceError);
        expect(mockFormatResponse.success).not.toHaveBeenCalled();
    });

    test("View Artist Registration List returns requests with pagination meta", async () => {
        const requests = [
            createVerificationRequest(),
            createVerificationRequest({ _id: "request-2", note: "Second request" }),
        ];
        const chain = createArtistVerificationRequestChain(requests);
        mockArtistVerificationRequestModel.find.mockReturnValue(chain);
        mockArtistVerificationRequestModel.countDocuments.mockResolvedValue(2);

        const result = await buildArtistRegistrationService.getArtistRegistrationList({ page: 2, limit: 1 });

        expect(mockArtistVerificationRequestModel.find).toHaveBeenCalledWith({ status: "open" });
        expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(chain.populate).toHaveBeenNthCalledWith(1, "artistId");
        expect(chain.populate).toHaveBeenNthCalledWith(2, "userId");
        expect(result).toEqual({
            requests,
            meta: {
                page: 2,
                limit: 1,
                total: 2,
                totalPages: 2,
                skip: 1,
            },
        });
    });

    test("View Artist Registration Detail returns populated request detail", async () => {
        const request = createVerificationRequest({ _id: "request-detail" });
        const chain = createArtistVerificationRequestChain(request);
        mockArtistVerificationRequestModel.findOne.mockReturnValue(chain);

        const result = await buildArtistRegistrationService.getArtistRegistrationDetail("request-detail");

        expect(mockArtistVerificationRequestModel.findOne).toHaveBeenCalledWith({
            _id: "request-detail",
            status: "open",
        });
        expect(chain.populate).toHaveBeenNthCalledWith(1, "artistId");
        expect(chain.populate).toHaveBeenNthCalledWith(2, "userId");
        expect(result).toEqual(request);
    });

    test("View Artist Registration Detail throws not found error when request is missing", async () => {
        const chain = createArtistVerificationRequestChain(null);
        mockArtistVerificationRequestModel.findOne.mockReturnValue(chain);

        await expect(
            buildArtistRegistrationService.getArtistRegistrationDetail("missing-request")
        ).rejects.toBeInstanceOf(AppError);

        await expect(
            buildArtistRegistrationService.getArtistRegistrationDetail("missing-request")
        ).rejects.toMatchObject({
            message: "Artist registration request not found.",
            statusCode: 404,
        });
    });

    test("View Artist Registration List controller returns success response", async () => {
        const req = { query: { page: "1", limit: "10" } };
        const res = createResponse();
        const next = jest.fn();
        const requests = [createVerificationRequest()];
        const serviceSpy = jest.spyOn(buildArtistRegistrationService, "getArtistRegistrationList")
            .mockResolvedValue({
                requests,
                meta: { page: 1, limit: 10, total: 1, totalPages: 1, skip: 0 },
            });

        await buildArtistRegistrationController.viewArtistRegistrationList(req, res, next);

        expect(serviceSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
        expect(mockFormatResponse.success).toHaveBeenCalledWith(
            res,
            { requests },
            "Artist registration list fetched successfully",
            { page: 1, limit: 10, total: 1, totalPages: 1, skip: 0 }
        );
        expect(next).not.toHaveBeenCalled();
    });

    test("View Artist Registration Detail controller forwards detail response", async () => {
        const req = { params: { id: "request-1" } };
        const res = createResponse();
        const next = jest.fn();
        const request = createVerificationRequest();
        const serviceSpy = jest.spyOn(buildArtistRegistrationService, "getArtistRegistrationDetail")
            .mockResolvedValue(request);

        await buildArtistRegistrationController.viewArtistRegistrationDetail(req, res, next);

        expect(serviceSpy).toHaveBeenCalledWith("request-1");
        expect(mockFormatResponse.success).toHaveBeenCalledWith(
            res,
            { request },
            "Artist registration detail fetched successfully"
        );
        expect(next).not.toHaveBeenCalled();
    });
});
