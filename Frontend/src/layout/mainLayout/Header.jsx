import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import brandArtwork from "../../assets/images/ChatGPT Image 13_16_10 4 thg 5, 2026.png";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { routePaths } from "../../routes/routePaths";
import { hasPremiumAccess } from "../../utils/premiumAccess";
import AccountMenu from "./AccountMenu";

const Header = ({ onToggleSidebar }) => {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const { isDark } = useTheme();
  const isPremiumUser = hasPremiumAccess(user);

  return (
    <header
      className={[
        "relative z-40 flex h-full items-center justify-between gap-2 border-b px-3 backdrop-blur-xl sm:gap-3 sm:px-4 lg:px-5",
        isDark
          ? "border-[#f5b66f]/10 bg-black text-[#f7f1ea]"
          : "border-[#eeeeee] bg-white text-[#111111]",
      ].join(" ") }
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={ onToggleSidebar }
          className={[
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition lg:hidden",
            isDark
              ? "border-[#f5b66f]/10 bg-[#1c1820] text-[#f7f1ea] hover:bg-[#241f28]"
              : "border-[#e5e7eb] bg-white text-[#111111] hover:bg-[#f9fafb]",
          ].join(" ") }
          aria-label="Mở menu điều hướng"
        >
          <Menu className="h-4 w-4" />
        </button>

        <Link
          to={ routePaths.home }
          className="hidden min-w-0 items-center gap-2 sm:flex sm:gap-3"
          aria-label="Về trang chủ"
        >
          <img
            src={ brandArtwork }
            alt="Logo Reso Unlimited Rhythm"
            className="h-9 w-9 shrink-0 sm:h-10 sm:w-10 lg:h-11 lg:w-11"
          />
          <div className="min-w-0">
            <p
              className={[
                "hidden text-[9px] uppercase tracking-[0.24em] sm:block sm:text-[10px] sm:tracking-[0.28em]",
                isPremiumUser
                  ? "text-[#f5b66f]"
                  : isDark
                    ? "text-[#b8b0aa]"
                    : "text-[#6b7280]",
              ].join(" ") }
            >
              { isPremiumUser ? "PREMIUM" : "Khám phá" }
            </p>
            <h2
              className={[
                "truncate font-title text-sm font-semibold sm:mt-0.5 sm:text-base lg:text-lg",
                isDark ? "text-[#f7f1ea]" : "text-[#111111]",
              ].join(" ") }
            >
              Khám phá âm nhạc
            </h2>
          </div>
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        { isAuthenticated && !isPremiumUser ? (
          <Link
            to={ routePaths.premium }
            className={[
              "hidden shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition md:inline-flex",
              isDark
                ? "bg-white text-black hover:bg-[#f8c886]"
                : "bg-black text-white hover:bg-[#1f1f1f]",
            ].join(" ") }
          >
            Nâng cấp Premium
          </Link>
        ) : null }

        { isLoading ? (
          <div
            className={[
              "shrink-0 rounded-full border px-2 py-1.5 text-[11px] sm:px-3 sm:text-xs",
              isDark
                ? "border-[#f5b66f]/10 bg-[#1c1820] text-[#b8b0aa]"
                : "border-[#e5e7eb] bg-white text-[#6b7280]",
            ].join(" ") }
          >
            Đang tải...
          </div>
        ) : !isAuthenticated ? (
          <Link
            to="/login"
            className={[
              "inline-flex h-9 shrink-0 items-center rounded-full px-2.5 text-[11px] font-medium transition sm:px-3 sm:text-xs",
              isDark
                ? "bg-white text-black hover:bg-[#f5f5f5]"
                : "bg-black text-white hover:bg-[#1f1f1f]",
            ].join(" ") }
          >
            Đăng nhập
          </Link>
        ) : (
          <AccountMenu user={ user } onLogout={ logout } />
        ) }
      </div>
    </header>
  );
};

export default Header;
