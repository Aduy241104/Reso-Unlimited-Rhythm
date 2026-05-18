import { BrowserRouter, useRoutes } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import { appRoutes } from "./routeConfig";
import { Toaster } from "react-hot-toast";

const AppRouteTree = () => {
  return useRoutes(appRoutes);
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouteTree />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { fontSize: "0.95rem" },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;
