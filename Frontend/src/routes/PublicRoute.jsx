import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LoadingState from "../components/common/LoadingState";
import { routePaths } from "./routePaths";

const PublicRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState className="min-h-screen bg-black" />;
  }

  if (isAuthenticated) {
    return <Navigate to={routePaths.home} replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
