import MainLayout from "../layout/mainLayout/MainLayout";
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
    ],
  },
];
