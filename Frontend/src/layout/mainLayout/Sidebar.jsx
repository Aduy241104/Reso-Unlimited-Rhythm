import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Profile", to: "/profile" },
  { label: "Admin", to: "/admin" },
  { label: "Artist", to: "/artist" },
];

const Sidebar = () => {
  return (
    <aside className="flex h-full flex-col overflow-y-auto rounded-[28px] border-r border-[#f5b66f]/10 bg-[#151218] px-4 py-5 pb-32 text-[#f7f1ea] [scrollbar-color:rgba(245,182,111,0.3)_#0f0f14] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#f5b66f]/30 [&::-webkit-scrollbar-track]:bg-[#0f0f14] [&::-webkit-scrollbar]:w-2">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-[#b8b0aa]">
          Music App
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#f7f1ea]">
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
                  ? "bg-gradient-to-r from-[#f5b66f]/20 to-transparent text-[#f5b66f]"
                  : "text-[#b8b0aa] hover:bg-[#241f28] hover:text-[#f7f1ea]",
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
