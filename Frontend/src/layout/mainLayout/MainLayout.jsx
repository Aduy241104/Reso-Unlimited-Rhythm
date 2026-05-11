import { Outlet } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import Header from "./Header";
import Player from "./Player";
import Sidebar from "./Sidebar";

const MainLayout = () => {
  const { isDark } = useTheme();

  return (
    <div className={[
      "grid h-screen grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden text-[#f7f1ea] md:grid-cols-[260px_minmax(0,1fr)] md:grid-rows-1",
      isDark ? "bg-black" : "bg-white",
    ].join(" ")}>

      <Sidebar />

      {/* Right side */ }
      <div
        className={[
          "grid min-w-0 grid-rows-[64px_minmax(0,1fr)] overflow-hidden md:grid-rows-[72px_minmax(0,1fr)]",
          isDark ? "bg-black" : "bg-white",
        ].join(" ")}
      >
        <Header />

        <main
          className={[
            "min-h-0 overflow-y-auto px-3 py-4 pb-40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#f5b66f]/30 [&::-webkit-scrollbar]:w-2 sm:px-4 sm:py-5 sm:pb-32",
            isDark
              ? "bg-black text-[#f7f1ea] [scrollbar-color:rgba(245,182,111,0.3)_#0f0f14] [&::-webkit-scrollbar-track]:bg-[#0f0f14]"
              : "bg-white text-[#111111] [scrollbar-color:rgba(209,213,219,0.9)_#ffffff] [&::-webkit-scrollbar-track]:bg-[#ffffff]",
          ].join(" ")}
        >
          <Outlet />
        </main>
      </div>

      <Player />
    </div>
  );
};

export default MainLayout;
