import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../utils/api";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const isAuthRoute = location.pathname.startsWith("/auth");

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
  });

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading session...</div>;
  }

  if (!data?.user && !isAuthRoute) {
    return <Navigate to="/tryit" replace />;
  }

  return children;
};

export default ProtectedRoute;
