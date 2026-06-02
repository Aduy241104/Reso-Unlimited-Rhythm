import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ChevronDown,
  Loader2,
  MapPin,
  RefreshCw,
  Save,
  Upload,
  UserRound,
  VenusAndMars,
  X,
} from "lucide-react";
import {
  getCountryOptions,
  getCurrentUserProfile,
  updateCurrentUserProfile,
} from "../../services/userProfileService";
import { getApiErrorMessage } from "../../utils/apiError";
import { createUserProfileSnapshot } from "./UserProfileCard";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const inputClassName =
  "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-gray-500 focus:border-[#ff9f43]/60 focus:bg-black/45 focus:shadow-[0_0_0_4px_rgba(255,159,67,0.08)]";

const secondaryButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-gray-200 transition-all duration-300 hover:scale-[1.01] hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60";

const primaryButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#ffb15c_0%,#ff8a2a_45%,#a64a00_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,138,42,0.25)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_24px_55px_rgba(255,138,42,0.34)] disabled:cursor-not-allowed disabled:opacity-60";

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const createFormState = (profile) => {
  const snapshot = createUserProfileSnapshot(profile);

  return {
    fullName: snapshot.fullName,
    gender: snapshot.gender,
    country: snapshot.country,
  };
};

const getFieldErrorsFromApi = (error) => {
  const details = error?.response?.data?.errors;
  const normalizedErrors = Array.isArray(details)
    ? details
    : details?.field && details?.message
      ? [details]
      : [];

  const fieldMap = {
    avatar: "avatar",
    fullName: "fullName",
    fullname: "fullName",
    gender: "gender",
    country: "country",
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

const findCountryOption = (countries, value) => {
  const normalizedValue = normalizeText(value).toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  return (
    countries.find((country) => {
      const candidates = [
        country.name,
        country.officialName,
        country.code,
      ];

      return candidates.some(
        (candidate) => normalizeText(candidate).toLowerCase() === normalizedValue
      );
    }) ?? null
  );
};

const getCountryLabel = (country, fallbackValue = "") => {
  if (country?.name) {
    return country.name;
  }

  return normalizeText(fallbackValue);
};

const useDismissibleDropdown = (isOpen, onClose) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen, onClose]);

  return containerRef;
};

const useCountryDropdown = () => {
  const [countries, setCountries] = useState([]);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const loadCountries = async () => {
      setStatus("loading");
      setErrorMessage("");

      try {
        const nextCountries = await getCountryOptions(controller.signal);

        if (!isMounted) {
          return;
        }

        setCountries(nextCountries);
        setStatus("success");
      } catch (error) {
        if (!isMounted || controller.signal.aborted) {
          return;
        }

        setCountries([]);
        setStatus("error");
        setErrorMessage(
          getApiErrorMessage(error, "Could not load the country list.")
        );
      }
    };

    loadCountries();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const reload = async () => {
    setStatus("loading");
    setErrorMessage("");

    try {
      const nextCountries = await getCountryOptions();
      setCountries(nextCountries);
      setStatus("success");
    } catch (error) {
      setCountries([]);
      setStatus("error");
      setErrorMessage(
        getApiErrorMessage(error, "Could not load the country list.")
      );
    }
  };

  return {
    countries,
    isLoading: status === "loading",
    hasError: status === "error",
    errorMessage,
    reload,
  };
};

const FormField = ({ children, errorMessage, label, icon }) => {
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

const EditUserProfileForm = ({ profile, onCancel, onSaved }) => {
  const [formValues, setFormValues] = useState(() => createFormState(profile));
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarInputKey, setAvatarInputKey] = useState(0);
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const { countries, isLoading, hasError, errorMessage, reload } =
    useCountryDropdown();

  const genderDropdownRef = useDismissibleDropdown(isGenderOpen, () =>
    setIsGenderOpen(false)
  );
  const countryDropdownRef = useDismissibleDropdown(isCountryOpen, () =>
    setIsCountryOpen(false)
  );

  const snapshot = createUserProfileSnapshot(profile);
  const selectedCountry = findCountryOption(countries, formValues.country);
  const selectedGender =
    GENDER_OPTIONS.find((option) => option.value === formValues.gender) ?? null;
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(snapshot.avatar);

  useEffect(() => {
    const nextSnapshot = createUserProfileSnapshot(profile);

    setFormValues(createFormState(nextSnapshot));
    setFieldErrors({});
    setApiError("");
    setAvatarFile(null);
    setAvatarPreviewUrl(nextSnapshot.avatar);
    setAvatarInputKey((currentKey) => currentKey + 1);
  }, [profile]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(snapshot.avatar);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile, snapshot.avatar]);

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

    if (!normalizeText(formValues.fullName)) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!normalizeText(formValues.gender)) {
      nextErrors.gender = "Please choose a gender.";
    }

    if (!normalizeText(formValues.country)) {
      nextErrors.country = "Please choose a country.";
    }

    setFieldErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleAvatarChange = (event) => {
    const nextFile = event.target.files?.[0] ?? null;
    setAvatarFile(nextFile);
    setApiError("");
    setFieldErrors((current) => {
      if (!current.avatar) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors.avatar;
      return nextErrors;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSaving || !validateForm()) {
      return;
    }

    setIsSaving(true);
    setApiError("");

    try {
      const updatedUser = await updateCurrentUserProfile({
        avatar: avatarFile,
        fullName: formValues.fullName,
        gender: formValues.gender,
        country: formValues.country,
      });

      let refreshedUser = updatedUser;

      try {
        refreshedUser = (await getCurrentUserProfile()) || updatedUser;
      } catch (refreshError) {
        if (!updatedUser) {
          throw refreshError;
        }
      }

      if (!refreshedUser) {
        throw new Error("Profile updated, but the latest data could not be loaded.");
      }

      onSaved(refreshedUser);
    } catch (error) {
      const nextErrors = getFieldErrorsFromApi(error);
      setFieldErrors(nextErrors);
      setApiError(
        getApiErrorMessage(error, "Unable to save your profile changes.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const showAvatarFallback = !avatarPreviewUrl;

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(12,12,15,0.86),rgba(255,255,255,0.04))] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.36)] backdrop-blur-xl transition-all duration-300 sm:p-6"
    >
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9f43]">
            Update profile
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Edit your account details
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Save a new avatar, update your name, and keep your profile identity in
            sync with the backend.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Close update profile form"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="mt-6 rounded-[28px] border border-white/10 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative mx-auto h-24 w-24 shrink-0 sm:mx-0">
            <div className="absolute inset-[-12px] rounded-full bg-[#ff9f43]/18 blur-2xl" />
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white/15 bg-[linear-gradient(135deg,#ff9f43_0%,#4a2208_100%)] text-xl font-semibold text-white shadow-[0_0_0_10px_rgba(255,255,255,0.02),0_20px_50px_rgba(255,159,67,0.2)]">
              {showAvatarFallback ? (
                <UserRound className="h-9 w-9 text-white/90" aria-hidden />
              ) : (
                <img
                  src={avatarPreviewUrl}
                  alt="Profile avatar preview"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Camera className="h-4 w-4 text-[#ff9f43]" aria-hidden />
              Avatar preview
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Upload a new image to replace your current avatar. The backend keeps
              the final storage and Cloudinary handling.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className={`${secondaryButtonClassName} cursor-pointer`}>
                <Upload className="h-4 w-4" aria-hidden />
                <span>Upload new image</span>
                <input
                  key={`avatar-input-${avatarInputKey}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={isSaving}
                />
              </label>

              {avatarFile ? (
                <p className="min-w-0 truncate text-sm text-gray-300">
                  {avatarFile.name}
                </p>
              ) : (
                <p className="text-sm text-gray-500">PNG, JPG, or WebP</p>
              )}
            </div>

            {fieldErrors.avatar ? (
              <p className="mt-3 text-sm text-red-200/90">{fieldErrors.avatar}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <FormField
          label="Full Name"
          icon={UserRound}
          errorMessage={fieldErrors.fullName}
        >
          <input
            type="text"
            value={formValues.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            placeholder="Enter your full name"
            className={inputClassName}
            disabled={isSaving}
          />
        </FormField>

        <FormField
          label="Gender"
          icon={VenusAndMars}
          errorMessage={fieldErrors.gender}
        >
          <div ref={genderDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsGenderOpen((current) => !current)}
              disabled={isSaving}
              className={`${inputClassName} flex items-center justify-between gap-3 text-left`}
            >
              <span className="truncate text-sm text-white">
                {selectedGender?.label || "Select your gender"}
              </span>
              <ChevronDown
                className={[
                  "h-4 w-4 shrink-0 text-[#ffb46a] transition-transform duration-300",
                  isGenderOpen ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden
              />
            </button>

            <div
              className={[
                "absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 origin-top rounded-2xl border border-white/10 bg-[#101013]/95 p-2 shadow-[0_22px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-200",
                isGenderOpen
                  ? "visible translate-y-0 opacity-100"
                  : "pointer-events-none invisible -translate-y-2 opacity-0",
              ].join(" ")}
            >
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    updateField("gender", option.value);
                    setIsGenderOpen(false);
                  }}
                  className={[
                    "flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm transition-all duration-200",
                    formValues.gender === option.value
                      ? "bg-[#ff9f43]/15 text-white"
                      : "text-gray-300 hover:bg-white/[0.06] hover:text-white",
                  ].join(" ")}
                >
                  <span>{option.label}</span>
                  {formValues.gender === option.value ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff9f43]" />
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </FormField>

        <FormField
          label="Country"
          icon={MapPin}
          errorMessage={fieldErrors.country}
        >
          <div ref={countryDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsCountryOpen((current) => !current)}
              disabled={isSaving}
              className={`${inputClassName} flex items-center justify-between gap-3 text-left`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg">
                  {selectedCountry?.flag || (
                    <MapPin className="h-4 w-4 text-[#ffb46a]" aria-hidden />
                  )}
                </span>

                <span className="truncate text-sm text-white">
                  {getCountryLabel(selectedCountry, formValues.country) ||
                    (isLoading ? "Loading countries..." : "Select your country")}
                </span>
              </span>

              <ChevronDown
                className={[
                  "h-4 w-4 shrink-0 text-[#ffb46a] transition-transform duration-300",
                  isCountryOpen ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden
              />
            </button>

            <div
              className={[
                "absolute bottom-[calc(100%+0.75rem)] left-0 right-0 z-30 origin-bottom rounded-2xl border border-white/10 bg-[#101013]/95 p-2 shadow-[0_22px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-200",
                isCountryOpen
                  ? "visible translate-y-0 opacity-100"
                  : "pointer-events-none invisible translate-y-2 opacity-0",
              ].join(" ")}
            >
              {isLoading ? (
                <div className="flex items-center gap-3 px-3 py-4 text-sm text-gray-300">
                  <Loader2
                    className="h-4 w-4 animate-spin text-[#ff9f43]"
                    aria-hidden
                  />
                  Loading countries...
                </div>
              ) : null}

              {hasError ? (
                <div className="space-y-3 px-3 py-3">
                  <p className="text-sm leading-6 text-red-200/90">
                    {errorMessage}
                  </p>

                  <button
                    type="button"
                    onClick={reload}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Retry
                  </button>
                </div>
              ) : null}

              {!isLoading && !hasError ? (
                <div className="max-h-72 overflow-y-auto pr-1">
                  {countries.map((country) => (
                    <button
                      key={country.code || country.name}
                      type="button"
                      onClick={() => {
                        updateField("country", country.name);
                        setIsCountryOpen(false);
                      }}
                      className={[
                        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-all duration-200",
                        normalizeText(formValues.country).toLowerCase() ===
                          normalizeText(country.name).toLowerCase()
                          ? "bg-[#ff9f43]/15 text-white"
                          : "text-gray-300 hover:bg-white/[0.06] hover:text-white",
                      ].join(" ")}
                    >
                      <span className="flex h-6 w-6 items-center justify-center text-lg">
                        {country.flag || (
                          <MapPin
                            className="h-4 w-4 text-[#ffb46a]"
                            aria-hidden
                          />
                        )}
                      </span>

                      <span className="min-w-0 truncate">
                        {country.name}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
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
              Saving Changes...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default EditUserProfileForm;
