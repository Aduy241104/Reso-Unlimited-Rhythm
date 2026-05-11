import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { routePaths } from "./routePaths";

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <p className="p-6 text-sm text-slate-500">Checking session...</p>;
  }

  if (!isAuthenticated) {
    return (
      <Navigate to={routePaths.login} replace state={{ from: location }} />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
