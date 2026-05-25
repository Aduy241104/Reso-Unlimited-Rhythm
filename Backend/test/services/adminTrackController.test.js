import { jest } from "@jest/globals";

const VALID_TRACK_ID = "507f1f77bcf86cd799439011";

const createTrack = (overrides = {}) => ({
    _id: VALID_TRACK_ID,
    title: "Track A",
    approvalStatus: "pending",
    isHidden: false,
    ...overrides,
});

const loadAdminTrackControllerModule = async () => {
    jest.resetModules();

    const mockAdminTrackService = {
        listTracksForAdmin: jest.fn(),
        updateTrackApprovalStatus: jest.fn(),
        updateTrackVisibility: jest.fn(),
    };

    const mockAdminTrackValidation = {
        listTracksQuerySchema: {
            validate: jest.fn(),
        },
    };

    const mockFormatResponse = {
        success: jest.fn(),
    };

    jest.unstable_mockModule("../../src/services/Track/admin.track.service.js", () => ({
        default: mockAdminTrackService,
    }));
    jest.unstable_mockModule("../../src/middlewares/Admin/admin.track.validation.js", () => ({
        default: mockAdminTrackValidation,
    }));
    jest.unstable_mockModule("../../src/utils/formatResponse.js", () => ({
        default: mockFormatResponse,
    }));

    const [{ default: adminTrackController }, { AppError }] = await Promise.all([
        import("../../src/controllers/admin.track.controller.js"),
        import("../../src/utils/AppError.js"),
    ]);

    return {
        adminTrackController,
        AppError,
        mockAdminTrackService,
        mockAdminTrackValidation,
        mockFormatResponse,
    };
};

describe("adminTrackController - listTracksForAdmin", () => {
    let adminTrackController;
    let AppError;
    let mockAdminTrackService;
    let mockAdminTrackValidation;
    let mockFormatResponse;

    beforeEach(async () => {
        ({
            adminTrackController,
            AppError,
            mockAdminTrackService,
            mockAdminTrackValidation,
            mockFormatResponse,
        } = await loadAdminTrackControllerModule());
    });

    test("calls validate with stripUnknown and abortEarly false", async () => {
        const req = { query: { q: "abc", extra: "x" } };
        const res = {};
        const next = jest.fn();

        mockAdminTrackValidation.listTracksQuerySchema.validate.mockReturnValue({
            error: null,
            value: { q: "abc", page: 1, limit: 20 },
        });
        mockAdminTrackService.listTracksForAdmin.mockResolvedValue({
            tracks: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        });

        await adminTrackController.listTracksForAdmin(req, res, next);

        expect(mockAdminTrackValidation.listTracksQuerySchema.validate).toHaveBeenCalledWith(
            req.query,
            { abortEarly: false, stripUnknown: true }
        );
    });

    test("returns success response with tracks and pagination", async () => {
        const req = { query: { q: "rock", page: 2, limit: 10 } };
        const res = {};
        const next = jest.fn();
        const validated = { q: "rock", page: 2, limit: 10 };
        const serviceResult = {
            tracks: [createTrack(), createTrack({ _id: "507f1f77bcf86cd799439012" })],
            pagination: { page: 2, limit: 10, total: 22, totalPages: 3 },
        };

        mockAdminTrackValidation.listTracksQuerySchema.validate.mockReturnValue({
            error: null,
            value: validated,
        });
        mockAdminTrackService.listTracksForAdmin.mockResolvedValue(serviceResult);

        await adminTrackController.listTracksForAdmin(req, res, next);

        expect(mockAdminTrackService.listTracksForAdmin).toHaveBeenCalledWith(validated);
        expect(mockFormatResponse.success).toHaveBeenCalledWith(
            res,
            { tracks: serviceResult.tracks },
            "Tracks fetched successfully",
            serviceResult.pagination
        );
        expect(next).not.toHaveBeenCalled();
    });

    test("returns success response when tracks are empty", async () => {
        const req = { query: {} };
        const res = {};
        const next = jest.fn();

        mockAdminTrackValidation.listTracksQuerySchema.validate.mockReturnValue({
            error: null,
            value: { q: "", page: 1, limit: 20 },
        });
        mockAdminTrackService.listTracksForAdmin.mockResolvedValue({
            tracks: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        });

        await adminTrackController.listTracksForAdmin(req, res, next);

        expect(mockFormatResponse.success).toHaveBeenCalledWith(
            res,
            { tracks: [] },
            "Tracks fetched successfully",
            { page: 1, limit: 20, total: 0, totalPages: 0 }
        );
    });

    test("maps validation details into AppError details", async () => {
        const req = { query: { page: 0, limit: 100 } };
        const res = {};
        const next = jest.fn();

        mockAdminTrackValidation.listTracksQuerySchema.validate.mockReturnValue({
            error: {
                details: [
                    { path: ["page"], message: "page invalid" },
                    { path: ["limit"], message: "limit invalid" },
                ],
            },
            value: null,
        });

        await adminTrackController.listTracksForAdmin(req, res, next);

        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(AppError);
        expect(error).toMatchObject({
            message: "Invalid request data.",
            statusCode: 400,
            details: [
                { field: "page", message: "page invalid" },
                { field: "limit", message: "limit invalid" },
            ],
        });
        expect(mockAdminTrackService.listTracksForAdmin).not.toHaveBeenCalled();
        expect(mockFormatResponse.success).not.toHaveBeenCalled();
    });

    test("handles nested validation path correctly", async () => {
        const req = { query: {} };
        const res = {};
        const next = jest.fn();

        mockAdminTrackValidation.listTracksQuerySchema.validate.mockReturnValue({
            error: {
                details: [{ path: ["filters", "status"], message: "invalid status" }],
            },
            value: null,
        });

        await adminTrackController.listTracksForAdmin(req, res, next);

        expect(next.mock.calls[0][0]).toMatchObject({
            details: [{ field: "filters.status", message: "invalid status" }],
        });
    });

    test("passes service error to next", async () => {
        const req = { query: { q: "abc" } };
        const res = {};
        const next = jest.fn();
        const serviceError = new Error("db down");

        mockAdminTrackValidation.listTracksQuerySchema.validate.mockReturnValue({
            error: null,
            value: { q: "abc", page: 1, limit: 20 },
        });
        mockAdminTrackService.listTracksForAdmin.mockRejectedValue(serviceError);

        await adminTrackController.listTracksForAdmin(req, res, next);

        expect(next).toHaveBeenCalledWith(serviceError);
        expect(mockFormatResponse.success).not.toHaveBeenCalled();
    });
});

describe("adminTrackController - updateTrackApprovalStatus", () => {
    let adminTrackController;
    let mockAdminTrackService;
    let mockFormatResponse;

    beforeEach(async () => {
        ({
            adminTrackController,
            mockAdminTrackService,
            mockFormatResponse,
        } = await loadAdminTrackControllerModule());
    });

    test("calls service with id, status, rejectReason", async () => {
        const req = {
            params: { id: VALID_TRACK_ID },
            body: { status: "approved", rejectReason: "" },
        };
        const res = {};
        const next = jest.fn();
        const updatedTrack = createTrack({ approvalStatus: "approved" });

        mockAdminTrackService.updateTrackApprovalStatus.mockResolvedValue(updatedTrack);

        await adminTrackController.updateTrackApprovalStatus(req, res, next);

        expect(mockAdminTrackService.updateTrackApprovalStatus).toHaveBeenCalledWith(
            VALID_TRACK_ID,
            { status: "approved", rejectReason: "" }
        );
    });

    test("returns success response with updated track", async () => {
        const req = {
            params: { id: VALID_TRACK_ID },
            body: { status: "rejected", rejectReason: "copyright" },
        };
        const res = {};
        const next = jest.fn();
        const updatedTrack = createTrack({
            approvalStatus: "rejected",
        });

        mockAdminTrackService.updateTrackApprovalStatus.mockResolvedValue(updatedTrack);

        await adminTrackController.updateTrackApprovalStatus(req, res, next);

        expect(mockFormatResponse.success).toHaveBeenCalledWith(
            res,
            { track: updatedTrack },
            "Track approval status updated successfully"
        );
        expect(next).not.toHaveBeenCalled();
    });

    test("forwards service error to next", async () => {
        const req = {
            params: { id: VALID_TRACK_ID },
            body: { status: "approved", rejectReason: "" },
        };
        const res = {};
        const next = jest.fn();
        const serviceError = new Error("track not found");

        mockAdminTrackService.updateTrackApprovalStatus.mockRejectedValue(serviceError);

        await adminTrackController.updateTrackApprovalStatus(req, res, next);

        expect(next).toHaveBeenCalledWith(serviceError);
        expect(mockFormatResponse.success).not.toHaveBeenCalled();
    });

    test("handles missing rejectReason and still passes body fields", async () => {
        const req = {
            params: { id: VALID_TRACK_ID },
            body: { status: "approved" },
        };
        const res = {};
        const next = jest.fn();

        mockAdminTrackService.updateTrackApprovalStatus.mockResolvedValue(createTrack());

        await adminTrackController.updateTrackApprovalStatus(req, res, next);

        expect(mockAdminTrackService.updateTrackApprovalStatus).toHaveBeenCalledWith(
            VALID_TRACK_ID,
            { status: "approved", rejectReason: undefined }
        );
    });
});

describe("adminTrackController - updateTrackVisibilityController", () => {
    let adminTrackController;
    let mockAdminTrackService;

    beforeEach(async () => {
        ({
            adminTrackController,
            mockAdminTrackService,
        } = await loadAdminTrackControllerModule());
    });

    test("calls service with track id and body", async () => {
        const req = {
            params: { id: VALID_TRACK_ID },
            body: { action: "hide", hiddenReason: "policy violation" },
        };
        const res = { json: jest.fn() };
        const next = jest.fn();

        mockAdminTrackService.updateTrackVisibility.mockResolvedValue(
            createTrack({ isHidden: true })
        );

        await adminTrackController.updateTrackVisibilityController(req, res, next);

        expect(mockAdminTrackService.updateTrackVisibility).toHaveBeenCalledWith(
            VALID_TRACK_ID,
            { action: "hide", hiddenReason: "policy violation" }
        );
    });

    test("returns raw json result", async () => {
        const req = {
            params: { id: VALID_TRACK_ID },
            body: { action: "unhide", hiddenReason: "" },
        };
        const res = { json: jest.fn() };
        const next = jest.fn();
        const updatedTrack = createTrack({ isHidden: false });

        mockAdminTrackService.updateTrackVisibility.mockResolvedValue(updatedTrack);

        await adminTrackController.updateTrackVisibilityController(req, res, next);

        expect(res.json).toHaveBeenCalledWith(updatedTrack);
        expect(next).not.toHaveBeenCalled();
    });

    test("passes service error to next and does not call res.json", async () => {
        const req = {
            params: { id: VALID_TRACK_ID },
            body: { action: "hide", hiddenReason: "rule" },
        };
        const res = { json: jest.fn() };
        const next = jest.fn();
        const serviceError = new Error("update failed");

        mockAdminTrackService.updateTrackVisibility.mockRejectedValue(serviceError);

        await adminTrackController.updateTrackVisibilityController(req, res, next);

        expect(next).toHaveBeenCalledWith(serviceError);
        expect(res.json).not.toHaveBeenCalled();
    });

    test("passes through empty body", async () => {
        const req = {
            params: { id: VALID_TRACK_ID },
            body: {},
        };
        const res = { json: jest.fn() };
        const next = jest.fn();

        mockAdminTrackService.updateTrackVisibility.mockResolvedValue(createTrack());

        await adminTrackController.updateTrackVisibilityController(req, res, next);

        expect(mockAdminTrackService.updateTrackVisibility).toHaveBeenCalledWith(
            VALID_TRACK_ID,
            {}
        );
    });
});
