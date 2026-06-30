import {
  Album,
  BarChart3,
  Bell,
  Disc3,
  FileText,
  Landmark,
  LayoutDashboard,
  Music2,
  Users,
  Wallet,
  Waves,
} from "lucide-react";
import { routePaths } from "../../routes/routePaths";

export const artistNavigation = [
  {
    label: "Tổng quan",
    to: routePaths.artistRoot,
    icon: LayoutDashboard,
  },
  {
    label: "Nhạc của tôi",
    to: routePaths.artistMusic,
    icon: Music2,
  },
  {
    label: "Lời nhạc",
    to: routePaths.artistLyrics,
    icon: FileText,
  },
  {
    label: "Album",
    to: routePaths.artistAlbums,
    icon: Album,
  },
  {
    label: "Phát hành",
    to: routePaths.artistReleases,
    icon: Disc3,
  },
  {
    label: "Phân tích bài hát",
    to: routePaths.artistAnalytics,
    icon: BarChart3,
  },
  {
    label: "Số dư",
    to: routePaths.artistRoyalties,
    icon: Wallet,
  },
  {
    label: "Yêu cầu rút tiền",
    to: routePaths.artistWithdrawalRequests,
    icon: Landmark,
  },
  {
    label: "Thông báo",
    to: routePaths.artistNotifications,
    icon: Bell,
  },
  {
    label: "Người theo dõi",
    to: routePaths.artistFollowers,
    icon: Users,
  },
  {
    label: "Hồ sơ nghệ sĩ",
    to: routePaths.artistProfile,
    icon: BarChart3,
  },
];

export const artistPageTitles = {
  [routePaths.artistRoot]: "Tổng quan nghệ sĩ",
  [routePaths.artistMusic]: "Nhạc của tôi",
  [routePaths.artistTrackDetail()]: "Chi tiết bài hát",
  [routePaths.artistTrackEdit()]: "Chỉnh sửa bài hát",
  [routePaths.artistLyrics]: "Quản lý lời nhạc",
  [routePaths.artistAlbums]: "Album của tôi",
  [routePaths.artistReleases]: "Phát hành",
  [routePaths.artistAnalytics]: "Phân tích bài hát",
  [routePaths.artistRoyalties]: "Số dư khả dụng",
  [routePaths.artistWithdrawalRequests]: "Yêu cầu rút tiền",
  [routePaths.artistNotifications]: "Thông báo",
  [routePaths.artistFollowers]: "Người theo dõi",
  [routePaths.artistProfile]: "Hồ sơ nghệ sĩ",
  [routePaths.artistProfileEdit]: "Chỉnh sửa hồ sơ nghệ sĩ",
};

export const artistProfile = {
  name: "Nghệ sĩ",
  role: "Tài khoản nghệ sĩ",
  icon: Waves,
};