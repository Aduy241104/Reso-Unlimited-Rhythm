import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDoorClosed } from "@fortawesome/free-solid-svg-icons";
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "../../components/common/ThemeToggle";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { testAccessTokenService } from "../../services/authService";

const Header = () => {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const displayName = user?.name || user?.email || "User";
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
    { label: "Home", to: "/" },
    { label: "Profile", to: "/profile" },
    ...(userRole === "artist" ? [{ label: "Artist", to: "/artist" }] : []),
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
        "flex h-full items-center justify-between gap-3 border-b px-4 backdrop-blur-xl sm:px-6",
        isDark
          ? "border-[#f5b66f]/10 bg-black text-[#f7f1ea]"
          : "border-[#eeeeee] bg-white text-[#111111]",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <img src="src/assets/images/ChatGPT Image 13_16_10 4 thg 5, 2026.png" alt="" className="h-16 w-16" />
        <div className="min-w-0">
          <p
            className={[
              "text-[10px] uppercase tracking-[0.28em] sm:text-xs sm:tracking-[0.3em]",
              isDark ? "text-[#b8b0aa]" : "text-[#6b7280]",
            ].join(" ")}
          >
            Browse
          </p>
          <h2
            className={[
              "mt-1 truncate font-title text-lg font-semibold sm:text-xl",
              isDark ? "text-[#f7f1ea]" : "text-[#111111]",
            ].join(" ")}
          >
            Discover Music
          </h2>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        { isAuthenticated && (
          <button
            onClick={ testAccessToken }
            className={[
              "shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition sm:px-4",
              isDark
                ? "border-[#f5b66f]/10 bg-[#1c1820] text-[#f7f1ea] hover:bg-[#241f28]"
                : "border-[#e5e7eb] bg-white text-[#111111] hover:bg-[#f9fafb]",
            ].join(" ")}
          >
            Test
          </button>
        ) }

        <ThemeToggle />

        { isLoading ? (
          <div
            className={[
              "shrink-0 rounded-full border px-3 py-2 text-sm sm:px-4",
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
              "inline-flex shrink-0 items-center rounded-full px-3 py-2 text-sm font-medium transition sm:px-4",
              isDark
                ? "bg-white text-black hover:bg-[#f5f5f5]"
                : "bg-black text-white hover:bg-[#1f1f1f]",
            ].join(" ")}
          >
            Login
          </Link>
        ) : (
          <div className="relative shrink-0" ref={ menuRef }>
            <button
              type="button"
              onClick={ () => setIsOpen((value) => !value) }
              className={[
                "flex max-w-[10.5rem] items-center gap-2 rounded-full border px-3 py-2 text-sm transition sm:max-w-none sm:gap-3 sm:px-4",
                isDark
                  ? "border-[#f5b66f]/10 bg-white text-black hover:bg-[#f5b66f]/20"
                  : "border-[#e5e7eb] bg-white text-[#111111] hover:bg-[#f9fafb]",
              ].join(" ")}
            >
              <span className="truncate sm:max-w-40">{ displayName }</span>
              <span className="text-xs">v</span>
            </button>

            { isOpen ? (
              <div
                className={[
                  "absolute right-0 top-full z-[100] mt-3 w-48 rounded-2xl border p-2 backdrop-blur-xl sm:w-56",
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
                      "truncate text-sm font-medium",
                      isDark ? "text-[#f7f1ea]" : "text-[#111111]",
                    ].join(" ")}
                  >
                    { displayName }
                  </p>
                  <p
                    className={[
                      "mt-1 text-xs uppercase tracking-[0.2em]",
                      isDark ? "text-[#b8b0aa]" : "text-[#6b7280]",
                    ].join(" ")}
                  >
                    { userRole || "member" }
                  </p>
                </div>

                <div className="py-2">
                  { menuItems.map((item) => (
                    <button
                      key={ item.to }
                      type="button"
                      onClick={ () => handleNavigate(item.to) }
                      className={[
                        "flex w-full rounded-xl px-3 py-2 text-left text-sm transition",
                        isDark
                          ? "text-[#f7f1ea] hover:bg-[#241f28] hover:text-[#f5b66f]"
                          : "text-[#111111] hover:bg-[#f9fafb] hover:text-[#111111]",
                      ].join(" ")}
                    >
                      { item.label }
                    </button>
                  )) }
                </div>

                <div
                  className={[
                    "border-t pt-2",
                    isDark ? "border-[#f5b66f]/10" : "border-[#f3f4f6]",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={ handleLogout }
                    className={[
                      "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition",
                      isDark
                        ? "text-[#f7f1ea] hover:bg-[#241f28] hover:text-[#f5b66f]"
                        : "text-[#111111] hover:bg-[#f9fafb] hover:text-[#111111]",
                    ].join(" ")}
                  >
                    <FontAwesomeIcon icon={ faDoorClosed } className="text-sm" />
                    Logout
                  </button>
                </div>
              </div>
            ) : null }
          </div>
        ) }
      </div>
    </header>
  );
};

export default Header;
