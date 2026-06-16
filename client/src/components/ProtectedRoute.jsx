import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children, message }) {
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          message: message || null,
        }}
      />
    );
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      return (
        <Navigate
          to="/login"
          replace
          state={{
            from: location.pathname,
            message: message || null,
          }}
        />
      );
    }
  } catch {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, message: message || null }}
      />
    );
  }

  return children;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      return <Navigate to="/login" replace />;
    }
    if (payload.role !== "admin") return <Navigate to="/" replace />;
  } catch {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export { ProtectedRoute, AdminRoute };