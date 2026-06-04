import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { routePaths } from "./routePaths";

const normalizeRoleValue = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const getCurrentUserRole = (user) => {
  const directRole = normalizeRoleValue(user?.role);

  if (directRole) {
    return directRole;
  }

  const nestedProfileRole = normalizeRoleValue(user?.profile?.role);

  if (nestedProfileRole) {
    return nestedProfileRole;
  }

  const accountTypeRole = normalizeRoleValue(user?.accountType);

  if (accountTypeRole) {
    return accountTypeRole;
  }

  const userTypeRole = normalizeRoleValue(user?.userType);

  if (userTypeRole) {
    return userTypeRole;
  }

  return "";
};

const RoleRoute = ({ allowedRoles = [] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p>Loading...</p>;
  }

  const userRole = getCurrentUserRole(user);
  const normalizedAllowedRoles = allowedRoles.map((role) => normalizeRoleValue(role));

  if (!userRole || !normalizedAllowedRoles.includes(userRole)) {
    return <Navigate to={routePaths.home} replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
