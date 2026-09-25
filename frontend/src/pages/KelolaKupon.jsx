import { useEffect, useState } from "react";
import api from "../api";
import Swal from "sweetalert2";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Pagination from "../components/Pagination";
import ExpiryPicker, { formatExpiryID, sudahLewat } from "../components/ExpiryPicker";
import { labelClass } from "../components/ui";

function rupiah(n) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

const kosong = { kode: "", tipe: "persen", nilai: 10, min_total: 0, expiry: "", aktif: true };

export default function KelolaKupon() {
  const [daftar, setDaftar] = useState([]);
  const [form, setForm] = useState(kosong);
  const [editKode, setEditKode] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [halaman, setHalaman] = useState(1);
  const PER_HALAMAN = 50;

  const muat = () => {
    api
      .get("/api/superadmin/kupon")
      .then((res) => setDaftar(res.data))
      .catch(() => setDaftar([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    muat();
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const simpan = async () => {
    setError("");
    if (form.kode.trim().length < 3) {
      setError("Kode minimal 3 karakter.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kode: form.kode.trim().toUpperCase(),
        tipe: form.tipe,
        nilai: parseInt(form.nilai) || 0,
        min_total: parseInt(form.min_total) || 0,
        expiry: form.expiry || null,
        aktif: !!form.aktif,
      };
      if (editKode) {
        await api.put(`/api/superadmin/kupon/${editKode}`, payload);
      } else {
        await api.post("/api/superadmin/kupon", payload);
      }
      setForm(kosong);
      setEditKode(null);
      muat();
      Swal.fire({ title: "Berhasil", text: "Kupon tersimpan.", timer: 1500, showConfirmButton: false });
    } catch (err) {
      setError(err.response?.data?.detail || "Gagal menyimpan kupon.");
    } finally {
      setSaving(false);
    }
  };

  const mulaiEdit = (k) => {
    setEditKode(k.kode);
    setForm({
      kode: k.kode,
      tipe: k.tipe,
      nilai: k.nilai,
      min_total: k.min_total,
      expiry: k.expiry ? String(k.expiry).slice(0, 16) : "",
      aktif: k.aktif,
    });
  };

  const hapus = async (kode) => {
    const r = await Swal.fire({ title: `Hapus kupon ${kode}?`, showCancelButton: true, confirmButtonText: "Hapus", cancelButtonText: "Batal", confirmButtonColor: "#cd2c01" });
    if (!r.isConfirmed) return;
    try {
      await api.delete(`/api/superadmin/kupon/${kode}`);
      muat();
    } catch (err) {
      Swal.fire({ title: "Gagal", text: err.response?.data?.detail || "Gagal hapus.", confirmButtonColor: "#273d8a" });
    }
  };

  const deskripsi = (k) => {
    const nilai = k.tipe === "persen" ? `${k.nilai}%` : rupiah(k.nilai);
    const syarat = k.min_total > 0 ? ` • min. ${rupiah(k.min_total)}` : "";
    return `${nilai}${syarat}`;
  };

  const toggleAktif = async (k) => {
    try {
      await api.put(`/api/superadmin/kupon/${k.kode}`, {
        kode: k.kode,
        tipe: k.tipe,
        nilai: k.nilai,
        min_total: k.min_total ?? 0,
        maks_potongan: null,
        expiry: k.expiry || null,
        aktif: !k.aktif,
      });
      muat();
      Swal.fire({ title: k.aktif ? "Kupon dinonaktifkan." : "Kupon diaktifkan.", timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ title: "Gagal", text: err.response?.data?.detail || "Gagal mengubah status.", confirmButtonColor: "#273d8a" });
    }
  };

  return (
    <div className="max-w-[800px] mt-6 mx-auto px-4">
      <h2 className="text-slate-900 text-[22px] font-bold uppercase tracking-[-0.3px] mb-2">
        Kupon Diskon
      </h2>
      <p className="text-[13px] text-slate-500 mb-5">
        Buat kode promo persen/nominal. Client memakainya saat bayar; potongan dihitung backend.
      </p>

      <Card className="p-5 mb-6">
        <h3 className="text-sm font-bold text-slate-600 uppercase tracking-[0.5px] mt-0 mb-4">
          {editKode ? `Edit ${editKode}` : "Kupon Baru"}
        </h3>
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div>
            <label className={labelClass}>Kode</label>
            <Input value={form.kode} onChange={(e) => set("kode", e.target.value)} placeholder="HEMAT10" disabled={!!editKode} />
          </div>
          <div>
            <label className={labelClass}>Tipe</label>
            <select value={form.tipe} onChange={(e) => set("tipe", e.target.value)} className="px-3 py-2.5 rounded-xs border border-slate-300 bg-white text-[13px] w-full outline-none">
              <option value="persen">Persen (%)</option>
              <option value="nominal">Nominal (Rp)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{form.tipe === "persen" ? "Persen (1-100)" : "Nominal (Rp)"}</label>
            <Input type="number" min={1} value={form.nilai} onChange={(e) => set("nilai", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Min. belanja (Rp)</label>
            <Input type="number" min={0} value={form.min_total} onChange={(e) => set("min_total", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Kadaluarsa (opsional)</label>
            <ExpiryPicker value={form.expiry} onChange={(v) => set("expiry", v)} />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button variant="primary" size="md" disabled={saving} onClick={simpan}>
            {saving ? "Menyimpan..." : editKode ? "Simpan Perubahan" : "Buat Kupon"}
          </Button>
          {editKode && <Button variant="outline" size="md" onClick={() => { setEditKode(null); setForm(kosong); }}>Batal</Button>}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-600 uppercase tracking-[0.5px] mt-0 mb-4">Daftar Kupon</h3>
        {loading ? <p className="text-slate-500 text-sm">Memuat...</p>
        : daftar.length === 0 ? <p className="text-slate-400 text-sm">Belum ada kupon.</p>
        : (
          <div className="flex flex-col gap-2">
            {daftar.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN).map((k) => (
              <div key={k.kode} className="flex justify-between items-center gap-3 px-3 py-2.5 rounded-xs border border-slate-200 flex-wrap">
                <div>
                  <div className="font-bold text-[14px] text-slate-900 font-[family-name:var(--font-mono)]">
                    {k.kode} {!k.aktif && <span className="text-[10px] text-slate-400">nonaktif</span>}
                    {k.aktif && sudahLewat(k.expiry) && (
                      <span className="ml-1.5 text-[10px] font-bold uppercase text-red-600 border border-red-200 px-1.5 py-0.5 rounded-xs">kedaluwarsa</span>
                    )}
                  </div>
                  <div className="text-[12px] text-slate-500">{deskripsi(k)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {k.expiry ? `Berakhir: ${formatExpiryID(k.expiry)}` : "Tanpa batas waktu"}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => toggleAktif(k)}
                    className={`text-[11px] font-bold uppercase border px-2.5 py-1.5 rounded-xs cursor-pointer ${
                      k.aktif
                        ? "text-amber-600 border-amber-200"
                        : "text-green-600 border-green-200"
                    }`}
                  >
                    {k.aktif ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button onClick={() => mulaiEdit(k)} className="text-[11px] font-bold uppercase border border-slate-300 px-2.5 py-1.5 rounded-xs cursor-pointer">Edit</button>
                  <button onClick={() => hapus(k.kode)} className="text-[11px] font-bold uppercase text-red-600 border border-red-200 px-2.5 py-1.5 rounded-xs cursor-pointer">Hapus</button>
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
        itemLabel="kupon"
      />
    </div>
  );
}

