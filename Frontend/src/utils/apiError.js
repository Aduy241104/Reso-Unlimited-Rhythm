const getApiErrorPayload = (error) => error?.response?.data ?? null;

const API_ERROR_MESSAGE_TRANSLATIONS = {
  "email is already in use": "Email này đã được sử dụng.",
  "track already exists in playlist": "Bài hát đã có trong playlist.",
};

const translateApiErrorMessage = (message, fallbackMessage = "") => {
  if (typeof message !== "string" || !message.trim()) {
    return fallbackMessage;
  }

  const normalizedMessage = message.trim().toLowerCase().replace(/[.!]+$/, "");

  return API_ERROR_MESSAGE_TRANSLATIONS[normalizedMessage] || message.trim();
};

export const getApiErrorMessage = (
  error,
  fallbackMessage = "Something went wrong."
) => {
  const payload = getApiErrorPayload(error);

  return translateApiErrorMessage(
    payload?.message || error?.message,
    fallbackMessage
  );
};

export const getApiErrorDetailsText = (error) => {
  const payload = getApiErrorPayload(error) ?? error;
  const details = payload?.errors;

  if (Array.isArray(details) && details.length > 0) {
    return details
      .map((detail) =>
        translateApiErrorMessage(detail?.message, detail?.field)
      )
      .filter(Boolean)
      .join("\n");
  }

  if (details?.field && details?.message) {
    return translateApiErrorMessage(details.message);
  }

  return "";
};

export const getApiErrorFullMessage = (error, fallbackMessage = "Something went wrong.") => {
  const baseMessage = getApiErrorMessage(error, fallbackMessage);
  const detailsText = getApiErrorDetailsText(error);

  if (!detailsText || detailsText === baseMessage) {
    return baseMessage;
  }

  return `${baseMessage}\n${detailsText}`;
};

export const getResendAfterSecondsFromError = (error) => {
  const details = getApiErrorPayload(error)?.errors;
  const resendAfterSeconds = Number(details?.resendAfterSeconds);

  if (!Number.isFinite(resendAfterSeconds) || resendAfterSeconds <= 0) {
    return 0;
  }

  return resendAfterSeconds;
};

export const applyApiFieldErrors = ({
  error,
  setError,
  fieldMap = {},
  errorType = "server",
  strictFieldMap = false,
}) => {
  const details = getApiErrorPayload(error)?.errors;
  const normalizedErrors = Array.isArray(details)
    ? details
    : details?.field && details?.message
      ? [details]
      : [];

  let hasMappedError = false;

  normalizedErrors.forEach((detail) => {
    const fieldName = strictFieldMap
      ? fieldMap[detail.field]
      : fieldMap[detail.field] || detail.field;

    if (!fieldName) {
      return;
    }

    setError(fieldName, {
      type: errorType,
      message: translateApiErrorMessage(detail.message, "Giá trị không hợp lệ."),
    });
    hasMappedError = true;
  });

  return hasMappedError;
};
