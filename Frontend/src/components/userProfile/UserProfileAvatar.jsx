import { useEffect } from "react";
import { BadgeCheck } from "lucide-react";
import {
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

const getProfileInitials = (fullName, email) => {
  const source = String(fullName || "").trim() || String(email || "").trim();
  const words = source
    .replace(/@.*$/, "")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "U";
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

const UserProfileAvatar = ({ avatar, fullName, email }) => {
  const { profile, setProfile } = useUserProfileCard();

  useEffect(() => {
    setProfile((current) =>
      mergeUserProfileSnapshot(current, {
        avatar,
        fullName,
        email,
      })
    );
  }, [avatar, email, fullName, setProfile]);

  const resolvedFullName = getPreferredText(profile?.fullName, fullName);
  const resolvedEmail = getPreferredText(profile?.email, email);
  const resolvedAvatar = normalizeText(profile?.avatar) || normalizeText(avatar);
  const initials = getProfileInitials(
    resolvedFullName === FALLBACK_TEXT ? "" : resolvedFullName,
    resolvedEmail === FALLBACK_TEXT ? "" : resolvedEmail
  );

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur-md sm:p-8 xl:sticky xl:top-10">
      <div className="mx-auto flex max-w-[18rem] flex-col items-center">
        <div className="relative">
          <div className="absolute inset-[-16px] rounded-full bg-[#ff9f43]/20 blur-2xl" />
          <div
            className="
              relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full
              border border-white/15 bg-[linear-gradient(135deg,#ff9f43_0%,#4a2208_100%)]
              text-4xl font-semibold text-white shadow-[0_0_0_10px_rgba(255,255,255,0.03),0_24px_70px_rgba(255,159,67,0.18)]
              sm:h-44 sm:w-44
            "
          >
            {resolvedAvatar ? (
              <img
                src={resolvedAvatar}
                alt={resolvedFullName !== FALLBACK_TEXT ? resolvedFullName : resolvedEmail}
                className="h-full w-full object-cover"
              />
            ) : (
              <span aria-hidden>{initials}</span>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-full border border-[#ff9f43]/20 bg-[#ff9f43]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[#ffb46a]">
          <BadgeCheck className="h-4 w-4" aria-hidden />
          Premium
        </div>

        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
          {resolvedFullName}
        </h2>

        <p className="mt-4 max-w-xs text-sm leading-7 text-gray-400">
          "Your identity stays in rhythm with every session, every playlist, and
          every discovery."
        </p>

        <p className="mt-6 text-xs font-medium uppercase tracking-[0.24em] text-gray-500">
          Thank you for using our services.
        </p>
      </div>
    </div>
  );
};

export default UserProfileAvatar;
