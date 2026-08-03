import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

process.env.JWT_SECRET = "test-secret";

const mockBcrypt = {
    compare: jest.fn(),
    hash: jest.fn(),
};

const mockCrypto = {
    randomBytes: jest.fn(),
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

const mockMailer = {
    sendOtpEmail: jest.fn(),
    sendResetPasswordLinkEmail: jest.fn(),
};

const mockBuildResetLink = jest.fn();

const createRandomBytesBuffer = (token = "12345") => ({
    toString: jest.fn().mockReturnValue(token),
});

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
    password: "hashed-password",
    ...overrides,
});

const loadAuthenticationService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("bcrypt", () => ({
        default: mockBcrypt,
    }));
    jest.unstable_mockModule("crypto", () => ({
        default: mockCrypto,
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
        sendOtpEmail: mockMailer.sendOtpEmail,
        sendResetPasswordLinkEmail: mockMailer.sendResetPasswordLinkEmail,
    }));
    jest.unstable_mockModule("../../src/utils/buildForgotPasswordLink.js", () => ({
        buildResetLink: mockBuildResetLink,
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

describe("authenticationService.requestForgotPassword", () => {
    let authenticationService;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockCrypto.randomBytes.mockReturnValue(createRandomBytesBuffer("12345"));
        mockBuildResetLink.mockReturnValue("https://example.com/reset-password?token=12345");
        ({ authenticationService } = await loadAuthenticationService());
    });

    test("returns generic success data when email does not exist", async () => {
        mockUserModel.findOne.mockResolvedValue(null);

        const result = await authenticationService.requestForgotPassword({
            email: "  missing@example.com  ",
        });

        expect(mockUserModel.findOne).toHaveBeenCalledWith({
            email: "missing@example.com",
        });
        expect(result).toEqual({
            expiresInMinutes: 15,
            resendAfterSeconds: 60,
        });
        expect(mockVerificationTokenModel.findOne).not.toHaveBeenCalled();
        expect(mockMailer.sendResetPasswordLinkEmail).not.toHaveBeenCalled();
    });

    test("returns generic success data when account is inactive", async () => {
        mockUserModel.findOne.mockResolvedValue(
            createUser({
                activeStatus: "inactive",
            })
        );

        const result = await authenticationService.requestForgotPassword({
            email: "member@example.com",
        });

        expect(result).toEqual({
            expiresInMinutes: 15,
            resendAfterSeconds: 60,
        });
        expect(mockVerificationTokenModel.findOne).not.toHaveBeenCalled();
        expect(mockMailer.sendResetPasswordLinkEmail).not.toHaveBeenCalled();
    });

    test("creates reset token and sends reset link email for active account", async () => {
        const user = createUser();
        const latestVerificationQuery = createAwaitableQuery(null, ["sort"]);

        mockUserModel.findOne.mockResolvedValue(user);
        mockVerificationTokenModel.findOne.mockReturnValue(latestVerificationQuery);
        mockVerificationTokenModel.create.mockResolvedValue({
            _id: "507f1f77bcf86cd799439321",
        });
        mockVerificationTokenModel.deleteMany.mockResolvedValue({
            acknowledged: true,
            deletedCount: 0,
        });

        const result = await authenticationService.requestForgotPassword({
            email: "  MEMBER@Example.com  ",
        });

        expect(mockUserModel.findOne).toHaveBeenCalledWith({
            email: "member@example.com",
        });
        expect(mockVerificationTokenModel.findOne).toHaveBeenCalledWith({
            email: "member@example.com",
            type: "reset_password",
            isUsed: false,
        });
        expect(latestVerificationQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(mockVerificationTokenModel.create).toHaveBeenCalledWith({
            userId: "507f1f77bcf86cd799439111",
            email: "member@example.com",
            token: "12345",
            otp: "",
            type: "reset_password",
            expiresAt: expect.any(Date),
            isUsed: false,
        });
        expect(mockVerificationTokenModel.deleteMany).toHaveBeenCalledWith({
            email: "member@example.com",
            type: "reset_password",
            _id: { $ne: "507f1f77bcf86cd799439321" },
        });
        expect(mockBuildResetLink).toHaveBeenCalledWith({
            token: "12345",
        });
        expect(mockMailer.sendResetPasswordLinkEmail).toHaveBeenCalledWith({
            to: "member@example.com",
            resetLink: "https://example.com/reset-password?token=12345",
            ttlMinutes: 15,
        });
        expect(result).toEqual({
            expiresInMinutes: 15,
            resendAfterSeconds: 60,
        });
    });

    test("throws 429 when requesting reset link again too soon", async () => {
        const user = createUser();
        const latestVerification = {
            _id: "507f1f77bcf86cd799439322",
            updatedAt: new Date(Date.now() - 10 * 1000),
            createdAt: new Date(Date.now() - 20 * 1000),
        };

        mockUserModel.findOne.mockResolvedValue(user);
        mockVerificationTokenModel.findOne.mockReturnValue(
            createAwaitableQuery(latestVerification, ["sort"])
        );

        await expect(
            authenticationService.requestForgotPassword({
                email: "member@example.com",
            })
        ).rejects.toMatchObject({
            message: "Please wait before requesting another reset link.",
            statusCode: 429,
            details: { resendAfterSeconds: 60 },
        });

        expect(mockVerificationTokenModel.create).not.toHaveBeenCalled();
        expect(mockMailer.sendResetPasswordLinkEmail).not.toHaveBeenCalled();
    });
});
