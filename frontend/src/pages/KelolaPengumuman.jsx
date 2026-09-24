import { useEffect, useState } from "react";
import api from "../api";
import Swal from "sweetalert2";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Pagination from "../components/Pagination";

export default function KelolaPengumuman() {
  const [daftar, setDaftar] = useState([]);
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [halaman, setHalaman] = useState(1);
  const PER_HALAMAN = 50;
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);

  const muat = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/superadmin/pengumuman");
      setDaftar(res.data);
    } catch {
      setDaftar([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api
      .get("/api/superadmin/pengumuman")
      .then((res) => setDaftar(res.data))
      .catch(() => setDaftar([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSimpan = async () => {
    setError("");
    if (judul.trim().length < 3 || isi.trim().length < 3) {
      setError("Judul dan isi minimal 3 karakter.");
      return;
    }
    setSubmitting(true);
    try {
      if (editId) {
        await api.put(`/api/superadmin/pengumuman/${editId}`, { judul: judul.trim(), isi: isi.trim(), aktif: true });
      } else {
        await api.post("/api/superadmin/pengumuman", { judul: judul.trim(), isi: isi.trim(), aktif: true });
      }
      setJudul("");
      setIsi("");
      setEditId(null);
      muat();
    } catch (err) {
      setError(err.response?.data?.detail || "Gagal menyimpan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNonaktif = async (id) => {
    try {
      const item = daftar.find((d) => d.id === id);
      await api.put(`/api/superadmin/pengumuman/${id}`, { judul: item.judul, isi: item.isi, aktif: false });
      muat();
    } catch (err) {
      Swal.fire({ title: "Gagal", text: err.response?.data?.detail || "Gagal update.", confirmButtonColor: "#273d8a" });
    }
  };

  const handleHapus = async (id) => {
    const r = await Swal.fire({ title: "Hapus pengumuman?", showCancelButton: true, confirmButtonText: "Hapus", cancelButtonText: "Batal", confirmButtonColor: "#cd2c01" });
    if (!r.isConfirmed) return;
    try {
      await api.delete(`/api/superadmin/pengumuman/${id}`);
      muat();
    } catch (err) {
      Swal.fire({ title: "Gagal", text: err.response?.data?.detail || "Gagal hapus.", confirmButtonColor: "#273d8a" });
    }
  };

  return (
    <div className="max-w-[800px] mt-6 mx-auto px-4">
      <h2 className="text-slate-900 text-[22px] font-bold uppercase tracking-[-0.3px] mb-2">
        Kelola Pengumuman
      </h2>
      <p className="text-[13px] text-slate-500 mb-5">
        Satu pengumuman aktif tampil di halaman utama dan desain. Menyimpan baru otomatis menonaktifkan yang lama.
      </p>

      <Card className="p-5 mb-6">
        <h3 className="text-sm font-bold text-slate-600 uppercase tracking-[0.5px] mt-0 mb-4">
          {editId ? "Edit Pengumuman" : "Pengumuman Baru (langsung aktif)"}
        </h3>
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        <Input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Judul, mis: Libur Lebaran" className="mb-3" />
        <textarea
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          placeholder="Isi pengumuman..."
          rows={3}
          className="w-full box-border px-3 py-2.5 rounded-xs border border-slate-300 text-[13px] outline-none mb-3 resize-y"
          style={{ display: "block", maxWidth: "100%" }}
        />
        <div className="flex gap-2">
          <Button variant="primary" size="md" disabled={submitting} onClick={handleSimpan}>
            {submitting ? "Menyimpan..." : editId ? "Simpan Perubahan" : "Tampilkan Pengumuman"}
          </Button>
          {editId && <Button variant="outline" size="md" onClick={() => { setEditId(null); setJudul(""); setIsi(""); }}>Batal</Button>}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-600 uppercase tracking-[0.5px] mt-0 mb-4">Riwayat</h3>
        {loading ? <p className="text-slate-500 text-sm">Memuat...</p>
        : daftar.length === 0 ? <p className="text-slate-400 text-sm">Belum ada pengumuman.</p>
        : (
          <div className="flex flex-col gap-2">
            {daftar.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN).map((p) => (
              <div key={p.id} className="px-3 py-2.5 rounded-xs border border-slate-200">
                <div className="font-semibold text-[13px] text-slate-900 flex items-center gap-2">
                  {p.judul}
                  {p.aktif
                    ? <span className="text-[10px] font-bold uppercase text-green-600">aktif</span>
                    : <span className="text-[10px] font-bold uppercase text-slate-400">nonaktif</span>}
                </div>
                <div className="text-[12px] text-slate-500 whitespace-pre-line">{p.isi}</div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setEditId(p.id); setJudul(p.judul); setIsi(p.isi); }} className="text-[11px] font-bold uppercase border border-slate-300 rounded-xs px-2 py-1 cursor-pointer">Edit + Aktifkan</button>
                  {p.aktif && <button onClick={() => handleNonaktif(p.id)} className="text-[11px] font-bold uppercase border border-slate-300 rounded-xs px-2 py-1 cursor-pointer">Nonaktifkan</button>}
                  <button onClick={() => handleHapus(p.id)} className="text-[11px] font-bold uppercase text-red-600 border border-red-200 rounded-xs px-2 py-1 cursor-pointer">Hapus</button>
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
        itemLabel="pengumuman"
      />
    </div>
  );
}
