import { useEffect, useState } from "react";
import api from "../api";
import Card from "../components/Card";
import Input from "../components/Input";
import Textarea from "../components/Textarea";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { labelClass } from "../components/ui";

export default function KelolaToko() {
  const [tutup, setTutup] = useState(false);
  const [pesanTutup, setPesanTutup] = useState("");
  const [judulA, setJudulA] = useState("Konveksi");
  const [judulB, setJudulB] = useState("Bordir");
  const [subjudul, setSubjudul] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    api
      .get("/api/pengaturan/publik")
      .then((res) => {
        const d = res.data;
        setTutup(!!d.tutup);
        setPesanTutup(d.pesan_tutup || "");
        setJudulA(d.judul_a || "Konveksi");
        setJudulB(d.judul_b || "Bordir");
        setSubjudul(d.subjudul || "");
      })
      .catch(() => setError("Gagal memuat pengaturan."))
      .finally(() => setLoading(false));
  }, []);

  const simpan = async () => {
    setError("");
    setOk("");
    setSaving(true);
    try {
      await api.put("/api/superadmin/pengaturan", {
        tutup,
        pesan_tutup: pesanTutup,
        judul_a: judulA.trim() || "Konveksi",
        judul_b: judulB.trim() || "Bordir",
        subjudul,
      });
      setOk("Pengaturan tersimpan dan langsung tayang.");
    } catch (err) {
      setError(err.response?.data?.detail || "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[800px] mt-6 mx-auto px-4">
      <h2 className="text-slate-900 text-[22px] font-bold uppercase tracking-[-0.3px] mb-2">
        Kelola Toko
      </h2>
      <p className="text-[13px] text-slate-500 mb-5">
        Buka/tutup pemesanan dan ubah teks hero landing tanpa edit kode.
      </p>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {ok && <Alert variant="success" className="mb-4">{ok}</Alert>}

      {loading ? (
        <p className="text-slate-500 text-sm">Memuat...</p>
      ) : (
        <>
          <Card className="p-5 mb-6">
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-[0.5px] mt-0 mb-4">
              Status Toko
            </h3>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input type="checkbox" checked={tutup} onChange={(e) => setTutup(e.target.checked)} className="w-4 h-4" />
              <span className="text-[13px] font-semibold text-slate-900">Tutup pemesanan sementara</span>
            </label>
            <label className={labelClass}>Pesan saat tutup</label>
            <Textarea value={pesanTutup} onChange={(e) => setPesanTutup(e.target.value)} placeholder="Toko tutup sementara..." className="min-h-[60px]" />
          </Card>

          <Card className="p-5 mb-6">
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-[0.5px] mt-0 mb-4">
              Teks Hero Landing
            </h3>
            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label className={labelClass}>Judul kiri (putih)</label>
                <Input value={judulA} onChange={(e) => setJudulA(e.target.value)} maxLength={50} />
              </div>
              <div className="flex-1">
                <label className={labelClass}>Judul kanan (biru)</label>
                <Input value={judulB} onChange={(e) => setJudulB(e.target.value)} maxLength={50} />
              </div>
            </div>
            <label className={labelClass}>Subjudul</label>
            <Textarea value={subjudul} onChange={(e) => setSubjudul(e.target.value)} maxLength={300} className="min-h-[60px]" />
          </Card>

          <Button variant="primary" size="md" disabled={saving} onClick={simpan}>
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </>
      )}
    </div>
  );
}
