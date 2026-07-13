import { useEffect, useState } from "react";
import {
  BadgeCheck,
  ChevronRight,
  Loader2,
  Mail,
  MapPin,
  PencilLine,
  ShieldCheck,
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

const formatGenderLabel = (value) => {
  const normalizedValue = normalizeText(value).toLowerCase();

  if (!normalizedValue || normalizedValue === FALLBACK_TEXT.toLowerCase()) {
    return FALLBACK_TEXT;
  }

  const genderLabelMap = {
    male: "Nam",
    female: "Nữ",
    other: "Khác",
    prefer_not_to_say: "Không muốn tiết lộ",
  };

  return genderLabelMap[normalizedValue] || FALLBACK_TEXT;
};

const ProfileField = ({ icon, label, value }) => {
  const IconComponent = icon;

  return (
    <div className="group rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(10,10,10,0.76))] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_18px_45px_rgba(0,0,0,0.22)] sm:p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] text-white/80">
          <IconComponent className="h-5 w-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/35">
            {label}
          </p>
          <p className="mt-2 break-words text-sm font-medium leading-6 text-white sm:text-base">
            {value}
          </p>
        </div>

        <ChevronRight
          className="mt-1 h-5 w-5 shrink-0 text-white/20 transition group-hover:translate-x-1 group-hover:text-white/65"
          aria-hidden
        />
      </div>
    </div>
  );
};

const secondaryButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white transition duration-300 hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60";

const primaryButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-white bg-white px-5 py-3 text-sm font-semibold text-black shadow-[0_18px_38px_rgba(255,255,255,0.08)] transition duration-300 hover:bg-transparent hover:text-white disabled:cursor-not-allowed disabled:opacity-60";

const Notice = ({ children }) => {
  return (
    <div className="mt-6 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white/82">
      {children}
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

    void loadLatestProfile();

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
      label: "Họ và tên",
      value: getPreferredText(profileSnapshot.fullName, fullName),
      icon: UserRound,
    },
    {
      label: "Email",
      value: getPreferredText(profileSnapshot.email, email),
      icon: Mail,
    },
    {
      label: "Giới tính",
      value: formatGenderLabel(profileSnapshot.gender || gender),
      icon: VenusAndMars,
    },
    {
      label: "Quốc gia",
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
          "Không thể tải thông tin hồ sơ mới nhất để chỉnh sửa."
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
    setSuccessNotice("Cập nhật hồ sơ thành công.");
  };

  const handleOpenPasswordForm = () => {
    setFormError("");
    setIsEditing(false);
    setIsChangingPassword(true);
  };

  const handlePasswordSaved = (message) => {
    setIsChangingPassword(false);
    setFormError("");
    setSuccessNotice(message || "Đổi mật khẩu thành công.");
  };

  const authProvider = normalizeText(
    profileSnapshot?.authProvider ||
      profileSnapshot?.provider ||
      profile?.authProvider ||
      profile?.provider
  ).toLowerCase();

  const avatarUrl = normalizeText(profileSnapshot?.avatar || profile?.avatar).toLowerCase();

  const isGoogleAccount =
    authProvider === "google" ||
    avatarUrl.includes("googleusercontent.com");

  const accountTypeLabel = isGoogleAccount ? "Google Sign-In" : "Email & Password";
  const securityLabel = isGoogleAccount ? "Xác thực qua Google" : "Bảo mật nội bộ";

  return (
    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(155deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03)_26%,rgba(8,8,8,0.96)_100%)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.34)] sm:p-8">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            Hồ sơ đã xác thực
          </div>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-[2.5rem]">
            Chi tiết hồ sơ
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
            Cập nhật thông tin cá nhân, theo dõi phương thức đăng nhập và quản lý
            nhanh các thao tác quan trọng cho tài khoản của bạn.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[18rem] lg:max-w-[24rem] lg:flex-1">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
              Đăng nhập
            </p>
            <p className="mt-2 text-sm font-medium text-white">{accountTypeLabel}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
              Bảo mật
            </p>
            <p className="mt-2 text-sm font-medium text-white">{securityLabel}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {displayFields.map((field) => (
          <ProfileField
            key={field.label}
            icon={field.icon}
            label={field.label}
            value={field.value}
          />
        ))}
      </div>

      {successNotice ? <Notice>{successNotice}</Notice> : null}
      {formError ? <Notice>{formError}</Notice> : null}

      <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
        {!isGoogleAccount ? (
          <button
            type="button"
            onClick={handleOpenPasswordForm}
            disabled={isPreparingForm}
            className={secondaryButtonClassName}
          >
            <ShieldCheck className="h-4 w-4 text-white/72" aria-hidden />
            <span className="hidden sm:inline">Đổi mật khẩu</span>
            <span className="sm:hidden">Đổi mật khẩu</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={handleOpenEditor}
          disabled={isPreparingForm}
          className={primaryButtonClassName}
        >
          {isPreparingForm ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Đang tải...
            </>
          ) : (
            <>
              <PencilLine className="h-4 w-4" aria-hidden />
              Cập nhật hồ sơ
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
