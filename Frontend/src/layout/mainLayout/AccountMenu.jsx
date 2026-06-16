import { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDoorClosed } from "@fortawesome/free-solid-svg-icons";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../../components/common/ThemeToggle";
import { useTheme } from "../../hooks/useTheme";
import { routePaths } from "../../routes/routePaths";
import { testAccessTokenService } from "../../services/authService";
import { hasPremiumAccess } from "../../utils/premiumAccess";

const ROLE_LABELS = {
  artist: "Nghệ sĩ",
  user: "Người dùng",
};

const AccountMenu = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const displayName = user?.name || user?.email || "Người dùng";
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || "N";
  const userRole = user?.role;
  const isPremiumUser = hasPremiumAccess(user);

  const menuItems = useMemo(
    () => [
      { label: "Trang chủ", to: routePaths.home },
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

  const handleNavigate = (to) => {
    setIsOpen(false);
    navigate(to);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await onLogout({ redirectTo: "/login" });
  };

  const handleTestAccessToken = async () => {
    try {
      const response = await testAccessTokenService();
      console.log("Access token is valid:", response);
    } catch (error) {
      console.error("Access token is invalid:", error);
    }
  };

  return (
    <div className="relative shrink-0" ref={ menuRef }>
      <button
        type="button"
        onClick={ () => setIsOpen((value) => !value) }
        className={[
          "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-1.5 pr-2 transition sm:max-w-none sm:gap-2 sm:px-3",
          isDark
            ? "border-[#f5b66f]/10 bg-white text-black hover:bg-[#f5b66f]/20"
            : "border-[#e5e7eb] bg-white text-[#111111] hover:bg-[#f9fafb]",
        ].join(" ") }
        aria-label="Mở menu tài khoản"
        aria-expanded={ isOpen }
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-semibold text-white sm:hidden">
          { displayInitial }
        </span>
        <span className="hidden truncate text-xs sm:block sm:max-w-36">{ displayName }</span>
        <ChevronDown className="hidden h-3.5 w-3.5 sm:block" />
      </button>

      { isOpen ? (
        <div
          className={[
            "absolute right-0 top-full z-[120] mt-2 w-56 rounded-2xl border p-2 backdrop-blur-xl sm:w-64",
            isDark
              ? "border-[#f5b66f]/10 bg-[#151218]/95 shadow-[0_20px_60px_rgba(245,158,66,0.15)]"
              : "border-[#e5e7eb] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]",
          ].join(" ") }
        >
          <div
            className={[
              "border-b px-3 py-2",
              isDark ? "border-[#f5b66f]/10" : "border-[#f3f4f6]",
            ].join(" ") }
          >
            <p
              className={[
                "truncate text-xs font-medium sm:text-sm",
                isDark ? "text-[#f7f1ea]" : "text-[#111111]",
              ].join(" ") }
            >
              { displayName }
            </p>
            <p
              className={[
                "mt-1 text-xs uppercase tracking-[0.2em]",
                isDark ? "text-[#b8b0aa]" : "text-[#6b7280]",
              ].join(" ") }
            >
              { ROLE_LABELS[userRole] || "Thành viên" }
            </p>
          </div>

          <div className="py-2">
            { menuItems.map((item) => (
              <button
                key={ item.to }
                type="button"
                onClick={ () => handleNavigate(item.to) }
                className={[
                  "flex w-full rounded-xl px-3 py-2 text-left text-xs transition sm:text-sm",
                  isDark
                    ? "text-[#f7f1ea] hover:bg-[#241f28] hover:text-[#f5b66f]"
                    : "text-[#111111] hover:bg-[#f9fafb] hover:text-[#111111]",
                ].join(" ") }
              >
                { item.label }
              </button>
            )) }
          </div>

          <div
            className={[
              "border-t py-2",
              isDark ? "border-[#f5b66f]/10" : "border-[#f3f4f6]",
            ].join(" ") }
          >
            <ThemeToggle variant="menu" />
            <button
              type="button"
              onClick={ handleTestAccessToken }
              className={[
                "mt-1 flex w-full rounded-xl px-3 py-2 text-left text-xs transition sm:text-sm",
                isDark
                  ? "text-[#f7f1ea] hover:bg-[#241f28] hover:text-[#f5b66f]"
                  : "text-[#111111] hover:bg-[#f9fafb] hover:text-[#111111]",
              ].join(" ") }
            >
              Kiểm tra phiên đăng nhập
            </button>
          </div>

          <div
            className={[
              "border-t pt-2",
              isDark ? "border-[#f5b66f]/10" : "border-[#f3f4f6]",
            ].join(" ") }
          >
            <button
              type="button"
              onClick={ handleLogout }
              className={[
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition sm:text-sm",
                isDark
                  ? "text-[#f7f1ea] hover:bg-[#241f28] hover:text-[#f5b66f]"
                  : "text-[#111111] hover:bg-[#f9fafb] hover:text-[#111111]",
              ].join(" ") }
            >
              <FontAwesomeIcon icon={ faDoorClosed } className="text-xs sm:text-sm" />
              Đăng xuất
            </button>
          </div>
        </div>
      ) : null }
    </div>
  );
};

export default AccountMenu;
