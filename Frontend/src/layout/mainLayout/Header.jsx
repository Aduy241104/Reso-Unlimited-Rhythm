import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDoorClosed } from "@fortawesome/free-solid-svg-icons";
import { ChevronDown, Menu } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import brandArtwork from "../../assets/images/ChatGPT Image 13_16_10 4 thg 5, 2026.png";
import ThemeToggle from "../../components/common/ThemeToggle";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { routePaths } from "../../routes/routePaths";
import { testAccessTokenService } from "../../services/authService";
import NotificationDropdown from "./NotificationDropdown";

const Header = ({ onToggleSidebar }) => {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const displayName = user?.name || user?.email || "User";
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || "U";
  const userRole = user?.role;

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

  const menuItems = [
    { label: "Home", to: routePaths.home },
    { label: "Profile", to: routePaths.userProfile },
    ...(userRole === "user"
      ? [
        { label: "Đăng kí nghệ sĩ", to: routePaths.artistRegistrationRequest },
        { label: "Yêu cầu của tôi", to: routePaths.artistRegistrationRequestsList },
      ]
      : []),
    ...(userRole === "artist"
      ? [{ label: "Yêu cầu của tôi", to: routePaths.artistRegistrationRequestsList }]
      : []),
    { label: "FollowingArtist", to: routePaths.libraryFollowedArtists },
    { label: "FollowingAlbum", to: routePaths.libraryFollowedAlbums },
    { label: "Playlist", to: routePaths.userPlaylist },
    ...(userRole === "artist" ? [{ label: "Artist", to: routePaths.artistRoot }] : []),
  ];

  const handleNavigate = (to) => {
    setIsOpen(false);
    navigate(to);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout({ redirectTo: "/login" });
  };


  const testAccessToken = async () => {
    try {
      const response = await testAccessTokenService();
      console.log("Access token is valid:", response);
    } catch (error) {
      console.error("Access token is invalid:", error);
    }
  };

  return (
    <header
      className={[
        // 🔥 NHÉT THÊM "relative z-50" VÀO ĐẦU CHUỖI NÀY ĐỂ ĐẨY TOÀN BỘ HEADER LÊN TRÊN CÙNG
        "relative z-50 flex h-full items-center justify-between gap-2 border-b px-3 backdrop-blur-xl sm:gap-3 sm:px-4 lg:px-5",
        isDark
          ? "border-[#f5b66f]/10 bg-black text-[#f7f1ea]"
          : "border-[#eeeeee] bg-white text-[#111111]",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={[
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition lg:hidden",
            isDark
              ? "border-[#f5b66f]/10 bg-[#1c1820] text-[#f7f1ea] hover:bg-[#241f28]"
              : "border-[#e5e7eb] bg-white text-[#111111] hover:bg-[#f9fafb]",
          ].join(" ")}
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <img src={brandArtwork} alt="" className="h-9 w-9 shrink-0 sm:h-10 sm:w-10 lg:h-11 lg:w-11" />
        <div className="min-w-0">
          <p
            className={[
              "hidden text-[9px] uppercase tracking-[0.24em] sm:block sm:text-[10px] sm:tracking-[0.28em]",
              isDark ? "text-[#b8b0aa]" : "text-[#6b7280]",
            ].join(" ")}
          >
            Browse
          </p>
          <h2
            className={[
              "truncate font-title text-sm font-semibold sm:mt-0.5 sm:text-base lg:text-lg",
              isDark ? "text-[#f7f1ea]" : "text-[#111111]",
            ].join(" ")}
          >
            Discover Music
          </h2>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {isAuthenticated && (
          <button
            onClick={testAccessToken}
            className={[
              "hidden shrink-0 rounded-full border px-2.5 py-1.5 text-xs font-medium transition md:inline-flex md:px-3",
              isDark
                ? "border-[#f5b66f]/10 bg-[#1c1820] text-[#f7f1ea] hover:bg-[#241f28]"
                : "border-[#e5e7eb] bg-white text-[#111111] hover:bg-[#f9fafb]",
            ].join(" ")}
          >
            Test
          </button>
        )}

        <ThemeToggle />
        {isAuthenticated && <NotificationDropdown />}
        {isLoading ? (
          <div
            className={[
              "shrink-0 rounded-full border px-2 py-1.5 text-[11px] sm:px-3 sm:text-xs",
              isDark
                ? "border-[#f5b66f]/10 bg-[#1c1820] text-[#b8b0aa]"
                : "border-[#e5e7eb] bg-white text-[#6b7280]",
            ].join(" ")}
          >
            Loading...
          </div>
        ) : !isAuthenticated ? (
          <Link
            to="/login"
            className={[
              "inline-flex h-9 shrink-0 items-center rounded-full px-2.5 text-[11px] font-medium transition sm:px-3 sm:text-xs",
              isDark
                ? "bg-white text-black hover:bg-[#f5f5f5]"
                : "bg-black text-white hover:bg-[#1f1f1f]",
            ].join(" ")}
          >
            Login
          </Link>
        ) : (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsOpen((value) => !value)}
              className={[
                "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-1.5 pr-2 transition sm:max-w-none sm:gap-2 sm:px-3",
                isDark
                  ? "border-[#f5b66f]/10 bg-white text-black hover:bg-[#f5b66f]/20"
                  : "border-[#e5e7eb] bg-white text-[#111111] hover:bg-[#f9fafb]",
              ].join(" ")}
              aria-label="Open account menu"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-semibold text-white sm:hidden">
                {displayInitial}
              </span>
              <span className="hidden truncate text-xs sm:block sm:max-w-36">{displayName}</span>
              <ChevronDown className="hidden h-3.5 w-3.5 sm:block" />
            </button>

            {isOpen ? (
              <div
                className={[
                  "absolute right-0 top-full z-[100] mt-2 w-44 rounded-2xl border p-2 backdrop-blur-xl sm:w-52",
                  isDark
                    ? "border-[#f5b66f]/10 bg-[#151218]/95 shadow-[0_20px_60px_rgba(245,158,66,0.15)]"
                    : "border-[#e5e7eb] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]",
                ].join(" ")}
              >
                <div
                  className={[
                    "border-b px-3 py-2",
                    isDark ? "border-[#f5b66f]/10" : "border-[#f3f4f6]",
                  ].join(" ")}
                >
                  <p
                    className={[
                      "truncate text-xs font-medium sm:text-sm",
                      isDark ? "text-[#f7f1ea]" : "text-[#111111]",
                    ].join(" ")}
                  >
                    {displayName}
                  </p>
                  <p
                    className={[
                      "mt-1 text-xs uppercase tracking-[0.2em]",
                      isDark ? "text-[#b8b0aa]" : "text-[#6b7280]",
                    ].join(" ")}
                  >
                    {userRole || "member"}
                  </p>
                </div>

                <div className="py-2">
                  {menuItems.map((item) => (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => handleNavigate(item.to)}
                      className={[
                        "flex w-full rounded-xl px-3 py-1.5 text-left text-xs transition sm:text-sm",
                        isDark
                          ? "text-[#f7f1ea] hover:bg-[#241f28] hover:text-[#f5b66f]"
                          : "text-[#111111] hover:bg-[#f9fafb] hover:text-[#111111]",
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div
                  className={[
                    "border-t pt-2",
                    isDark ? "border-[#f5b66f]/10" : "border-[#f3f4f6]",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={[
                      "flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-xs transition sm:text-sm",
                      isDark
                        ? "text-[#f7f1ea] hover:bg-[#241f28] hover:text-[#f5b66f]"
                        : "text-[#111111] hover:bg-[#f9fafb] hover:text-[#111111]",
                    ].join(" ")}
                  >
                    <FontAwesomeIcon icon={faDoorClosed} className="text-xs sm:text-sm" />
                    Logout
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
