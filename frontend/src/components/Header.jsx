import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import Icon from "./Icon";
import { buttonClass } from "./ui";

function topLinkClass({ isActive }) {
  return isActive
    ? "no-underline font-semibold text-[13px] uppercase tracking-[0.5px] pb-0.5 border-b-2 text-blue-600 border-blue-600"
    : "no-underline font-semibold text-[13px] uppercase tracking-[0.5px] pb-0.5 border-b-2 text-slate-600 border-transparent";
}

function ClientMenu({ user, onLogout }) {
  const [menuBuka, setMenuBuka] = useState(false);

  return (
    <>
      <NavLink to="/desain" className={topLinkClass}>
        Buat Desain
      </NavLink>
      <NavLink to="/pesanan-saya" className={topLinkClass}>
        Riwayat Pesanan
      </NavLink>

      <div className="relative">
        <button
          onClick={() => setMenuBuka((v) => !v)}
          className={`cursor-pointer border-0 rounded-xs px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.5px] transition-colors duration-150 ${
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

            <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-xs border border-slate-200 bg-white shadow-lg shadow-slate-900/10">
              <div className="border-b border-slate-100 px-3.5 py-2.5">
                <div className="truncate text-[11px] font-bold uppercase tracking-[0.5px] text-slate-900">
                  {user.nama}
                </div>
                <div className="truncate text-[11px] text-slate-400">{user.email}</div>
              </div>

              <NavLink
                to="/profil-saya"
                onClick={() => setMenuBuka(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-[0.5px] text-slate-700 no-underline transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
              >
                <Icon name="settings" />
                Pengaturan Akun
              </NavLink>

              <a
                href="https://wa.me/6285760284491"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-[0.5px] text-slate-700 no-underline transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
              >
                <Icon name="help" />
                Bantuan
              </a>

              <button
                onClick={() => {
                  setMenuBuka(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2.5 border-0 bg-transparent px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.5px] text-red-600 cursor-pointer transition-colors duration-150 hover:bg-red-50"
              >
                <Icon name="logout" />
                Keluar
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function Header({ user, onLogout }) {
  return (
    <nav className="flex flex-wrap justify-between items-center gap-y-2 bg-white border-b border-slate-300 px-6 py-3 shrink-0 relative z-30">
      <Link to="/" translate="no" className="no-underline font-extrabold text-base text-slate-900 tracking-[-0.5px] uppercase notranslate">
        Konveksi<span className="text-blue-600">Bordir</span>
      </Link>

      <div className="flex items-center gap-3 flex-wrap">
        {!user && (
          <>
            <NavLink
              to="/login"
              translate="no"
              className={({ isActive }) => buttonClass({ variant: isActive ? "accent" : "outline", size: "nav" }) + " notranslate"}
            >
              Masuk
            </NavLink>

            <NavLink
              to="/register"
              translate="no"
              className={({ isActive }) => buttonClass({ variant: isActive ? "accent" : "outline", size: "nav" }) + " notranslate"}
            >
              Daftar
            </NavLink>
          </>
        )}

        {user && user.role !== "admin" && user.role !== "superadmin" && (
          <ClientMenu user={user} onLogout={onLogout} />
        )}
      </div>
    </nav>
  );
}
