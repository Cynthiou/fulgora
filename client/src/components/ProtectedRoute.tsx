import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../hooks/useAuth";
import LoadingState from "./LoadingState";

// Wraps the private pages: nothing private is shown without a connected user.
// The page asked for is kept in state.from, so the login page can come back
// to it afterwards.
function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState />;
  }

  if (user === null) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/connexion" replace state={{ from }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
