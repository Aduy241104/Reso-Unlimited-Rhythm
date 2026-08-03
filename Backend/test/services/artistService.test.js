import { jest } from "@jest/globals";

process.env.JWT_SECRET = "test-secret";

// Helper: Create artist document mock
const createArtistDoc = (overrides = {}) => ({
    _id: "artist-123",
    userId: "user-123",
    name: "Test Artist",
    bio: "Test bio",
    avatar: "https://cloudinary.com/avatar.jpg",
    coverImage: "https://cloudinary.com/cover.jpg",
    socialLinks: {
        facebook: "https://facebook.com/test",
        instagram: "https://instagram.com/test",
        youtube: "https://youtube.com/test",
    },
    verificationStatus: "pending",
    activeStatus: "active",
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-10T00:00:00.000Z"),
    save: jest.fn(),
    markModified: jest.fn(),
    ...overrides,
});

const loadArtistValidationModule = async () => {
    jest.resetModules();
    return import("../../src/middlewares/artist/artist.validation.js");
};

const loadArtistServiceModule = async () => {
    jest.resetModules();

    // Mock Artist model - findOne returns a query-like object with populate and lean
    const mockArtistModel = {
        findOne: jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockImplementation(() => ({
                lean: jest.fn(),
            })),
        })),
        create: jest.fn(),
    };

    const mockArtistVerificationRequestModel = {
        findOne: jest.fn(),
        exists: jest.fn(),
        create: jest.fn(),
    };

    const mockCloudinaryService = {
        uploadImageBuffer: jest.fn(),
        deleteImageByPublicId: jest.fn(),
    };

    const mockUploadCloud = {
        extractPublicIdFromUrl: jest.fn(),
    };

    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));

    jest.unstable_mockModule("../../src/models/ArtistVerificationRequest.js", () => ({
        default: mockArtistVerificationRequestModel,
    }));

    jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
        uploadImageBuffer: mockCloudinaryService.uploadImageBuffer,
        deleteImageByPublicId: mockCloudinaryService.deleteImageByPublicId,
    }));

    jest.unstable_mockModule("../../src/utils/uploadCloud.js", () => ({
        extractPublicIdFromUrl: mockUploadCloud.extractPublicIdFromUrl,
    }));

    const { default: artistService } = await import("../../src/services/artist/artist.service.js");
    const { AppError } = await import("../../src/utils/AppError.js");

    return { artistService, AppError, mockArtistModel, mockArtistVerificationRequestModel, mockCloudinaryService, mockUploadCloud };
};

// ============ VALIDATION TESTS ============

describe("artist validation - updateMyProfileSchema", () => {
    let artistValidation;

    beforeEach(async () => {
        ({ default: artistValidation } = await loadArtistValidationModule());
    });

    test("accepts valid name update", () => {
        const { error } = artistValidation.updateMyProfileSchema.validate(
            { name: "New Artist Name" },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts valid bio update", () => {
        const { error } = artistValidation.updateMyProfileSchema.validate(
            { bio: "New artist bio" },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts valid socialLinks update", () => {
        const { error } = artistValidation.updateMyProfileSchema.validate(
            {
                socialLinks: {
                    facebook: "https://facebook.com/newartist",
                    instagram: "https://instagram.com/newartist",
                },
            },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts valid socialLinks with valid URLs", () => {
        const { error } = artistValidation.updateMyProfileSchema.validate(
            {
                socialLinks: {
                    facebook: "https://facebook.com/artist",
                    youtube: "https://youtube.com/channel/abc",
                },
            },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("rejects socialLinks with invalid URL", () => {
        const { error } = artistValidation.updateMyProfileSchema.validate(
            {
                socialLinks: {
                    facebook: "not-a-valid-url",
                },
            },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
        expect(error.details[0].path).toEqual(["socialLinks", "facebook"]);
    });

    test("rejects empty object", () => {
        const { error } = artistValidation.updateMyProfileSchema.validate(
            {},
            { abortEarly: false }
        );
        expect(error).toBeDefined();
        expect(error.details[0].message).toContain("At least one field");
    });

    test("accepts removeAvatar flag", () => {
        const { error } = artistValidation.updateMyProfileSchema.validate(
            { removeAvatar: true },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts removeCover flag", () => {
        const { error } = artistValidation.updateMyProfileSchema.validate(
            { removeCover: true },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("rejects name exceeding max length", () => {
        const longName = "a".repeat(121);
        const { error } = artistValidation.updateMyProfileSchema.validate(
            { name: longName },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });
});

describe("artist validation - requestVerificationSchema", () => {
    let artistValidation;

    beforeEach(async () => {
        ({ default: artistValidation } = await loadArtistValidationModule());
    });

    test("accepts empty note", () => {
        const { error } = artistValidation.requestVerificationSchema.validate(
            {},
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("accepts valid note", () => {
        const { error } = artistValidation.requestVerificationSchema.validate(
            { note: "Please verify my artist account" },
            { abortEarly: false }
        );
        expect(error).toBeUndefined();
    });

    test("rejects note exceeding max length", () => {
        const longNote = "a".repeat(2001);
        const { error } = artistValidation.requestVerificationSchema.validate(
            { note: longNote },
            { abortEarly: false }
        );
        expect(error).toBeDefined();
    });
});

// ============ SERVICE TESTS ============

describe("artistService.getMyProfileByUserId", () => {
    let artistService;
    let AppError;
    let mockArtistModel;
    let mockArtistVerificationRequestModel;

    beforeEach(async () => {
        ({ artistService, AppError, mockArtistModel, mockArtistVerificationRequestModel } = await loadArtistServiceModule());
    });

    test("returns artist profile with user data when found", async () => {
        const artistData = createArtistDoc();
        mockArtistModel.findOne.mockReturnValue({
            populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(artistData),
            }),
        });
        mockArtistVerificationRequestModel.exists.mockResolvedValue(null);

        const result = await artistService.getMyProfileByUserId("user-123");

        expect(mockArtistModel.findOne).toHaveBeenCalledWith({ userId: "user-123" });
        expect(result).toBeDefined();
        expect(result.name).toBe("Test Artist");
        expect(result.hasPendingVerificationRequest).toBe(false);
    });

    test("throws NOT_FOUND when artist profile does not exist", async () => {
        mockArtistModel.findOne.mockReturnValue({
            populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(null),
            }),
        });

        await expect(
            artistService.getMyProfileByUserId("nonexistent-user")
        ).rejects.toBeInstanceOf(AppError);

        await expect(
            artistService.getMyProfileByUserId("nonexistent-user")
        ).rejects.toMatchObject({
            message: "Artist profile not found for this account.",
            statusCode: 404,
        });
    });

    test("returns hasPendingVerificationRequest as true when pending request exists", async () => {
        const artistData = createArtistDoc();
        mockArtistModel.findOne.mockReturnValue({
            populate: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(artistData),
            }),
        });
        mockArtistVerificationRequestModel.exists.mockResolvedValue({ _id: "request-123" });

        const result = await artistService.getMyProfileByUserId("user-123");

        expect(result.hasPendingVerificationRequest).toBe(true);
    });
});

describe("artistService.updateMyProfileByUserId", () => {
    let artistService;
    let AppError;
    let mockArtistModel;
    let mockCloudinaryService;
    let mockUploadCloud;

    beforeEach(async () => {
        ({ artistService, AppError, mockArtistModel, mockCloudinaryService, mockUploadCloud } = await loadArtistServiceModule());
        mockUploadCloud.extractPublicIdFromUrl.mockReturnValue("public-id-123");
        mockCloudinaryService.deleteImageByPublicId.mockResolvedValue({ result: "ok" });
    });

    test("updates artist name successfully", async () => {
        const artistDoc = createArtistDoc();
        const artistData = createArtistDoc({ name: "New Name" });

        // First call: findOwnedArtistDocumentOrThrow - direct doc
        const mockFindOne = jest.fn()
            .mockReturnValueOnce(artistDoc)  // findOwnedArtistDocumentOrThrow
            .mockReturnValueOnce({  // getMyProfileByUserId
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(artistData),
                }),
            });
        mockArtistModel.findOne = mockFindOne;

        await artistService.updateMyProfileByUserId("user-123", {
            name: "New Name",
        });

        expect(artistDoc.name).toBe("New Name");
        expect(artistDoc.save).toHaveBeenCalled();
    });

    test("updates artist bio successfully", async () => {
        const artistDoc = createArtistDoc();
        const artistData = createArtistDoc({ bio: "New bio" });

        const mockFindOne = jest.fn()
            .mockReturnValueOnce(artistDoc)
            .mockReturnValueOnce({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(artistData),
                }),
            });
        mockArtistModel.findOne = mockFindOne;

        await artistService.updateMyProfileByUserId("user-123", {
            bio: "New bio",
        });

        expect(artistDoc.bio).toBe("New bio");
        expect(artistDoc.save).toHaveBeenCalled();
    });

    test("updates socialLinks successfully", async () => {
        const artistDoc = createArtistDoc();
        artistDoc.socialLinks = {
            facebook: "https://facebook.com/test",
            instagram: "https://instagram.com/test",
            youtube: "https://youtube.com/test",
        };

        const artistData = createArtistDoc({
            socialLinks: {
                facebook: "https://facebook.com/newpage",
                instagram: "https://instagram.com/test",
                youtube: "https://youtube.com/test",
            },
        });

        const mockFindOne = jest.fn()
            .mockReturnValueOnce(artistDoc)
            .mockReturnValueOnce({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(artistData),
                }),
            });
        mockArtistModel.findOne = mockFindOne;

        await artistService.updateMyProfileByUserId("user-123", {
            socialLinks: {
                facebook: "https://facebook.com/newpage",
            },
        });

        expect(artistDoc.socialLinks.facebook).toBe("https://facebook.com/newpage");
        expect(artistDoc.markModified).toHaveBeenCalledWith("socialLinks");
        expect(artistDoc.save).toHaveBeenCalled();
    });

    test("deletes avatar when removeAvatar is true", async () => {
        const artistDoc = createArtistDoc({ avatar: "https://cloudinary.com/avatar.jpg" });
        const artistData = createArtistDoc({ avatar: "" });

        const mockFindOne = jest.fn()
            .mockReturnValueOnce(artistDoc)
            .mockReturnValueOnce({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(artistData),
                }),
            });
        mockArtistModel.findOne = mockFindOne;

        await artistService.updateMyProfileByUserId("user-123", {
            removeAvatar: true,
        });

        expect(mockCloudinaryService.deleteImageByPublicId).toHaveBeenCalledWith(
            "public-id-123",
            true
        );
        expect(artistDoc.avatar).toBe("");
    });

    test("deletes cover when removeCover is true", async () => {
        const artistDoc = createArtistDoc({ coverImage: "https://cloudinary.com/cover.jpg" });
        const artistData = createArtistDoc({ coverImage: "" });

        const mockFindOne = jest.fn()
            .mockReturnValueOnce(artistDoc)
            .mockReturnValueOnce({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(artistData),
                }),
            });
        mockArtistModel.findOne = mockFindOne;

        await artistService.updateMyProfileByUserId("user-123", {
            removeCover: true,
        });

        expect(mockCloudinaryService.deleteImageByPublicId).toHaveBeenCalledWith(
            "public-id-123",
            true
        );
        expect(artistDoc.coverImage).toBe("");
    });

    test("throws FORBIDDEN when artist profile is blocked", async () => {
        const blockedArtist = createArtistDoc({ activeStatus: "blocked" });
        mockArtistModel.findOne.mockReturnValue(blockedArtist);

        await expect(
            artistService.updateMyProfileByUserId("user-123", { name: "New Name" })
        ).rejects.toMatchObject({
            message: "Your artist profile cannot be updated while it is blocked.",
            statusCode: 403,
        });
    });

    test("throws NOT_FOUND when artist profile does not exist", async () => {
        mockArtistModel.findOne.mockReturnValue(null);

        await expect(
            artistService.updateMyProfileByUserId("nonexistent-user", { name: "New Name" })
        ).rejects.toMatchObject({
            message: "Artist profile not found for this account.",
            statusCode: 404,
        });
    });
});

describe("artistService.updateMyProfileMediaByUserId", () => {
    let artistService;
    let AppError;
    let mockArtistModel;
    let mockCloudinaryService;

    beforeEach(async () => {
        ({ artistService, AppError, mockArtistModel, mockCloudinaryService } = await loadArtistServiceModule());
    });

    test("uploads avatar successfully", async () => {
        const artistDoc = createArtistDoc();
        const artistData = createArtistDoc({ avatar: "https://cloudinary.com/new-avatar.jpg" });

        const mockFindOne = jest.fn()
            .mockReturnValueOnce(artistDoc)
            .mockReturnValueOnce({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(artistData),
                }),
            });
        mockArtistModel.findOne = mockFindOne;
        mockCloudinaryService.uploadImageBuffer.mockResolvedValue({
            secure_url: "https://cloudinary.com/new-avatar.jpg",
        });

        const avatarFile = { buffer: Buffer.from("test"), fieldname: "avatar" };
        await artistService.updateMyProfileMediaByUserId("user-123", {
            avatarFile,
        });

        expect(mockCloudinaryService.uploadImageBuffer).toHaveBeenCalledWith(
            expect.objectContaining({
                buffer: avatarFile.buffer,
                folder: "reso/artists",
            })
        );
        expect(artistDoc.avatar).toBe("https://cloudinary.com/new-avatar.jpg");
    });

    test("uploads cover successfully", async () => {
        const artistDoc = createArtistDoc();
        const artistData = createArtistDoc({ coverImage: "https://cloudinary.com/new-cover.jpg" });

        const mockFindOne = jest.fn()
            .mockReturnValueOnce(artistDoc)
            .mockReturnValueOnce({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(artistData),
                }),
            });
        mockArtistModel.findOne = mockFindOne;
        mockCloudinaryService.uploadImageBuffer.mockResolvedValue({
            secure_url: "https://cloudinary.com/new-cover.jpg",
        });

        const coverFile = { buffer: Buffer.from("test"), fieldname: "coverImage" };
        await artistService.updateMyProfileMediaByUserId("user-123", {
            coverFile,
        });

        expect(mockCloudinaryService.uploadImageBuffer).toHaveBeenCalledWith(
            expect.objectContaining({
                buffer: coverFile.buffer,
                folder: "reso/artists",
            })
        );
        expect(artistDoc.coverImage).toBe("https://cloudinary.com/new-cover.jpg");
    });

    test("uploads both avatar and cover", async () => {
        const artistDoc = createArtistDoc();
        const artistData = createArtistDoc({
            avatar: "https://cloudinary.com/new-avatar.jpg",
            coverImage: "https://cloudinary.com/new-cover.jpg",
        });

        const mockFindOne = jest.fn()
            .mockReturnValueOnce(artistDoc)
            .mockReturnValueOnce({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(artistData),
                }),
            });
        mockArtistModel.findOne = mockFindOne;
        mockCloudinaryService.uploadImageBuffer
            .mockResolvedValueOnce({ secure_url: "https://cloudinary.com/new-avatar.jpg" })
            .mockResolvedValueOnce({ secure_url: "https://cloudinary.com/new-cover.jpg" });

        const avatarFile = { buffer: Buffer.from("avatar") };
        const coverFile = { buffer: Buffer.from("cover") };
        await artistService.updateMyProfileMediaByUserId("user-123", {
            avatarFile,
            coverFile,
        });

        expect(mockCloudinaryService.uploadImageBuffer).toHaveBeenCalledTimes(2);
    });

    test("throws BAD_REQUEST when no files provided", async () => {
        await expect(
            artistService.updateMyProfileMediaByUserId("user-123", {})
        ).rejects.toMatchObject({
            message: "Provide at least one image field: avatar or coverImage.",
            statusCode: 400,
        });
    });

    test("throws BAD_GATEWAY when avatar upload fails", async () => {
        const artistDoc = createArtistDoc();
        mockArtistModel.findOne.mockReturnValue(artistDoc);
        mockCloudinaryService.uploadImageBuffer.mockRejectedValue(
            new Error("Upload failed")
        );

        const avatarFile = { buffer: Buffer.from("test") };
        await expect(
            artistService.updateMyProfileMediaByUserId("user-123", { avatarFile })
        ).rejects.toMatchObject({
            message:
                "Could not upload avatar image. Check storage configuration and try again.",
            statusCode: 502,
        });
    });
});

describe("artistService.requestVerificationByUserId", () => {
    let artistService;
    let AppError;
    let mockArtistModel;
    let mockArtistVerificationRequestModel;

    beforeEach(async () => {
        ({ artistService, AppError, mockArtistModel, mockArtistVerificationRequestModel } = await loadArtistServiceModule());
    });

    test("creates verification request successfully", async () => {
        const artistDoc = createArtistDoc({ verificationStatus: "pending" });
        const artistData = createArtistDoc({ verificationStatus: "pending" });

        const mockFindOne = jest.fn()
            .mockReturnValueOnce(artistDoc)
            .mockReturnValueOnce({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(artistData),
                }),
            });
        mockArtistModel.findOne = mockFindOne;
        mockArtistVerificationRequestModel.findOne.mockResolvedValue(null);
        mockArtistVerificationRequestModel.create.mockResolvedValue({
            _id: "request-123",
        });

        await artistService.requestVerificationByUserId("user-123", {
            note: "Please verify my account",
        });

        expect(mockArtistVerificationRequestModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
                artistId: artistDoc._id,
                userId: artistDoc.userId,
                note: "Please verify my account",
            })
        );
    });

    test("throws BAD_REQUEST when already verified", async () => {
        const verifiedArtist = createArtistDoc({ verificationStatus: "verified" });
        mockArtistModel.findOne.mockReturnValue(verifiedArtist);

        await expect(
            artistService.requestVerificationByUserId("user-123", {})
        ).rejects.toMatchObject({
            message: "Your artist profile is already verified.",
            statusCode: 400,
        });
    });

    test("throws CONFLICT when pending request already exists", async () => {
        const artistDoc = createArtistDoc({ verificationStatus: "pending" });
        mockArtistModel.findOne.mockReturnValue(artistDoc);
        mockArtistVerificationRequestModel.findOne.mockResolvedValue({
            _id: "existing-request",
        });

        await expect(
            artistService.requestVerificationByUserId("user-123", {})
        ).rejects.toMatchObject({
            message:
                "A verification request is already being reviewed. Please wait for the team to respond.",
            statusCode: 409,
        });
    });

    test("throws FORBIDDEN when artist profile is blocked", async () => {
        const blockedArtist = createArtistDoc({ activeStatus: "blocked" });
        mockArtistModel.findOne.mockReturnValue(blockedArtist);

        await expect(
            artistService.requestVerificationByUserId("user-123", {})
        ).rejects.toMatchObject({
            message: "Your artist profile cannot be updated while it is blocked.",
            statusCode: 403,
        });
    });

    test("creates request with empty note when note not provided", async () => {
        const artistDoc = createArtistDoc({ verificationStatus: "pending" });
        const artistData = createArtistDoc({ verificationStatus: "pending" });

        const mockFindOne = jest.fn()
            .mockReturnValueOnce(artistDoc)
            .mockReturnValueOnce({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(artistData),
                }),
            });
        mockArtistModel.findOne = mockFindOne;
        mockArtistVerificationRequestModel.findOne.mockResolvedValue(null);
        mockArtistVerificationRequestModel.create.mockResolvedValue({
            _id: "request-123",
        });

        await artistService.requestVerificationByUserId("user-123", {});

        expect(mockArtistVerificationRequestModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
                note: "",
            })
        );
    });
});
