import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Profile", to: "/profile" },
  { label: "Admin", to: "/admin" },
  { label: "Artist", to: "/artist" },
];

const Sidebar = () => {
  return (
    <aside className="flex h-full flex-col overflow-y-auto rounded-[17px] border border-white/10 bg-[#5D5958] px-4 py-5 pb-32 shadow-sm">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Music App
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Library
        </h1>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        { navItems.map((item) => (
          <NavLink
            key={ item.to }
            to={ item.to }
            className={ ({ isActive }) =>
              [
                "rounded-xl px-4 py-3 text-sm transition",
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              ].join(" ")
            }
          >
            { item.label }
          </NavLink>
        )) }
      </nav>
    </aside>
  );
};

export default Sidebar;
