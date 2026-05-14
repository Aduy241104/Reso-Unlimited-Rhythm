import { NavLink } from "react-router-dom";

const AdminSidebar = ({ navigationItems, onLogout, user }) => {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col bg-black text-white">
      <div className="px-6 py-4">
        <h1 className="text-2xl font-semibold">Admin Panel</h1>
      </div>

      <div className="border-t border-white/10 px-6 py-6">
        <nav className="mt-3 -mx-6 space-y-1">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end !== false}
              className={({ isActive }) =>
                `mx-3 block rounded-r-xl border-l transition-all duration-200 ${isActive
                  ? "border-white bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.12)]"
                  : "border-transparent text-white/45 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
                }`
              }
            >
              <div className="px-5 py-3 text-sm font-medium">
                { item.label }
              </div>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/10 px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
          Account
        </p>
        <div className="mt-4">
          <p className="text-sm font-semibold">
            {user?.username || user?.email || "Admin"}
          </p>
          <p className="mt-1 break-all text-sm text-white/60">
            {user?.email || "-"}
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-5 w-full rounded-md border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
