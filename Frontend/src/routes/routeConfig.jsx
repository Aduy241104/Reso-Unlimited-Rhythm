import { Navigate } from "react-router-dom";
import ArtistDashboardLayout from "../layout/artistDashboard/ArtistDashboardLayout";
import MainLayout from "../layout/mainLayout/MainLayout";
import AlbumDetailPage from "../pages/album/AlbumDetailPage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ArtistOverviewPage from "../pages/artist/ArtistOverviewPage";
import ArtistProfileEditPage from "../pages/artist/ArtistProfileEditPage";
import ArtistProfilePage from "../pages/artist/ArtistProfilePage";
import {
  AnalyticsPage,
  FansPage,
  MyMusicPage,
  ReleasesPage,
  RoyaltiesPage,
  SettingsPage,
} from "../pages/artist/ArtistSectionPages";
import CreateTrackPage from "../pages/artist/CreateTrackPage";
import HomePage from "../pages/home/HomePage";
import ProfilePage from "../pages/profile/ProfilePage";
import TrackDetailPage from "../pages/track/TrackDetailPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import RoleRoute from "./RoleRoute";
import { routePaths } from "./routePaths";

export const appRoutes = [
  {
    element: <MainLayout />,
    children: [
      {
        path: routePaths.home,
        element: <HomePage />,
      },
      {
        path: routePaths.albumDetail(),
        element: <AlbumDetailPage />,
      },
      {
        path: routePaths.trackDetail(),
        element: <TrackDetailPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: routePaths.profile,
            element: <ProfilePage />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleRoute allowedRoles={["artist"]} />,
        children: [
          {
            path: routePaths.artistRoot,
            element: <ArtistDashboardLayout />,
            children: [
              {
                index: true,
                element: <ArtistOverviewPage />,
              },
              {
                path: routePaths.artistMusic,
                element: <MyMusicPage />,
              },
              {
                path: routePaths.artistCreateTrack,
                element: <CreateTrackPage />,
              },
              {
                path: routePaths.artistReleases,
                element: <ReleasesPage />,
              },
              {
                path: routePaths.artistAnalytics,
                element: <AnalyticsPage />,
              },
              {
                path: routePaths.artistFans,
                element: <FansPage />,
              },
              {
                path: routePaths.artistRoyalties,
                element: <RoyaltiesPage />,
              },
              {
                path: routePaths.artistSettings,
                element: <SettingsPage />,
              },
              {
                path: routePaths.artistProfileEdit,
                element: <ArtistProfileEditPage />,
              },
              {
                path: routePaths.artistProfile,
                element: <ArtistProfilePage />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <PublicRoute />,
    children: [
      {
        path: routePaths.login,
        element: <LoginPage />,
      },
      {
        path: routePaths.register,
        element: <RegisterPage />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to={routePaths.home} replace />,
  },
];
