import { Outlet } from "react-router-dom";
import Header from "./Header";
import Player from "./Player";
import Sidebar from "./Sidebar";

const MainLayout = () => {
  return (
    <div className="grid h-screen grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-black text-[#f7f1ea] md:grid-cols-[260px_minmax(0,1fr)] md:grid-rows-1">
      {/* Sidebar full height */ }
      <Sidebar />

      {/* Right side */ }
      <div className="grid min-w-0 grid-rows-[64px_minmax(0,1fr)] overflow-hidden md:grid-rows-[72px_minmax(0,1fr)]">
        <Header />

        <main className="min-h-0 overflow-y-auto px-3 py-4 pb-40 text-[#f7f1ea] [scrollbar-color:rgba(245,182,111,0.3)_#0f0f14] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#f5b66f]/30 [&::-webkit-scrollbar-track]:bg-[#0f0f14] [&::-webkit-scrollbar]:w-2 sm:px-4 sm:py-5 sm:pb-32">
          <Outlet />
        </main>
      </div>

      <Player />
    </div>
  );
};

export default MainLayout;
