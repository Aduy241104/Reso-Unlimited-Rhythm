import MainLayout from "../layout/mainLayout/MainLayout";
import RecommendationMixDetailPage from "../pages/recommendation/RecommendationMixDetailPage";
import { routePaths } from "./routePaths";

export const recommendationRoutes = [
  {
    element: <MainLayout />,
    children: [
      {
        path: routePaths.recommendationMixDetail(),
        element: <RecommendationMixDetailPage />,
      },
    ],
  },
];
