import { jest } from "@jest/globals";

process.env.JWT_SECRET = "test-secret";

const mockBcrypt = {
    compare: jest.fn(),
    hash: jest.fn(),
};

const mockJwt = {
    sign: jest.fn(),
};

const mockCrypto = {
    randomBytes: jest.fn(),
};

const mockGoogleAuthClient = {
    verifyIdToken: jest.fn(),
};

const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
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

const mockMailer = {
    sendOtpEmail: jest.fn(),
    sendResetPasswordLinkEmail: jest.fn(),
};

const mockBuildResetLink = jest.fn();
const mockGenerateOtp = jest.fn();

const mockAuthenticationService = {
    requestRegistrationOtp: jest.fn(),
    completeRegistration: jest.fn(),
    login: jest.fn(),
    googleLogin: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
};

const createUser = (overrides = {}) => ({
    _id: "user-123",
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

const createSavableUser = (overrides = {}) => ({
    ...createUser(overrides),
    save: jest.fn().mockResolvedValue(true),
});

const createVerificationTokenQuery = (token) => ({
    sort: jest.fn().mockResolvedValue(token),
});

const createResponse = () => {
    const response = {
        cookie: jest.fn(),
        clearCookie: jest.fn(),
        status: jest.fn(),
        json: jest.fn(),
    };

    response.status.mockReturnValue(response);
    response.json.mockReturnValue(response);

    return response;
};

const createRandomBytesBuffer = (token = "refresh-token") => ({
    toString: jest.fn().mockReturnValue(token),
});

const createGoogleTicket = (payload = {}) => ({
    getPayload: jest.fn().mockReturnValue(payload),
});

const loadValidationModule = async () => {
    jest.resetModules();

    return import("../../src/middlewares/Authentication/authentication.validation.js");
};

const loadAuthenticationService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("bcrypt", () => ({
        default: mockBcrypt,
    }));
    jest.unstable_mockModule("jsonwebtoken", () => ({
        default: mockJwt,
    }));
    jest.unstable_mockModule("crypto", () => ({
        default: mockCrypto,
    }));
    jest.unstable_mockModule("google-auth-library", () => ({
        OAuth2Client: jest.fn(() => mockGoogleAuthClient),
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
        generateOtp: mockGenerateOtp,
    }));

    const [{ default: authenticationService }, { AppError }] = await Promise.all([
        import("../../src/services/Authentication/authentication.service.js"),
        import("../../src/utils/AppError.js"),
    ]);

    return { authenticationService, AppError };
};

const loadAuthenticationController = async () => {
    jest.resetModules();

    jest.unstable_mockModule(
        "../../src/services/Authentication/authentication.service.js",
        () => ({
            default: mockAuthenticationService,
        })
    );

    const [{ default: authenticationController }, { REFRESH_TOKEN_COOKIE_MAX_AGE_MS }] =
        await Promise.all([
            import("../../src/controllers/authentication.controller.js"),
            import("../../src/utils/tokenUtils.js"),
        ]);

    return {
        authenticationController,
        REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
    };
};

describe("authentication login validation", () => {
    let authenticationValidation;

    beforeEach(async () => {
        ({ default: authenticationValidation } = await loadValidationModule());
    });

    test("rejects empty email and password", () => {
        const { error } = authenticationValidation.loginSchema.validate(
            { email: "", password: "" },
            { abortEarly: false }
        );

        expect(error).toBeDefined();
        expect(error.details.map((detail) => detail.path.join("."))).toEqual(
            expect.arrayContaining(["email", "password"])
        );
    });

    test("rejects an invalid email format", () => {
        const { error } = authenticationValidation.loginSchema.validate(
            { email: "not-an-email", password: "Secret123" },
            { abortEarly: false }
        );

        expect(error).toBeDefined();
        expect(error.details.map((detail) => detail.path.join("."))).toContain(
            "email"
        );
    });

    test("requires a Google ID token for Google login", () => {
        const { error } = authenticationValidation.googleLoginSchema.validate(
            {},
            { abortEarly: false }
        );

        expect(error).toBeDefined();
        expect(error.details.map((detail) => detail.path.join("."))).toContain(
            "token"
        );
    });

    test("defaults clientType to web during login validation", () => {
        const { error, value } = authenticationValidation.loginSchema.validate({
            email: "member@example.com",
            password: "Secret123",
        });

        expect(error).toBeUndefined();
        expect(value.clientType).toBe("web");
    });

    test("requires refresh token for mobile refresh requests", () => {
        const { error } = authenticationValidation.refreshTokenSchema.validate(
            { clientType: "mobile" },
            { abortEarly: false }
        );

        expect(error).toBeDefined();
        expect(error.details[0].message).toBe(
            "Refresh token is required for mobile client."
        );
    });
});

describe("authenticationService.login", () => {
    let authenticationService;
    let AppError;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockJwt.sign.mockReturnValue("access-token");
        mockCrypto.randomBytes.mockReturnValue(
            createRandomBytesBuffer("refresh-token")
        );

        ({ authenticationService, AppError } = await loadAuthenticationService());
    });

    test("returns tokens and sanitized user when login succeeds", async () => {
        const user = createUser();
        mockUserModel.findOne.mockResolvedValue(user);
        mockBcrypt.compare.mockResolvedValue(true);
        mockRefreshTokenModel.updateMany.mockResolvedValue({
            acknowledged: true,
            modifiedCount: 1,
        });
        mockRefreshTokenModel.create.mockResolvedValue({
            token: "refresh-token",
        });

        const result = await authenticationService.login({
            email: "  MEMBER@Example.com  ",
            password: "Secret123",
        });

        expect(mockUserModel.findOne).toHaveBeenCalledWith({
            email: "member@example.com",
        });
        expect(mockBcrypt.compare).toHaveBeenCalledWith(
            "Secret123",
            "hashed-password"
        );
        expect(mockJwt.sign).toHaveBeenCalledWith(
            {
                id: "user-123",
                email: "member@example.com",
                role: "listener",
            },
            "test-secret",
            { expiresIn: "1h" }
        );
        expect(mockRefreshTokenModel.updateMany).toHaveBeenCalledWith(
            {
                userId: "user-123",
                isRevoked: false,
                $or: [
                    { clientType: "web" },
                    { clientType: { $exists: false } },
                ],
            },
            { $set: { isRevoked: true } }
        );
        expect(mockRefreshTokenModel.create).toHaveBeenCalledWith({
            userId: "user-123",
            clientType: "web",
            token: "refresh-token",
            expiresAt: expect.any(Date),
            isRevoked: false,
        });
        expect(result).toEqual({
            accessToken: "access-token",
            refreshToken: "refresh-token",
            user: {
                id: "user-123",
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
            },
        });
    });

    test("throws 401 when the user cannot be found", async () => {
        mockUserModel.findOne.mockResolvedValue(null);

        await expect(
            authenticationService.login({
                email: "missing@example.com",
                password: "Secret123",
            })
        ).rejects.toBeInstanceOf(AppError);

        await expect(
            authenticationService.login({
                email: "missing@example.com",
                password: "Secret123",
            })
        ).rejects.toMatchObject({
            message: "Email or password is incorrect.",
            statusCode: 401,
        });

        expect(mockBcrypt.compare).not.toHaveBeenCalled();
        expect(mockRefreshTokenModel.updateMany).not.toHaveBeenCalled();
        expect(mockRefreshTokenModel.create).not.toHaveBeenCalled();
    });

    test("throws 401 when the password is wrong", async () => {
        const user = createUser();
        mockUserModel.findOne.mockResolvedValue(user);
        mockBcrypt.compare.mockResolvedValue(false);

        await expect(
            authenticationService.login({
                email: "member@example.com",
                password: "WrongPassword1",
            })
        ).rejects.toMatchObject({
            message: "Email or password is incorrect.",
            statusCode: 401,
        });

        expect(mockRefreshTokenModel.updateMany).not.toHaveBeenCalled();
        expect(mockRefreshTokenModel.create).not.toHaveBeenCalled();
    });

    test("throws 403 when the account is locked", async () => {
        const blockedUser = createUser({
            activeStatus: "blocked",
        });
        mockUserModel.findOne.mockResolvedValue(blockedUser);

        await expect(
            authenticationService.login({
                email: "member@example.com",
                password: "Secret123",
            })
        ).rejects.toMatchObject({
            message: "Your account has been blocked.",
            statusCode: 403,
        });

        expect(mockBcrypt.compare).not.toHaveBeenCalled();
        expect(mockRefreshTokenModel.updateMany).not.toHaveBeenCalled();
        expect(mockRefreshTokenModel.create).not.toHaveBeenCalled();
    });

    test("creates an isolated mobile session without affecting web session lookup", async () => {
        const user = createUser();
        mockUserModel.findOne.mockResolvedValue(user);
        mockBcrypt.compare.mockResolvedValue(true);
        mockRefreshTokenModel.updateMany.mockResolvedValue({
            acknowledged: true,
            modifiedCount: 1,
        });
        mockRefreshTokenModel.create.mockResolvedValue({
            token: "refresh-token",
        });

        await authenticationService.login({
            email: "member@example.com",
            password: "Secret123",
            clientType: "mobile",
        });

        expect(mockRefreshTokenModel.updateMany).toHaveBeenCalledWith(
            {
                userId: "user-123",
                isRevoked: false,
                clientType: "mobile",
            },
            { $set: { isRevoked: true } }
        );
        expect(mockRefreshTokenModel.create).toHaveBeenCalledWith({
            userId: "user-123",
            clientType: "mobile",
            token: "refresh-token",
            expiresAt: expect.any(Date),
            isRevoked: false,
        });
    });
});

describe("authenticationService.requestRegistrationOtp", () => {
    let authenticationService;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockGenerateOtp.mockReturnValue("123456");
        mockBcrypt.hash.mockResolvedValue("hashed-pending-password");
        mockCrypto.randomBytes
            .mockReturnValueOnce(createRandomBytesBuffer("pending-password-seed"))
            .mockReturnValueOnce(createRandomBytesBuffer("verify-email-token"));

        ({ authenticationService } = await loadAuthenticationService());
    });

    test("creates an inactive pending user before sending register OTP", async () => {
        mockUserModel.findOne.mockResolvedValue(null);
        mockUserModel.create.mockResolvedValue(
            createSavableUser({
                _id: "pending-user-1",
                email: "newmember@example.com",
                activeStatus: "inactive",
                emailVerified: false,
                authProvider: "local",
            })
        );
        mockVerificationTokenModel.findOne.mockReturnValue(
            createVerificationTokenQuery(null)
        );
        mockVerificationTokenModel.create.mockResolvedValue({
            _id: "verify-token-1",
        });

        const result = await authenticationService.requestRegistrationOtp({
            email: " NewMember@Example.com ",
        });

        expect(mockUserModel.findOne).toHaveBeenCalledWith({
            email: "newmember@example.com",
        });
        expect(mockUserModel.create).toHaveBeenCalledWith({
            email: "newmember@example.com",
            password: "hashed-pending-password",
            activeStatus: "inactive",
            emailVerified: false,
        });
        expect(mockVerificationTokenModel.create).toHaveBeenCalledWith({
            userId: "pending-user-1",
            email: "newmember@example.com",
            otp: "123456",
            token: "verify-email-token",
            type: "verify_email",
            expiresAt: expect.any(Date),
            isUsed: false,
        });
        expect(mockMailer.sendOtpEmail).toHaveBeenCalledWith({
            to: "newmember@example.com",
            code: "123456",
            type: "register",
            ttlMinutes: 5,
        });
        expect(result).toEqual({
            email: "newmember@example.com",
            expiresInMinutes: 5,
            resendAfterSeconds: 60,
        });
    });
});

describe("authenticationService.completeRegistration", () => {
    let authenticationService;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockBcrypt.hash.mockResolvedValue("hashed-user-password");

        ({ authenticationService } = await loadAuthenticationService());
    });

    test("activates the pending registration user after OTP verification", async () => {
        const pendingUser = createSavableUser({
            _id: "pending-user-1",
            email: "newmember@example.com",
            activeStatus: "inactive",
            emailVerified: false,
            authProvider: "local",
            blockReason: "old reason",
            profile: {
                fullName: "",
                gender: "prefer_not_to_say",
                country: "",
            },
        });
        const verificationToken = {
            _id: "verify-token-1",
            userId: "pending-user-1",
            email: "newmember@example.com",
            otp: "123456",
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            isUsed: false,
            save: jest.fn().mockResolvedValue(true),
        };

        mockVerificationTokenModel.findOne.mockReturnValue(
            createVerificationTokenQuery(verificationToken)
        );
        mockUserModel.findById.mockResolvedValue(pendingUser);

        const result = await authenticationService.completeRegistration({
            email: "newmember@example.com",
            otp: "123456",
            password: "Secret123",
            fullName: "New Member",
            gender: "female",
            country: "VN",
        });

        expect(mockUserModel.findById).toHaveBeenCalledWith("pending-user-1");
        expect(mockUserModel.create).not.toHaveBeenCalled();
        expect(pendingUser.password).toBe("hashed-user-password");
        expect(pendingUser.emailVerified).toBe(true);
        expect(pendingUser.activeStatus).toBe("active");
        expect(pendingUser.blockReason).toBe("");
        expect(pendingUser.profile).toEqual({
            fullName: "New Member",
            gender: "female",
            dateOfBirth: undefined,
            country: "VN",
        });
        expect(pendingUser.save).toHaveBeenCalled();
        expect(verificationToken.userId).toBe("pending-user-1");
        expect(verificationToken.isUsed).toBe(true);
        expect(verificationToken.save).toHaveBeenCalled();
        expect(mockVerificationTokenModel.deleteMany).toHaveBeenCalledWith({
            email: "newmember@example.com",
            type: "verify_email",
            _id: { $ne: "verify-token-1" },
        });
        expect(result).toEqual({
            user: expect.objectContaining({
                id: "pending-user-1",
                email: "newmember@example.com",
                activeStatus: "active",
                profile: {
                    fullName: "New Member",
                    gender: "female",
                    dateOfBirth: undefined,
                    country: "VN",
                },
            }),
        });
    });
});

describe("authenticationService.googleLogin", () => {
    let authenticationService;
    let AppError;

    beforeEach(async () => {
        jest.clearAllMocks();
        process.env.GOOGLE_CLIENT_ID = "google-client-id";
        mockJwt.sign.mockReturnValue("access-token");
        mockCrypto.randomBytes.mockReturnValue(
            createRandomBytesBuffer("refresh-token")
        );

        ({ authenticationService, AppError } = await loadAuthenticationService());
    });

    test("creates a new Google user and returns a session", async () => {
        mockGoogleAuthClient.verifyIdToken.mockResolvedValue(
            createGoogleTicket({
                sub: "google-user-1",
                email: "newuser@example.com",
                name: "New User",
                picture: "https://example.com/avatar.png",
                email_verified: true,
                iss: "https://accounts.google.com",
                exp: Math.floor(Date.now() / 1000) + 3600,
            })
        );
        mockUserModel.findOne.mockResolvedValue(null);
        mockUserModel.create.mockResolvedValue(
            createUser({
                _id: "google-user-db-id",
                email: "newuser@example.com",
                role: "user",
                avatar: "https://example.com/avatar.png",
                profile: {
                    fullName: "New User",
                },
                authProvider: "google",
                emailVerified: true,
            })
        );
        mockRefreshTokenModel.updateMany.mockResolvedValue({
            acknowledged: true,
            modifiedCount: 1,
        });

        const result = await authenticationService.googleLogin({
            token: "google-id-token",
        });

        expect(mockGoogleAuthClient.verifyIdToken).toHaveBeenCalledWith({
            idToken: "google-id-token",
            audience: ["google-client-id"],
        });
        expect(mockUserModel.findOne).toHaveBeenCalledWith({
            email: "newuser@example.com",
        });
        expect(mockUserModel.create).toHaveBeenCalledWith({
            email: "newuser@example.com",
            authProvider: "google",
            googleId: "google-user-1",
            avatar: "https://example.com/avatar.png",
            role: "user",
            emailVerified: true,
            activeStatus: "active",
            profile: {
                fullName: "New User",
            },
        });
        expect(mockRefreshTokenModel.create).toHaveBeenCalledWith({
            userId: "google-user-db-id",
            clientType: "web",
            token: "refresh-token",
            expiresAt: expect.any(Date),
            isRevoked: false,
        });
        expect(result).toEqual({
            accessToken: "access-token",
            refreshToken: "refresh-token",
            user: {
                id: "google-user-db-id",
                email: "newuser@example.com",
                username: "member",
                avatar: "https://example.com/avatar.png",
                role: "user",
                activeStatus: "active",
                profile: {
                    fullName: "New User",
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

    test("throws 403 when the Google email is not verified", async () => {
        mockGoogleAuthClient.verifyIdToken.mockResolvedValue(
            createGoogleTicket({
                sub: "google-user-1",
                email: "member@example.com",
                email_verified: false,
                iss: "https://accounts.google.com",
                exp: Math.floor(Date.now() / 1000) + 3600,
            })
        );

        await expect(
            authenticationService.googleLogin({
                token: "google-id-token",
            })
        ).rejects.toBeInstanceOf(AppError);

        await expect(
            authenticationService.googleLogin({
                token: "google-id-token",
            })
        ).rejects.toMatchObject({
            message: "Google account email is not verified.",
            statusCode: 403,
        });

        expect(mockUserModel.findOne).not.toHaveBeenCalled();
        expect(mockRefreshTokenModel.updateMany).not.toHaveBeenCalled();
    });

    test("throws 403 when the existing account is blocked", async () => {
        mockGoogleAuthClient.verifyIdToken.mockResolvedValue(
            createGoogleTicket({
                sub: "google-user-1",
                email: "member@example.com",
                email_verified: true,
                iss: "https://accounts.google.com",
                exp: Math.floor(Date.now() / 1000) + 3600,
            })
        );
        mockUserModel.findOne.mockResolvedValue(
            createUser({
                activeStatus: "blocked",
            })
        );

        await expect(
            authenticationService.googleLogin({
                token: "google-id-token",
            })
        ).rejects.toMatchObject({
            message: "Your account has been blocked.",
            statusCode: 403,
        });

        expect(mockRefreshTokenModel.updateMany).not.toHaveBeenCalled();
        expect(mockRefreshTokenModel.create).not.toHaveBeenCalled();
    });
});

describe("authenticationService.refreshToken", () => {
    let authenticationService;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockJwt.sign.mockReturnValue("new-access-token");
        mockCrypto.randomBytes.mockReturnValue(
            createRandomBytesBuffer("new-refresh-token")
        );

        ({ authenticationService } = await loadAuthenticationService());
    });

    test("rotates a legacy web refresh token and assigns web clientType", async () => {
        const user = createUser();
        const storedToken = {
            userId: user,
            token: "legacy-web-token",
            expiresAt: new Date(Date.now() + 60 * 1000),
            save: jest.fn().mockResolvedValue(true),
        };

        mockRefreshTokenModel.findOne.mockReturnValue({
            populate: jest.fn().mockResolvedValue(storedToken),
        });

        const result = await authenticationService.refreshToken({
            token: "legacy-web-token",
            clientType: "web",
        });

        expect(mockRefreshTokenModel.findOne).toHaveBeenCalledWith({
            token: "legacy-web-token",
            isRevoked: false,
            $or: [
                { clientType: "web" },
                { clientType: { $exists: false } },
            ],
        });
        expect(storedToken.clientType).toBe("web");
        expect(storedToken.token).toBe("new-refresh-token");
        expect(storedToken.save).toHaveBeenCalled();
        expect(result).toMatchObject({
            accessToken: "new-access-token",
            refreshToken: "new-refresh-token",
            user: {
                id: "user-123",
            },
        });
    });
});

describe("authenticationController.login", () => {
    let authenticationController;
    let REFRESH_TOKEN_COOKIE_MAX_AGE_MS;

    beforeEach(async () => {
        jest.clearAllMocks();
        ({
            authenticationController,
            REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
        } = await loadAuthenticationController());
    });

    test("sets the refresh token cookie and returns the login response", async () => {
        const user = createUser();
        const req = {
            body: {
                email: "member@example.com",
                password: "Secret123",
            },
        };
        const res = createResponse();
        const next = jest.fn();

        mockAuthenticationService.login.mockResolvedValue({
            user,
            accessToken: "access-token",
            refreshToken: "refresh-token",
        });

        await authenticationController.login(req, res, next);

        expect(mockAuthenticationService.login).toHaveBeenCalledWith(req.body);
        expect(res.cookie).toHaveBeenCalledWith("refreshToken", "refresh-token", {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/",
            maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Login successful",
                data: {
                    user,
                    accessToken: "access-token",
                },
                meta: null,
                errors: null,
                timestamp: expect.any(String),
            })
        );
        expect(next).not.toHaveBeenCalled();
    });

    test("returns refresh token in body for mobile login without setting cookie", async () => {
        const user = createUser();
        const req = {
            body: {
                email: "member@example.com",
                password: "Secret123",
                clientType: "mobile",
            },
        };
        const res = createResponse();
        const next = jest.fn();

        mockAuthenticationService.login.mockResolvedValue({
            user,
            accessToken: "access-token",
            refreshToken: "refresh-token",
        });

        await authenticationController.login(req, res, next);

        expect(res.cookie).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: {
                    user,
                    accessToken: "access-token",
                    refreshToken: "refresh-token",
                },
            })
        );
    });
});

describe("authenticationController.googleLogin", () => {
    let authenticationController;
    let REFRESH_TOKEN_COOKIE_MAX_AGE_MS;

    beforeEach(async () => {
        jest.clearAllMocks();
        ({
            authenticationController,
            REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
        } = await loadAuthenticationController());
    });

    test("sets the refresh token cookie and returns the Google login response", async () => {
        const user = createUser({
            email: "googleuser@example.com",
        });
        const req = {
            body: {
                token: "google-id-token",
            },
        };
        const res = createResponse();
        const next = jest.fn();

        mockAuthenticationService.googleLogin.mockResolvedValue({
            user,
            accessToken: "access-token",
            refreshToken: "refresh-token",
        });

        await authenticationController.googleLogin(req, res, next);

        expect(mockAuthenticationService.googleLogin).toHaveBeenCalledWith(req.body);
        expect(res.cookie).toHaveBeenCalledWith("refreshToken", "refresh-token", {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/",
            maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Login successful",
                data: {
                    user,
                    accessToken: "access-token",
                },
                meta: null,
                errors: null,
                timestamp: expect.any(String),
            })
        );
        expect(next).not.toHaveBeenCalled();
    });
});

describe("authenticationController.refreshToken", () => {
    let authenticationController;
    let REFRESH_TOKEN_COOKIE_MAX_AGE_MS;

    beforeEach(async () => {
        jest.clearAllMocks();
        ({
            authenticationController,
            REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
        } = await loadAuthenticationController());
    });

    test("uses cookie refresh token for web clients", async () => {
        const user = createUser();
        const req = {
            body: {
                clientType: "web",
            },
            cookies: {
                refreshToken: "cookie-refresh-token",
            },
        };
        const res = createResponse();
        const next = jest.fn();

        mockAuthenticationService.refreshToken.mockResolvedValue({
            user,
            accessToken: "new-access-token",
            refreshToken: "new-refresh-token",
        });

        await authenticationController.refreshToken(req, res, next);

        expect(mockAuthenticationService.refreshToken).toHaveBeenCalledWith({
            token: "cookie-refresh-token",
            clientType: "web",
        });
        expect(res.cookie).toHaveBeenCalledWith(
            "refreshToken",
            "new-refresh-token",
            {
                httpOnly: true,
                secure: false,
                sameSite: "lax",
                path: "/",
                maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
            }
        );
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: {
                    user,
                    accessToken: "new-access-token",
                },
            })
        );
    });

    test("uses body refresh token for mobile clients and returns rotated token", async () => {
        const user = createUser();
        const req = {
            body: {
                clientType: "mobile",
                refreshToken: "mobile-refresh-token",
            },
            cookies: {},
        };
        const res = createResponse();
        const next = jest.fn();

        mockAuthenticationService.refreshToken.mockResolvedValue({
            user,
            accessToken: "new-access-token",
            refreshToken: "rotated-mobile-refresh-token",
        });

        await authenticationController.refreshToken(req, res, next);

        expect(mockAuthenticationService.refreshToken).toHaveBeenCalledWith({
            token: "mobile-refresh-token",
            clientType: "mobile",
        });
        expect(res.cookie).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: {
                    user,
                    accessToken: "new-access-token",
                    refreshToken: "rotated-mobile-refresh-token",
                },
            })
        );
        expect(next).not.toHaveBeenCalled();
    });
});
