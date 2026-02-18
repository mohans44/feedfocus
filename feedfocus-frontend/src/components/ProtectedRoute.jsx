import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../utils/api";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const isAuthRoute = location.pathname.startsWith("/auth");

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-12 animate-pulse rounded-2xl bg-card/70" />
          <div className="h-52 animate-pulse rounded-3xl bg-card/70" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-2xl bg-card/70" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data?.user && !isAuthRoute) {
    return <Navigate to="/tryit" replace />;
  }

  return children;
};

export default ProtectedRoute;
