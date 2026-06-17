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

const resolveDisplayName = (user) =>
  user?.profile?.fullName || user?.name || user?.email || "Người dùng";

const resolveAvatarUrl = (user) =>
  user?.avatar ||
  user?.profile?.avatar ||
  user?.image ||
  user?.profileImage ||
  "";

const AccountMenu = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const displayName = resolveDisplayName(user);
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || "N";
  const avatarUrl = resolveAvatarUrl(user);
  const userRole = user?.role;
  const isPremiumUser = hasPremiumAccess(user);

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
      ...(!isPremiumUser ? [{ label: "Nâng cấp Premium", to: routePaths.premium }] : []),
      { label: "Nghệ sĩ đang theo dõi", to: routePaths.libraryFollowedArtists },
      { label: "Album đang theo dõi", to: routePaths.libraryFollowedAlbums },
      { label: "Playlist của tôi", to: routePaths.userPlaylist },
    ],
    [isPremiumUser, userRole]
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

  const handleNavigate = (to) => {
    setIsOpen(false);
    navigate(to);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await onLogout({ redirectTo: "/login" });
  };

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition",
        ].join(" ")}
        aria-label="Mở menu tài khoản"
        aria-expanded={isOpen}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
            {displayInitial}
          </span>
        )}
      </button>

      {isOpen ? (
        <div
          className={[
            "absolute right-0 top-full z-[120] mt-2 w-48 border p-1.5 backdrop-blur-xl sm:w-52",
            isDark ? "border-white/10 bg-[#151218]/95" : "border-white bg-white",
          ].join(" ")}
        >
          <div
            className={[
              "border-b px-2.5 py-1.5",
              isDark ? "border-[#f5b66f]/10" : "border-[#f3f4f6]",
            ].join(" ")}
          >
            <p
              className={[
                "mt-1 text-[10px] font-normal uppercase tracking-[0.18em]",
                isDark ? "text-[#b8b0aa]" : "text-[#6b7280]",
              ].join(" ")}
            >
              {ROLE_LABELS[userRole] || "Thành viên"}
            </p>
          </div>

          <div className="py-1.5">
            {menuItems.map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() => handleNavigate(item.to)}
                className={[
                  "flex w-full px-2.5 py-1.5 text-left text-[11px] font-normal transition sm:text-xs",
                  isDark ? "text-[#f7f1ea]" : "text-[#111111]",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div
            className={[
              "border-t py-1.5",
              isDark ? "border-[#f5b66f]/10" : "border-[#f3f4f6]",
            ].join(" ")}
          >
            <ThemeToggle variant="menu" />
          </div>

          <div
            className={[
              "border-t pt-1.5",
              isDark ? "border-[#f5b66f]/10" : "border-[#f3f4f6]",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={handleLogout}
              className={[
                "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] font-normal transition sm:text-xs",
                isDark ? "text-[#f7f1ea]" : "text-[#111111]",
              ].join(" ")}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AccountMenu;
