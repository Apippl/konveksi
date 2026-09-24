import { Navigate } from "react-router-dom";
import { getUser, homePath } from "../auth";

export function Guard({ children, adminOnly, role }) {
  const user = getUser();
  const token = localStorage.getItem("token");
  if (!user || !token) return <Navigate to="/login" replace />;
  if (adminOnly && !["admin", "superadmin"].includes(user.role)) return <Navigate to="/" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  if (!adminOnly && !role && user.role === "client" && !user.profil_lengkap) {
    return <Navigate to="/lengkapi-profil" replace />;
  }
  return children;
}

export function GuestOnly({ children }) {
  const user = getUser();
  const token = localStorage.getItem("token");
  if (user && token) {
    return <Navigate to={homePath(user)} replace />;
  }
  return children;
}

export function ProfilGuard({ children }) {
  const user = getUser();
  const token = localStorage.getItem("token");
  if (!user || !token) return <Navigate to="/login" replace />;
  return children;
}
