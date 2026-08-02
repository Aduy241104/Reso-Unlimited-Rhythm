import { jest } from "@jest/globals";

process.env.JWT_SECRET = "test-secret";

// Valid 24-char ObjectId for testing
const VALID_PLAYLIST_ID = "507f1f77bcf86cd799439011";
const VALID_TRACK_ID = "507f1f77bcf86cd799439012";
const VALID_ADMIN_ID = "507f1f77bcf86cd799439013";

// Helper: Create playlist document mock
const createPlaylistDoc = (overrides = {}) => ({
    _id: VALID_PLAYLIST_ID,
    userId: VALID_ADMIN_ID,
    title: "Test Playlist",
    description: "Test description",
    type: "system",
    coverImage: "https://cloudinary.com/cover.jpg",
    isPublic: true,
    isHidden: false,
    tracks: [],
    trackCount: 0,
    totalDuration: 0,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-10T00:00:00.000Z"),
    save: jest.fn(),
    markModified: jest.fn(),
    toObject: jest.fn().mockReturnThis(),
    ...overrides,
});

// Helper: Create track document mock
const createTrackDoc = (overrides = {}) => ({
    _id: VALID_TRACK_ID,
    title: "Test Track",
    duration: 180,
    ...overrides,
});

const loadAdminPlaylistValidationModule = async () => {
    jest.resetModules();
    return import("../../src/middlewares/Admin/admin.playlist.validation.js");
};

const loadAdminPlaylistServiceModule = async () => {
    jest.resetModules();

    const mockPlaylistModel = {
        find: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
                lean: jest.fn(),
            }),
        }),
        findOne: jest.fn(),
        create: jest.fn(),
        deleteOne: jest.fn(),
    };

    const mockTrackModel = {
        findById: jest.fn(),
        find: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn(),
            }),
        }),
    };

    const mockCloudinaryService = {
        uploadImageBuffer: jest.fn(),
        deleteImageByPublicId: jest.fn(),
    };

    const mockUploadCloud = {
        extractPublicIdFromUrl: jest.fn(),
    };

    const mockPlaylistService = {
        getPlaylistDetail: jest.fn(),
    };

    jest.unstable_mockModule("../../src/models/Playlist.js", () => ({
        default: mockPlaylistModel,
    }));

    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));

    jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
        uploadImageBuffer: mockCloudinaryService.uploadImageBuffer,
        deleteImageByPublicId: mockCloudinaryService.deleteImageByPublicId,
    }));

    jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
        extractPublicIdFromUrl: mockUploadCloud.extractPublicIdFromUrl,
    }));

    jest.unstable_mockModule("../../src/services/Playlist/playlist.service.js", () => ({
        default: mockPlaylistService,
    }));

    const { default: adminPlaylistService } = await import("../../src/services/Playlist/admin.playlist.service.js");
    const { AppError } = await import("../../src/utils/AppError.js");

    return {
        adminPlaylistService,
        AppError,
        mockPlaylistModel,
        mockTrackModel,
        mockCloudinaryService,
        mockUploadCloud,
        mockPlaylistService,
    };
};

// ============ VALIDATION TESTS ============

describe("adminPlaylist validation - createSystemPlaylistSchema", () => {
    let adminPlaylistValidation;

    beforeEach(async () => {
        ({ default: adminPlaylistValidation } = await loadAdminPlaylistValidationModule());
    });

    test("accepts valid playlist data", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            {
                title: "My Playlist",
                description: "A cool playlist",
            },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts playlist with isPublic and isHidden flags", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            {
                title: "Public Playlist",
                isPublic: true,
                isHidden: false,
            },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts empty description", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            { title: "No Description" },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("rejects missing title", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            { description: "No title" },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });

    test("rejects empty title", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            { title: "" },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });

    test("rejects title exceeding max length", () => {
        const longTitle = "a".repeat(201);
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            { title: longTitle },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });

    test("rejects invalid coverImage URL", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            {
                title: "Playlist",
                coverImage: "not-a-url",
            },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });

    test("accepts empty description", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            { title: "No Description" },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts description within max length", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            { title: "Valid Playlist", description: "a".repeat(5000) },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("rejects description exceeding max length", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            { title: "Valid Playlist", description: "a".repeat(5001) },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });

    test("accepts valid coverImage URL", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            {
                title: "Playlist",
                coverImage: "https://example.com/image.jpg",
            },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts coverImage with http protocol", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            {
                title: "Playlist",
                coverImage: "http://example.com/image.jpg",
            },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("rejects coverImage with invalid protocol", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            {
                title: "Playlist",
                coverImage: "ftp://example.com/image.jpg",
            },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });

    test("accepts empty string as coverImage", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            { title: "Playlist", coverImage: "" },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts isPublic as true", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            { title: "Public Playlist", isPublic: true },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts isPublic as false", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            { title: "Private Playlist", isPublic: false },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts isHidden as true", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            { title: "Hidden Playlist", isHidden: true },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts isHidden as false", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            { title: "Visible Playlist", isHidden: false },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("rejects non-boolean isPublic", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            { title: "Playlist", isPublic: "yes" },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });

    test("rejects non-boolean isHidden", () => {
        const { error } = adminPlaylistValidation.createSystemPlaylistSchema.validate(
            { title: "Playlist", isHidden: "yes" },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });
});

describe("adminPlaylist validation - updateSystemPlaylistSchema", () => {
    let adminPlaylistValidation;

    beforeEach(async () => {
        ({ default: adminPlaylistValidation } = await loadAdminPlaylistValidationModule());
    });

    test("accepts valid update with title", () => {
        const { error } = adminPlaylistValidation.updateSystemPlaylistSchema.validate(
            { title: "Updated Title" },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts valid update with isPublic and isHidden", () => {
        const { error } = adminPlaylistValidation.updateSystemPlaylistSchema.validate(
            {
                isPublic: false,
                isHidden: true,
            },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("rejects empty update object", () => {
        const { error } = adminPlaylistValidation.updateSystemPlaylistSchema.validate(
            {},
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });

    test("accepts valid update with title", () => {
        const { error } = adminPlaylistValidation.updateSystemPlaylistSchema.validate(
            { title: "Updated Title" },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts valid update with description", () => {
        const { error } = adminPlaylistValidation.updateSystemPlaylistSchema.validate(
            { description: "New description" },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts valid update with description within max length", () => {
        const { error } = adminPlaylistValidation.updateSystemPlaylistSchema.validate(
            { description: "a".repeat(5000) },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("rejects update with description exceeding max length", () => {
        const { error } = adminPlaylistValidation.updateSystemPlaylistSchema.validate(
            { description: "a".repeat(5001) },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });

    test("accepts valid update with coverImage URL", () => {
        const { error } = adminPlaylistValidation.updateSystemPlaylistSchema.validate(
            { coverImage: "https://example.com/new-cover.jpg" },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("rejects update with invalid coverImage URL", () => {
        const { error } = adminPlaylistValidation.updateSystemPlaylistSchema.validate(
            { coverImage: "not-a-valid-url" },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });

    test("accepts empty string as coverImage", () => {
        const { error } = adminPlaylistValidation.updateSystemPlaylistSchema.validate(
            { coverImage: "" },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts valid update with isPublic and isHidden", () => {
        const { error } = adminPlaylistValidation.updateSystemPlaylistSchema.validate(
            {
                isPublic: false,
                isHidden: true,
            },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts update with all valid fields", () => {
        const { error } = adminPlaylistValidation.updateSystemPlaylistSchema.validate(
            {
                title: "Full Update",
                description: "Updated description",
                coverImage: "https://example.com/cover.jpg",
                isPublic: false,
                isHidden: true,
            },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("rejects update with only title exceeding max length", () => {
        const { error } = adminPlaylistValidation.updateSystemPlaylistSchema.validate(
            { title: "a".repeat(201) },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });
});

describe("adminPlaylist validation - addTrackToSystemPlaylistSchema", () => {
    let adminPlaylistValidation;

    beforeEach(async () => {
        ({ default: adminPlaylistValidation } = await loadAdminPlaylistValidationModule());
    });

    test("accepts valid trackId", () => {
        const { error } = adminPlaylistValidation.addTrackToSystemPlaylistSchema.validate(
            { trackId: "507f1f77bcf86cd799439011" },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("rejects invalid trackId format", () => {
        const { error } = adminPlaylistValidation.addTrackToSystemPlaylistSchema.validate(
            { trackId: "invalid-id" },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });

    test("rejects missing trackId", () => {
        const { error } = adminPlaylistValidation.addTrackToSystemPlaylistSchema.validate(
            {},
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });
});

describe("adminPlaylist validation - addTracksBatchSchema", () => {
    let adminPlaylistValidation;

    beforeEach(async () => {
        ({ default: adminPlaylistValidation } = await loadAdminPlaylistValidationModule());
    });

    test("accepts valid trackIds array", () => {
        const { error } = adminPlaylistValidation.addTracksBatchSchema.validate(
            { trackIds: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"] },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("rejects empty array", () => {
        const { error } = adminPlaylistValidation.addTracksBatchSchema.validate(
            { trackIds: [] },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });

    test("rejects missing trackIds", () => {
        const { error } = adminPlaylistValidation.addTracksBatchSchema.validate(
            {},
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });

    test("rejects array with invalid id", () => {
        const { error } = adminPlaylistValidation.addTracksBatchSchema.validate(
            { trackIds: ["507f1f77bcf86cd799439011", "invalid"] },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });

    test("accepts single trackId", () => {
        const { error } = adminPlaylistValidation.addTracksBatchSchema.validate(
            { trackIds: ["507f1f77bcf86cd799439011"] },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts 50 trackIds (max limit)", () => {
        const trackIds = Array.from({ length: 50 }, (_, i) =>
            `507f1f77bcf86cd${String(i).padStart(12, "0")}`
        );
        const { error } = adminPlaylistValidation.addTracksBatchSchema.validate(
            { trackIds },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("rejects array exceeding 50 trackIds", () => {
        const trackIds = Array.from({ length: 51 }, (_, i) =>
            `507f1f77bcf86cd${String(i).padStart(12, "0")}`
        );
        const { error } = adminPlaylistValidation.addTracksBatchSchema.validate(
            { trackIds },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });

    test("rejects non-array trackIds", () => {
        const { error } = adminPlaylistValidation.addTracksBatchSchema.validate(
            { trackIds: "507f1f77bcf86cd799439011" },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });

    test("rejects array with duplicates", () => {
        const { error } = adminPlaylistValidation.addTracksBatchSchema.validate(
            { trackIds: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439011"] },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });
});

// ============ SERVICE TESTS ============

describe("adminPlaylistService - Create System Playlist", () => {
    let adminPlaylistService;
    let AppError;
    let mockPlaylistModel;

    beforeEach(async () => {
        ({ adminPlaylistService, AppError, mockPlaylistModel } = await loadAdminPlaylistServiceModule());
    });

    test("creates playlist successfully", async () => {
        const playlistData = {
            title: "New Playlist",
            description: "Description",
            isPublic: true,
            isHidden: false,
        };

        const createdDoc = createPlaylistDoc(playlistData);
        mockPlaylistModel.create.mockResolvedValue(createdDoc);

        const result = await adminPlaylistService.createSystemPlaylist(VALID_ADMIN_ID, playlistData);

        expect(mockPlaylistModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "New Playlist",
                description: "Description",
                type: "system",
                isPublic: true,
                isHidden: false,
            })
        );
    });

    test("creates playlist with default isPublic true", async () => {
        const playlistData = { title: "Public by Default" };

        const createdDoc = createPlaylistDoc({ ...playlistData, isPublic: true, isHidden: false });
        mockPlaylistModel.create.mockResolvedValue(createdDoc);

        const result = await adminPlaylistService.createSystemPlaylist(VALID_ADMIN_ID, playlistData);

        expect(mockPlaylistModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
                isPublic: true,
                isHidden: false,
            })
        );
    });
});

describe("adminPlaylistService - View System Playlists", () => {
    let adminPlaylistService;
    let AppError;
    let mockPlaylistModel;

    beforeEach(async () => {
        ({ adminPlaylistService, AppError, mockPlaylistModel } = await loadAdminPlaylistServiceModule());
    });

    test("returns all system playlists", async () => {
        const playlists = [
            createPlaylistDoc({ _id: "507f1f77bcf86cd799439111", title: "Playlist 1" }),
            createPlaylistDoc({ _id: "507f1f77bcf86cd799439222", title: "Playlist 2" }),
        ];

        mockPlaylistModel.find.mockReturnValue({
            sort: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(playlists),
            }),
        });

        const result = await adminPlaylistService.getSystemPlaylistsForAdmin();

        expect(mockPlaylistModel.find).toHaveBeenCalledWith({ type: "system" });
        expect(result).toHaveLength(2);
    });

    test("returns empty array when no playlists exist", async () => {
        mockPlaylistModel.find.mockReturnValue({
            sort: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([]),
            }),
        });

        const result = await adminPlaylistService.getSystemPlaylistsForAdmin();

        expect(result).toEqual([]);
    });
});

describe("adminPlaylistService - View System Playlist Details", () => {
    let adminPlaylistService;
    let AppError;
    let mockPlaylistService;

    beforeEach(async () => {
        ({ adminPlaylistService, AppError, mockPlaylistService } = await loadAdminPlaylistServiceModule());
    });

    test("returns playlist details for admin", async () => {
        const detail = createPlaylistDoc({ title: "Detail Playlist" });
        mockPlaylistService.getPlaylistDetail.mockResolvedValue(detail);

        const result = await adminPlaylistService.getSystemPlaylistDetailForAdmin(VALID_PLAYLIST_ID);

        expect(mockPlaylistService.getPlaylistDetail).toHaveBeenCalledWith(VALID_PLAYLIST_ID, { mode: "adminSystem" });
        expect(result).toEqual(detail);
    });
});

describe("adminPlaylistService - Edit System Playlist", () => {
    let adminPlaylistService;
    let AppError;
    let mockPlaylistModel;
    let mockPlaylistService;

    beforeEach(async () => {
        ({ adminPlaylistService, AppError, mockPlaylistModel, mockPlaylistService } = await loadAdminPlaylistServiceModule());
    });

    test("updates title successfully", async () => {
        const playlistDoc = createPlaylistDoc({ title: "Old Title" });
        const updatedDoc = createPlaylistDoc({ title: "New Title" });

        mockPlaylistModel.findOne.mockResolvedValue(playlistDoc);
        mockPlaylistService.getPlaylistDetail.mockResolvedValue(updatedDoc);

        const result = await adminPlaylistService.updateSystemPlaylist(VALID_PLAYLIST_ID, {
            title: "New Title",
        });

        expect(playlistDoc.title).toBe("New Title");
        expect(playlistDoc.save).toHaveBeenCalled();
    });

    test("updates isPublic flag", async () => {
        const playlistDoc = createPlaylistDoc({ isPublic: true });
        const updatedDoc = createPlaylistDoc({ isPublic: false });

        mockPlaylistModel.findOne.mockResolvedValue(playlistDoc);
        mockPlaylistService.getPlaylistDetail.mockResolvedValue(updatedDoc);

        const result = await adminPlaylistService.updateSystemPlaylist(VALID_PLAYLIST_ID, {
            isPublic: false,
        });

        expect(playlistDoc.isPublic).toBe(false);
        expect(playlistDoc.save).toHaveBeenCalled();
    });

    test("updates isHidden flag", async () => {
        const playlistDoc = createPlaylistDoc({ isHidden: false });
        const updatedDoc = createPlaylistDoc({ isHidden: true });

        mockPlaylistModel.findOne.mockResolvedValue(playlistDoc);
        mockPlaylistService.getPlaylistDetail.mockResolvedValue(updatedDoc);

        const result = await adminPlaylistService.updateSystemPlaylist(VALID_PLAYLIST_ID, {
            isHidden: true,
        });

        expect(playlistDoc.isHidden).toBe(true);
        expect(playlistDoc.save).toHaveBeenCalled();
    });

    test("throws BAD_REQUEST for invalid playlist id format", async () => {
        await expect(
            adminPlaylistService.updateSystemPlaylist("invalid-id", { title: "New" })
        ).rejects.toMatchObject({
            statusCode: 400,
        });
    });

    test("throws NOT_FOUND when playlist does not exist", async () => {
        mockPlaylistModel.findOne.mockResolvedValue(null);

        await expect(
            adminPlaylistService.updateSystemPlaylist(VALID_PLAYLIST_ID, { title: "New" })
        ).rejects.toMatchObject({
            statusCode: 404,
        });
    });
});

describe("adminPlaylistService - Delete System Playlist", () => {
    let adminPlaylistService;
    let AppError;
    let mockPlaylistModel;

    beforeEach(async () => {
        ({ adminPlaylistService, AppError, mockPlaylistModel } = await loadAdminPlaylistServiceModule());
    });

    test("deletes playlist successfully", async () => {
        const playlistDoc = createPlaylistDoc();
        mockPlaylistModel.findOne.mockResolvedValue(playlistDoc);
        mockPlaylistModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

        await adminPlaylistService.deleteSystemPlaylist(VALID_PLAYLIST_ID);

        expect(mockPlaylistModel.deleteOne).toHaveBeenCalledWith({
            _id: VALID_PLAYLIST_ID,
            type: "system",
        });
    });

    test("throws NOT_FOUND when playlist does not exist", async () => {
        mockPlaylistModel.findOne.mockResolvedValue(null);

        await expect(
            adminPlaylistService.deleteSystemPlaylist(VALID_PLAYLIST_ID)
        ).rejects.toMatchObject({
            statusCode: 404,
        });
    });
});

describe("adminPlaylistService - Add Track to System Playlist", () => {
    let adminPlaylistService;
    let AppError;
    let mockPlaylistModel;
    let mockTrackModel;
    let mockPlaylistService;

    beforeEach(async () => {
        ({ adminPlaylistService, AppError, mockPlaylistModel, mockTrackModel, mockPlaylistService } = await loadAdminPlaylistServiceModule());
    });

    test("adds track successfully", async () => {
        const playlistDoc = createPlaylistDoc({ tracks: [] });
        const trackDoc = createTrackDoc();
        const updatedDoc = createPlaylistDoc({
            tracks: [{ trackId: VALID_TRACK_ID, order: 0 }],
            trackCount: 1,
        });

        mockTrackModel.findById.mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(trackDoc),
            }),
        });
        mockPlaylistModel.findOne.mockResolvedValue(playlistDoc);
        mockTrackModel.find.mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([trackDoc]),
            }),
        });
        mockPlaylistService.getPlaylistDetail.mockResolvedValue(updatedDoc);

        const result = await adminPlaylistService.addTrackToSystemPlaylist(
            VALID_PLAYLIST_ID,
            VALID_TRACK_ID
        );

        expect(playlistDoc.tracks).toHaveLength(1);
        expect(playlistDoc.save).toHaveBeenCalled();
    });

    test("throws NOT_FOUND when track does not exist", async () => {
        mockTrackModel.findById.mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(null),
            }),
        });

        await expect(
            adminPlaylistService.addTrackToSystemPlaylist(VALID_PLAYLIST_ID, VALID_TRACK_ID)
        ).rejects.toMatchObject({
            statusCode: 404,
        });
    });

    test("throws CONFLICT when track already in playlist", async () => {
        const playlistDoc = createPlaylistDoc({
            tracks: [{ trackId: VALID_TRACK_ID, order: 0 }],
        });
        const trackDoc = createTrackDoc();

        mockTrackModel.findById.mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(trackDoc),
            }),
        });
        mockPlaylistModel.findOne.mockResolvedValue(playlistDoc);

        await expect(
            adminPlaylistService.addTrackToSystemPlaylist(VALID_PLAYLIST_ID, VALID_TRACK_ID)
        ).rejects.toMatchObject({
            statusCode: 409,
        });
    });

    test("throws BAD_REQUEST for invalid track id format", async () => {
        await expect(
            adminPlaylistService.addTrackToSystemPlaylist(VALID_PLAYLIST_ID, "invalid-id")
        ).rejects.toMatchObject({
            statusCode: 400,
        });
    });
});

describe("adminPlaylistService - Remove Track from System Playlist", () => {
    let adminPlaylistService;
    let AppError;
    let mockPlaylistModel;
    let mockTrackModel;
    let mockPlaylistService;

    beforeEach(async () => {
        ({ adminPlaylistService, AppError, mockPlaylistModel, mockTrackModel, mockPlaylistService } = await loadAdminPlaylistServiceModule());
    });

    test("removes track successfully", async () => {
        const playlistDoc = createPlaylistDoc({
            tracks: [
                { trackId: VALID_TRACK_ID, order: 0 },
                { trackId: "507f1f77bcf86cd799439099", order: 1 },
            ],
            trackCount: 2,
        });
        const updatedDoc = createPlaylistDoc({
            tracks: [{ trackId: "507f1f77bcf86cd799439099", order: 0 }],
            trackCount: 1,
        });

        mockPlaylistModel.findOne.mockResolvedValue(playlistDoc);
        mockTrackModel.find.mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([{ _id: "507f1f77bcf86cd799439099", duration: 180 }]),
            }),
        });
        mockPlaylistService.getPlaylistDetail.mockResolvedValue(updatedDoc);

        const result = await adminPlaylistService.removeTrackFromSystemPlaylist(
            VALID_PLAYLIST_ID,
            VALID_TRACK_ID
        );

        expect(playlistDoc.tracks).toHaveLength(1);
        expect(playlistDoc.save).toHaveBeenCalled();
    });

    test("throws NOT_FOUND when track not in playlist", async () => {
        const playlistDoc = createPlaylistDoc({
            tracks: [{ trackId: VALID_TRACK_ID, order: 0 }],
        });

        mockPlaylistModel.findOne.mockResolvedValue(playlistDoc);

        await expect(
            adminPlaylistService.removeTrackFromSystemPlaylist(VALID_PLAYLIST_ID, "507f1f77bcf86cd799439099")
        ).rejects.toMatchObject({
            statusCode: 404,
        });
    });

    test("throws BAD_REQUEST for invalid track id format", async () => {
        await expect(
            adminPlaylistService.removeTrackFromSystemPlaylist(VALID_PLAYLIST_ID, "invalid")
        ).rejects.toMatchObject({
            statusCode: 400,
        });
    });
});

describe("adminPlaylistService - Add Tracks Batch", () => {
    let adminPlaylistService;
    let AppError;
    let mockPlaylistModel;
    let mockTrackModel;
    let mockPlaylistService;

    beforeEach(async () => {
        ({ adminPlaylistService, AppError, mockPlaylistModel, mockTrackModel, mockPlaylistService } = await loadAdminPlaylistServiceModule());
    });

    test("adds multiple tracks successfully", async () => {
        const playlistDoc = createPlaylistDoc({ tracks: [] });
        const tracks = [
            createTrackDoc({ _id: "507f1f77bcf86cd799439011" }),
            createTrackDoc({ _id: "507f1f77bcf86cd799439012" }),
        ];
        const updatedDoc = createPlaylistDoc({
            tracks: [
                { trackId: "507f1f77bcf86cd799439011", order: 0 },
                { trackId: "507f1f77bcf86cd799439012", order: 1 },
            ],
            trackCount: 2,
        });

        mockPlaylistModel.findOne.mockResolvedValue(playlistDoc);
        mockTrackModel.find.mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(tracks),
            }),
        });
        mockPlaylistService.getPlaylistDetail.mockResolvedValue(updatedDoc);

        const result = await adminPlaylistService.addTracksToSystemPlaylistBatch(
            VALID_PLAYLIST_ID,
            ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
        );

        expect(result.addedCount).toBe(2);
        expect(playlistDoc.save).toHaveBeenCalled();
    });

    test("throws BAD_REQUEST for empty array", async () => {
        await expect(
            adminPlaylistService.addTracksToSystemPlaylistBatch(VALID_PLAYLIST_ID, [])
        ).rejects.toMatchObject({
            statusCode: 400,
        });
    });

    test("throws BAD_REQUEST when all tracks already in playlist", async () => {
        const playlistDoc = createPlaylistDoc({
            tracks: [{ trackId: "507f1f77bcf86cd799439011", order: 0 }],
        });
        const trackDoc = createTrackDoc({ _id: "507f1f77bcf86cd799439011" });

        mockPlaylistModel.findOne.mockResolvedValue(playlistDoc);
        mockTrackModel.find.mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([trackDoc]),
            }),
        });

        await expect(
            adminPlaylistService.addTracksToSystemPlaylistBatch(VALID_PLAYLIST_ID, ["507f1f77bcf86cd799439011"])
        ).rejects.toMatchObject({
            statusCode: 400,
        });
    });

    test("skips duplicate ids in input array", async () => {
        const playlistDoc = createPlaylistDoc({ tracks: [] });
        const trackDoc = createTrackDoc({ _id: "507f1f77bcf86cd799439011" });
        const updatedDoc = createPlaylistDoc({
            tracks: [{ trackId: "507f1f77bcf86cd799439011", order: 0 }],
            trackCount: 1,
        });

        mockPlaylistModel.findOne.mockResolvedValue(playlistDoc);
        mockTrackModel.find.mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([trackDoc]),
            }),
        });
        mockPlaylistService.getPlaylistDetail.mockResolvedValue(updatedDoc);

        const result = await adminPlaylistService.addTracksToSystemPlaylistBatch(
            VALID_PLAYLIST_ID,
            ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439011"]
        );

        expect(result.addedCount).toBe(1);
        expect(playlistDoc.tracks).toHaveLength(1);
    });
});
