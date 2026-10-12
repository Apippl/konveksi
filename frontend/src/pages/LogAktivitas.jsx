import { useEffect, useState } from "react";
import api from "../api";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Alert from "../components/Alert";
import Pagination from "../components/Pagination";

const WARNA_AKSI = {
  hapus_pesanan: "text-red-600",
  hapus_user: "text-red-600",
  hapus_pengelola: "text-red-600",
  reset_password: "text-amber-600",
  ubah_pesanan: "text-blue-600",
  buat_pengelola: "text-green-600",
};

const DAFTAR_AKSI = [
  { value: "", label: "Semua aksi" },
  { value: "hapus_pesanan", label: "hapus pesanan" },
  { value: "hapus_user", label: "hapus user" },
  { value: "hapus_pengelola", label: "hapus pengelola" },
  { value: "ubah_pesanan", label: "ubah pesanan" },
  { value: "reset_password", label: "reset password" },
  { value: "buat_pengelola", label: "tambah pengelola" },
];

export default function LogAktivitas() {
  const [daftar, setDaftar] = useState([]);
  const [filter, setFilter] = useState("");
  const [dropdownBuka, setDropdownBuka] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [halaman, setHalaman] = useState(1);
  const PER_HALAMAN = 50;

  const muat = (aksi = "") => {
    setHalaman(1);
    setLoading(true);
    api
      .get("/api/superadmin/audit-log", { params: { ...(aksi ? { aksi } : {}), limit: 500 } })
      .then((res) => setDaftar(res.data))
      .catch(() => setError("Gagal memuat log."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api
      .get("/api/superadmin/audit-log", { params: { limit: 500 } })
      .then((res) => setDaftar(res.data))
      .catch(() => setError("Gagal memuat log."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-[900px] mt-6 mx-auto px-0 pb-6 sm:px-4 sm:pb-0">
      <h2 className="text-slate-900 text-[22px] font-bold uppercase tracking-[-0.3px] mb-2">
        Log Aktivitas
      </h2>
      <p className="text-[13px] text-slate-500 mb-5">
        Jejak aksi sensitif: hapus pesanan/user/pengelola, ubah pesanan, reset password.
      </p>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <Card className="p-5">
        <div className="mb-4 relative">
          <button
            type="button"
            onClick={() => setDropdownBuka((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-slate-300 rounded-xs text-sm text-slate-900 hover:border-slate-400 focus:outline-none focus:border-slate-900 cursor-pointer transition-colors min-h-[44px] box-border"
          >
            <span className="font-medium truncate">
              {DAFTAR_AKSI.find((a) => a.value === filter)?.label || "Semua aksi"}
            </span>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${dropdownBuka ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownBuka && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownBuka(false)}
              />
              <div className="absolute top-[calc(100%_+_4px)] left-0 right-0 bg-white border border-slate-300 rounded-xs max-h-[220px] overflow-y-auto z-20 shadow-[0_4px_10px_rgba(15,23,42,0.08)]">
                {DAFTAR_AKSI.map((a) => (
                  <div
                    key={a.value || "semua"}
                    onClick={() => {
                      setFilter(a.value);
                      muat(a.value);
                      setDropdownBuka(false);
                    }}
                    className={`px-3 py-2.5 cursor-pointer text-sm text-slate-900 hover:bg-slate-50 transition-colors ${
                      filter === a.value ? "bg-slate-100 font-bold" : "bg-white font-normal"
                    }`}
                  >
                    {a.label}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm">Memuat...</p>
        ) : daftar.length === 0 ? (
          <EmptyState>Belum ada aktivitas tercatat.</EmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            {daftar.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN).map((l) => (
              <div key={l.id} className="px-3 py-2.5 rounded-xs border border-slate-200 text-[12px]">
                <div className="flex justify-between gap-2 flex-wrap mb-1">
                  <span className={`font-bold uppercase ${WARNA_AKSI[l.aksi] || "text-slate-700"}`}>
                    {l.aksi.replace(/_/g, " ")}
                  </span>
                  <span className="text-slate-400">
                    {l.dibuat_pada ? new Date(l.dibuat_pada).toLocaleString("id-ID") : "-"}
                  </span>
                </div>
                <div className="text-slate-900 font-semibold break-words">{l.target}</div>
                <div className="text-slate-500">
                  oleh {l.aktor_email} ({l.aktor_role}){l.detail ? ` • ${l.detail}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Pagination
        halaman={halaman}
        totalHalaman={Math.max(1, Math.ceil(daftar.length / PER_HALAMAN))}
        totalItems={daftar.length}
        perHalaman={PER_HALAMAN}
        onHalamanChange={setHalaman}
        itemLabel="aktivitas"
      />
    </div>
  );
}
