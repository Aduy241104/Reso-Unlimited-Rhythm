import nodemailer from "nodemailer";

const createMobilePasswordResetTransport = () =>
    nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

export const sendMobilePasswordResetOtpEmail = async ({
    to,
    otp,
    ttlMinutes,
}) => {
    if (!to) {
        throw new Error("No recipient email provided for mobile password reset.");
    }

    const appName = process.env.MAIL_FROM_NAME || "Reso";
    const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER;
    const subject = `Mã OTP đặt lại mật khẩu ${appName}`;
    const text = [
        "Bạn vừa yêu cầu đặt lại mật khẩu trên ứng dụng.",
        `Mã OTP của bạn là: ${otp}`,
        `Mã có hiệu lực trong ${ttlMinutes} phút.`,
        "Nếu không phải bạn yêu cầu, hãy bỏ qua email này.",
    ].join("\n");
    const html = `
        <div style="margin:0;background:#f4f7fb;padding:24px;font-family:Arial,sans-serif;color:#172033">
            <div style="max-width:560px;margin:0 auto;overflow:hidden;border-radius:18px;background:#ffffff;box-shadow:0 10px 30px rgba(15,23,42,.08)">
                <div style="background:#111827;padding:24px 28px;color:#ffffff">
                    <div style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">${appName}</div>
                    <h1 style="margin:10px 0 0;font-size:24px;line-height:1.35">Đặt lại mật khẩu trên ứng dụng</h1>
                </div>
                <div style="padding:28px">
                    <p style="margin:0 0 12px;line-height:1.6">Bạn vừa yêu cầu đặt lại mật khẩu trên ứng dụng.</p>
                    <p style="margin:0 0 18px;line-height:1.6">Nhập mã OTP dưới đây vào màn hình đặt lại mật khẩu:</p>
                    <div style="margin:0 0 20px;border-radius:14px;background:#eef6ff;padding:18px;text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:#0757b8">${otp}</div>
                    <p style="margin:0;color:#64748b;line-height:1.6">Mã có hiệu lực trong <strong>${ttlMinutes} phút</strong>. Không chia sẻ mã này với bất kỳ ai.</p>
                    <p style="margin:16px 0 0;color:#64748b;line-height:1.6">Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>
                </div>
            </div>
        </div>
    `;

    const mailer = createMobilePasswordResetTransport();

    await mailer.sendMail({
        from: `"${appName}" <${fromEmail}>`,
        to,
        subject,
        text,
        html,
    });
};
