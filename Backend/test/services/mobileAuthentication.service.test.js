import { jest } from "@jest/globals";

const mockUserModel = {
    findOne: jest.fn(),
};

const mockVerificationTokenModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
};

const mockSendMobilePasswordResetOtpEmail = jest.fn();
const mockGenerateOtp = jest.fn();

const createLatestVerificationQuery = (result) => ({
    sort: jest.fn().mockResolvedValue(result),
});

const loadService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/User.js", () => ({
        default: mockUserModel,
    }));
    jest.unstable_mockModule("../../src/models/VerificationToken.js", () => ({
        default: mockVerificationTokenModel,
    }));
    jest.unstable_mockModule("../../src/utils/generateOtp.js", () => ({
        generateOtp: mockGenerateOtp,
    }));
    jest.unstable_mockModule(
        "../../src/utils/mobilePasswordResetMailer.js",
        () => ({
            sendMobilePasswordResetOtpEmail:
                mockSendMobilePasswordResetOtpEmail,
        })
    );

    const { default: mobileAuthenticationService } = await import(
        "../../src/services/Authentication/mobile.authentication.service.js"
    );

    return mobileAuthenticationService;
};

describe("mobileAuthenticationService", () => {
    beforeEach(() => {
        mockUserModel.findOne.mockReset();
        mockVerificationTokenModel.findOne.mockReset();
        mockVerificationTokenModel.create.mockReset();
        mockVerificationTokenModel.deleteMany.mockReset();
        mockSendMobilePasswordResetOtpEmail.mockReset();
        mockGenerateOtp.mockReset();
        process.env.RESET_PASSWORD_TTL_MINUTES = "15";
        process.env.OTP_RESEND_COOLDOWN_SECONDS = "60";
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-07-30T10:00:00.000Z"));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("creates a reset verification and sends only the mobile OTP payload", async () => {
        const service = await loadService();
        const user = {
            _id: "507f1f77bcf86cd799439011",
            activeStatus: "active",
        };

        mockUserModel.findOne.mockResolvedValue(user);
        mockVerificationTokenModel.findOne.mockReturnValue(
            createLatestVerificationQuery(null)
        );
        mockGenerateOtp.mockReturnValue("063323");
        mockVerificationTokenModel.create.mockResolvedValue({
            _id: "507f1f77bcf86cd799439012",
        });
        mockVerificationTokenModel.deleteMany.mockResolvedValue({
            deletedCount: 0,
        });
        mockSendMobilePasswordResetOtpEmail.mockResolvedValue();

        const result = await service.requestMobileForgotPassword({
            email: "  USER@example.com ",
        });

        expect(mockVerificationTokenModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: user._id,
                email: "user@example.com",
                token: expect.any(String),
                otp: "063323",
                type: "reset_password",
                isUsed: false,
                expiresAt: new Date("2026-07-30T10:15:00.000Z"),
            })
        );
        expect(mockSendMobilePasswordResetOtpEmail).toHaveBeenCalledWith({
            to: "user@example.com",
            otp: "063323",
            ttlMinutes: 15,
        });
        expect(result).toEqual({
            expiresInMinutes: 15,
            resendAfterSeconds: 60,
        });
    });

    test("does not reveal whether the mobile email exists", async () => {
        const service = await loadService();
        mockUserModel.findOne.mockResolvedValue(null);

        const result = await service.requestMobileForgotPassword({
            email: "missing@example.com",
        });

        expect(result).toEqual({
            expiresInMinutes: 15,
            resendAfterSeconds: 60,
        });
        expect(mockVerificationTokenModel.findOne).not.toHaveBeenCalled();
        expect(mockSendMobilePasswordResetOtpEmail).not.toHaveBeenCalled();
    });

    test("keeps the reset OTP resend cooldown", async () => {
        const service = await loadService();
        mockUserModel.findOne.mockResolvedValue({
            _id: "507f1f77bcf86cd799439011",
            activeStatus: "active",
        });
        mockVerificationTokenModel.findOne.mockReturnValue(
            createLatestVerificationQuery({
                createdAt: new Date("2026-07-30T09:59:30.000Z"),
            })
        );

        await expect(
            service.requestMobileForgotPassword({
                email: "user@example.com",
            })
        ).rejects.toMatchObject({
            statusCode: 429,
            details: { resendAfterSeconds: 60 },
        });
        expect(mockSendMobilePasswordResetOtpEmail).not.toHaveBeenCalled();
    });
});
