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
    login: jest.fn(),
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
        expect(mockRefreshTokenModel.create).toHaveBeenCalledWith({
            userId: "user-123",
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
        expect(mockRefreshTokenModel.create).not.toHaveBeenCalled();
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
});
