const getApiErrorPayload = (error) => error?.response?.data ?? null;

export const getApiErrorMessage = (
  error,
  fallbackMessage = "Something went wrong."
) => {
  const payload = getApiErrorPayload(error);

  return payload?.message || error?.message || fallbackMessage;
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
}) => {
  const details = getApiErrorPayload(error)?.errors;
  const normalizedErrors = Array.isArray(details)
    ? details
    : details?.field && details?.message
      ? [details]
      : [];

  let hasMappedError = false;

  normalizedErrors.forEach((detail) => {
    const fieldName = fieldMap[detail.field] || detail.field;

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
