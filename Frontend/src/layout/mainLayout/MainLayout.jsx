import { Outlet } from "react-router-dom";
import Header from "./Header";
import Player from "./Player";
import Sidebar from "./Sidebar";

const MainLayout = () => {
  return (
    <div className="grid h-screen grid-cols-[260px_minmax(0,1fr)] overflow-hidden bg-[#0f0f14] text-[#f7f1ea]">
      {/* Sidebar full height */ }
      <Sidebar />

      {/* Right side */ }
      <div className="grid grid-rows-[72px_minmax(0,1fr)] overflow-hidden">
        <Header />

        <main className="min-h-0 overflow-y-auto  px-4 py-5 pb-32 text-[#f7f1ea] [scrollbar-color:rgba(245,182,111,0.3)_#0f0f14] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#f5b66f]/30 [&::-webkit-scrollbar-track]:bg-[#0f0f14] [&::-webkit-scrollbar]:w-2">
          <Outlet />
        </main>
      </div>

      <Player />
    </div>
  );
};

export default MainLayout;
