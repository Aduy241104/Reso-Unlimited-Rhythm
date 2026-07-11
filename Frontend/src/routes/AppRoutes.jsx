import { useRoutes } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import { PlayerProvider } from "../contexts/PlayerContext";
import { appRoutes } from "./routeConfig";

const AppRouteTree = () => {
  return useRoutes(appRoutes);
};

const AppRoutes = () => {
  return (
    <AuthProvider>
      <PlayerProvider>
        <AppRouteTree />
      </PlayerProvider>
    </AuthProvider>
  );
};

export default AppRoutes;
