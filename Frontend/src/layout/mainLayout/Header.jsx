import { useEffect, useRef, useState } from "react";
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
    <header className="flex h-full items-center justify-between border-b border-[#f5b66f]/10 bg-[#121118]/80 px-6 text-[#f7f1ea] backdrop-blur-xl">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#b8b0aa]">
          Browse
        </p>
        <h2 className="mt-1 font-title text-xl font-semibold text-[#f7f1ea]">
          Discover Music
        </h2>
      </div>

      { isAuthenticated && (
        <button
          onClick={ testAccessToken }
          className="rounded-full border border-[#f5b66f]/10 bg-[#1c1820] px-4 py-2 text-sm font-medium text-[#f7f1ea] transition hover:bg-[#241f28]"
        >
          Test
        </button>
      ) }

      { isLoading ? (
        <div className="rounded-full border border-[#f5b66f]/10 bg-[#1c1820] px-4 py-2 text-sm text-[#b8b0aa]">
          Loading...
        </div>
      ) : !isAuthenticated ? (
        <Link
          to="/login"
          className="rounded-full bg-gradient-to-r from-[#f5b66f] to-[#d98235] px-4 py-2 text-sm font-medium text-black transition hover:brightness-105"
        >
          Login
        </Link>
      ) : (
        <div className="relative" ref={ menuRef }>
          <button
            type="button"
            onClick={ () => setIsOpen((value) => !value) }
            className="flex items-center gap-3 rounded-full border border-[#f5b66f]/10 bg-white px-4 py-2 text-sm text-black transition hover:bg-[#f5b66f]/20"
          >
            <span className="max-w-40 truncate">{ displayName }</span>
            <span className="text-xs text-black">v</span>
          </button>

          { isOpen ? (
            <div className="absolute right-0 top-full z-20 mt-3 w-56 rounded-2xl border border-[#f5b66f]/10 bg-[#151218]/95 p-2 shadow-[0_20px_60px_rgba(245,158,66,0.15)] backdrop-blur-xl">
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
                  className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-[#f7f1ea] transition hover:bg-[#241f28] hover:text-[#f5b66f]"
                >
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
