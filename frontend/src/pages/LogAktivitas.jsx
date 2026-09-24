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

export default function LogAktivitas() {
  const [daftar, setDaftar] = useState([]);
  const [filter, setFilter] = useState("");
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
    <div className="max-w-[900px] mt-6 mx-auto px-4">
      <h2 className="text-slate-900 text-[22px] font-bold uppercase tracking-[-0.3px] mb-2">
        Log Aktivitas
      </h2>
      <p className="text-[13px] text-slate-500 mb-5">
        Jejak aksi sensitif: hapus pesanan/user/pengelola, ubah pesanan, reset password.
      </p>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <Card className="p-5">
        <div className="flex gap-2 mb-4 flex-wrap">
          {["", "hapus_pesanan", "hapus_user", "hapus_pengelola", "ubah_pesanan", "reset_password", "buat_pengelola"].map((a) => (
            <button
              key={a || "semua"}
              onClick={() => { setFilter(a); muat(a); }}
              className={`px-3 py-1.5 rounded-xs border text-[11px] font-bold uppercase cursor-pointer ${
                filter === a ? "bg-slate-900 text-white border-slate-900" : "bg-transparent text-slate-600 border-slate-300"
              }`}
            >
              {a ? a.replace(/_/g, " ") : "Semua"}
            </button>
          ))}
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
