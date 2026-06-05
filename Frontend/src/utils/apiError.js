const getApiErrorPayload = (error) => error?.response?.data ?? null;

export const getApiErrorMessage = (
  error,
  fallbackMessage = "Something went wrong."
) => {
  const payload = getApiErrorPayload(error);

  return payload?.message || error?.message || fallbackMessage;
};

export const getApiErrorDetailsText = (error) => {
  const payload = getApiErrorPayload(error) ?? error;
  const details = payload?.errors;

  if (Array.isArray(details) && details.length > 0) {
    return details
      .map((detail) => detail?.message || detail?.field)
      .filter(Boolean)
      .join("\n");
  }

  if (details?.field && details?.message) {
    return details.message;
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
      message: detail.message || "Invalid value.",
    });
    hasMappedError = true;
  });

  return hasMappedError;
};
