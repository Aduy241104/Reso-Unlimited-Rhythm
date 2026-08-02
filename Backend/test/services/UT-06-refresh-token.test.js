import { jest } from "@jest/globals";
import {
    createPopulatedQuery,
    createRandomBytesBuffer,
    createResponse,
    createUser,
    loadAuthenticationController,
    loadAuthenticationService,
    loadAuthenticationValidation,
    mockAuthenticationService,
    mockCrypto,
    mockJwt,
    mockRefreshTokenModel,
} from "./helpers/authenticationTestHarness.js";

describe("UT-06 - refresh token", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("requires a refresh token for mobile validation", async () => {
        const { default: validation } = await loadAuthenticationValidation();
        const { error } = validation.refreshTokenSchema.validate({
            clientType: "mobile",
        });

        expect(error).toBeDefined();
        expect(error.message).toContain("Refresh token is required");
    });

    test("throws 401 when no refresh token is supplied", async () => {
        const service = await loadAuthenticationService();

        await expect(
            service.refreshToken({ token: null, clientType: "web" })
        ).rejects.toMatchObject({ statusCode: 401, message: "Refresh token is required." });
        expect(mockRefreshTokenModel.findOne).not.toHaveBeenCalled();
    });

    test("throws 401 when the refresh token is invalid", async () => {
        mockRefreshTokenModel.findOne.mockReturnValue(createPopulatedQuery(null));
        const service = await loadAuthenticationService();

        await expect(
            service.refreshToken({ token: "invalid-token", clientType: "mobile" })
        ).rejects.toMatchObject({ statusCode: 401, message: "Refresh token is invalid." });
    });

    test("revokes an expired refresh token and throws 401", async () => {
        const storedToken = {
            userId: createUser(),
            expiresAt: new Date(Date.now() - 1_000),
            isRevoked: false,
            save: jest.fn().mockResolvedValue(true),
        };
        mockRefreshTokenModel.findOne.mockReturnValue(
            createPopulatedQuery(storedToken)
        );
        const service = await loadAuthenticationService();

        await expect(
            service.refreshToken({ token: "expired-token", clientType: "web" })
        ).rejects.toMatchObject({ statusCode: 401, message: "Refresh token has expired." });
        expect(storedToken.isRevoked).toBe(true);
        expect(storedToken.save).toHaveBeenCalled();
    });

    test("throws 403 when the token owner is blocked", async () => {
        const storedToken = {
            userId: createUser({ activeStatus: "blocked" }),
            expiresAt: new Date(Date.now() + 60_000),
            save: jest.fn(),
        };
        mockRefreshTokenModel.findOne.mockReturnValue(
            createPopulatedQuery(storedToken)
        );
        const service = await loadAuthenticationService();

        await expect(
            service.refreshToken({ token: "blocked-token", clientType: "web" })
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(storedToken.save).not.toHaveBeenCalled();
    });

    test("throws 403 when the token owner is inactive", async () => {
        const storedToken = {
            userId: createUser({ activeStatus: "inactive" }),
            expiresAt: new Date(Date.now() + 60_000),
            save: jest.fn(),
        };
        mockRefreshTokenModel.findOne.mockReturnValue(
            createPopulatedQuery(storedToken)
        );
        const service = await loadAuthenticationService();

        await expect(
            service.refreshToken({ token: "inactive-token", clientType: "mobile" })
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(storedToken.save).not.toHaveBeenCalled();
    });

    test("rotates a valid legacy web refresh token", async () => {
        const user = createUser();
        const storedToken = {
            userId: user,
            token: "legacy-token",
            expiresAt: new Date(Date.now() + 60_000),
            save: jest.fn().mockResolvedValue(true),
        };
        mockRefreshTokenModel.findOne.mockReturnValue(
            createPopulatedQuery(storedToken)
        );
        mockJwt.sign.mockReturnValue("new-access-token");
        mockCrypto.randomBytes.mockReturnValue(
            createRandomBytesBuffer("new-refresh-token")
        );
        const service = await loadAuthenticationService();

        const result = await service.refreshToken({
            token: "legacy-token",
            clientType: "web",
        });

        expect(mockRefreshTokenModel.findOne).toHaveBeenCalledWith({
            token: "legacy-token",
            isRevoked: false,
            $or: [{ clientType: "web" }, { clientType: { $exists: false } }],
        });
        expect(storedToken).toMatchObject({
            clientType: "web",
            token: "new-refresh-token",
        });
        expect(result).toMatchObject({
            accessToken: "new-access-token",
            refreshToken: "new-refresh-token",
            user: { id: user._id },
        });
    });

    test("uses the cookie token and sets a rotated cookie for web", async () => {
        const controller = await loadAuthenticationController();
        const user = createUser();
        const req = {
            body: { clientType: "web" },
            cookies: { refreshToken: "cookie-token" },
        };
        const res = createResponse();
        const next = jest.fn();
        mockAuthenticationService.refreshToken.mockResolvedValue({
            user,
            accessToken: "new-access-token",
            refreshToken: "new-refresh-token",
        });

        await controller.refreshToken(req, res, next);

        expect(mockAuthenticationService.refreshToken).toHaveBeenCalledWith({
            token: "cookie-token",
            clientType: "web",
        });
        expect(res.cookie).toHaveBeenCalledWith(
            "refreshToken",
            "new-refresh-token",
            expect.objectContaining({ httpOnly: true, path: "/" })
        );
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: { user, accessToken: "new-access-token" },
            })
        );
    });

    test("uses the body token and returns the rotated token for mobile", async () => {
        const controller = await loadAuthenticationController();
        const user = createUser();
        const req = {
            body: { clientType: "mobile", refreshToken: "mobile-token" },
            cookies: { refreshToken: "ignored-cookie-token" },
        };
        const res = createResponse();
        const next = jest.fn();
        mockAuthenticationService.refreshToken.mockResolvedValue({
            user,
            accessToken: "new-access-token",
            refreshToken: "rotated-mobile-token",
        });

        await controller.refreshToken(req, res, next);

        expect(mockAuthenticationService.refreshToken).toHaveBeenCalledWith({
            token: "mobile-token",
            clientType: "mobile",
        });
        expect(res.cookie).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: {
                    user,
                    accessToken: "new-access-token",
                    refreshToken: "rotated-mobile-token",
                },
            })
        );
        expect(next).not.toHaveBeenCalled();
    });
});
