import { NavLink } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";

const navItems = [
  { label: "Home", to: routePaths.home },
  { label: "Artist Profile", to: routePaths.artistProfile("featured") },
  { label: "Artist", to: routePaths.artistRoot },
];

const Sidebar = () => {
  return (
    <aside className="
            mx-3 mb-0 mt-3 flex h-auto flex-col overflow-x-auto overflow-y-hidden 
            rounded-tr-2xl rounded-br-2xl
            border border-[#f5b66f]/10 bg-[#151218] px-4 py-4 text-[#f7f1ea] 
            [scrollbar-color:rgba(245,182,111,0.3)_#0f0f14] 
            [&::-webkit-scrollbar-thumb]:rounded-full 
            [&::-webkit-scrollbar-thumb]:bg-[#f5b66f]/30 
            [&::-webkit-scrollbar-track]:bg-[#0f0f14] 
            [&::-webkit-scrollbar]:h-1.5 
            md:mx-0 md:mt-0 md:h-full md:overflow-x-hidden md:overflow-y-auto 
            md:rounded-tr-[28px] md:rounded-br-[28px]
            md:border-r md:px-4 md:py-5 md:pb-32 md:[&::-webkit-scrollbar]:w-2"
    >
      <div className="mb-4 shrink-0 md:mb-8">

        <div>
          <h1 className="mt-1 text-xl font-semibold text-[#f7f1ea] md:mt-2 md:text-2xl">
            Library
          </h1>
        </div>
      </div>

      <nav className="flex min-w-max flex-1 flex-row gap-2 md:min-w-0 md:flex-col">
        { navItems.map((item) => (
          <NavLink
            key={ item.to }
            to={ item.to }
            className={ ({ isActive }) =>
              [
                "whitespace-nowrap rounded-xl px-4 py-2.5 text-sm transition md:px-4 md:py-3",
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
