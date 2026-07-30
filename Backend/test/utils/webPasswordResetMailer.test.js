import { jest } from "@jest/globals";

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({
    sendMail: mockSendMail,
}));

const loadMailer = async () => {
    jest.resetModules();
    jest.unstable_mockModule("nodemailer", () => ({
        default: {
            createTransport: mockCreateTransport,
        },
    }));

    return import("../../src/utils/mailer.js");
};

describe("web password reset mail", () => {
    beforeEach(() => {
        mockSendMail.mockReset();
        mockCreateTransport.mockClear();
        mockSendMail.mockResolvedValue();
        process.env.MAIL_FROM_NAME = "Reso";
        process.env.MAIL_FROM_EMAIL = "noreply@example.com";
    });

    test("contains the reset link and does not render a mobile OTP", async () => {
        const { sendResetPasswordLinkEmail } = await loadMailer();
        const resetLink =
            "https://web.example/reset-password?token=web-reset-token";

        await sendResetPasswordLinkEmail({
            to: "user@example.com",
            resetLink,
            ttlMinutes: 15,
        });

        expect(mockSendMail).toHaveBeenCalledTimes(1);
        const message = mockSendMail.mock.calls[0][0];

        expect(message.html).toContain(resetLink);
        expect(message.html).not.toMatch(/nhap ma OTP|letter-spacing: 6px/i);
    });
});
