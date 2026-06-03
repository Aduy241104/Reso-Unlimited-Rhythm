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
    label: "Overview",
    to: routePaths.artistRoot,
    icon: LayoutDashboard,
  },
  {
    label: "My Music",
    to: routePaths.artistMusic,
    icon: Music2,
  },
  {
    label: "Lyrics",
    to: routePaths.artistLyrics,
    icon: FileText,
  },
  {
    label: "Albums",
    to: routePaths.artistAlbums,
    icon: Album,
  },
  {
    label: "Releases",
    to: routePaths.artistReleases,
    icon: Disc3,
  },
  {
    label: "Analytics",
    to: routePaths.artistAnalytics,
    icon: BarChart3,
  },
];

export const artistPageTitles = {
  [routePaths.artistRoot]: "Artist Overview",
  [routePaths.artistMusic]: "My Music",
  [routePaths.artistTrackDetail()]: "Track Detail",
  [routePaths.artistTrackEdit()]: "Edit Track",
  [routePaths.artistLyrics]: "Lyrics Management",
  [routePaths.artistAlbums]: "My Albums",
  [routePaths.artistReleases]: "Releases",
  [routePaths.artistAnalytics]: "Analytics",
  [routePaths.artistProfile]: "Artist Profile",
  [routePaths.artistProfileEdit]: "Edit Artist Profile",
};

export const artistProfile = {
  name: "Artist",
  role: "Artist account",
  icon: Waves,
};
