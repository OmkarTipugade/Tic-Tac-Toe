import React from "react";
import { Navigate, Outlet, useLocation } from "react-router";

const ProtectedRoute: React.FC = () => {
  const location = useLocation();


  if (!(localStorage.getItem("logged_user"))) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
