import { Outlet } from "react-router-dom";
import Header from "./Header";
import Player from "./Player";
import Sidebar from "./Sidebar";

const MainLayout = () => {
  return (
    <div className="grid h-screen grid-rows-[72px_minmax(0,1fr)] overflow-hidden text-white">
      <Header />

      <div className="grid min-h-0 grid-cols-[260px_minmax(0,1fr)] gap-2 px-2 pb-4">
        <Sidebar />
        <main className="min-h-0 overflow-y-auto rounded-[28px] bg-black px-4 py-5 pb-32 text-zinc-950 shadow-sm">
          <Outlet />
        </main>
      </div>

      <Player />
    </div>
  );
};

export default MainLayout;
