const PASSWORD_FIELD_MESSAGES = {
  currentPassword: {
    required: "Vui lòng nhập mật khẩu hiện tại.",
    invalid: "Mật khẩu hiện tại không hợp lệ.",
  },
  newPassword: {
    required: "Vui lòng nhập mật khẩu mới.",
    invalid: "Mật khẩu mới không hợp lệ.",
  },
  password: {
    required: "Vui lòng nhập mật khẩu mới.",
    invalid: "Mật khẩu mới không hợp lệ.",
  },
  confirmPassword: {
    required: "Vui lòng xác nhận mật khẩu.",
    invalid: "Mật khẩu xác nhận không hợp lệ.",
  },
};

export const PASSWORD_WHITESPACE_MESSAGES = {
  currentPassword: "Mật khẩu hiện tại không được chứa khoảng trắng.",
  newPassword: "Mật khẩu mới không được chứa khoảng trắng.",
  password: "Mật khẩu mới không được chứa khoảng trắng.",
  confirmPassword: "Mật khẩu xác nhận không được chứa khoảng trắng.",
};

export const hasPasswordWhitespace = (value) => /\s/.test(String(value || ""));

export const removePasswordWhitespace = (value) =>
  String(value || "").replace(/\s/g, "");

const isVietnameseMessage = (message) =>
  /[À-ỹ]/u.test(message) ||
  /\b(vui lòng|không|mật khẩu|liên kết|giá trị|thành công)\b/i.test(message);

export const getVietnamesePasswordMessage = (
  message,
  { fieldName = "", fallbackMessage = "Thông tin mật khẩu không hợp lệ." } = {}
) => {
  const sourceMessage = typeof message === "string" ? message.trim() : "";
  const fieldMessages = PASSWORD_FIELD_MESSAGES[fieldName];

  if (!sourceMessage) {
    return fallbackMessage || fieldMessages?.invalid || "Thông tin mật khẩu không hợp lệ.";
  }

  if (isVietnameseMessage(sourceMessage)) {
    return sourceMessage;
  }

  const normalizedMessage = sourceMessage
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[.!]+$/, "");

  if (
    normalizedMessage.includes("password") &&
    (normalizedMessage.includes("whitespace") ||
      normalizedMessage.includes("white space") ||
      normalizedMessage.includes("spaces"))
  ) {
    return (
      PASSWORD_WHITESPACE_MESSAGES[fieldName] ||
      "Mật khẩu không được chứa khoảng trắng."
    );
  }

  if (
    normalizedMessage.includes("required") ||
    normalizedMessage.includes("not allowed to be empty")
  ) {
    return fieldMessages?.required || "Vui lòng nhập đầy đủ thông tin mật khẩu.";
  }

  if (
    normalizedMessage.includes("current password") ||
    normalizedMessage.includes("currentpassword") ||
    normalizedMessage.includes("old password") ||
    normalizedMessage.includes("oldpassword")
  ) {
    if (
      normalizedMessage.includes("incorrect") ||
      normalizedMessage.includes("invalid") ||
      normalizedMessage.includes("wrong") ||
      normalizedMessage.includes("not match")
    ) {
      return "Mật khẩu hiện tại không chính xác.";
    }
  }

  if (
    normalizedMessage.includes("do not match") ||
    normalizedMessage.includes("does not match") ||
    normalizedMessage.includes("must match") ||
    normalizedMessage.includes("mismatch")
  ) {
    return "Mật khẩu xác nhận không khớp.";
  }

  if (
    normalizedMessage.includes("different") &&
    (normalizedMessage.includes("current") || normalizedMessage.includes("old"))
  ) {
    return "Mật khẩu mới phải khác mật khẩu hiện tại.";
  }

  if (
    normalizedMessage.includes("at least 8") ||
    normalizedMessage.includes("minimum of 8") ||
    normalizedMessage.includes("min 8")
  ) {
    return "Mật khẩu mới phải có ít nhất 8 ký tự.";
  }

  if (
    normalizedMessage.includes("at least 6") ||
    normalizedMessage.includes("minimum of 6") ||
    normalizedMessage.includes("min 6")
  ) {
    return "Mật khẩu phải có ít nhất 6 ký tự.";
  }

  if (
    normalizedMessage.includes("invalid") &&
    (normalizedMessage.includes("token") || normalizedMessage.includes("link"))
  ) {
    return "Liên kết đặt lại mật khẩu không hợp lệ.";
  }

  if (
    normalizedMessage.includes("expired") &&
    (normalizedMessage.includes("token") || normalizedMessage.includes("link"))
  ) {
    return "Liên kết đặt lại mật khẩu đã hết hạn.";
  }

  if (
    normalizedMessage.includes("password") &&
    normalizedMessage.includes("success")
  ) {
    return fieldName === "currentPassword"
      ? "Đổi mật khẩu thành công."
      : "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.";
  }

  return fieldMessages?.invalid || fallbackMessage || "Thông tin mật khẩu không hợp lệ.";
};
