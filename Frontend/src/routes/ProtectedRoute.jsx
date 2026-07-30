import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LoadingState from "../components/common/LoadingState";
import { routePaths } from "./routePaths";

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState className="min-h-screen bg-black" />;
  }

  if (!isAuthenticated) {
    return <Navigate to={routePaths.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
