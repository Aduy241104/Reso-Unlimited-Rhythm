import { jest } from "@jest/globals";
import {
    createRandomBytesBuffer,
    createResponse,
    createSortedQuery,
    createUser,
    loadAuthenticationController,
    loadAuthenticationService,
    loadAuthenticationValidation,
    mockAuthenticationService,
    mockBcrypt,
    mockCrypto,
    mockGenerateOtp,
    mockMailer,
    mockUserModel,
    mockVerificationTokenModel,
} from "./helpers/authenticationTestHarness.js";

const pendingUser = (overrides = {}) =>
    createUser({
        activeStatus: "inactive",
        emailVerified: false,
        authProvider: "local",
        ...overrides,
    });

const prepareNewRegistration = () => {
    const user = pendingUser();
    const verification = { _id: "507f1f77bcf86cd799439211" };
    mockUserModel.findOne.mockResolvedValue(null);
    mockUserModel.create.mockResolvedValue(user);
    mockBcrypt.hash.mockResolvedValue("temporary-password-hash");
    mockVerificationTokenModel.findOne.mockReturnValue(createSortedQuery(null));
    mockVerificationTokenModel.create.mockResolvedValue(verification);
    mockVerificationTokenModel.deleteMany.mockResolvedValue({ deletedCount: 0 });
    mockGenerateOtp.mockReturnValue("123456");
    mockCrypto.randomBytes
        .mockReturnValueOnce(createRandomBytesBuffer("temporary-password"))
        .mockReturnValueOnce(createRandomBytesBuffer("verification-token"));
    mockMailer.sendOtpEmail.mockResolvedValue(undefined);
    return { user, verification };
};

describe("UT-02 - register", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("accepts a valid registration OTP request", async () => {
        const { default: validation } = await loadAuthenticationValidation();
        const { error, value } = validation.requestRegistrationOtpSchema.validate({
            email: " member@example.com ",
        });

        expect(error).toBeUndefined();
        expect(value.email).toBe("member@example.com");
    });

    test("rejects an invalid registration email", async () => {
        const { default: validation } = await loadAuthenticationValidation();
        const { error } = validation.requestRegistrationOtpSchema.validate({
            email: "not-an-email",
        });

        expect(error).toBeDefined();
        expect(error.details[0].path).toEqual(["email"]);
    });

    test("creates a pending user and sends the first OTP", async () => {
        const { user, verification } = prepareNewRegistration();
        const service = await loadAuthenticationService();

        const result = await service.requestRegistrationOtp({
            email: " MEMBER@EXAMPLE.COM ",
        });

        expect(mockUserModel.create).toHaveBeenCalledWith({
            email: "member@example.com",
            password: "temporary-password-hash",
            activeStatus: "inactive",
            emailVerified: false,
        });
        expect(mockVerificationTokenModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: user._id,
                email: "member@example.com",
                otp: "123456",
                token: "verification-token",
                type: "verify_email",
                isUsed: false,
            })
        );
        expect(mockVerificationTokenModel.deleteMany).toHaveBeenCalledWith({
            email: "member@example.com",
            type: "verify_email",
            _id: { $ne: verification._id },
        });
        expect(mockMailer.sendOtpEmail).toHaveBeenCalledWith({
            to: "member@example.com",
            code: "123456",
            type: "register",
            ttlMinutes: expect.any(Number),
        });
        expect(result).toMatchObject({
            email: "member@example.com",
            expiresInMinutes: expect.any(Number),
            resendAfterSeconds: expect.any(Number),
        });
    });

    test("reuses an inactive unverified local account", async () => {
        const user = pendingUser();
        mockUserModel.findOne.mockResolvedValue(user);
        mockVerificationTokenModel.findOne.mockReturnValue(createSortedQuery(null));
        mockVerificationTokenModel.create.mockResolvedValue({ _id: "token-id" });
        mockVerificationTokenModel.deleteMany.mockResolvedValue({});
        mockGenerateOtp.mockReturnValue("123456");
        mockCrypto.randomBytes.mockReturnValue(
            createRandomBytesBuffer("verification-token")
        );
        mockMailer.sendOtpEmail.mockResolvedValue(undefined);
        const service = await loadAuthenticationService();

        await service.requestRegistrationOtp({ email: user.email });

        expect(mockUserModel.create).not.toHaveBeenCalled();
        expect(mockVerificationTokenModel.create).toHaveBeenCalledWith(
            expect.objectContaining({ userId: user._id })
        );
    });

    test("rejects registration when the email is already active", async () => {
        mockUserModel.findOne.mockResolvedValue(createUser());
        const service = await loadAuthenticationService();

        await expect(
            service.requestRegistrationOtp({ email: "member@example.com" })
        ).rejects.toMatchObject({ statusCode: 409, details: { field: "email" } });
        expect(mockVerificationTokenModel.findOne).not.toHaveBeenCalled();
    });

    test("rejects registration when the email belongs to a blocked account", async () => {
        mockUserModel.findOne.mockResolvedValue(
            createUser({ activeStatus: "blocked" })
        );
        const service = await loadAuthenticationService();

        await expect(
            service.requestRegistrationOtp({ email: "member@example.com" })
        ).rejects.toMatchObject({ statusCode: 409, message: "Email is already in use." });
    });

    test("enforces the OTP resend cooldown", async () => {
        const latest = {
            updatedAt: new Date(),
            createdAt: new Date(),
        };
        mockUserModel.findOne.mockResolvedValue(pendingUser());
        mockVerificationTokenModel.findOne.mockReturnValue(
            createSortedQuery(latest)
        );
        const service = await loadAuthenticationService();

        await expect(
            service.requestRegistrationOtp({ email: "member@example.com" })
        ).rejects.toMatchObject({ statusCode: 429 });
        expect(mockGenerateOtp).not.toHaveBeenCalled();
    });

    test("refreshes an old unused verification record", async () => {
        const latest = {
            _id: "old-token-id",
            createdAt: new Date(Date.now() - 120_000),
            isUsed: false,
            save: jest.fn().mockResolvedValue(true),
        };
        mockUserModel.findOne.mockResolvedValue(pendingUser());
        mockVerificationTokenModel.findOne.mockReturnValue(
            createSortedQuery(latest)
        );
        mockVerificationTokenModel.deleteMany.mockResolvedValue({});
        mockGenerateOtp.mockReturnValue("654321");
        mockCrypto.randomBytes.mockReturnValue(
            createRandomBytesBuffer("new-verification-token")
        );
        mockMailer.sendOtpEmail.mockResolvedValue(undefined);
        const service = await loadAuthenticationService();

        await service.requestRegistrationOtp({ email: "member@example.com" });

        expect(latest).toMatchObject({
            otp: "654321",
            token: "new-verification-token",
            isUsed: false,
        });
        expect(latest.save).toHaveBeenCalled();
        expect(mockVerificationTokenModel.create).not.toHaveBeenCalled();
    });

    test("uses createdAt for cooldown when updatedAt is absent", async () => {
        mockUserModel.findOne.mockResolvedValue(pendingUser());
        mockVerificationTokenModel.findOne.mockReturnValue(
            createSortedQuery({ createdAt: new Date(), save: jest.fn() })
        );
        const service = await loadAuthenticationService();

        await expect(
            service.requestRegistrationOtp({ email: "member@example.com" })
        ).rejects.toMatchObject({ statusCode: 429 });
    });

    test("propagates an error while creating the pending user", async () => {
        mockUserModel.findOne.mockResolvedValue(null);
        mockBcrypt.hash.mockResolvedValue("temporary-password-hash");
        mockCrypto.randomBytes.mockReturnValue(
            createRandomBytesBuffer("temporary-password")
        );
        mockUserModel.create.mockRejectedValue(new Error("database unavailable"));
        const service = await loadAuthenticationService();

        await expect(
            service.requestRegistrationOtp({ email: "member@example.com" })
        ).rejects.toThrow("database unavailable");
        expect(mockMailer.sendOtpEmail).not.toHaveBeenCalled();
    });

    test("propagates an error while creating the verification token", async () => {
        prepareNewRegistration();
        mockVerificationTokenModel.create.mockRejectedValue(
            new Error("verification write failed")
        );
        const service = await loadAuthenticationService();

        await expect(
            service.requestRegistrationOtp({ email: "member@example.com" })
        ).rejects.toThrow("verification write failed");
        expect(mockMailer.sendOtpEmail).not.toHaveBeenCalled();
    });

    test("returns an OTP response through the controller", async () => {
        const controller = await loadAuthenticationController();
        const req = { body: { email: "member@example.com" } };
        const res = createResponse();
        const next = jest.fn();
        mockAuthenticationService.requestRegistrationOtp.mockResolvedValue({
            email: "member@example.com",
            expiresInMinutes: 5,
            resendAfterSeconds: 60,
        });

        await controller.requestRegistrationOtp(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "OTP sent successfully",
            })
        );
        expect(next).not.toHaveBeenCalled();
    });

    test("forwards registration OTP errors from the controller", async () => {
        const controller = await loadAuthenticationController();
        const error = new Error("mail delivery failed");
        const req = { body: { email: "member@example.com" } };
        const res = createResponse();
        const next = jest.fn();
        mockAuthenticationService.requestRegistrationOtp.mockRejectedValue(error);

        await controller.requestRegistrationOtp(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.json).not.toHaveBeenCalled();
    });
});
