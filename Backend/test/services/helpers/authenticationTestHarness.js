import { jest } from "@jest/globals";

process.env.JWT_SECRET = "test-secret";

export const mockBcrypt = {
    compare: jest.fn(),
    hash: jest.fn(),
};

export const mockJwt = {
    sign: jest.fn(),
};

export const mockCrypto = {
    randomBytes: jest.fn(),
};

export const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
};

export const mockRefreshTokenModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
};

export const mockVerificationTokenModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
};

export const mockMailer = {
    sendOtpEmail: jest.fn(),
    sendResetPasswordLinkEmail: jest.fn(),
};

export const mockGenerateOtp = jest.fn();
export const mockBuildResetLink = jest.fn();

export const mockAuthenticationService = {
    requestRegistrationOtp: jest.fn(),
    completeRegistration: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
};

export const createUser = (overrides = {}) => ({
    _id: "507f1f77bcf86cd799439111",
    email: "member@example.com",
    username: "member",
    avatar: null,
    role: "listener",
    authProvider: "local",
    emailVerified: true,
    activeStatus: "active",
    profile: {
        fullName: "Test Member",
        gender: "female",
        dateOfBirth: new Date("2000-01-02T00:00:00.000Z"),
        country: "Vietnam",
    },
    subscription: null,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-10T00:00:00.000Z"),
    password: "hashed-password",
    ...overrides,
});

export const createResponse = () => {
    const response = {
        cookie: jest.fn(),
        status: jest.fn(),
        json: jest.fn(),
    };
    response.status.mockReturnValue(response);
    response.json.mockReturnValue(response);
    return response;
};

export const createSortedQuery = (result) => ({
    sort: jest.fn().mockResolvedValue(result),
});

export const createPopulatedQuery = (result) => ({
    populate: jest.fn().mockResolvedValue(result),
});

export const createRandomBytesBuffer = (value) => ({
    toString: jest.fn().mockReturnValue(value),
});

export const loadAuthenticationValidation = async () => {
    jest.resetModules();
    return import("../../../src/middlewares/Authentication/authentication.validation.js");
};

export const loadAuthenticationService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("bcrypt", () => ({ default: mockBcrypt }));
    jest.unstable_mockModule("jsonwebtoken", () => ({ default: mockJwt }));
    jest.unstable_mockModule("crypto", () => ({ default: mockCrypto }));
    jest.unstable_mockModule("google-auth-library", () => ({
        OAuth2Client: jest.fn(() => ({ verifyIdToken: jest.fn() })),
    }));
    jest.unstable_mockModule("../../../src/models/User.js", () => ({
        default: mockUserModel,
    }));
    jest.unstable_mockModule("../../../src/models/RefreshToken.js", () => ({
        default: mockRefreshTokenModel,
    }));
    jest.unstable_mockModule("../../../src/models/VerificationToken.js", () => ({
        default: mockVerificationTokenModel,
    }));
    jest.unstable_mockModule("../../../src/utils/mailer.js", () => ({
        sendOtpEmail: mockMailer.sendOtpEmail,
        sendResetPasswordLinkEmail: mockMailer.sendResetPasswordLinkEmail,
    }));
    jest.unstable_mockModule("../../../src/utils/buildForgotPasswordLink.js", () => ({
        buildResetLink: mockBuildResetLink,
    }));
    jest.unstable_mockModule("../../../src/utils/generateOtp.js", () => ({
        generateOtp: mockGenerateOtp,
    }));

    const { default: authenticationService } = await import(
        "../../../src/services/Authentication/authentication.service.js"
    );
    return authenticationService;
};

export const loadAuthenticationController = async () => {
    jest.resetModules();
    jest.unstable_mockModule(
        "../../../src/services/Authentication/authentication.service.js",
        () => ({ default: mockAuthenticationService })
    );
    const { default: authenticationController } = await import(
        "../../../src/controllers/authentication.controller.js"
    );
    return authenticationController;
};
