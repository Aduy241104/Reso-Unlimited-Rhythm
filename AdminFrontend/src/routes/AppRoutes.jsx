import { BrowserRouter, useRoutes } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import { appRoutes } from "./routeConfig";

const AppRouteTree = () => {
  return useRoutes(appRoutes);
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouteTree />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;
