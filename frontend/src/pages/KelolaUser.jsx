import { useEffect, useState } from "react";
import api from "../api";
import Swal from "sweetalert2";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import Pagination from "../components/Pagination";
import Alert from "../components/Alert";

export default function KelolaUser() {
  const [daftar, setDaftar] = useState([]);
  const [cari, setCari] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [halaman, setHalaman] = useState(1);
  const PER_HALAMAN = 100;

  const muat = async (keyword = "") => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/superadmin/users", { params: keyword ? { q: keyword } : {} });
      setDaftar(res.data);
    } catch {
      setError("Gagal memuat daftar user.");
      setDaftar([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api
      .get("/api/superadmin/users")
      .then((res) => setDaftar(res.data))
      .catch(() => {
        setError("Gagal memuat daftar user.");
        setDaftar([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const cariUser = () => {
    setHalaman(1);
    muat(cari);
  };

  const totalHalaman = Math.max(1, Math.ceil(daftar.length / PER_HALAMAN));
  const halamanIni = daftar.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);

  const handleToggleVerify = async (u) => {
    try {
      await api.put(`/api/superadmin/users/${u.id}`, { is_verified: !u.is_verified });
      muat(cari);
    } catch (err) {
      Swal.fire({ title: "Gagal", text: err.response?.data?.detail || "Gagal update verifikasi.", confirmButtonColor: "#273d8a" });
    }
  };

  const handleToggleAktif = async (u) => {
    const aksi = u.is_active ? "Nonaktifkan" : "Aktifkan";
    const result = await Swal.fire({
      title: `${aksi} ${u.email}?`,
      text: u.is_active ? "User tidak bisa login sampai diaktifkan lagi." : "User bisa login kembali.",
      showCancelButton: true,
      confirmButtonText: aksi,
      cancelButtonText: "Batal",
      confirmButtonColor: "#273d8a",
    });
    if (!result.isConfirmed) return;
    try {
      await api.put(`/api/superadmin/users/${u.id}`, { is_active: !u.is_active });
      muat(cari);
    } catch (err) {
      Swal.fire({ title: "Gagal", text: err.response?.data?.detail || "Gagal update status.", confirmButtonColor: "#273d8a" });
    }
  };

  const handleReset = async (u) => {
    const { value: pass } = await Swal.fire({
      title: `Reset password ${u.email}`,
      input: "password",
      inputLabel: "Password baru (min 6 karakter)",
      inputAttributes: { minLength: 6 },
      showCancelButton: true,
      confirmButtonText: "Reset",
      cancelButtonText: "Batal",
      confirmButtonColor: "#273d8a",
      inputValidator: (v) => (!v || v.length < 6 ? "Minimal 6 karakter." : undefined),
    });
    if (!pass) return;
    try {
      await api.post(`/api/superadmin/users/${u.id}/reset-password`, { password_baru: pass });
      Swal.fire({ title: "Berhasil", text: "Password direset.", timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ title: "Gagal", text: err.response?.data?.detail || "Gagal reset.", confirmButtonColor: "#273d8a" });
    }
  };

  const handleHapus = async (u) => {
    const result = await Swal.fire({
      title: `Hapus ${u.email}?`,
      text: "User + seluruh riwayat pesanannya ikut terhapus permanen. Butuh sesi OTP aktif.",
      showCancelButton: true,
      confirmButtonText: "Hapus Permanen",
      cancelButtonText: "Batal",
      confirmButtonColor: "#cd2c01",
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/api/superadmin/users/${u.id}`);
      muat(cari);
    } catch (err) {
      const msg = err.response?.data?.detail || "Gagal menghapus.";
      Swal.fire({
        title: "Gagal",
        text: msg.includes("Sesi aksi") ? `${msg} Aktifkan dulu via menu Kelola Pengelola.` : msg,
        confirmButtonColor: "#273d8a",
      });
    }
  };

  return (
    <div className="max-w-[800px] mt-6 mx-auto px-4">
      <h2 className="text-slate-900 text-[22px] font-bold uppercase tracking-[-0.3px] mb-2">
        Kelola User
      </h2>
      <p className="text-[13px] text-slate-500 mb-5">
        Verifikasi manual, nonaktifkan, reset password, atau hapus akun client.
      </p>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <Card className="p-5">
        <div className="flex gap-2 mb-4">
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama / email..." className="flex-1" />
          <Button variant="primary" size="md" onClick={cariUser}>Cari</Button>
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm">Memuat...</p>
        ) : daftar.length === 0 ? (
          <p className="text-slate-400 text-sm">Tidak ada user.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {halamanIni.map((u) => (
              <div key={u.id} className="flex justify-between items-center gap-3 px-3 py-2.5 rounded-xs border border-slate-200 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold text-[13px] text-slate-900 flex items-center gap-2 flex-wrap">
                    {u.nama}
                    {!u.is_verified && <span className="text-[10px] font-bold uppercase text-amber-600">belum verif</span>}
                    {!u.is_active && <span className="text-[10px] font-bold uppercase text-red-600">nonaktif</span>}
                  </div>
                  <div className="text-[12px] text-slate-500">{u.email}</div>
                </div>
                <div className="flex gap-1.5 flex-wrap shrink-0">
                  <button onClick={() => handleToggleVerify(u)} className="text-[11px] font-bold uppercase border border-slate-300 rounded-xs px-2 py-1.5 cursor-pointer">
                    {u.is_verified ? "Unverif" : "Verif"}
                  </button>
                  <button onClick={() => handleToggleAktif(u)} className="text-[11px] font-bold uppercase border border-slate-300 rounded-xs px-2 py-1.5 cursor-pointer">
                    {u.is_active ? "Blokir" : "Aktifkan"}
                  </button>
                  <button onClick={() => handleReset(u)} className="text-[11px] font-bold uppercase border border-slate-300 rounded-xs px-2 py-1.5 cursor-pointer">
                    Reset PW
                  </button>
                  <button onClick={() => handleHapus(u)} className="text-[11px] font-bold uppercase text-red-600 border border-red-200 rounded-xs px-2 py-1.5 cursor-pointer">
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Pagination
        halaman={halaman}
        totalHalaman={totalHalaman}
        totalItems={daftar.length}
        perHalaman={PER_HALAMAN}
        onHalamanChange={setHalaman}
        itemLabel="user"
      />
    </div>
  );
}
