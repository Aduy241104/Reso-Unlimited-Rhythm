import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LoadingState from "../components/common/LoadingState";
import { routePaths } from "./routePaths";

const RoleRoute = ({ allowedRoles = [] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState className="min-h-screen bg-black" />;
  }

  const userRole = user?.role;

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to={routePaths.home} replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
