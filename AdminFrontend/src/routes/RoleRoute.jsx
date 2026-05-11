import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { routePaths } from "./routePaths";

const RoleRoute = ({ allowedRoles = [] }) => {
  const { isLoading, logout, user } = useAuth();
  const [roleStatus, setRoleStatus] = useState("checking");

  const userRole = user?.role;
  const hasPermission = Boolean(userRole) && allowedRoles.includes(userRole);

  useEffect(() => {
    let isMounted = true;

    const resolveRole = async () => {
      if (isLoading) {
        return;
      }

      if (!user) {
        if (isMounted) {
          setRoleStatus("unauthenticated");
        }
        return;
      }

      if (hasPermission) {
        if (isMounted) {
          setRoleStatus("authorized");
        }
        return;
      }

      if (isMounted) {
        setRoleStatus("revoking");
      }

      try {
        await logout({ redirectTo: null });
      } finally {
        if (isMounted) {
          setRoleStatus("unauthorized");
        }
      }
    };

    void resolveRole();

    return () => {
      isMounted = false;
    };
  }, [hasPermission, isLoading, logout, user]);

  if (
    isLoading ||
    roleStatus === "checking" ||
    roleStatus === "revoking"
  ) {
    return <p className="p-6 text-sm text-slate-500">Checking permissions...</p>;
  }

  if (roleStatus === "unauthenticated") {
    return (
      <Navigate
        to={routePaths.login}
        replace
        state={{
          authNotice: "Please sign in with an admin account.",
        }}
      />
    );
  }

  if (roleStatus === "unauthorized") {
    return (
      <Navigate
        to={routePaths.login}
        replace
        state={{
          authNotice: "This account cannot access the admin area.",
        }}
      />
    );
  }

  return <Outlet />;
};

export default RoleRoute;
