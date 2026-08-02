const getErrorMessages = (error) => {
  const payload = error?.response?.data ?? error;
  const details = payload?.errors;
  const detailMessages = Array.isArray(details)
    ? details.map((detail) =>
        typeof detail === "string" ? detail : detail?.message
      )
    : [typeof details === "string" ? details : details?.message];
  const payloadMessage =
    typeof payload === "string" ? payload : payload?.message;
  const errorMessage = typeof error === "string" ? error : error?.message;

  return [payloadMessage, payload?.error, errorMessage, ...detailMessages]
    .filter((message) => typeof message === "string" && message.trim())
    .map((message) => message.trim().toLowerCase());
};

export const isResourceNotFoundError = (error) => {
  const status = Number(
    error?.response?.status || error?.status || error?.statusCode
  );

  if (status === 404) {
    return true;
  }

  return getErrorMessages(error).some(
    (message) =>
      /\bid is invalid\b/.test(message) ||
      /\binvalid\s+[a-z\s-]*\bid\b/.test(message) ||
      /\bnot found\b/.test(message) ||
      /\bdoes not exist\b/.test(message) ||
      message.includes("không tìm thấy") ||
      message.includes("không tồn tại") ||
      /mã .+ không hợp lệ/.test(message)
  );
};
