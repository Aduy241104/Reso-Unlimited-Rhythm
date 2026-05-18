import { Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import SystemPlaylistsLayout from "../layouts/SystemPlaylistsLayout";
import LoginPage from "../pages/auth/LoginPage";
import CreateSystemPlaylistPage from "../pages/systemPlaylists/CreateSystemPlaylistPage";
import SystemPlaylistDetailPage from "../pages/systemPlaylists/SystemPlaylistDetailPage";
import SystemPlaylistEditPage from "../pages/systemPlaylists/SystemPlaylistEditPage";
import SystemPlaylistsListPage from "../pages/systemPlaylists/SystemPlaylistsListPage";
import SystemTracksListPage from "../pages/systemTracks/SystemTracksListPage";
import HomePage from "../pages/home/HomePage";
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
                path: "system-tracks",
                element: <SystemTracksListPage />,
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
