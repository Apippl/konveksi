import { useEffect, useState } from "react";
import api from "../api";
import Swal from "sweetalert2";
import Card from "../components/Card";
import RupiahInput from "../components/RupiahInput";
import Button from "../components/Button";
import Alert from "../components/Alert";

function rupiah(n) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

export default function KelolaHarga() {
  const [daftar, setDaftar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/api/pengaturan/harga")
      .then((res) => setDaftar(res.data))
      .catch(() => setError("Gagal memuat harga."))
      .finally(() => setLoading(false));
  }, []);

  const ubah = (ukuran, harga) => {
    setDaftar((prev) => prev.map((r) => (r.ukuran === ukuran ? { ...r, harga } : r)));
  };

  const simpan = async () => {
    setError("");
    const payload = daftar.map((r) => ({ ukuran: r.ukuran, harga: parseInt(r.harga) || 0 }));
    if (payload.some((r) => r.harga < 0)) {
      setError("Harga tidak boleh negatif.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.put("/api/superadmin/pengaturan/harga", payload);
      setDaftar(res.data);
      Swal.fire({ title: "Berhasil", text: "Harga baju diperbarui. Berlaku untuk pesanan baru.", timer: 1800, showConfirmButton: false });
    } catch (err) {
      setError(err.response?.data?.detail || "Gagal menyimpan harga.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[800px] mt-6 mx-auto px-0 pb-6 sm:px-4">
      <h2 className="text-slate-900 text-[22px] font-bold uppercase tracking-[-0.3px] mb-2">
        Harga Baju
      </h2>
      <p className="text-[13px] text-slate-500 mb-5">
        Ubah harga baju per ukuran. Berlaku untuk pesanan baru; riwayat lama tidak berubah.
      </p>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <Card className="p-5">
        {loading ? (
          <p className="text-slate-500 text-sm">Memuat...</p>
        ) : (
          <>
            <div className="flex flex-col gap-2 mb-4">
              {daftar.map((r) => (
                <div key={r.ukuran} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-xs border border-slate-200 min-w-0">
                  <div className="flex items-center justify-between gap-2 sm:contents">
                    <span className="font-bold text-[14px] text-slate-900 sm:w-16">Size {r.ukuran}</span>
                    <span className="text-[12px] text-slate-500 sm:w-28 sm:text-right">{rupiah(parseInt(r.harga) || 0)}</span>
                  </div>
                  <RupiahInput
                    value={r.harga}
                    onChange={(v) => ubah(r.ukuran, v)}
                    className="w-full sm:flex-1"
                  />
                </div>
              ))}
            </div>
            <Button variant="primary" size="md" full disabled={saving} onClick={simpan}>
              {saving ? "Menyimpan..." : "Simpan Harga"}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
