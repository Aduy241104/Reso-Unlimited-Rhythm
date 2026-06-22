import { Outlet } from "react-router-dom";
import {
  CircleDollarSign,
  CreditCard,
  Flag,
  LayoutDashboard,
  ListMusic,
  Mic2,
  Music2,
  Tags,
  UserCheck,
  Users,
} from "lucide-react";
import AdminSidebar from "../components/layout/AdminSidebar";
import { useAuth } from "../hooks/useAuth";
import { routePaths } from "../routes/routePaths";
import {
  LayoutDashboard,
  CircleDollarSign,
  Music2,
  UserCheck,
  ListMusic,
  Mic2,
  Tags,
  Users,
  Bell,
  Flag,
} from "lucide-react";

const navigationItems = [
  {
    to: routePaths.home,
    label: "Tổng quan",
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: routePaths.revenue,
    label: "Doanh thu",
    icon: CircleDollarSign,
    end: false,
  },
  {
    to: routePaths.systemTracks,
    label: "Kiểm duyệt track",
    icon: Music2,
    end: false,
  },
  {
    to: routePaths.artistRequests,
    label: "Yêu cầu artist",
    icon: UserCheck,
    end: false,
  },
  {
    to: routePaths.systemPlaylists,
    label: "Playlist hệ thống",
    icon: ListMusic,
    end: false,
  },
  {
    to: routePaths.systemArtists,
    label: "Artist hệ thống",
    icon: Mic2,
    end: false,
  },
  {
    to: routePaths.genres,
    label: "Thể loại",
    icon: Tags,
    end: false,
  },
  {
    to: routePaths.users,
    label: "Người dùng",
    icon: Users,
    end: false,
  },
  {
    to: routePaths.notifications,
    label: "Danh sách thông báo",
    icon: Bell,
    end: false,
  },
  {
    to: routePaths.reports,
    label: "Báo cáo",
    icon: Flag,
    end: false,
  },
  {
    to: routePaths.subscriptions,
    label: "Gói đăng ký",
    icon: CreditCard,
    end: false,
  },
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