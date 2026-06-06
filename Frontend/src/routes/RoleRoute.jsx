import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { routePaths } from "./routePaths";

const RoleRoute = ({ allowedRoles = [] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p>Loading...</p>;
  }

  const userRole = user?.role;

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to={routePaths.home} replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
