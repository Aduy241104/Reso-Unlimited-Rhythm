import {
  BarChart3,
  FileText,
  LayoutDashboard,
  Music2,
  Settings,
  Waves,
  Album,
  UserRound,
} from "lucide-react";
import { routePaths } from "../../routes/routePaths";

export const artistNavigation = [
  {
    label: "Dashboard",
    to: routePaths.artistRoot,
    icon: LayoutDashboard,
  },
  {
    label: "Tracks",
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
    label: "Analytics",
    to: routePaths.artistAnalytics,
    icon: BarChart3,
  },
  {
    label: "Profile",
    to: routePaths.artistProfile,
    icon: UserRound,
  },
  {
    label: "Settings",
    to: routePaths.artistSettings,
    icon: Settings,
  },
];

export const artistPageTitles = {
  [routePaths.artistRoot]: "Artist Dashboard",
  [routePaths.artistMusic]: "Tracks",
  [routePaths.artistTrackDetail()]: "Track Detail",
  [routePaths.artistTrackEdit()]: "Edit Track",
  [routePaths.artistCreateTrack]: "Create Track",
  [routePaths.artistLyrics]: "Lyrics Management",
  [routePaths.artistAlbums]: "Albums",
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
