import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import api from "../api";

function sidebarLinkClass({ isActive }) {
  const base =
    "no-underline flex items-center gap-2.5 px-3.5 py-2.5 rounded-xs text-[13px] font-semibold uppercase tracking-[0.5px] whitespace-nowrap transition-colors duration-200 ease-out";
  return isActive
    ? `${base} text-white bg-blue-600`
    : `${base} text-slate-600 bg-transparent hover:bg-slate-100 hover:text-slate-900`;
}

function SidebarLink({ to, label, icon, ramping, badge }) {
  return (
    <NavLink
      to={to}
      title={label}
      className={({ isActive }) => {
        const cls = sidebarLinkClass({ isActive });
        return ramping ? `${cls} justify-center px-2.5 relative` : `${cls} overflow-hidden`;
      }}
    >
      {icon}
      {!ramping && <span className="truncate min-w-0 flex-1">{label}</span>}
      {!ramping && badge > 0 && (
        <span className="shrink-0 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {ramping && badge > 0 && (
        <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-600 border border-white" />
      )}
    </NavLink>
  );
}

export default function Sidebar({ title = "Menu", items = [], user, onLogout, ramping = false, onToggle }) {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (user?.role !== "admin") return;
    api
      .get("/api/pesanan")
      .then((res) => setPending((res.data || []).filter((p) => (p.status || "Pending") === "Pending").length))
      .catch(() => setPending(0));
  }, [user]);
  return (
    <aside className={`sidebar-scroll relative w-full shrink-0 bg-white border-b border-slate-300 md:h-full md:overflow-y-auto md:flex md:flex-col md:border-b-0 md:border-r ${ramping ? "md:w-[60px]" : "md:w-56"}`}>
      <div className={`hidden md:flex items-center pt-5 pb-2 ${ramping ? "justify-center px-2" : "justify-between px-4"}`}>
        {!ramping && (
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.5px] truncate">
            {title}
          </span>
        )}
        <button
          onClick={onToggle}
          title={ramping ? "Bentangkan menu" : "Lipet menu"}
          aria-label={ramping ? "Bentangkan menu" : "Lipet menu"}
          className="border border-slate-200 bg-transparent rounded-xs p-1.5 text-slate-500 cursor-pointer transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
        >
          <Icon name="panel" className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex flex-row gap-2 overflow-x-auto p-3 md:flex-col md:gap-1 md:overflow-visible">
        {items.map((item) => (
          <SidebarLink key={item.to} {...item} ramping={ramping} badge={item.to === "/admin" ? pending : 0} />
        ))}
      </nav>

      {user && (
        <div className="hidden md:block md:mt-auto px-3 pb-4 pt-2 border-t border-slate-100">
          {ramping ? (
            <div className="flex flex-col items-center gap-2">
              <NavLink
                to="/profil-saya"
                title={`${user.nama} (${user.role})`}
                className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-[13px] font-bold no-underline"
              >
                {(user.nama || "?").trim().charAt(0).toUpperCase()}
              </NavLink>
              <button
                onClick={onLogout}
                title="Keluar"
                className="border-0 bg-transparent p-2 text-red-600 cursor-pointer rounded-xs transition-colors duration-150 hover:bg-red-50"
              >
                <Icon name="logout" />
              </button>
            </div>
          ) : (
            <>
              <NavLink
                to="/profil-saya"
                className="block px-3.5 py-3 rounded-xs no-underline transition-colors duration-150 hover:bg-slate-100"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="truncate text-[12px] font-bold text-slate-900">{user.nama}</div>
                  <span className="shrink-0 px-2 py-0.5 rounded-xs bg-slate-100 text-[10px] font-bold uppercase tracking-[0.5px] text-slate-600">
                    {user.role}
                  </span>
                </div>
                <div className="truncate text-[11px] text-slate-400">{user.email}</div>
              </NavLink>
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-2.5 mt-1 border-0 bg-transparent px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.5px] text-red-600 cursor-pointer rounded-xs transition-colors duration-150 hover:bg-red-50"
              >
                <Icon name="logout" />
                Keluar
              </button>
            </>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-0 left-0 -right-px hidden h-4 bg-linear-to-t from-page to-transparent md:block" />
    </aside>
  );
}
