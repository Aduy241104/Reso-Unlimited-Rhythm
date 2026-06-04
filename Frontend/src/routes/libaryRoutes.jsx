import MainLayout from "../layout/mainLayout/MainLayout";
import LibaryAlbumPage from "../pages/libary/LibaryAlbumPage";
import LibaryPage from "../pages/libary/LibaryPage";
import { routePaths } from "./routePaths";

export const libaryRoutes = [
  {
    element: <MainLayout />,
    children: [
      {
        path: routePaths.libraryFollowedArtists,
        element: <LibaryPage />,
      },
      {
        path: routePaths.libraryFollowedAlbums,
        element: <LibaryAlbumPage />,
      },
    ],
  },
];
