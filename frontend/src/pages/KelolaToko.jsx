import { useEffect, useState } from "react";
import api from "../api";
import Card from "../components/Card";
import Input from "../components/Input";
import Textarea from "../components/Textarea";
import Button from "../components/Button";
import Alert from "../components/Alert";
import KelolaPengumuman from "./KelolaPengumuman";
import { labelClass } from "../components/ui";

function IsiToko() {
  const [tutup, setTutup] = useState(false);
  const [pesanTutup, setPesanTutup] = useState("");
  const [judulA, setJudulA] = useState("Konveksi");
  const [judulB, setJudulB] = useState("Bordir");
  const [subjudul, setSubjudul] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gantiStatus, setGantiStatus] = useState(false);
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

  // Toggle Tutup/Buka langsung tersimpan ke server saat di-tap.
  const handleToggleTutup = async () => {
    const nilaiBaru = !tutup;
    setError("");
    setOk("");
    setGantiStatus(true);
    try {
      await api.put("/api/superadmin/pengaturan", { tutup: nilaiBaru });
      setTutup(nilaiBaru);
      setOk(nilaiBaru ? "Toko ditutup — pemesanan dihentikan." : "Toko dibuka kembali.");
    } catch (err) {
      setError(err.response?.data?.detail || "Gagal mengubah status toko.");
    } finally {
      setGantiStatus(false);
    }
  };

  // Tombol Simpan khusus teks hero landing (+ pesan saat tutup).
  const simpan = async () => {
    setError("");
    setOk("");
    setSaving(true);
    try {
      await api.put("/api/superadmin/pengaturan", {
        pesan_tutup: pesanTutup,
        judul_a: judulA.trim() || "Konveksi",
        judul_b: judulB.trim() || "Bordir",
        subjudul,
      });
      setOk("Teks hero tersimpan dan langsung tayang.");
    } catch (err) {
      setError(err.response?.data?.detail || "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
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
            <Button
              variant={tutup ? "danger" : "primary"}
              size="md"
              full
              disabled={gantiStatus}
              onClick={handleToggleTutup}
            >
              {gantiStatus ? "Memproses..." : tutup ? "Tutup" : "Buka"}
            </Button>
            <p className="text-[12px] text-slate-500 mt-2 mb-3">
              {tutup
                ? "Pesanan ditutup sementara — tap untuk membuka kembali."
                : "Pesanan dibuka untuk umum — tap untuk menutup sementara."}
            </p>
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

            <Button variant="primary" size="md" full disabled={saving} onClick={simpan} className="mt-4">
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </Card>
        </>
      )}
    </>
  );
}

export default function KelolaToko() {
  return (
    <div className="max-w-[800px] mt-6 mx-auto px-0 pb-6 sm:px-4 sm:pb-0 min-w-0">
      <h2 className="text-slate-900 text-[22px] font-bold uppercase tracking-[-0.3px] mb-2">
        Kelola Toko
      </h2>
      <p className="text-[13px] text-slate-500 mb-5">
        Status pemesanan, teks hero landing, dan pengumuman dalam satu tempat.
      </p>

      <IsiToko />

      <div className="mt-8">
        <KelolaPengumuman tanpaHeader />
      </div>
    </div>
  );
}
