import { jest } from "@jest/globals";

const mockBcrypt = {
    compare: jest.fn(),
    hash: jest.fn(),
};

const mockCrypto = {
    randomBytes: jest.fn(),
};

const mockRefreshTokenModel = {};
const mockUserModel = {
    findOne: jest.fn(),
};
const mockVerificationTokenModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
};
const mockBuildResetLink = jest.fn();
const mockGenerateOtp = jest.fn();
const mockSendOtpEmail = jest.fn();
const mockSendResetPasswordLinkEmail = jest.fn();

const loadService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("bcrypt", () => ({
        default: mockBcrypt,
    }));
    jest.unstable_mockModule("crypto", () => ({
        default: mockCrypto,
    }));
    jest.unstable_mockModule("../../src/models/RefreshToken.js", () => ({
        default: mockRefreshTokenModel,
    }));
    jest.unstable_mockModule("../../src/models/User.js", () => ({
        default: mockUserModel,
    }));
    jest.unstable_mockModule("../../src/models/VerificationToken.js", () => ({
        default: mockVerificationTokenModel,
    }));
    jest.unstable_mockModule(
        "../../src/utils/buildForgotPasswordLink.js",
        () => ({
            buildResetLink: mockBuildResetLink,
        })
    );
    jest.unstable_mockModule("../../src/utils/generateOtp.js", () => ({
        generateOtp: mockGenerateOtp,
    }));
    jest.unstable_mockModule("../../src/utils/mailer.js", () => ({
        sendOtpEmail: mockSendOtpEmail,
        sendResetPasswordLinkEmail: mockSendResetPasswordLinkEmail,
    }));
    jest.unstable_mockModule(
        "../../src/services/Authentication/authentication.helper.js",
        () => ({
            buildRegistrationProfilePayload: jest.fn(),
            createAuthSession: jest.fn(),
            ensureEmailCanStartRegistration: jest.fn(),
            ensureActiveUser: jest.fn(),
            findOrCreateGoogleUser: jest.fn(),
            isInactiveUnverifiedUser: jest.fn(),
            sanitizeUser: jest.fn(),
            verifyGoogleIdToken: jest.fn(),
        })
    );
    jest.unstable_mockModule("../../src/utils/tokenUtils.js", () => ({
        createAccessToken: jest.fn(),
        createRefreshToken: jest.fn(),
        getRefreshExpireDate: jest.fn(),
    }));

    const { default: authenticationService } = await import(
        "../../src/services/Authentication/authentication.service.js"
    );

    return authenticationService;
};

describe("web forgot-password isolation", () => {
    beforeEach(() => {
        mockUserModel.findOne.mockReset();
        mockVerificationTokenModel.findOne.mockReset();
        mockVerificationTokenModel.create.mockReset();
        mockVerificationTokenModel.deleteMany.mockReset();
        mockBuildResetLink.mockReset();
        mockGenerateOtp.mockReset();
        mockSendOtpEmail.mockReset();
        mockSendResetPasswordLinkEmail.mockReset();
        mockCrypto.randomBytes.mockReset();

        process.env.RESET_PASSWORD_TTL_MINUTES = "15";
        process.env.OTP_RESEND_COOLDOWN_SECONDS = "60";
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-30T10:00:00.000Z"));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("creates a link-only web verification and clears OTP", async () => {
        const service = await loadService();
        const user = {
            _id: "507f1f77bcf86cd799439011",
            activeStatus: "active",
        };

        mockUserModel.findOne.mockResolvedValue(user);
        mockVerificationTokenModel.findOne.mockReturnValue({
            sort: jest.fn().mockResolvedValue(null),
        });
        mockCrypto.randomBytes.mockReturnValue({
            toString: jest.fn().mockReturnValue("web-reset-token"),
        });
        mockVerificationTokenModel.create.mockResolvedValue({
            _id: "507f1f77bcf86cd799439012",
        });
        mockVerificationTokenModel.deleteMany.mockResolvedValue({
            deletedCount: 0,
        });
        mockBuildResetLink.mockReturnValue(
            "https://web.example/reset-password?token=web-reset-token"
        );
        mockSendResetPasswordLinkEmail.mockResolvedValue();

        await service.requestForgotPassword({
            email: "user@example.com",
        });

        expect(mockGenerateOtp).not.toHaveBeenCalled();
        expect(mockVerificationTokenModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
                email: "user@example.com",
                token: "web-reset-token",
                otp: "",
                type: "reset_password",
            })
        );
        expect(mockSendResetPasswordLinkEmail).toHaveBeenCalledWith({
            to: "user@example.com",
            resetLink:
                "https://web.example/reset-password?token=web-reset-token",
            ttlMinutes: 15,
        });
    });

    test("clears a previous mobile OTP when the latest request comes from web", async () => {
        const service = await loadService();
        const existingVerification = {
            _id: "507f1f77bcf86cd799439012",
            otp: "063323",
            createdAt: new Date("2026-07-30T09:55:00.000Z"),
            updatedAt: new Date("2026-07-30T09:55:00.000Z"),
            save: jest.fn(),
        };

        existingVerification.save.mockResolvedValue(existingVerification);
        mockUserModel.findOne.mockResolvedValue({
            _id: "507f1f77bcf86cd799439011",
            activeStatus: "active",
        });
        mockVerificationTokenModel.findOne.mockReturnValue({
            sort: jest.fn().mockResolvedValue(existingVerification),
        });
        mockCrypto.randomBytes.mockReturnValue({
            toString: jest.fn().mockReturnValue("next-web-reset-token"),
        });
        mockVerificationTokenModel.deleteMany.mockResolvedValue({
            deletedCount: 0,
        });
        mockBuildResetLink.mockReturnValue(
            "https://web.example/reset-password?token=next-web-reset-token"
        );
        mockSendResetPasswordLinkEmail.mockResolvedValue();

        await service.requestForgotPassword({
            email: "user@example.com",
        });

        expect(existingVerification.otp).toBe("");
        expect(existingVerification.token).toBe("next-web-reset-token");
        expect(existingVerification.save).toHaveBeenCalledTimes(1);
        expect(mockGenerateOtp).not.toHaveBeenCalled();
    });
});
