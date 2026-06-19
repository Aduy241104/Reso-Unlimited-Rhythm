import { Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import SystemPlaylistsLayout from "../layouts/SystemPlaylistsLayout";
import LoginPage from "../pages/auth/LoginPage";
import CreateSystemPlaylistPage from "../pages/systemPlaylists/CreateSystemPlaylistPage";
import SystemPlaylistDetailPage from "../pages/systemPlaylists/SystemPlaylistDetailPage";
import SystemPlaylistEditPage from "../pages/systemPlaylists/SystemPlaylistEditPage";
import SystemPlaylistsListPage from "../pages/systemPlaylists/SystemPlaylistsListPage";
import SystemTracksListPage from "../pages/systemTracks/SystemTracksListPage";
import TrackDetailPage from "../pages/systemTracks/SystemTracksDetailPage";
import GenresListPage from "../pages/systemGenres/GenresListPage";
import CreateGenrePage from "../pages/systemGenres/CreateGenrePage";
import EditGenrePage from "../pages/systemGenres/EditGenrePage";
import HomePage from "../pages/dashboard/DashboardPage";
import RevenueManagementPage from "../pages/revenue/RevenueManagementPage";
import RevenueHistoryPage from "../pages/revenue/RevenueHistoryPage";
import RevenuePeriodDetailPage from "../pages/revenue/RevenuePeriodDetailPage";
import RevenueSharingHistoryPage from "../pages/revenue/RevenueSharingHistoryPage";
import RevenueSharingWorkflowDetailPage from "../pages/revenue/RevenueSharingWorkflowDetailPage";
import UsersListPage from "../pages/users/UsersListPage";
import UserDetailPage from "../pages/users/UserDetailPage";
import ArtistRequestsListPage from "../pages/artistRequests/ArtistRequestsListPage";
import ArtistRequestDetailPage from "../pages/artistRequests/ArtistRequestDetailPage";
import SystemArtistsListPage from "../pages/artist/SystemArtistsListPage";
import SystemArtistDetailPage from "../pages/artist/ArtistDetailPage";
import SystemTracksModerationPage from "../pages/systemTracks/SystemTracksModerationPage";
import AdminListPage from "../pages/users/AdminListPage";
import ReportsListPage from "../pages/reports/ReportsListPage";
import ReportDetailPage from "../pages/reports/ReportDetailPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import RoleRoute from "./RoleRoute";
import { routePaths } from "./routePaths";

export const appRoutes = [
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleRoute allowedRoles={["admin"]} />,
        children: [
          {
            path: routePaths.home,
            element: <AdminLayout />,
            children: [
              {
                index: true,
                element: <HomePage />,
              },
              {
                path: "system-playlists",
                element: <SystemPlaylistsLayout />,
                children: [
                  {
                    index: true,
                    element: <SystemPlaylistsListPage />,
                  },
                  {
                    path: "new",
                    element: <CreateSystemPlaylistPage />,
                  },
                  {
                    path: ":playlistId/edit",
                    element: <SystemPlaylistEditPage />,
                  },
                  {
                    path: ":playlistId",
                    element: <SystemPlaylistDetailPage />,
                  },
                ],
              },
              {
                path: "revenue",
                element: <RevenueManagementPage />,
              },
              {
                path: "revenue/history",
                element: <RevenueHistoryPage />,
              },
              {
                path: "revenue/history/:year/:month",
                element: <RevenuePeriodDetailPage />,
              },
              {
                path: "revenue-sharing",
                element: <RevenueSharingHistoryPage />,
              },
              {
                path: "revenue-sharing/:periodId",
                element: <RevenueSharingWorkflowDetailPage />,
              },
              {
                path: "users",
                element: <UsersListPage />,
              },
              {
                path: "users/:userId",
                element: <UserDetailPage />,
              },
              {
                path: "users/admins",
                element: <AdminListPage />,
              },
              {
                path: "system-tracks",
                element: <SystemTracksListPage />,
              },
              {
                path: "system-tracks/moderation",
                element: <SystemTracksModerationPage />,
              },
              {
                path: "artist-requests",
                element: <ArtistRequestsListPage />,
              },
              {
                path: "artist-requests/:requestId",
                element: <ArtistRequestDetailPage />,
              },
              {
                path: "system-artists",
                element: <SystemArtistsListPage />,
              },
              {
                path: "system-artists/:id",
                element: <SystemArtistDetailPage />,
              },
              {
                path: "system-tracks/:id",
                element: <TrackDetailPage />,
              },
              {
                path: "genres",
                element: <GenresListPage />,
              },
              {
                path: "genres/new",
                element: <CreateGenrePage />,
              },
              {
                path: "genres/:genreId/edit",
                element: <EditGenrePage />,
              },
              {
                path: "reports",
                element: <ReportsListPage />,
              },
              {
                path: "reports/:reportId",
                element: <ReportDetailPage />,
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
    ],
  },
  {
    path: "*",
    element: <Navigate to={routePaths.home} replace />,
  },
];
