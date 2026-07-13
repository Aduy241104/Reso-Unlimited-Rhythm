import { useEffect } from "react";
import { Mail, Sparkles } from "lucide-react";
import {
  mergeUserProfileSnapshot,
  useUserProfileCard,
} from "./UserProfileCard";

const FALLBACK_TEXT = "Chưa cập nhật";

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
    <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03)_38%,rgba(8,8,8,0.96)_100%)] p-6 text-center shadow-[0_28px_80px_rgba(0,0,0,0.34)] sm:p-8 xl:sticky xl:top-8">
      <div className="absolute inset-x-10 top-0 h-28 rounded-full bg-white/8 blur-3xl" />

      <div className="relative mx-auto flex max-w-[18rem] flex-col items-center">
        

        <div className="relative mt-6">
          <div className="absolute inset-[-18px] rounded-full bg-white/8 blur-3xl" />
          <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-[linear-gradient(135deg,#2a2a2a_0%,#080808_100%)] text-4xl font-semibold text-white shadow-[0_0_0_12px_rgba(255,255,255,0.03),0_24px_60px_rgba(255,255,255,0.05)] sm:h-44 sm:w-44">
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

        <h2 className="mt-7 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
          {resolvedFullName}
        </h2>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/72">
          <Mail className="h-4 w-4 text-white/70" aria-hidden />
          <span className="truncate">{resolvedEmail}</span>
        </div>

        <p className="mt-5 max-w-xs text-sm leading-7 text-white/55">
          Góc cá nhân của bạn trên Reso, nơi quản lý hồ sơ, hoạt động nghe nhạc
          và các kết nối yêu thích trong cùng một màn hình.
        </p>


      </div>
    </div>
  );
};

export default UserProfileAvatar;
