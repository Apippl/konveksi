import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import Icon from "./Icon";
import { ADMIN_MENU, SUPERADMIN_MENU } from "./sidebarMenu";

function topLinkClass({ isActive }) {
  return isActive
    ? "no-underline font-semibold text-[13px] uppercase tracking-[0.5px] pb-0.5 border-b-2 text-blue-600 border-blue-600"
    : "no-underline font-semibold text-[13px] uppercase tracking-[0.5px] pb-0.5 border-b-2 text-slate-600 border-transparent";
}

function dropdownLinkClass({ isActive }, py = "py-3") {
  const base =
    `flex items-center gap-2.5 px-3.5 ${py} text-xs font-semibold uppercase tracking-[0.5px] no-underline transition-colors duration-150`;
  return isActive
    ? `${base} bg-blue-50 text-slate-900`
    : `${base} text-slate-700 hover:bg-slate-100 hover:text-slate-900`;
}

function UserDropdown({ user, onLogout, navItems = null, wide = false, compact = false }) {
  const [menuBuka, setMenuBuka] = useState(false);
  const itemPy = compact ? "py-2" : "py-3";
  const linkClass = (s) => dropdownLinkClass(s, itemPy);

  return (
    // wide: wrapper statis agar panel full-width nempel ke <nav> (kiri-kanan selebar layar).
    <div className={wide ? "shrink-0" : "relative shrink-0"}>
      <button
        onClick={() => setMenuBuka((v) => !v)}
        className={`cursor-pointer border-0 rounded-xs px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.5px] transition-colors duration-150 max-w-[120px] sm:max-w-none truncate ${
          menuBuka
            ? "bg-blue-600 text-white"
            : "bg-transparent text-slate-900 hover:bg-slate-100 active:bg-blue-600 active:text-white"
        }`}
      >
        {user.nama}
      </button>

      {menuBuka && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuBuka(false)} />

          <div className={wide
            ? "absolute left-0 right-0 top-full z-20 border-b border-slate-200 bg-white shadow-lg shadow-slate-900/10"
            : "absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-xs border border-slate-200 bg-white shadow-lg shadow-slate-900/10"
          }>
            <div className="border-b border-slate-100 px-3.5 py-2.5">
              <div className="truncate text-[11px] font-bold uppercase tracking-[0.5px] text-slate-900">
                {user.nama}
              </div>
              <div className="truncate text-[11px] text-slate-400">{user.email}</div>
            </div>

            {/* Navigasi tambahan (mobile): client = Desain/Riwayat, admin = Kelola Pesanan */}
            {navItems && (
              <>
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuBuka(false)}
                    className={linkClass}
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                ))}

                <div className="border-t border-slate-100" />
              </>
            )}

            <NavLink
              to="/profil-saya"
              onClick={() => setMenuBuka(false)}
              className={linkClass}
            >
              <Icon name="settings" />
              Pengaturan Akun
            </NavLink>

            <a
              href="https://wa.me/6285760284491"
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-2.5 px-3.5 ${itemPy} text-xs font-semibold uppercase tracking-[0.5px] text-slate-700 no-underline transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900`}
            >
              <Icon name="help" />
              Bantuan
            </a>

            <button
              onClick={() => {
                setMenuBuka(false);
                onLogout();
              }}
              className={`flex w-full items-center gap-2.5 border-0 border-t border-slate-100 bg-transparent px-3.5 ${itemPy} text-left text-xs font-semibold uppercase tracking-[0.5px] text-red-600 cursor-pointer transition-colors duration-150 hover:bg-red-600 hover:text-white active:bg-red-700`}
            >
              <Icon name="logout" />
              Keluar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Header({ user, onLogout }) {
  const isClient = user && user.role !== "admin" && user.role !== "superadmin";
  const isAdmin = user && user.role === "admin";
  const isSuperadmin = user && user.role === "superadmin";
  const CLIENT_NAV = [
    { to: "/desain", label: "Buat Desain", icon: <Icon name="edit" /> },
    { to: "/pesanan-saya", label: "Riwayat Pesanan", icon: <Icon name="history" /> },
  ];

  return (
    <nav className="bg-white border-b border-slate-300 px-4 sm:px-6 py-3 shrink-0 relative z-30">
      <div className="flex justify-between items-center gap-2">
        <Link to="/" translate="no" className="no-underline font-extrabold text-base text-slate-900 tracking-[-0.5px] uppercase notranslate shrink-0">
          Konveksi<span className="text-blue-600">Bordir</span>
        </Link>

        {/* Guest (landing/auth): topbar bersih, logo saja. Masuk/Daftar lewat hero. */}
        {isClient && (
          <>
            {/* Desktop: menu tetap sebaris di topbar seperti semula */}
            <div className="hidden md:flex items-center gap-3">
              <NavLink to="/desain" className={topLinkClass}>
                Buat Desain
              </NavLink>
              <NavLink to="/pesanan-saya" className={topLinkClass}>
                Riwayat Pesanan
              </NavLink>
              <UserDropdown user={user} onLogout={onLogout} />
            </div>
            {/* Mobile: menu pindah ke dalam dropdown akun */}
            <div className="md:hidden shrink-0">
              <UserDropdown user={user} onLogout={onLogout} navItems={CLIENT_NAV} />
            </div>
          </>
        )}
        {/* Admin: desktop tidak diubah (logo saja); mobile dapat dropdown akun full-width */}
        {isAdmin && (
          <div className="md:hidden shrink-0">
            <UserDropdown user={user} onLogout={onLogout} navItems={ADMIN_MENU} wide />
          </div>
        )}
        {/* Superadmin: sama kayak admin, khusus mobile (compact biar semua muat tanpa scroll) */}
        {isSuperadmin && (
          <div className="md:hidden shrink-0">
            <UserDropdown user={user} onLogout={onLogout} navItems={SUPERADMIN_MENU} wide compact />
          </div>
        )}
      </div>
    </nav>
  );
}
