import { useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  ClipboardList,
  Crown,
  Disc3,
  Flag,
  History,
  ListMusic,
  LogOut,
  MicVocal,
  ReceiptText,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
      { label: "Hồ sơ cá nhân", to: routePaths.userProfile, icon: UserRound },
      {
        label: "Nghe gần đây",
        to: routePaths.userRecentListeningActivity,
        icon: History,
      },

      ...(userRole === "user"
        ? [
            {
              label: "Đăng ký nghệ sĩ",
              to: routePaths.artistRegistrationRequest,
              icon: MicVocal,
            },
            {
              label: "Yêu cầu của tôi",
              to: routePaths.artistRegistrationRequestsList,
              icon: ClipboardList,
            },
          ]
        : []),

      ...(userRole === "artist"
        ? [
            {
              label: "Khu vực nghệ sĩ",
              to: routePaths.artistRoot,
              icon: AudioLines,
            },
          ]
        : []),

      ...(!isPremiumUser
        ? [
            {
              label: "Nâng cấp Premium",
              to: routePaths.premium,
              icon: Crown,
              premium: true,
            },
          ]
        : []),

      {
        label: "Nghệ sĩ đang theo dõi",
        to: routePaths.libraryFollowedArtists,
        icon: UserRoundCheck,
      },
      {
        label: "Album đang theo dõi",
        to: routePaths.libraryFollowedAlbums,
        icon: Disc3,
      },
      {
        label: "Playlist của tôi",
        to: routePaths.userPlaylist,
        icon: ListMusic,
      },
      {
        label: "Lịch sử thanh toán",
        to: routePaths.userPaymentHistory,
        icon: ReceiptText,
      },
      {
        label: "Danh sách báo cáo",
        to: routePaths.userReportList,
        icon: Flag,
      },
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
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className={[
          "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
          isOpen ? "scale-95" : "scale-100",
        ].join(" ")}
        aria-label="Mở menu tài khoản"
        aria-expanded={isOpen}
      >
        <img
          src={avatarSrc}
          alt={displayName}
          onError={handleAvatarError}
          className="h-9 w-9 rounded-full object-cover"
        />
      </button>

      <div
        className={[
          "absolute right-0 top-full z-[120] mt-2 w-[min(16rem,calc(100vw-1rem))] max-h-[calc(100dvh-4.5rem)] origin-top-right overflow-hidden rounded-lg border border-white/10 bg-[#151515]/95 p-1.5 shadow-xl backdrop-blur-xl",
          "transition-all duration-200 ease-out",
          isOpen
            ? "visible translate-y-0 scale-100 opacity-100"
            : "pointer-events-none invisible -translate-y-1 scale-95 opacity-0",
        ].join(" ")}
      >
        <div className="mb-1 flex items-center gap-2 rounded-md bg-white/[0.04] px-2.5 py-2">
          <img
            src={avatarSrc}
            alt={displayName}
            onError={handleAvatarError}
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {displayName}
            </p>

            <p className="mt-0.5 truncate text-xs text-white/55">
              {displayEmail || ROLE_LABELS[userRole] || "Thành viên"}
            </p>
          </div>
        </div>

        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-h-[320px]">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.to}
                type="button"
                onClick={() => handleNavigate(item.to)}
                className="group flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left text-sm font-medium text-white transition-all duration-150 hover:bg-white/[0.08]"
              >
                <Icon
                  aria-hidden="true"
                  className={[
                    "h-4 w-4 shrink-0 transition-colors",
                    item.premium
                      ? "text-[#f5b66f]"
                      : "text-white/65 group-hover:text-white",
                  ].join(" ")}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-1 border-t border-white/10 px-1 pt-1">
          <button
            type="button"
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left text-sm font-medium text-white transition-all duration-150 hover:bg-red-500/10"
          >
            <LogOut
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-red-300 transition-colors group-hover:text-red-200"
            />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountMenu;
