import {
  BarChart3,
  Disc3,
  FileText,
  LayoutDashboard,
  Music2,
  Settings,
  Users,
  Wallet,
  Waves,
  Album,
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
  [routePaths.artistProfile]: "Hồ sơ nghệ sĩ",
  [routePaths.artistProfileEdit]: "Chỉnh sửa hồ sơ nghệ sĩ",
};

export const artistProfile = {
  name: "Nghệ sĩ",
  role: "Tài khoản nghệ sĩ",
  icon: Waves,
};
