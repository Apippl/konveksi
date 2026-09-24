import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../api";
import Card from "../components/Card";
import Input from "../components/Input";
import Textarea from "../components/Textarea";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { labelClass, popCardClass } from "../components/ui";
import PengumumanBanner from "../components/PengumumanBanner";
import { payWithSnap } from "../snapPay";

const FONT_LIST = [
  { nama: "Sans", css: "sans-serif" },
  { nama: "Serif", css: "serif" },
  { nama: "Monospace", css: "monospace" },
  { nama: "Cursive", css: "cursive" },
];

const UKURAN_LIST = [
  { label: "S", biaya: -10000, dada: 46, panjang: 66, bahu: 42 },
  { label: "M", biaya: 0, dada: 48, panjang: 68, bahu: 44 },
  { label: "L", biaya: 10000, dada: 50, panjang: 70, bahu: 46 },
  { label: "XL", biaya: 20000, dada: 52, panjang: 72, bahu: 48 },
  { label: "XXL", biaya: 30000, dada: 54, panjang: 74, bahu: 50 },
  { label: "XXXL", biaya: 40000, dada: 56, panjang: 76, bahu: 52 },
];

const HARGA_DASAR_M = 45000;
const HARGA_PER_CM2 = 1000;
const NOMOR_WA_ADMIN = "6285760284491";

export default function Desain() {
  const [mode, setMode] = useState("teks");

  const [teks, setTeks] = useState("");
  const [font, setFont] = useState(FONT_LIST[0].css);
  const [fontQuery, setFontQuery] = useState(FONT_LIST[0].nama);
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const [warna, setWarna] = useState("#000000");
  const [daftarUkuran, setDaftarUkuran] = useState([{ id: 1, ukuran: "M", jumlah: 1 }]);
  const idBarisBerikutnya = useRef(2);
  const [ukuranDropdownOpenId, setUkuranDropdownOpenId] = useState(null);
  const [panjangCm, setPanjangCm] = useState(5);
  const [lebarCm, setLebarCm] = useState(5);
  const [catatan, setCatatan] = useState("");

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(1);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tokoTutup, setTokoTutup] = useState("");
  const [hargaMap, setHargaMap] = useState(null); // {S:35000,...} dari backend, null = fallback lokal
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/api/pengaturan/publik")
      .then((res) => {
        if (res.data?.tutup) setTokoTutup(res.data.pesan_tutup || "Toko tutup sementara.");
      })
      .catch(() => {});
    api
      .get("/api/pengaturan/harga")
      .then((res) => {
        const m = {};
        (res.data || []).forEach((r) => { m[r.ukuran] = r.harga; });
        setHargaMap(m);
      })
      .catch(() => setHargaMap({}));
  }, []);

  function hargaBaju(label) {
    if (hargaMap && hargaMap[label] != null) return hargaMap[label];
    const biayaUkuran = UKURAN_LIST.find((u) => u.label === label)?.biaya || 0;
    return HARGA_DASAR_M + biayaUkuran;
  }

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

    function tambahBaris() {
      const id = idBarisBerikutnya.current;
      idBarisBerikutnya.current += 1;
      setDaftarUkuran([...daftarUkuran, { id, ukuran: "M", jumlah: 1 }]);
    }

  function hapusBaris(id) {
    if (daftarUkuran.length > 1) {
      setDaftarUkuran(daftarUkuran.filter((item) => item.id !== id));
    }
  }

  function updateBaris(id, field, value) {
    setDaftarUkuran(
      daftarUkuran.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  const luasCm2 = panjangCm * lebarCm;
  const hargaBordirSatuan = mode === "teks" ? luasCm2 * HARGA_PER_CM2 : 0;
  
  let totalBaju = 0;
  let estimasiHargaTotal = 0;
  let rincianUkuran = "";

  daftarUkuran.forEach((item) => {
    const qty = parseInt(item.jumlah) || 1;
    totalBaju += qty;

    const hargaBajuSatuan = hargaBaju(item.ukuran);
    
    estimasiHargaTotal += (hargaBajuSatuan + hargaBordirSatuan) * qty;
    rincianUkuran += `${item.ukuran} (${qty} pcs), `;
  });

  const previewHeightPx = lebarCm * 20;

  function handlePilihFile(e) {
    const f = e.target.files[0];
    if (!f) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(f);
    setError("");

    const url = URL.createObjectURL(f);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalHeight / img.naturalWidth;
      setAspectRatio(ratio);
      setLebarCm(Math.max(2, Math.round(panjangCm * ratio)));
    };
    img.src = url;
  }

  function handlePanjangChange(val) {
    const parsed = Number(val);
    const p = Math.max(1, isNaN(parsed) ? 1 : parsed);
    setPanjangCm(p);
    if (mode === "gambar") {
      setLebarCm(Math.max(2, Math.round(p * aspectRatio)));
    }
  }

  function buatLinkWA(kodePesanan) {
    const pesan = [
      "Halo, saya ingin konsultasi harga bordir gambar kustom.",
      `No. Pesanan: ${kodePesanan}`,
      `Rincian Pesanan: ${rincianUkuran.slice(0, -2)}`,
      `Total Baju: ${totalBaju} pcs`,
      `Ukuran Bordir: ${panjangCm} x ${lebarCm} cm`,
      mode === "teks" && warna ? `Warna Benang: ${warna}` : null,
      catatan ? `Catatan: ${catatan}` : null,
      "Mohon info estimasi harganya ya, terima kasih.",
    ]
      .filter(Boolean)
      .join("\n");
    return `https://wa.me/${NOMOR_WA_ADMIN}?text=${encodeURIComponent(pesan)}`;
  }

  async function handleSubmit() {
    setError("");

    if (tokoTutup) {
      setError(tokoTutup);
      return;
    }
    if (mode === "teks" && !teks.trim()) {
      setError("Isi teksnya dulu ya.");
      return;
    }
    if (mode === "gambar" && !file) {
      setError("Upload gambarnya dulu ya.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("mode", mode);
      
      const ukuranListInput = daftarUkuran.map(item => ({
        ukuran: item.ukuran,
        jumlah: parseInt(item.jumlah) || 1
      }));
      formData.append("ukuran_list", JSON.stringify(ukuranListInput));
      
      formData.append("panjang_cm", panjangCm);
      formData.append("lebar_cm", lebarCm);
      formData.append("catatan", catatan.trim());

      if (mode === "teks") {
        formData.append("teks", teks.trim());
        formData.append("font", font);
        formData.append("warna", warna);
      } else {
        formData.append("file", file);
      }

      const res = await api.post("/api/pesanan", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (mode === "gambar") {
        const hasil = await Swal.fire({
          title: "Pesanan Terkirim",
          text: "Harga akan ditentukan admin setelah melihat file kamu.",
          customClass: { popup: "swal-accent-success" },
          confirmButtonText: "Hubungi Admin via WA",
          confirmButtonColor: "#273d8a",
        });

        if (hasil.isConfirmed) {
          window.open(buatLinkWA(res.data.kode_pesanan || res.data.id), "_blank");
        }
        navigate("/pesanan-saya");
      } else {
        if (res.data.snap_token) {
          await payWithSnap(res.data.snap_token, {
            onSuccess: () => navigate("/pesanan-saya"),
            onPending: () => navigate("/pesanan-saya"),
            onClose: () => navigate("/pesanan-saya"),
            onError: () =>
              setError("Pembayaran gagal. Coba bayar lagi dari Riwayat Pesanan."),
          });
        } else {
          navigate("/pesanan-saya");
        }
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0]?.msg || "Format pesanan tidak valid.");
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Gagal mengirim pesanan.");
      }
    } finally {
      setLoading(false);
    }
  }

  const selectedSizes = daftarUkuran.map((d) => d.ukuran);

  return (
    <div className="relative max-w-[1100px] mt-5 mx-auto font-[sans-serif] px-4 box-border">
      <PengumumanBanner />
      {tokoTutup && (
        <div className="absolute inset-0 z-10 bg-black/85 flex flex-col items-center justify-center text-center rounded-xs p-8">
          <div className="text-red-600 text-[42px] md:text-[56px] font-extrabold uppercase tracking-wide drop-shadow-lg">
            Toko Tutup
          </div>
          <p className="text-slate-200 text-[14px] mt-3 max-w-[420px]">{tokoTutup}</p>
        </div>
      )}
      <h2 className="text-slate-900 text-[22px] font-bold mb-5 uppercase tracking-[-0.5px]">
        Desain Bordir
      </h2>

      {error && (
        <Alert variant="error" className="mb-5">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6 items-stretch">
        {/* KOLOM KIRI: Form Input */}
        <Card className="p-5 flex flex-col box-border">
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-[0.5px] mt-0 mb-4">
            Pengaturan Desain
          </h3>

          <div className="flex gap-2 mb-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => setMode("teks")}
              className={`flex-1 p-2.5 rounded-xs border border-slate-900 font-semibold cursor-pointer text-xs uppercase tracking-[0.5px] ${
                mode === "teks" ? "bg-slate-900 text-white" : "bg-white text-slate-900"
              }`}
            >
              Bordir Teks
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setMode("gambar")}
              className={`flex-1 p-2.5 rounded-xs border border-slate-900 font-semibold cursor-pointer text-xs uppercase tracking-[0.5px] ${
                mode === "gambar" ? "bg-slate-900 text-white" : "bg-white text-slate-900"
              }`}
            >
              Upload Logo / Gambar
            </button>
          </div>

          {/* BAGIAN UKURAN & JUMLAH BAJU */}
          <div className="mb-4">
            <label className={labelClass}>Ukuran & Jumlah Baju</label>
            
            <div className="flex flex-col gap-2.5 mt-1.5">
              {daftarUkuran.map((item) => (
                <div key={item.id} className="flex gap-2 items-center relative">
                  {/* Dropdown Ukuran Bersih */}
                  <div className="flex-1 relative">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setUkuranDropdownOpenId(ukuranDropdownOpenId === item.id ? null : item.id)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-300 rounded-xs text-sm text-slate-900 hover:border-slate-400 focus:outline-none focus:border-slate-900 cursor-pointer transition-colors"
                    >
                      <span className="font-medium">Size {item.ukuran}</span>
                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform ${ukuranDropdownOpenId === item.id ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {ukuranDropdownOpenId === item.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setUkuranDropdownOpenId(null)}
                        />
                        <div className="absolute top-[calc(100%_+_4px)] left-0 right-0 bg-white border border-slate-300 rounded-xs max-h-[200px] overflow-y-auto z-20 shadow-[0_4px_10px_rgba(15,23,42,0.08)]">
                          {UKURAN_LIST.map((u) => (
                            <div
                              key={u.label}
                              onClick={() => {
                                updateBaris(item.id, "ukuran", u.label);
                                setUkuranDropdownOpenId(null);
                              }}
                              className={`px-3 py-2 cursor-pointer text-sm text-slate-900 hover:bg-slate-50 transition-colors ${
                                item.ukuran === u.label ? "bg-slate-100 font-bold" : "bg-white font-normal"
                              }`}
                            >
                              Size {u.label} — Rp {hargaBaju(u.label).toLocaleString("id-ID")}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Input Jumlah */}
                  <div className="w-28 shrink-0">
                    <Input
                      type="number"
                      min="1"
                      disabled={loading}
                      value={item.jumlah}
                      onChange={(e) => updateBaris(item.id, "jumlah", e.target.value)}
                      placeholder="Qty"
                      className="text-center"
                    />
                  </div>

                  {/* Tombol Hapus Baris */}
                  <div className="w-8 flex justify-center shrink-0">
                    {daftarUkuran.length > 1 && (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => hapusBaris(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="Hapus baris"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Tombol Tambah Ukuran di Bawah */}
            <button
              type="button"
              disabled={loading}
              onClick={tambahBaris}
              className="mt-2.5 px-3 py-1.5 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-[12px] font-semibold rounded-xs cursor-pointer inline-flex items-center gap-1 transition-colors uppercase tracking-[0.5px]"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Tambah Ukuran</span>
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Panjang (cm)</label>
              <Input
                type="number"
                min="1"
                disabled={loading}
                value={panjangCm}
                onChange={(e) => handlePanjangChange(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Lebar (cm)</label>
              <Input
                type="number"
                min="1"
                disabled={mode === "gambar" || loading}
                value={lebarCm}
                onChange={(e) => {
                  const parsed = Number(e.target.value);
                  setLebarCm(Math.max(1, isNaN(parsed) ? 1 : parsed));
                }}
              />
            </div>
          </div>

          {mode === "teks" && (
            <>
              <div className="mb-4">
                <label className={labelClass}>Teks Bordir</label>
                <Input
                  value={teks}
                  disabled={loading}
                  onChange={(e) => setTeks(e.target.value)}
                  placeholder="Contoh: Baju Angkatan"
                />
              </div>

              <div className="mb-4">
                <label className={labelClass}>Warna Benang</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    disabled={loading}
                    value={warna}
                    onChange={(e) => setWarna(e.target.value)}
                    className="w-12 h-10 rounded-xs border border-slate-300 cursor-pointer bg-white p-1 box-border shrink-0"
                  />
                  <Input
                    value={warna}
                    disabled={loading}
                    onChange={(e) => setWarna(e.target.value)}
                    placeholder="#000000"
                    className="font-[family-name:var(--font-mono)] uppercase"
                  />
                </div>
              </div>

              <div className="mb-4 relative">
                <label className={labelClass}>Pilih Font</label>
                <Input
                  type="text"
                  disabled={loading}
                  value={fontQuery}
                  onFocus={() => {
                    setFontQuery("");
                    setFontDropdownOpen(true);
                  }}
                  onChange={(e) => {
                    setFontQuery(e.target.value);
                    setFontDropdownOpen(true);
                  }}
                  onBlur={() => {
                    setFontDropdownOpen(false);
                    setFontQuery(FONT_LIST.find((f) => f.css === font)?.nama || "");
                  }}
                  placeholder="Cari font..."
                />

                {fontDropdownOpen && (
                  <div className="absolute top-[calc(100%_+_4px)] left-0 right-0 bg-white border border-slate-300 rounded-xs max-h-[220px] overflow-y-auto z-10 shadow-[0_4px_10px_rgba(15,23,42,0.08)]">
                    {(() => {
                      const q = fontQuery.trim().toLowerCase();
                      const filtered = q
                        ? FONT_LIST.filter((f) => f.nama.toLowerCase().includes(q))
                        : FONT_LIST;

                      if (filtered.length === 0) {
                        return (
                          <div className="px-3 py-2.5 text-[13px] text-slate-400">
                            Font tidak ditemukan
                          </div>
                        );
                      }

                      return filtered.map((f) => (
                        <div
                          key={f.css}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setFont(f.css);
                            setFontQuery(f.nama);
                            setFontDropdownOpen(false);
                          }}
                          style={{ fontFamily: f.css }}
                          className={`px-3 py-2.5 cursor-pointer text-sm text-slate-900 hover:bg-slate-50 ${
                            font === f.css ? "bg-slate-100 font-bold" : "bg-white font-normal"
                          }`}
                        >
                          {f.nama}
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </>
          )}

          {mode === "gambar" && (
            <div className="mb-4">
              <label className={labelClass}>File Gambar / Logo</label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePilihFile}
                className="hidden"
                disabled={loading}
              />

              <div
                onClick={() => !loading && fileInputRef.current?.click()}
                className={`border border-dashed border-slate-300 rounded-xs px-3.5 py-3 bg-white flex items-center gap-2.5 box-border ${
                  loading ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                }`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#475569"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>

                <span
                  className={`text-[13px] grow overflow-hidden text-ellipsis whitespace-nowrap ${
                    file ? "text-slate-900 font-semibold" : "text-slate-500 font-normal"
                  }`}
                >
                  {file ? file.name : "Klik untuk pilih gambar (PNG, JPG, WEBP)..."}
                </span>

                {file && (
                  <span className="text-[11px] text-blue-600 font-semibold uppercase">
                    Ganti
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col">
            <label className={labelClass}>Catatan / Deskripsi Tambahan (opsional)</label>
            <Textarea
              value={catatan}
              disabled={loading}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: warna benang dominan biru, dsb."
              className="min-h-[80px]"
            />
          </div>
        </Card>

        {/* KOLOM KANAN: Panel Menyatu (Live Preview + Total Harga + Action) */}
        <Card className="p-5 flex flex-col box-border">
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-[0.5px] mt-0 mb-4">
            Live Preview ({panjangCm} x {lebarCm} cm)
          </h3>

          <div
            className={`${popCardClass} w-full h-[230px] flex items-center justify-center p-4 box-border overflow-hidden relative mb-5`}
          >
            {mode === "teks" ? (
              <span
                className="break-words text-center"
                style={{
                  fontFamily: font,
                  color: warna,
                  fontSize: `${Math.min(previewHeightPx * 0.5, 48)}px`,
                }}
              >
                {teks || "Teks Kamu"}
              </span>
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <span className="text-[13px] text-[#666666]">Belum ada gambar diupload</span>
            )}
          </div>

          <div className="mb-5">
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-[0.5px] mt-0 mb-2">
              Panduan Ukuran (Standar Asia)
            </h3>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-slate-100 text-[10px] text-slate-600 uppercase">
                  <th className="px-2 py-1.5 text-left border border-slate-200">Ukuran</th>
                  <th className="px-2 py-1.5 text-left border border-slate-200">Lebar Dada</th>
                  <th className="px-2 py-1.5 text-left border border-slate-200">Panjang Badan</th>
                  <th className="px-2 py-1.5 text-left border border-slate-200">Lebar Bahu</th>
                </tr>
              </thead>
              <tbody>
                {UKURAN_LIST.map((u) => (
                  <tr
                    key={u.label}
                    className={
                      selectedSizes.includes(u.label)
                        ? "bg-blue-50 font-bold text-blue-800"
                        : "text-slate-700"
                    }
                  >
                    <td className="px-2 py-1.5 border border-slate-200">{u.label}</td>
                    <td className="px-2 py-1.5 border border-slate-200">{u.dada} cm</td>
                    <td className="px-2 py-1.5 border border-slate-200">{u.panjang} cm</td>
                    <td className="px-2 py-1.5 border border-slate-200">{u.bahu} cm</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10.5px] text-slate-400 mt-1.5 mb-0">
              Lebar dada: ketiak kiri ke ketiak kanan. Panjang badan: bahu tertinggi ke ujung bawah kaos.
            </p>
          </div>

          <div className="mt-auto">
            <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xs mb-4 box-border">
              {mode === "teks" ? (
                <>
                  <p className="m-0 text-blue-700 font-bold text-base">
                    Estimasi Total: Rp{estimasiHargaTotal.toLocaleString("id-ID")}
                  </p>
                  <span className="text-xs text-slate-600 mt-1 block">
                    Total Qty: {totalBaju} pcs
                  </span>
                  <span className="text-xs text-slate-600 mt-0.5 block">
                    Rincian: {rincianUkuran.slice(0, -2)}
                  </span>
                  <span className="text-xs text-slate-600 mt-0.5 block italic">
                    (Harga menyesuaikan size + biaya bordir teks {luasCm2} cm²)
                  </span>
                </>
              ) : (
                <div>
                  <p className="m-0 text-blue-700 font-bold text-base">
                    Total Baju: {totalBaju} pcs
                  </p>
                  <span className="text-xs text-slate-600 mt-1 block">
                    Rincian: {rincianUkuran.slice(0, -2)}
                  </span>
                  <span className="text-xs text-slate-600 mt-0.5 block font-bold text-red-600">
                    + Biaya Bordir: (Ditentukan Admin via WA)
                  </span>
                </div>
              )}
            </div>

            <Button
              full
              size="lg"
              variant="popPrimary"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading
                ? "Mengirim..."
                : mode === "teks"
                ? "Lanjut ke Pembayaran"
                : "Kirim & Konsultasi Harga"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}