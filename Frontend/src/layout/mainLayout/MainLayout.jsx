import { Outlet } from "react-router-dom";
import Header from "./Header";
import Player from "./Player";
import Sidebar from "./Sidebar";

const MainLayout = () => {
  return (
    <div className="grid h-screen grid-cols-[260px_minmax(0,1fr)] overflow-hidden text-white">
      <Sidebar />

      <div className="grid min-h-0 grid-rows-[72px_minmax(0,1fr)]">
        <Header />
        <main className="min-h-0 overflow-y-auto px-6 py-5 pb-32">
          <Outlet />
        </main>
      </div>

      <Player />
    </div>
  );
};

export default MainLayout;
