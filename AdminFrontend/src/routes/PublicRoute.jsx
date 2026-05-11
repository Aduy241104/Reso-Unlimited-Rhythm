import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { routePaths } from "./routePaths";

const PublicRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <p className="p-6 text-sm text-slate-500">Checking session...</p>;
  }

  if (isAuthenticated) {
    return <Navigate to={routePaths.home} replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
