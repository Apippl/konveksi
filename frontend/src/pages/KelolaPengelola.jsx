import { useEffect, useState } from "react";
import api from "../api";
import Swal from "sweetalert2";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import Alert from "../components/Alert";
import SesiAksiGate from "../components/SesiAksiGate";
import Pagination from "../components/Pagination";

export default function KelolaPengelola() {
  const [daftar, setDaftar] = useState([]);
  const [loading, setLoading] = useState(true);

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editNama, setEditNama] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [halaman, setHalaman] = useState(1);
  const PER_HALAMAN = 50;

  const muatDaftar = () => {
    api
      .get("/api/superadmin/pengelola")
      .then((res) => setDaftar(res.data))
      .catch(() => setDaftar([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    muatDaftar();
  }, []);

  async function handleTambah() {
    setError("");
    if (!nama || !email || !password) {
      setError("Semua kolom wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/superadmin/pengelola", { nama, email, password });
      setNama("");
      setEmail("");
      setPassword("");
      muatDaftar();
      Swal.fire({ title: "Berhasil", text: "Akun pengelola dibuat.", customClass: { popup: "swal-accent-success" }, timer: 1500, showConfirmButton: false });
    } catch (err) {
      setError(err.response?.data?.detail || "Gagal membuat akun pengelola.");
    } finally {
      setSubmitting(false);
    }
  }

  function mulaiEdit(p) {
    setEditId(p.id);
    setEditNama(p.nama);
  }

  function batalEdit() {
    setEditId(null);
    setEditNama("");
  }

  async function handleSimpanNama(id) {
    const namaBaru = editNama.trim();
    if (!namaBaru) return;
    setSavingEdit(true);
    try {
      await api.put(`/api/superadmin/pengelola/${id}`, { nama: namaBaru });
      setEditId(null);
      setEditNama("");
      muatDaftar();
      Swal.fire({
        title: "Berhasil",
        text: "Nama pengelola diperbarui.",
        customClass: { popup: "swal-accent-success" },
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        title: "Gagal",
        text: err.response?.data?.detail || "Gagal memperbarui nama.",
        confirmButtonColor: "#273d8a",
      });
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleHapus(id, emailPengelola) {
    const result = await Swal.fire({
      title: "Hapus Akun Pengelola?",
      text: `Akun ${emailPengelola} akan dihapus permanen.`,
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
      customClass: { popup: "swal-accent-danger" },
      confirmButtonColor: "#cd2c01",
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/api/superadmin/pengelola/${id}`);
      muatDaftar();
    } catch (err) {
      Swal.fire({
        title: "Gagal",
        text: err.response?.data?.detail || "Gagal menghapus akun.",
        confirmButtonColor: "#273d8a",
      });
    }
  }

  return (
    <div className="max-w-[800px] mt-6 mx-auto px-4">
      <h2 className="text-slate-900 text-[22px] font-bold uppercase tracking-[-0.3px] mb-2">
        Kelola Akun Pengelola
      </h2>
      <p className="text-[13px] text-slate-500 mb-5">
        Tambah, ubah nama, atau hapus akun admin pengelola toko.
      </p>

      <SesiAksiGate>
        <Card className="p-5 mb-6">
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-[0.5px] mt-0 mb-4">
            Tambah Akun Pengelola Baru
          </h3>
          {error && <Alert variant="error" className="mb-4">{error}</Alert>}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama" />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
          </div>
          <Button variant="primary" size="md" disabled={submitting} onClick={handleTambah}>
            {submitting ? "Menyimpan..." : "Tambah Pengelola"}
          </Button>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-[0.5px] mt-0 mb-4">
            Daftar Pengelola Aktif
          </h3>
          {loading ? (
            <p className="text-slate-500 text-sm">Memuat...</p>
          ) : daftar.length === 0 ? (
            <p className="text-slate-400 text-sm">Belum ada akun pengelola.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {daftar.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN).map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center gap-3 px-3 py-2.5 rounded-xs border border-slate-200"
                >
                  {editId === p.id ? (
                    <>
                      <Input
                        value={editNama}
                        onChange={(e) => setEditNama(e.target.value)}
                        placeholder="Nama pengelola"
                        className="flex-1"
                      />
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleSimpanNama(p.id)}
                          disabled={savingEdit || !editNama.trim()}
                          className="bg-brand text-white border-0 px-2.5 py-1.5 rounded-xs text-[11px] font-bold uppercase cursor-pointer disabled:opacity-50"
                        >
                          {savingEdit ? "Menyimpan..." : "Simpan"}
                        </button>
                        <button
                          onClick={batalEdit}
                          className="bg-transparent text-muted border border-graphite px-2.5 py-1.5 rounded-xs text-[11px] font-bold uppercase cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="font-semibold text-[13px] text-slate-900">{p.nama}</div>
                        <div className="text-[12px] text-slate-500">{p.email}</div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => mulaiEdit(p)}
                          className="text-brand-soft border border-graphite px-2.5 py-1.5 rounded-xs text-[11px] font-bold uppercase cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleHapus(p.id, p.email)}
                          className="text-red-600 border border-red-200 px-2.5 py-1.5 rounded-xs text-[11px] font-bold uppercase cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </>
                  )}
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
          itemLabel="pengelola"
        />
      </SesiAksiGate>
    </div>
  );
}