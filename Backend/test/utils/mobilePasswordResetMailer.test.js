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

    return import("../../src/utils/mobilePasswordResetMailer.js");
};

describe("mobilePasswordResetMailer", () => {
    beforeEach(() => {
        mockSendMail.mockReset();
        mockCreateTransport.mockClear();
        mockSendMail.mockResolvedValue();
        process.env.MAIL_FROM_NAME = "Reso";
        process.env.MAIL_FROM_EMAIL = "noreply@example.com";
    });

    test("renders an OTP-only email without a web reset link", async () => {
        const { sendMobilePasswordResetOtpEmail } = await loadMailer();

        await sendMobilePasswordResetOtpEmail({
            to: "user@example.com",
            otp: "063323",
            ttlMinutes: 15,
        });

        expect(mockSendMail).toHaveBeenCalledTimes(1);
        const message = mockSendMail.mock.calls[0][0];

        expect(message.to).toBe("user@example.com");
        expect(message.text).toContain("063323");
        expect(message.html).toContain("063323");
        expect(message.text).not.toMatch(/https?:\/\//i);
        expect(message.html).not.toMatch(/href=|https?:\/\/|reset-password/i);
    });
});
