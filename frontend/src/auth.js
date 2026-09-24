export function getUser() {
  const raw = localStorage.getItem("user");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function homePath(user) {
  if (!user) return "/login";
  if (user.role === "superadmin") return "/superadmin/dashboard";
  if (user.role === "admin") return "/admin";
  return "/desain";
}
