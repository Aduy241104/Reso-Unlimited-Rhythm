import { useState } from "react";
import { KeyRound, Loader2, LockKeyhole, Save, ShieldAlert, X } from "lucide-react";
import { changeCurrentUserPassword } from "../../services/userProfileService";
import { getApiErrorMessage } from "../../utils/apiError";

const inputClassName =
  "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-gray-500 focus:border-[#ff9f43]/60 focus:bg-black/45 focus:shadow-[0_0_0_4px_rgba(255,159,67,0.08)]";

const secondaryButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-gray-200 transition-all duration-300 hover:scale-[1.01] hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60";

const primaryButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#ffb15c_0%,#ff8a2a_45%,#a64a00_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,138,42,0.25)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_24px_55px_rgba(255,138,42,0.34)] disabled:cursor-not-allowed disabled:opacity-60";

const PASSWORD_SPECIAL_CHARACTER_PATTERN = /[!@#$%^&*(),.?":{}|<>]/;
const PASSWORD_NUMBER_PATTERN = /\d/;
const PASSWORD_UPPERCASE_PATTERN = /[A-Z]/;

const createFormState = () => ({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

const getFieldErrorsFromApi = (error) => {
  const responseData = error?.response?.data;
  const details = responseData?.errors;

  const normalizedErrors = Array.isArray(details)
    ? details
    : details?.field
      ? [
          {
            field: details.field,
            message:
              responseData?.message || "Invalid value.",
          },
        ]
      : [];

  const fieldMap = {
    currentPassword: "currentPassword",
    oldPassword: "currentPassword",
    password: "newPassword",
    newPassword: "newPassword",
    confirmPassword: "confirmPassword",
  };

  return normalizedErrors.reduce((nextErrors, detail) => {
    const fieldName = fieldMap[detail?.field];

    if (!fieldName || nextErrors[fieldName]) {
      return nextErrors;
    }

    return {
      ...nextErrors,
      [fieldName]: detail?.message || "Invalid value.",
    };
  }, {});
};

const FormField = ({ children, errorMessage, icon, label }) => {
  const IconComponent = icon;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
        <IconComponent className="h-4 w-4 text-[#ff9f43]" aria-hidden />
        <span>{label}</span>
      </div>
      {children}
      {errorMessage ? (
        <p className="mt-2 text-sm text-red-200/90">{errorMessage}</p>
      ) : null}
    </div>
  );
};

const ChangePasswordForm = ({ onCancel, onSaved }) => {
  const [formValues, setFormValues] = useState(createFormState);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const updateField = (fieldName, value) => {
    setFormValues((current) => ({
      ...current,
      [fieldName]: value,
    }));
    setFieldErrors((current) => {
      if (!current[fieldName]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[fieldName];
      return nextErrors;
    });
    setApiError("");
  };

  const validateForm = () => {
    const nextErrors = {};
    const { confirmPassword, currentPassword, newPassword } = formValues;

    if (!currentPassword) {
      nextErrors.currentPassword = "Current password is required.";
    }

    if (!newPassword) {
      nextErrors.newPassword = "New password is required.";
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = "New password must be at least 8 characters.";
    } else if (!PASSWORD_UPPERCASE_PATTERN.test(newPassword)) {
      nextErrors.newPassword = "New password must include at least 1 uppercase letter.";
    } else if (!PASSWORD_NUMBER_PATTERN.test(newPassword)) {
      nextErrors.newPassword = "New password must include at least 1 number.";
    } else if (!PASSWORD_SPECIAL_CHARACTER_PATTERN.test(newPassword)) {
      nextErrors.newPassword =
        "New password must include at least 1 special character.";
    } else if (newPassword === currentPassword) {
      nextErrors.newPassword =
        "New password must be different from your current password.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirm password is required.";
    } else if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Confirm password does not match.";
    }

    setFieldErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSaving || !validateForm()) {
      return;
    }

    setIsSaving(true);
    setApiError("");

    try {
      const response = await changeCurrentUserPassword(formValues);
      setFormValues(createFormState());
      setFieldErrors({});
      onSaved(response?.message || "Password changed successfully.");
    } catch (error) {
      const nextFieldErrors = getFieldErrorsFromApi(error);

      setFieldErrors(nextFieldErrors);
      setApiError(
        Object.keys(nextFieldErrors).length === 0
          ? getApiErrorMessage(error, "Unable to change your password.")
          : ""
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(12,12,15,0.86),rgba(255,255,255,0.04))] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.36)] backdrop-blur-xl transition-all duration-300 sm:p-6"
    >
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9f43]">
            Change password
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Update your account password
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Enter your current password and choose a stronger password for your
            next sign-in.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Close change password form"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="mt-6 grid gap-5">
        <FormField
          label="Current Password"
          icon={LockKeyhole}
          errorMessage={fieldErrors.currentPassword}
        >
          <input
            type="password"
            value={formValues.currentPassword}
            onChange={(event) => updateField("currentPassword", event.target.value)}
            placeholder="Enter your current password"
            autoComplete="current-password"
            className={inputClassName}
            disabled={isSaving}
          />
        </FormField>

        <FormField
          label="New Password"
          icon={KeyRound}
          errorMessage={fieldErrors.newPassword}
        >
          <input
            type="password"
            value={formValues.newPassword}
            onChange={(event) => updateField("newPassword", event.target.value)}
            placeholder="Enter your new password"
            autoComplete="new-password"
            className={inputClassName}
            disabled={isSaving}
          />
        </FormField>

        <FormField
          label="Confirm Password"
          icon={ShieldAlert}
          errorMessage={fieldErrors.confirmPassword}
        >
          <input
            type="password"
            value={formValues.confirmPassword}
            onChange={(event) => updateField("confirmPassword", event.target.value)}
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            className={inputClassName}
            disabled={isSaving}
          />
        </FormField>
      </div>

      {apiError ? (
        <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {apiError}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className={secondaryButtonClassName}
        >
          Cancel
        </button>

        <button type="submit" disabled={isSaving} className={primaryButtonClassName}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Updating Password...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden />
              Change Password
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ChangePasswordForm;
