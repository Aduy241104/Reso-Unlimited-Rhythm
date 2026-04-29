import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

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

  return (
    <header className="flex h-full items-center justify-between border-b border-white/10 bg-zinc-900 px-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
          Browse
        </p>
        <h2 className="mt-1 font-title text-xl font-semibold">
          Discover Music
        </h2>
      </div>

      {isLoading ? (
        <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400">
          Loading...
        </div>
      ) : !isAuthenticated ? (
        <Link
          to="/login"
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
        >
          Login
        </Link>
      ) : (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            className="flex items-center gap-3 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/5"
          >
            <span className="max-w-40 truncate">{displayName}</span>
            <span className="text-xs text-zinc-500">v</span>
          </button>

          {isOpen ? (
            <div className="absolute right-0 top-full z-20 mt-3 w-56 rounded-2xl border border-white/10 bg-zinc-950 p-2 shadow-2xl">
              <div className="border-b border-white/10 px-3 py-2">
                <p className="truncate text-sm font-medium text-white">
                  {displayName}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  {userRole || "member"}
                </p>
              </div>

              <div className="py-2">
                {menuItems.map((item) => (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => handleNavigate(item.to)}
                    className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="border-t border-white/10 pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </header>
  );
};

export default Header;
