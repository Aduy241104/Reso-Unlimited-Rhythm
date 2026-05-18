import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/layout/AdminSidebar";
import { useAuth } from "../hooks/useAuth";
import { routePaths } from "../routes/routePaths";

const navigationItems = [
  { to: routePaths.home, label: "Dashboard", end: true },
  { to: routePaths.systemTracks, label: "Track moderation", end: false },
  { to: routePaths.systemPlaylists, label: "System playlists", end: false },
  { to: routePaths.users, label: "Users", end: false },
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
