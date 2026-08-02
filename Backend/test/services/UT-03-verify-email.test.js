import { jest } from "@jest/globals";
import {
    createSortedQuery,
    createUser,
    loadAuthenticationService,
    mockBcrypt,
    mockUserModel,
    mockVerificationTokenModel,
} from "./helpers/authenticationTestHarness.js";

describe("UT-03 - verify email", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("activates the pending account when the OTP is valid", async () => {
        const pendingUser = createUser({
            activeStatus: "inactive",
            emailVerified: false,
            password: "temporary-password",
            save: jest.fn().mockResolvedValue(true),
        });
        const verification = {
            _id: "507f1f77bcf86cd799439211",
            userId: pendingUser._id,
            expiresAt: new Date(Date.now() + 60_000),
            isUsed: false,
            save: jest.fn().mockResolvedValue(true),
        };
        mockVerificationTokenModel.findOne.mockReturnValue(
            createSortedQuery(verification)
        );
        mockUserModel.findById.mockResolvedValue(pendingUser);
        mockBcrypt.hash.mockResolvedValue("new-password-hash");
        mockVerificationTokenModel.deleteMany.mockResolvedValue({ deletedCount: 0 });
        const service = await loadAuthenticationService();

        const result = await service.completeRegistration({
            email: " MEMBER@example.com ",
            otp: "123456",
            password: "Secret123",
            fullName: " Test Member ",
            gender: "female",
            country: " Vietnam ",
        });

        expect(pendingUser).toMatchObject({
            password: "new-password-hash",
            emailVerified: true,
            activeStatus: "active",
            profile: expect.objectContaining({
                fullName: "Test Member",
                country: "Vietnam",
            }),
        });
        expect(pendingUser.save).toHaveBeenCalled();
        expect(verification.isUsed).toBe(true);
        expect(result.user).toMatchObject({ id: pendingUser._id });
    });

    test("throws 400 when the OTP is invalid", async () => {
        mockVerificationTokenModel.findOne.mockReturnValue(createSortedQuery(null));
        const service = await loadAuthenticationService();

        await expect(
            service.completeRegistration({
                email: "member@example.com",
                otp: "654321",
                password: "Secret123",
            })
        ).rejects.toMatchObject({
            statusCode: 400,
            message: "OTP is invalid.",
            details: { field: "otp" },
        });
    });

    test("marks an expired OTP as used and throws 400", async () => {
        const verification = {
            expiresAt: new Date(Date.now() - 1_000),
            isUsed: false,
            save: jest.fn().mockResolvedValue(true),
        };
        mockVerificationTokenModel.findOne.mockReturnValue(
            createSortedQuery(verification)
        );
        const service = await loadAuthenticationService();

        await expect(
            service.completeRegistration({
                email: "member@example.com",
                otp: "123456",
                password: "Secret123",
            })
        ).rejects.toMatchObject({ statusCode: 400, message: "OTP has expired." });
        expect(verification.isUsed).toBe(true);
        expect(verification.save).toHaveBeenCalled();
    });

    test("throws 409 when the verified email already belongs to an active user", async () => {
        const verification = {
            expiresAt: new Date(Date.now() + 60_000),
            isUsed: false,
            save: jest.fn(),
        };
        mockVerificationTokenModel.findOne.mockReturnValue(
            createSortedQuery(verification)
        );
        mockUserModel.findOne.mockResolvedValue(createUser());
        mockBcrypt.hash.mockResolvedValue("new-password-hash");
        const service = await loadAuthenticationService();

        await expect(
            service.completeRegistration({
                email: "member@example.com",
                otp: "123456",
                password: "Secret123",
            })
        ).rejects.toMatchObject({ statusCode: 409, message: "Email is already in use." });
        expect(verification.save).not.toHaveBeenCalled();
    });
});
