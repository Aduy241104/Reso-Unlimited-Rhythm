import { useEffect, useState } from "react";
import {
  ChevronRight,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  PencilLine,
  UserRound,
  VenusAndMars,
} from "lucide-react";
import { getCurrentUserProfile } from "../../services/userProfileService";
import { getApiErrorMessage } from "../../utils/apiError";
import ChangePasswordForm from "./ChangePasswordForm";
import EditUserProfileForm from "./EditUserProfileForm";
import {
  createUserProfileSnapshot,
  mergeUserProfileSnapshot,
  useUserProfileCard,
} from "./UserProfileCard";

const FALLBACK_TEXT = "Not provided";

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const getPreferredText = (...values) => {
  for (const value of values) {
    const normalizedValue = normalizeText(value);

    if (normalizedValue && normalizedValue !== FALLBACK_TEXT) {
      return normalizedValue;
    }
  }

  return FALLBACK_TEXT;
};

const formatGenderLabel = (value) => {
  const normalizedValue = normalizeText(value).toLowerCase();

  if (!normalizedValue || normalizedValue === FALLBACK_TEXT.toLowerCase()) {
    return FALLBACK_TEXT;
  }

  return normalizedValue
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const ProfileField = ({ icon, label, value }) => {
  const IconComponent = icon;

  return (
    <div
      className="
        group flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4
        shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-md transition duration-300
        hover:-translate-y-1 hover:border-[#ff9f43]/25 hover:bg-white/[0.07]
        hover:shadow-[0_24px_70px_rgba(0,0,0,0.4)]
      "
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-[#ff9f43]">
        <IconComponent className="h-5 w-5" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-medium leading-6 text-white sm:text-base">
          {value}
        </p>
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-gray-500 transition group-hover:translate-x-1 group-hover:text-[#ffb46a]" aria-hidden />
    </div>
  );
};

const UserProfileInfo = ({ fullName, email, gender, country }) => {
  const { profile, setProfile } = useUserProfileCard();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPreparingForm, setIsPreparingForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  useEffect(() => {
    setProfile((current) =>
      mergeUserProfileSnapshot(current, {
        fullName,
        email,
        gender,
        country,
      })
    );
  }, [country, email, fullName, gender, setProfile]);

  useEffect(() => {
    let isMounted = true;

    const loadLatestProfile = async () => {
      try {
        const currentUser = await getCurrentUserProfile();

        if (!isMounted || !currentUser) {
          return;
        }

        setProfile(createUserProfileSnapshot(currentUser));
      } catch {
        if (!isMounted) {
          return;
        }
      }
    };

    loadLatestProfile();

    return () => {
      isMounted = false;
    };
  }, [setProfile]);

  useEffect(() => {
    if (!successNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessNotice("");
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [successNotice]);

  const baseProfile = createUserProfileSnapshot({
    fullName,
    email,
    gender,
    country,
  });
  const profileSnapshot = mergeUserProfileSnapshot(baseProfile, profile);
  const displayFields = [
    {
      label: "Full Name",
      value: getPreferredText(profileSnapshot.fullName, fullName),
      icon: UserRound,
    },
    {
      label: "Email",
      value: getPreferredText(profileSnapshot.email, email),
      icon: Mail,
    },
    {
      label: "Gender",
      value: formatGenderLabel(profileSnapshot.gender || gender),
      icon: VenusAndMars,
    },
    {
      label: "Country",
      value: getPreferredText(profileSnapshot.country, country),
      icon: MapPin,
    },
  ];

  const handleOpenEditor = async () => {
    setFormError("");
    setIsPreparingForm(true);
    setIsChangingPassword(false);

    try {
      const currentUser = await getCurrentUserProfile();

      if (currentUser) {
        setProfile(createUserProfileSnapshot(currentUser));
      }

      setIsEditing(true);
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "Unable to load your latest profile details for editing."
        )
      );
    } finally {
      setIsPreparingForm(false);
    }
  };

  const handleSaved = (updatedUser) => {
    setProfile(createUserProfileSnapshot(updatedUser));
    setIsEditing(false);
    setIsChangingPassword(false);
    setFormError("");
    setSuccessNotice("Profile updated successfully.");
  };

  const handleOpenPasswordForm = () => {
    setFormError("");
    setIsEditing(false);
    setIsChangingPassword(true);
  };

  const handlePasswordSaved = (message) => {
    setIsChangingPassword(false);
    setFormError("");
    setSuccessNotice(message || "Password changed successfully.");
  };

  const fields = [...displayFields];

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-md sm:p-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#ff9f43]">
          Profile details
        </p>

        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[2.6rem]">
          Profile Details
        </h2>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <ProfileField
            key={field.label}
            icon={field.icon}
            label={field.label}
            value={field.value}
          />
        ))}
      </div>

      {successNotice ? (
        <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {successNotice}
        </div>
      ) : null}

      {formError ? (
        <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {formError}
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleOpenPasswordForm}
          disabled={isPreparingForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#ffb15c_0%,#ff8a2a_45%,#a64a00_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_38px_rgba(255,138,42,0.25)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_24px_55px_rgba(255,138,42,0.36)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <KeyRound className="h-4 w-4" aria-hidden />
          Change Password
        </button>

        <button
          type="button"
          onClick={handleOpenEditor}
          disabled={isPreparingForm}
          className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#ffb15c_0%,#ff8a2a_45%,#a64a00_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_38px_rgba(255,138,42,0.25)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_24px_55px_rgba(255,138,42,0.36)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPreparingForm ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading...
            </>
          ) : (
            <>
              <PencilLine className="h-4 w-4" aria-hidden />
              Update Profile
            </>
          )}
        </button>
      </div>

      {isEditing ? (
        <EditUserProfileForm
          profile={profileSnapshot}
          onCancel={() => {
            setFormError("");
            setIsEditing(false);
          }}
          onSaved={handleSaved}
        />
      ) : null}

      {isChangingPassword ? (
        <ChangePasswordForm
          onCancel={() => {
            setIsChangingPassword(false);
          }}
          onSaved={handlePasswordSaved}
        />
      ) : null}
    </div>
  );
};

export default UserProfileInfo;
