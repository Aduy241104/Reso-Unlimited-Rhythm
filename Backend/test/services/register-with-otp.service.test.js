import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

process.env.JWT_SECRET = "test-secret";

const mockBcrypt = {
    hash: jest.fn(),
};

const mockUserModel = {
    findOne: jest.fn(),
    create: jest.fn(),
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
        gender: "female",
        dateOfBirth: new Date("2000-01-02T00:00:00.000Z"),
        country: "Vietnam",
    },
    settings: {
        language: "en",
    },
    subscription: null,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-10T00:00:00.000Z"),
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

    const [{ default: authenticationService }, { AppError }] = await Promise.all([
        import("../../src/services/Authentication/authentication.service.js"),
        import("../../src/utils/AppError.js"),
    ]);

    return { authenticationService, AppError };
};

describe("authenticationService.register", () => {
    let authenticationService;

    beforeEach(async () => {
        jest.clearAllMocks();
        ({ authenticationService } = await loadAuthenticationService());
    });

    test("creates an account when OTP is valid", async () => {
        const verificationToken = {
            _id: "507f1f77bcf86cd799439211",
            email: "member@example.com",
            otp: "123456",
            type: "verify_email",
            isUsed: false,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            save: jest.fn().mockResolvedValue(true),
        };
        const verificationQuery = createAwaitableQuery(verificationToken, ["sort"]);
        const createdUser = createUser();

        mockVerificationTokenModel.findOne.mockReturnValue(verificationQuery);
        mockUserModel.findOne.mockResolvedValue(null);
        mockBcrypt.hash.mockResolvedValue("hashed-password");
        mockUserModel.create.mockResolvedValue(createdUser);
        mockVerificationTokenModel.deleteMany.mockResolvedValue({
            acknowledged: true,
            deletedCount: 0,
        });

        const result = await authenticationService.register({
            email: "  MEMBER@Example.com  ",
            otp: "123456",
            password: "Secret123",
            fullName: "  Test Member  ",
            gender: "female",
            dateOfBirth: "2000-01-02T00:00:00.000Z",
            country: "  Vietnam  ",
        });

        expect(mockVerificationTokenModel.findOne).toHaveBeenCalledWith({
            email: "member@example.com",
            otp: "123456",
            type: "verify_email",
            isUsed: false,
        });
        expect(verificationQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(mockUserModel.findOne).toHaveBeenCalledWith({
            email: "member@example.com",
        });
        expect(mockBcrypt.hash).toHaveBeenCalledWith("Secret123", 10);
        expect(mockUserModel.create).toHaveBeenCalledWith({
            email: "member@example.com",
            password: "hashed-password",
            profile: {
                fullName: "Test Member",
                gender: "female",
                dateOfBirth: new Date("2000-01-02T00:00:00.000Z"),
                country: "Vietnam",
            },
        });
        expect(verificationToken.userId).toBe("507f1f77bcf86cd799439111");
        expect(verificationToken.isUsed).toBe(true);
        expect(verificationToken.save).toHaveBeenCalled();
        expect(mockVerificationTokenModel.deleteMany).toHaveBeenCalledWith({
            email: "member@example.com",
            type: "verify_email",
            _id: { $ne: "507f1f77bcf86cd799439211" },
        });
        expect(result).toEqual({
            user: {
                id: "507f1f77bcf86cd799439111",
                email: "member@example.com",
                username: "member",
                avatar: null,
                role: "listener",
                activeStatus: "active",
                profile: {
                    fullName: "Test Member",
                    gender: "female",
                    dateOfBirth: new Date("2000-01-02T00:00:00.000Z"),
                    country: "Vietnam",
                },
                settings: {
                    language: "en",
                },
                subscription: null,
                createdAt: new Date("2026-05-01T00:00:00.000Z"),
                updatedAt: new Date("2026-05-10T00:00:00.000Z"),
            },
        });
    });

    test("throws 400 when OTP is invalid", async () => {
        const verificationQuery = createAwaitableQuery(null, ["sort"]);
        mockVerificationTokenModel.findOne.mockReturnValue(verificationQuery);

        await expect(
            authenticationService.register({
                email: "member@example.com",
                otp: "654321",
                password: "Secret123",
            })
        ).rejects.toMatchObject({
            message: "OTP is invalid.",
            statusCode: 400,
            details: { field: "otp" },
        });

        expect(mockUserModel.findOne).not.toHaveBeenCalled();
        expect(mockBcrypt.hash).not.toHaveBeenCalled();
        expect(mockUserModel.create).not.toHaveBeenCalled();
    });

    test("throws 400 and marks token used when OTP has expired", async () => {
        const verificationToken = {
            _id: "507f1f77bcf86cd799439212",
            expiresAt: new Date(Date.now() - 1000),
            isUsed: false,
            save: jest.fn().mockResolvedValue(true),
        };

        mockVerificationTokenModel.findOne.mockReturnValue(
            createAwaitableQuery(verificationToken, ["sort"])
        );

        await expect(
            authenticationService.register({
                email: "member@example.com",
                otp: "123456",
                password: "Secret123",
            })
        ).rejects.toMatchObject({
            message: "OTP has expired.",
            statusCode: 400,
            details: { field: "otp" },
        });

        expect(verificationToken.isUsed).toBe(true);
        expect(verificationToken.save).toHaveBeenCalled();
        expect(mockUserModel.findOne).not.toHaveBeenCalled();
        expect(mockUserModel.create).not.toHaveBeenCalled();
    });

    test("throws 409 when email is already in use after OTP verification", async () => {
        const verificationToken = {
            _id: "507f1f77bcf86cd799439213",
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            isUsed: false,
            save: jest.fn().mockResolvedValue(true),
        };

        mockVerificationTokenModel.findOne.mockReturnValue(
            createAwaitableQuery(verificationToken, ["sort"])
        );
        mockUserModel.findOne.mockResolvedValue(
            createUser({
                _id: "507f1f77bcf86cd799439112",
                email: "member@example.com",
            })
        );

        await expect(
            authenticationService.register({
                email: "member@example.com",
                otp: "123456",
                password: "Secret123",
            })
        ).rejects.toMatchObject({
            message: "Email is already in use.",
            statusCode: 409,
            details: { field: "email" },
        });

        expect(mockBcrypt.hash).not.toHaveBeenCalled();
        expect(mockUserModel.create).not.toHaveBeenCalled();
        expect(verificationToken.save).not.toHaveBeenCalled();
        expect(mockVerificationTokenModel.deleteMany).not.toHaveBeenCalled();
    });
});
