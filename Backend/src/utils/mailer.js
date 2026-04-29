import nodemailer from "nodemailer";


const createTransport = () => {
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = process.env.SMTP_PORT;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;

  const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME;
  const MAIL_FROM_EMAIL = process.env.MAIL_FROM_EMAIL;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}


export const sendOtpEmail = async ({ to, code, type, ttlMinutes }) => {
 
  const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME;
  const MAIL_FROM_EMAIL = process.env.MAIL_FROM_EMAIL;

  if (!to) {
    throw new Error("No recipient email (to) provided");
  }

  //tạo transporter TẠI ĐÂY
  const mailer = createTransport();

  const subjectMap = {
    register: "OTP đăng ký tài khoản",
    login: "OTP đăng nhập",
    reset_password: "OTP đặt lại mật khẩu",
  };

  const subject = subjectMap[type] || "Mã OTP";
  const from = `"${MAIL_FROM_NAME}" <${MAIL_FROM_EMAIL}>`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6">
      <h3>${subject}</h3>
      <p>Mã OTP của bạn là:</p>
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px">${code}</div>
      <p>Mã có hiệu lực trong <b>${ttlMinutes}</b> phút.</p>
      <p>Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>
    </div>
  `;

  await mailer.sendMail({
    from,
    to,
    subject,
    html,
  });
};


export const sendResetPasswordLinkEmail = async ({ to, resetLink, ttlMinutes }) => {
  const subject = "Đặt lại mật khẩu (Reset Password)";
  const from = `"${process.env.MAIL_FROM_NAME || "App"}" <${process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER}>`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6">
      <h3>Đặt lại mật khẩu</h3>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu. Nhấn vào link bên dưới để tạo mật khẩu mới:</p>
      <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
      <p>Link có hiệu lực trong <b>${ttlMinutes}</b> phút.</p>
      <p>Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>
    </div>
  `;

  const mailer = createTransport();

  await mailer.sendMail({ from, to, subject, html });
};

export const sendSellerRequestStatusEmail = async ({
  to,
  fullName,
  status,
  rejectReason,
  shopName,
}) => {
  if (!to) {
    throw new Error("No recipient email (to) provided for seller request status email");
  }

  const mailer = createTransport();

  const from = `"${process.env.MAIL_FROM_NAME || "App"}" <${
    process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER
  }>`;

  const safeName = fullName || to;
  const isApproved = status === "approved";

  const subject = isApproved
    ? "Yêu cầu đăng ký Seller đã được duyệt"
    : "Yêu cầu đăng ký Seller không được chấp nhận";

  const reasonBlock =
    !isApproved && rejectReason
      ? `<p><b>Lý do từ chối:</b> ${rejectReason}</p>`
      : "";

  const shopBlock = shopName
    ? `<p><b>Tên shop đăng ký:</b> ${shopName}</p>`
    : "";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6">
      <h3>${subject}</h3>
      <p>Xin chào <b>${safeName}</b>,</p>
      ${shopBlock}
      ${
        isApproved
          ? `<p>Yêu cầu trở thành người bán (Seller) của bạn đã được <b>chấp nhận</b>. Bạn có thể đăng nhập và bắt đầu quản lý shop của mình trên hệ thống.</p>`
          : `<p>Rất tiếc, yêu cầu trở thành người bán (Seller) của bạn hiện chưa được chấp nhận.</p>${reasonBlock}`
      }
      <p>Nếu có thắc mắc, vui lòng liên hệ đội ngũ hỗ trợ của chúng tôi.</p>
      <p>Trân trọng,<br/>${process.env.MAIL_FROM_NAME || "Đội ngũ hỗ trợ"}</p>
    </div>
  `;

  await mailer.sendMail({
    from,
    to,
    subject,
    html,
  });
};

// ============================================
// GENERIC EMAIL (ADMIN -> SELLER)
// ============================================
export const sendCustomEmail = async ({ to, subject, html, text }) => {
  if (!to) {
    throw new Error("No recipient email (to) provided for custom email");
  }

  const mailer = createTransport();

  const from = `"${process.env.MAIL_FROM_NAME || "App"}" <${
    process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER
  }>`;

  const mailOptions = {
    from,
    to,
    subject: subject || "",
  };

  if (html) {
    mailOptions.html = html;
  } else if (text) {
    mailOptions.text = text;
  } else {
    mailOptions.text = "";
  }

  await mailer.sendMail(mailOptions);
};
