import { useState } from "react";
import { Settings, LogOut, ChevronUp } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const AdminSidebar = ({ navigationItems, onLogout, user }) => {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const { pathname } = useLocation();

  const handleLogout = () => {
    setIsAccountOpen(false);
    onLogout();
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col bg-black text-white">
      <div className="px-6 py-4">
        <h1 className="text-2xl font-semibold">Quản trị hệ thống</h1>
      </div>

      <div className="border-t border-white/10 px-6 py-6">
        <nav className="mt-3 -mx-6 space-y-1">
          { navigationItems.map((item) => {
            const Icon = item.icon;
            const activePaths = item.activePaths || [item.to];
            const isPrefixActive = item.matchPrefix && activePaths.some((path) => (
              pathname === path || pathname.startsWith(`${path}/`)
            ));

            return (
              <NavLink
                key={ item.to }
                to={ item.to }
                end={ item.end !== false }
                className={ ({ isActive }) =>
                  `mx-3 block rounded-r-xl border-l transition-all duration-200 ${isPrefixActive || isActive
                    ? "border-white bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.12)]"
                    : "border-transparent text-white/45 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
                  }`
                }
              >
                <div className="flex items-center gap-3 px-5 py-3 text-sm font-medium">
                  { Icon ? <Icon size={ 18 } strokeWidth={ 2 } /> : null }
                  <span>{ item.label }</span>
                </div>
              </NavLink>
            );
          }) }
        </nav>
      </div>

      <div className="relative mt-auto border-t border-white/10 px-6 py-5">
        {isAccountOpen ? (
          <div className="absolute inset-x-6 bottom-[calc(100%-0.75rem)] rounded-2xl border border-white/10 bg-[#111111] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.38)]">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
                  Tài khoản
                </p>
                <p className="mt-3 truncate text-sm font-semibold">
                  {user?.username || user?.email || "Quản trị viên"}
                </p>
                <p className="mt-1 break-all text-sm text-white/60">
                  {user?.email || "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAccountOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Đóng menu tài khoản"
              >
                <ChevronUp size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setIsAccountOpen((current) => !current)}
          aria-expanded={isAccountOpen}
          aria-label="Mở menu tài khoản"
          className={`flex h-12 w-12 items-center justify-center rounded-full border text-white transition ${
            isAccountOpen
              ? "border-white/20 bg-white/12"
              : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
          }`}
        >
          <Settings
            size={18}
            className={isAccountOpen ? "rotate-90 transition-transform duration-200" : "transition-transform duration-200"}
          />
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
