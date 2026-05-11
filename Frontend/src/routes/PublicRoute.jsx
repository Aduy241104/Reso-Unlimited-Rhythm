import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { routePaths } from "./routePaths";

const PublicRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (isAuthenticated) {
    return <Navigate to={routePaths.home} replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
