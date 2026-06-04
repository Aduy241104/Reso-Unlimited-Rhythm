import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/layout/AdminSidebar";
import { useAuth } from "../hooks/useAuth";
import { routePaths } from "../routes/routePaths";

const navigationItems = [
  { to: routePaths.home, label: "Tổng quan", end: true },
  { to: routePaths.systemTracks, label: "Kiểm duyệt track", end: false },
  { to: routePaths.artistRequests, label: "Yêu cầu artist", end: false },
  { to: routePaths.systemPlaylists, label: "Playlist hệ thống", end: false },
  { to: routePaths.genres, label: "Thể loại", end: false },
  { to: routePaths.users, label: "Người dùng", end: false },
];

const AdminLayout = () => {
  const { logout, user } = useAuth();

  return (
    <div className="h-screen overflow-hidden bg-white text-black">
      <div className="flex h-full">
        <AdminSidebar
          navigationItems={navigationItems}
          onLogout={() => logout()}
          user={user}
        />

        <main className="min-w-0 flex-1 overflow-y-auto bg-white">
          <div className="min-h-full px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
