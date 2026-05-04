import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDoorClosed } from "@fortawesome/free-solid-svg-icons";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { testAccessTokenService } from "../../services/authService";

const Header = () => {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
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
    ...(userRole === "admin" ? [{ label: "Admin", to: "/admin" }] : []),
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
    <header className="flex h-full items-center justify-between gap-3 border-b border-[#f5b66f]/10 bg-black px-4 text-[#f7f1ea] backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <img src="src/assets/images/ChatGPT Image 13_16_10 4 thg 5, 2026.png" alt="" className="h-16 w-16" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#b8b0aa] sm:text-xs sm:tracking-[0.3em]">
            Browse
          </p>
          <h2 className="mt-1 truncate font-title text-lg font-semibold text-[#f7f1ea] sm:text-xl">
            Discover Music
          </h2>
        </div>
      </div>

      { isAuthenticated && (
        <button
          onClick={ testAccessToken }
          className="shrink-0 rounded-full border border-[#f5b66f]/10 bg-[#1c1820] px-3 py-2 text-sm font-medium text-[#f7f1ea] transition hover:bg-[#241f28] sm:px-4"
        >
          Test
        </button>
      ) }

      { isLoading ? (
        <div className="shrink-0 rounded-full border border-[#f5b66f]/10 bg-[#1c1820] px-3 py-2 text-sm text-[#b8b0aa] sm:px-4">
          Loading...
        </div>
      ) : !isAuthenticated ? (
        <Link
          to="/login"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white to-[#d98235] px-3 py-2 text-sm font-medium text-black transition hover:brightness-105 sm:px-4"
        >
          Login
        </Link>
      ) : (
        <div className="relative shrink-0" ref={ menuRef }>
          <button
            type="button"
            onClick={ () => setIsOpen((value) => !value) }
            className="flex max-w-[10.5rem] items-center gap-2 rounded-full border border-[#f5b66f]/10 bg-white px-3 py-2 text-sm text-black transition hover:bg-[#f5b66f]/20 sm:max-w-none sm:gap-3 sm:px-4"
          >
            <span className="truncate sm:max-w-40">{ displayName }</span>
            <span className="text-xs text-black">v</span>
          </button>

          { isOpen ? (
            <div className="absolute right-0 top-full z-20 mt-3 w-48 rounded-2xl border border-[#f5b66f]/10 bg-[#151218]/95 p-2 shadow-[0_20px_60px_rgba(245,158,66,0.15)] backdrop-blur-xl sm:w-56">
              <div className="border-b border-[#f5b66f]/10 px-3 py-2">
                <p className="truncate text-sm font-medium text-[#f7f1ea]">
                  { displayName }
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#b8b0aa]">
                  { userRole || "member" }
                </p>
              </div>

              <div className="py-2">
                { menuItems.map((item) => (
                  <button
                    key={ item.to }
                    type="button"
                    onClick={ () => handleNavigate(item.to) }
                    className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-[#f7f1ea] transition hover:bg-[#241f28] hover:text-[#f5b66f]"
                  >
                    { item.label }
                  </button>
                )) }
              </div>

              <div className="border-t border-[#f5b66f]/10 pt-2">
                <button
                  type="button"
                  onClick={ handleLogout }
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[#f7f1ea] transition hover:bg-[#241f28] hover:text-[#f5b66f]"
                >
                  <FontAwesomeIcon icon={ faDoorClosed } className="text-sm" />
                  Logout
                </button>
              </div>
            </div>
          ) : null }
        </div>
      ) }
    </header>
  );
};

export default Header;
