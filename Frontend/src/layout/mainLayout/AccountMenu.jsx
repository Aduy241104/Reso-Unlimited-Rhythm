import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../../components/common/ThemeToggle";
import { useTheme } from "../../hooks/useTheme";
import { routePaths } from "../../routes/routePaths";
import { hasPremiumAccess } from "../../utils/premiumAccess";

const ROLE_LABELS = {
  artist: "Nghệ sĩ",
  user: "Người dùng",
};

const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='48' fill='%23111111'/%3E%3Ccircle cx='48' cy='38' r='16' fill='%23ffffff' fill-opacity='0.9'/%3E%3Cpath d='M22 78c4.2-15.5 14.2-24 26-24s21.8 8.5 26 24' fill='%23ffffff' fill-opacity='0.9'/%3E%3C/svg%3E";

const AccountMenu = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const displayName = user?.name || user?.email || "Người dùng";
  const displayEmail = user?.email || "";
  const userRole = user?.role;
  const isPremiumUser = hasPremiumAccess(user);

  const avatarUrl = user?.avatar || user?.profile?.avatar || DEFAULT_AVATAR;
  const [avatarSrc, setAvatarSrc] = useState(avatarUrl);

  useEffect(() => {
    setAvatarSrc(avatarUrl);
  }, [avatarUrl]);

  const menuItems = useMemo(
    () => [
      { label: "Hồ sơ cá nhân", to: routePaths.userProfile },

      ...(userRole === "user"
        ? [
          { label: "Đăng ký nghệ sĩ", to: routePaths.artistRegistrationRequest },
          { label: "Yêu cầu của tôi", to: routePaths.artistRegistrationRequestsList },
        ]
        : []),

      ...(userRole === "artist"
        ? [
          { label: "Yêu cầu của tôi", to: routePaths.artistRegistrationRequestsList },
          { label: "Khu vực nghệ sĩ", to: routePaths.artistRoot },
        ]
        : []),

      ...(!isPremiumUser
        ? [{ label: "Nâng cấp Premium", to: routePaths.premium, premium: true }]
        : []),

      { label: "Nghệ sĩ đang theo dõi", to: routePaths.libraryFollowedArtists },
      { label: "Album đang theo dõi", to: routePaths.libraryFollowedAlbums },
      { label: "Playlist của tôi", to: routePaths.userPlaylist },
    ],
    [isPremiumUser, userRole],
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAvatarError = (event) => {
    event.currentTarget.onerror = null;
    setAvatarSrc(DEFAULT_AVATAR);
  };

  const handleNavigate = (to) => {
    setIsOpen(false);
    navigate(to);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await onLogout({ redirectTo: "/login" });
  };

  return (
    <div className="relative shrink-0" ref={ menuRef }>
      <button
        type="button"
        onClick={ () => setIsOpen((value) => !value) }
        className={ [
          "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
          isOpen ? "scale-95" : "scale-100"
        ].join(" ") }
        aria-label="Mở menu tài khoản"
        aria-expanded={ isOpen }
      >
        <img
          src={ avatarSrc }
          alt={ displayName }
          onError={ handleAvatarError }
          className="h-9 w-9 rounded-full object-cover"
        />
      </button>

      <div
        className={ [
          "absolute right-0 top-full z-[120] mt-2 w-56 origin-top-right rounded-lg border p-1.5 shadow-xl backdrop-blur-xl",
          "transition-all duration-200 ease-out",
          isOpen
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible -translate-y-1 scale-95 opacity-0 pointer-events-none",
          isDark
            ? "border-white/10 bg-[#151515]/95"
            : "border-[#eeeeee] bg-white/95",
        ].join(" ") }
      >
        <div
          className={ [
            "mb-1 flex items-center gap-2 rounded-md px-2.5 py-2",
            isDark ? "bg-white/[0.04]" : "bg-[#f9fafb]",
          ].join(" ") }
        >
          <img
            src={ avatarSrc }
            alt={ displayName }
            onError={ handleAvatarError }
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />

          <div className="min-w-0 flex-1">
            <p
              className={ [
                "truncate text-[13px] font-semibold",
                isDark ? "text-white" : "text-[#111111]",
              ].join(" ") }
            >
              { displayName }
            </p>

            <p
              className={ [
                "mt-0.5 truncate text-[11px]",
                isDark ? "text-white/45" : "text-[#6b7280]",
              ].join(" ") }
            >
              { displayEmail || ROLE_LABELS[userRole] || "Thành viên" }
            </p>
          </div>
        </div>

        <div className="max-h-[320px] overflow-y-auto py-0.5">
          { menuItems.map((item) => (
            <button
              key={ item.to }
              type="button"
              onClick={ () => handleNavigate(item.to) }
              className={ [
                "flex w-full rounded-md px-2.5 py-2 text-left text-[13px] font-normal transition-all duration-150",
                item.premium
                  ? isDark
                    ? "text-[#f5b66f] hover:bg-[#f5b66f]/10"
                    : "text-[#b45309] hover:bg-[#fff7ed]"
                  : isDark
                    ? "text-white/80 hover:bg-white/[0.06] hover:text-white"
                    : "text-[#2f2f2f] hover:bg-[#f5f5f5] hover:text-black",
              ].join(" ") }
            >
              { item.label }
            </button>
          )) }
        </div>

        <div
          className={ [
            "mt-1 border-t px-1 py-1",
            isDark ? "border-white/10" : "border-[#f1f1f1]",
          ].join(" ") }
        >
          <ThemeToggle variant="menu" />
        </div>

        <div
          className={ [
            "border-t px-1 pt-1",
            isDark ? "border-white/10" : "border-[#f1f1f1]",
          ].join(" ") }
        >
          <button
            type="button"
            onClick={ handleLogout }
            className={ [
              "flex w-full rounded-md px-2.5 py-2 text-left text-[13px] font-normal transition-all duration-150",
              isDark
                ? "text-red-300 hover:bg-red-500/10"
                : "text-red-600 hover:bg-red-50",
            ].join(" ") }
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountMenu;