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


export const sendResetPasswordLinkEmail = async ({ to, resetLink, otp, ttlMinutes }) => {
  const subject = "Đặt lại mật khẩu (Reset Password)";
  const from = `"${process.env.MAIL_FROM_NAME || "App"}" <${process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER}>`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6">
      <h3>Đặt lại mật khẩu</h3>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu. Nhấn vào link bên dưới để tạo mật khẩu mới:</p>
      <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
      ${otp ? `<p>Hoac nhap ma OTP nay trong ung dung:</p><div style="font-size: 28px; font-weight: 700; letter-spacing: 6px">${otp}</div>` : ""}
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

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatPaymentAmount = (value, currency = "VND") =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: String(currency || "VND").toUpperCase(),
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatPaymentDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa xác định";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.TZ || "Asia/Ho_Chi_Minh",
  }).format(date);
};

export const sendPremiumPaymentSuccessEmail = async ({
  to,
  fullName,
  planName,
  amount,
  tax,
  totalAmount,
  currency = "VND",
  invoiceNumber,
  paymentMethod,
  paidAt,
  startDate,
  endDate,
}) => {
  if (!to) {
    throw new Error("No recipient email provided for premium payment confirmation");
  }

  const mailer = createTransport();
  const appName = process.env.MAIL_FROM_NAME || "Reso";
  const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER;
  const safeName = escapeHtml(fullName || to);
  const safePlanName = escapeHtml(planName || "Premium");
  const safeInvoiceNumber = escapeHtml(invoiceNumber || "");
  const safePaymentMethod = escapeHtml(
    String(paymentMethod || "").toUpperCase() || "Không xác định"
  );
  const subjectPlanName = String(planName || "Premium")
    .replace(/[\r\n]+/g, " ")
    .trim();
  const subject = `Thanh toán gói ${subjectPlanName} thành công`;
  const html = `
    <div style="margin:0;background:#f5f5f5;padding:24px;font-family:Arial,sans-serif;color:#202124">
      <div style="max-width:620px;margin:0 auto;overflow:hidden;border-radius:16px;background:#ffffff;box-shadow:0 8px 30px rgba(0,0,0,.08)">
        <div style="background:linear-gradient(135deg,#ff8a3d,#ff4fd8,#7b61ff);padding:28px;color:#ffffff">
          <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">${escapeHtml(appName)} Premium</div>
          <h1 style="margin:10px 0 0;font-size:26px;line-height:1.3">Thanh toán thành công</h1>
        </div>
        <div style="padding:28px">
          <p style="margin:0 0 12px">Xin chào <strong>${safeName}</strong>,</p>
          <p style="margin:0 0 22px;line-height:1.6">Gói <strong>${safePlanName}</strong> đã được kích hoạt thành công. Bạn có thể sử dụng các quyền lợi Premium ngay bây giờ.</p>

          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
            <tbody>
              <tr><td style="padding:9px 0;color:#6b7280">Mã hóa đơn</td><td style="padding:9px 0;text-align:right;font-weight:600">${safeInvoiceNumber || "Chưa xác định"}</td></tr>
              <tr><td style="padding:9px 0;color:#6b7280">Gói đăng ký</td><td style="padding:9px 0;text-align:right;font-weight:600">${safePlanName}</td></tr>
              <tr><td style="padding:9px 0;color:#6b7280">Giá gói</td><td style="padding:9px 0;text-align:right">${formatPaymentAmount(amount, currency)}</td></tr>
              <tr><td style="padding:9px 0;color:#6b7280">Thuế</td><td style="padding:9px 0;text-align:right">${formatPaymentAmount(tax, currency)}</td></tr>
              <tr><td style="padding:12px 0;border-top:1px solid #e5e7eb;font-weight:700">Tổng thanh toán</td><td style="padding:12px 0;border-top:1px solid #e5e7eb;text-align:right;font-size:17px;font-weight:700">${formatPaymentAmount(totalAmount, currency)}</td></tr>
              <tr><td style="padding:9px 0;color:#6b7280">Phương thức</td><td style="padding:9px 0;text-align:right">${safePaymentMethod}</td></tr>
              <tr><td style="padding:9px 0;color:#6b7280">Thanh toán lúc</td><td style="padding:9px 0;text-align:right">${formatPaymentDate(paidAt)}</td></tr>
              <tr><td style="padding:9px 0;color:#6b7280">Hiệu lực từ</td><td style="padding:9px 0;text-align:right">${formatPaymentDate(startDate)}</td></tr>
              <tr><td style="padding:9px 0;color:#6b7280">Hết hạn lúc</td><td style="padding:9px 0;text-align:right">${formatPaymentDate(endDate)}</td></tr>
            </tbody>
          </table>

          <p style="margin:24px 0 0;line-height:1.6;color:#6b7280">Nếu bạn không thực hiện giao dịch này, vui lòng liên hệ đội ngũ hỗ trợ.</p>
        </div>
      </div>
    </div>
  `;
  const text = [
    `Xin chào ${fullName || to},`,
    `Gói ${planName || "Premium"} đã được kích hoạt thành công.`,
    `Mã hóa đơn: ${invoiceNumber || "Chưa xác định"}`,
    `Tổng thanh toán: ${formatPaymentAmount(totalAmount, currency)}`,
    `Hiệu lực: ${formatPaymentDate(startDate)} - ${formatPaymentDate(endDate)}`,
  ].join("\n");

  await mailer.sendMail({
    from: `"${appName}" <${fromEmail}>`,
    to,
    subject,
    html,
    text,
  });
};
