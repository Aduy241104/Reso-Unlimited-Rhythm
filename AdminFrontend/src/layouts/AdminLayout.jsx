import { Outlet } from "react-router-dom";
import {
  Banknote,
  Bell,
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

const navigationItems = [
  {
    to: routePaths.home,
    label: "T\u1ed5ng quan",
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
    to: routePaths.withdrawals,
    label: "Yêu cầu rút tiền",
    icon: Banknote,
    end: false,
    matchPrefix: true,
    activePaths: [routePaths.withdrawals, "/withdrawal-requests"],
  },
  {
    to: routePaths.systemTracks,
    label: "Bài hát hệ thống",
    icon: Music2,
    end: false,
  },
  {
    to: routePaths.artistRequests,
    label: "Yêu cầu nghệ sĩ",
    icon: UserCheck,
    end: false,
  },
  {
    to: routePaths.systemPlaylists,
    label: "Playlist h\u1ec7 th\u1ed1ng",
    icon: ListMusic,
    end: false,
  },
  {
    to: routePaths.systemArtists,
    label: "Nghệ sĩ hệ thống",
    icon: Mic2,
    end: false,
  },
  {
    to: routePaths.genres,
    label: "Th\u1ec3 lo\u1ea1i",
    icon: Tags,
    end: false,
  },
  {
    to: routePaths.users,
    label: "Ng\u01b0\u1eddi d\u00f9ng",
    icon: Users,
    end: false,
  },
  {
    to: routePaths.notifications,
    label: "Thông báo",
    icon: Bell,
    end: false,
  },
  {
    to: routePaths.reports,
    label: "B\u00e1o c\u00e1o",
    icon: Flag,
    end: false,
  },
  {
    to: routePaths.subscriptions,
    label: "G\u00f3i \u0111\u0103ng k\u00fd",
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
