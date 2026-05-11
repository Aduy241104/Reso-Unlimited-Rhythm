import {
  BarChart3,
  Disc3,
  LayoutDashboard,
  Music2,
  Settings,
  Users,
  Wallet,
  Waves,
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
  [routePaths.artistReleases]: "Releases",
  [routePaths.artistAnalytics]: "Analytics",
};

export const artistProfile = {
  name: "Avery Stone",
  role: "Independent Artist",
  icon: Waves,
};
