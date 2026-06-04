import MainLayout from "../layout/mainLayout/MainLayout";
import UserPlaylistPage from "../pages/userPlaylist/UserPlaylistPage";
import { routePaths } from "./routePaths";

export const userPlaylistRoutes = [
  {
    element: <MainLayout />,
    children: [
      {
        path: routePaths.userPlaylist,
        element: <UserPlaylistPage />,
      },
    ],
  },
];
