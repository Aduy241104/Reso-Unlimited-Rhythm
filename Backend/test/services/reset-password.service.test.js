import { jest } from "@jest/globals";

process.env.JWT_SECRET = "test-secret";

const mockBcrypt = {
    compare: jest.fn(),
    hash: jest.fn(),
};

const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
};

const mockRefreshTokenModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
};

const mockVerificationTokenModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
};

const createUser = (overrides = {}) => ({
    _id: "507f1f77bcf86cd799439111",
    email: "member@example.com",
    username: "member",
    avatar: null,
    role: "listener",
    activeStatus: "active",
    profile: {
        fullName: "Test Member",
    },
    settings: {
        language: "en",
    },
    subscription: null,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-10T00:00:00.000Z"),
    password: "current-hashed-password",
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
});

const loadAuthenticationService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("bcrypt", () => ({
        default: mockBcrypt,
    }));
    jest.unstable_mockModule("google-auth-library", () => ({
        OAuth2Client: jest.fn(() => ({
            verifyIdToken: jest.fn(),
        })),
    }));
    jest.unstable_mockModule("../../src/models/User.js", () => ({
        default: mockUserModel,
    }));
    jest.unstable_mockModule("../../src/models/RefreshToken.js", () => ({
        default: mockRefreshTokenModel,
    }));
    jest.unstable_mockModule("../../src/models/VerificationToken.js", () => ({
        default: mockVerificationTokenModel,
    }));
    jest.unstable_mockModule("../../src/utils/mailer.js", () => ({
        sendOtpEmail: jest.fn(),
        sendResetPasswordLinkEmail: jest.fn(),
    }));
    jest.unstable_mockModule("../../src/utils/buildForgotPasswordLink.js", () => ({
        buildResetLink: jest.fn(),
    }));
    jest.unstable_mockModule("../../src/utils/generateOtp.js", () => ({
        generateOtp: jest.fn(),
    }));

    const { default: authenticationService } = await import(
        "../../src/services/Authentication/authentication.service.js"
    );

    return { authenticationService };
};

const loadValidationModule = async () => {
    jest.resetModules();

    return import("../../src/middlewares/Authentication/authentication.validation.js");
};

describe("authenticationService.resetPassword", () => {
    let authenticationService;

    beforeEach(async () => {
        jest.clearAllMocks();
        ({ authenticationService } = await loadAuthenticationService());
    });

    test("resets password, marks token used, and revokes active refresh tokens", async () => {
        const verificationToken = {
            _id: "507f1f77bcf86cd799439221",
            userId: "507f1f77bcf86cd799439111",
            email: "member@example.com",
            token: "12345",
            type: "reset_password",
            isUsed: false,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            save: jest.fn().mockResolvedValue(true),
        };
        const user = createUser();

        mockVerificationTokenModel.findOne.mockResolvedValue(verificationToken);
        mockUserModel.findById.mockResolvedValue(user);
        mockBcrypt.compare.mockResolvedValue(false);
        mockBcrypt.hash.mockResolvedValue("new-hashed-password");
        mockVerificationTokenModel.deleteMany.mockResolvedValue({
            acknowledged: true,
            deletedCount: 2,
        });
        mockRefreshTokenModel.updateMany.mockResolvedValue({
            acknowledged: true,
            modifiedCount: 3,
        });

        await authenticationService.resetPassword({
            token: "12345",
            password: "NewSecret123",
        });

        expect(mockVerificationTokenModel.findOne).toHaveBeenCalledWith({
            token: "12345",
            type: "reset_password",
            isUsed: false,
        });
        expect(mockUserModel.findById).toHaveBeenCalledWith("507f1f77bcf86cd799439111");
        expect(mockBcrypt.compare).toHaveBeenCalledWith(
            "NewSecret123",
            "current-hashed-password"
        );
        expect(mockBcrypt.hash).toHaveBeenCalledWith("NewSecret123", 10);
        expect(user.password).toBe("new-hashed-password");
        expect(user.save).toHaveBeenCalled();
        expect(verificationToken.isUsed).toBe(true);
        expect(verificationToken.userId).toBe("507f1f77bcf86cd799439111");
        expect(verificationToken.save).toHaveBeenCalled();
        expect(mockVerificationTokenModel.deleteMany).toHaveBeenCalledWith({
            email: "member@example.com",
            type: "reset_password",
            _id: { $ne: "507f1f77bcf86cd799439221" },
        });
        expect(mockRefreshTokenModel.updateMany).toHaveBeenCalledWith(
            { userId: "507f1f77bcf86cd799439111", isRevoked: false },
            { $set: { isRevoked: true } }
        );
    });

    test("throws 400 when reset token is invalid", async () => {
        mockVerificationTokenModel.findOne.mockResolvedValue(null);

        await expect(
            authenticationService.resetPassword({
                token: "12346",
                password: "NewSecret123",
            })
        ).rejects.toMatchObject({
            message: "Reset password link is invalid.",
            statusCode: 400,
            details: { field: "token" },
        });

        expect(mockUserModel.findById).not.toHaveBeenCalled();
        expect(mockUserModel.findOne).not.toHaveBeenCalled();
        expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    test("throws 400 and marks token used when reset token has expired", async () => {
        const verificationToken = {
            _id: "507f1f77bcf86cd799439222",
            isUsed: false,
            expiresAt: new Date(Date.now() - 1000),
            save: jest.fn().mockResolvedValue(true),
        };

        mockVerificationTokenModel.findOne.mockResolvedValue(verificationToken);

        await expect(
            authenticationService.resetPassword({
                token: "12347",
                password: "NewSecret123",
            })
        ).rejects.toMatchObject({
            message: "Reset password link has expired.",
            statusCode: 400,
            details: { field: "token" },
        });

        expect(mockVerificationTokenModel.findOne).toHaveBeenCalledWith({
            token: "12347",
            type: "reset_password",
            isUsed: false,
        });
        expect(verificationToken.isUsed).toBe(true);
        expect(verificationToken.save).toHaveBeenCalled();
        expect(mockUserModel.findById).not.toHaveBeenCalled();
        expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    test("throws 400 when new password matches current password", async () => {
        const verificationToken = {
            _id: "507f1f77bcf86cd799439223",
            userId: "507f1f77bcf86cd799439111",
            email: "member@example.com",
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            isUsed: false,
            save: jest.fn().mockResolvedValue(true),
        };
        const user = createUser();

        mockVerificationTokenModel.findOne.mockResolvedValue(verificationToken);
        mockUserModel.findById.mockResolvedValue(user);
        mockBcrypt.compare.mockResolvedValue(true);

        await expect(
            authenticationService.resetPassword({
                token: "12348",
                password: "SamePassword123",
            })
        ).rejects.toMatchObject({
            message: "New password must be different from the current password.",
            statusCode: 400,
            details: { field: "password" },
        });

        expect(mockBcrypt.hash).not.toHaveBeenCalled();
        expect(user.save).not.toHaveBeenCalled();
        expect(verificationToken.save).not.toHaveBeenCalled();
        expect(mockVerificationTokenModel.deleteMany).not.toHaveBeenCalled();
        expect(mockRefreshTokenModel.updateMany).not.toHaveBeenCalled();
    });
});

describe("authentication validation - reset password", () => {
    let authenticationValidation;

    beforeEach(async () => {
        jest.clearAllMocks();
        ({ default: authenticationValidation } = await loadValidationModule());
    });

    test("rejects reset password when password format is invalid", () => {
        const { error } = authenticationValidation.resetPasswordSchema.validate(
            {
                token: "12345",
                password: "123",
                confirmPassword: "123",
            },
            { abortEarly: false }
        );

        expect(error).toBeDefined();
        expect(error.details.map((detail) => detail.path.join("."))).toContain(
            "password"
        );
    });
});
