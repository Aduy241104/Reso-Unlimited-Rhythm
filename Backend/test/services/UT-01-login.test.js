import { jest } from "@jest/globals";
import {
    createRandomBytesBuffer,
    createUser,
    loadAuthenticationService,
    loadAuthenticationValidation,
    mockBcrypt,
    mockCrypto,
    mockJwt,
    mockRefreshTokenModel,
    mockUserModel,
} from "./helpers/authenticationTestHarness.js";

describe("UT-01 - login", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("rejects missing email and password", async () => {
        const { default: validation } = await loadAuthenticationValidation();
        const { error } = validation.loginSchema.validate(
            { email: "", password: "" },
            { abortEarly: false }
        );

        expect(error.details.map(({ path }) => path[0])).toEqual(
            expect.arrayContaining(["email", "password"])
        );
    });

    test("defaults the validated client type to web", async () => {
        const { default: validation } = await loadAuthenticationValidation();
        const { error, value } = validation.loginSchema.validate({
            email: "member@example.com",
            password: "Secret123",
        });

        expect(error).toBeUndefined();
        expect(value.clientType).toBe("web");
    });

    test("returns a new session for valid credentials", async () => {
        const user = createUser();
        mockUserModel.findOne.mockResolvedValue(user);
        mockBcrypt.compare.mockResolvedValue(true);
        mockJwt.sign.mockReturnValue("access-token");
        mockCrypto.randomBytes.mockReturnValue(
            createRandomBytesBuffer("refresh-token")
        );
        mockRefreshTokenModel.updateMany.mockResolvedValue({ modifiedCount: 1 });
        mockRefreshTokenModel.create.mockResolvedValue({});
        const service = await loadAuthenticationService();

        const result = await service.login({
            email: "  MEMBER@EXAMPLE.COM ",
            password: "Secret123",
            clientType: "mobile",
        });

        expect(mockUserModel.findOne).toHaveBeenCalledWith({
            email: "member@example.com",
        });
        expect(mockBcrypt.compare).toHaveBeenCalledWith(
            "Secret123",
            "hashed-password"
        );
        expect(mockRefreshTokenModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: user._id,
                clientType: "mobile",
                token: "refresh-token",
                isRevoked: false,
            })
        );
        expect(result).toMatchObject({
            accessToken: "access-token",
            refreshToken: "refresh-token",
            user: { id: user._id, email: user.email },
        });
    });

    test("throws 401 when the email does not exist", async () => {
        mockUserModel.findOne.mockResolvedValue(null);
        const service = await loadAuthenticationService();

        await expect(
            service.login({ email: "missing@example.com", password: "Secret123" })
        ).rejects.toMatchObject({ statusCode: 401 });
        expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    test("throws 401 when the password is incorrect", async () => {
        mockUserModel.findOne.mockResolvedValue(createUser());
        mockBcrypt.compare.mockResolvedValue(false);
        const service = await loadAuthenticationService();

        await expect(
            service.login({ email: "member@example.com", password: "Wrong123" })
        ).rejects.toMatchObject({ statusCode: 401 });
        expect(mockRefreshTokenModel.create).not.toHaveBeenCalled();
    });

    test("throws 403 when the account is blocked", async () => {
        mockUserModel.findOne.mockResolvedValue(
            createUser({ activeStatus: "blocked" })
        );
        const service = await loadAuthenticationService();

        await expect(
            service.login({ email: "member@example.com", password: "Secret123" })
        ).rejects.toMatchObject({ statusCode: 403, message: "Your account has been blocked." });
        expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    test("throws 403 when the account is inactive", async () => {
        mockUserModel.findOne.mockResolvedValue(
            createUser({ activeStatus: "inactive" })
        );
        const service = await loadAuthenticationService();

        await expect(
            service.login({ email: "member@example.com", password: "Secret123" })
        ).rejects.toMatchObject({ statusCode: 403, message: "Your account is inactive." });
        expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });
});
