import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import Card from "../components/Card";
import Button from "../components/Button";
import { pesanError } from "../components/ui";

function rupiah(n) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

function Baris({ label, value, bold }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="nota-label">{label}</span>
      <span className={bold ? "font-bold text-right" : "text-right"}>{value}</span>
    </div>
  );
}

export default function Nota() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/api/pesanan/${id}`)
      .then((res) => setP(res.data))
      .catch((err) => setError(pesanError(err, "Gagal memuat nota.")))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-center text-slate-500">Memuat nota...</div>;
  if (error || !p) {
    return (
      <div className="max-w-[640px] mx-auto px-4 mt-6">
        <Card className="p-6 text-center text-red-500 text-sm">{error || "Nota tidak ditemukan."}</Card>
        <div className="mt-3 no-print">
          <Button variant="outline" size="md" onClick={() => navigate(-1)}>Kembali</Button>
        </div>
      </div>
    );
  }

  const totalQty = (p.detail || []).reduce((s, d) => s + d.jumlah, 0);
  const tanggal = p.dibuat_pada
    ? new Date(p.dibuat_pada).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "-";
  const lunas = p.status_pembayaran === "Lunas";

  return (
    <div className="max-w-[640px] mx-auto px-4 mt-6">
      <div className="flex gap-2 mb-4 no-print">
        <Button variant="outline" size="md" onClick={() => navigate(-1)}>Kembali</Button>
        <Button variant="primary" size="md" onClick={() => window.print()}>Cetak Nota</Button>
      </div>

      <div className="nota-print">
        {/* Kop */}
        <div className="nota-kop">
          <div>
            <div className="nota-brand">KONVEKSI<span> BORDIR</span></div>
            <div className="nota-tagline">Jasa Bordir Kustom &amp; Presisi</div>
          </div>
          <div className="nota-nomor">
            <div className="nota-nota-label">NOTA PEMESANAN</div>
            <div className="nota-kode">{p.kode_pesanan || `#${p.id}`}</div>
            <div className={`nota-status ${lunas ? "lunas" : ""}`}>{p.status_pembayaran}</div>
          </div>
        </div>

        {/* Info */}
        <div className="nota-info">
          <div>
            <Baris label="Tanggal" value={tanggal} />
            <Baris label="Pelanggan" value={p.nama_pelanggan || "-"} bold />
            {p.no_telepon && <Baris label="No. WA" value={p.no_telepon} />}
          </div>
          <div>
            <Baris label="Desain" value={p.teks ? `"${p.teks}"` : "Gambar kustom"} bold />
            {p.teks && p.font && <Baris label="Font" value={p.font} />}
            <Baris label="Dimensi" value={`${p.panjang_cm} × ${p.lebar_cm} cm`} />
            {p.warna && <Baris label="Warna" value={p.warna} />}
            {p.catatan && <Baris label="Catatan" value={p.catatan} />}
          </div>
        </div>

        {/* Rincian */}
        <table className="nota-tabel">
          <thead>
            <tr>
              <th>Item</th>
              <th className="r">Harga</th>
              <th className="r">Qty</th>
              <th className="r">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(p.detail || []).map((d, i) => (
              <tr key={i}>
                <td>Baju Size {d.ukuran}</td>
                <td className="r">{rupiah(d.harga_baju)}</td>
                <td className="r">{d.jumlah} pcs</td>
                <td className="r">{rupiah(d.harga_baju * d.jumlah)}</td>
              </tr>
            ))}
            <tr>
              <td>Bordir ({totalQty} pcs)</td>
              <td className="r">{rupiah(p.harga_bordir)}</td>
              <td className="r">{totalQty} pcs</td>
              <td className="r">{rupiah((p.harga_bordir || 0) * totalQty)}</td>
            </tr>
            {(p.diskon || 0) > 0 && (
              <tr>
                <td>Diskon {p.kode_kupon || ""}</td>
                <td className="r">-</td>
                <td className="r">-</td>
                <td className="r">-{rupiah(p.diskon)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Total + bayar */}
        <div className="nota-bawah">
          <div className="nota-bayar">
            <Baris label="Status pesanan" value={p.status} />
            {p.metode_pembayaran && <Baris label="Dibayar via" value={p.metode_pembayaran} bold />}
            {!p.metode_pembayaran && <Baris label="Dibayar via" value="-" />}
          </div>
          <div className="nota-total">
            <span>TOTAL{(p.diskon || 0) > 0 ? " (stlh. diskon)" : ""}</span>
            <strong>{rupiah((p.total_harga || 0) - (p.diskon || 0))}</strong>
          </div>
        </div>

        {/* Tanda tangan */}
        <div className="nota-ttd">
          <div>
            <span>Pelanggan,</span>
            <strong>{p.nama_pelanggan || "(...............)"}</strong>
          </div>
          <div>
            <span>Admin,</span>
            <strong>(...............)</strong>
          </div>
        </div>

        <p className="nota-kaki">Terima kasih sudah memesan — tunjukkan nota ini saat pengambilan.</p>
      </div>
    </div>
  );
}
