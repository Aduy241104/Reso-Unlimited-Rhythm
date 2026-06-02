import UserProfilePage from "../pages/user/UserProfilePage";
import { routePaths } from "./routePaths";

export const userProfileRoutes = [
  {
    path: routePaths.userProfile,
    element: <UserProfilePage />,
  },
];
