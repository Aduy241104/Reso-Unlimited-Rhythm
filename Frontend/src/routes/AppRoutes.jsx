import { useRoutes } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import { appRoutes } from "./routeConfig";

const AppRouteTree = () => {
  return useRoutes(appRoutes);
};

const AppRoutes = () => {
  return (
    <AuthProvider>
      <AppRouteTree />
    </AuthProvider>
  );
};

export default AppRoutes;
