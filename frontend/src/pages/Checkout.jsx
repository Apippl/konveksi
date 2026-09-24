import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import Swal from "sweetalert2";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import { pesanError } from "../components/ui";
import { payWithSnap } from "../snapPay";

function rupiah(n) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kode, setKode] = useState("");
  const [diskon, setDiskon] = useState(null); // {kode, diskon, total_bayar}
  const [bayarLoading, setBayarLoading] = useState(false);

  useEffect(() => {
    api
      .get(`/api/pesanan/${id}`)
      .then((res) => setP(res.data))
      .catch((err) => setError(pesanError(err, "Gagal memuat pesanan.")))
      .finally(() => setLoading(false));
  }, [id]);

  const totalQty = (p?.detail || []).reduce((s, d) => s + d.jumlah, 0);
  const totalBayar = diskon ? diskon.total_bayar : p?.total_harga ?? 0;

  const handleCek = async () => {
    const k = kode.trim();
    if (!k) return;
    try {
      const res = await api.get(`/api/pesanan/${id}/cek-kupon`, { params: { kode: k } });
      setDiskon(res.data);
    } catch (err) {
      setDiskon(null);
      Swal.fire({ title: "Kupon tidak berlaku", text: err.response?.data?.detail || "Kode salah.", confirmButtonColor: "#273d8a" });
    }
  };

  const handleBayar = async () => {
    setBayarLoading(true);
    try {
      const res = await api.post(
        `/api/pesanan/${id}/bayar`,
        null,
        diskon ? { params: { kode_kupon: diskon.kode } } : {}
      );
      await payWithSnap(res.data.snap_token, {
        onSuccess: async () => {
          await api.get(`/api/pesanan/${id}/cek-status`);
          navigate("/pesanan-saya", { replace: true });
        },
        onPending: () => navigate("/pesanan-saya", { replace: true }),
        onClose: () => {},
        onError: () => Swal.fire({ title: "Pembayaran gagal", text: "Silakan coba lagi.", confirmButtonColor: "#273d8a" }),
      });
    } catch (err) {
      Swal.fire({ title: "Gagal", text: pesanError(err, "Gagal memulai pembayaran."), confirmButtonColor: "#273d8a" });
    } finally {
      setBayarLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Memuat checkout...</div>;
  if (error || !p) {
    return (
      <div className="max-w-[640px] mx-auto px-4 mt-6">
        <Card className="p-6 text-center text-red-500 text-sm">{error || "Pesanan tidak ditemukan."}</Card>
        <div className="mt-3">
          <Button variant="outline" size="md" onClick={() => navigate("/pesanan-saya")}>Kembali</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 mt-6">
      <h2 className="text-slate-900 text-[20px] font-bold uppercase mb-5">Checkout</h2>

      <Card className="p-5 mb-4">
        <div className="flex justify-between items-center mb-1">
          <strong className="text-[14px]">{p.kode_pesanan || `#${p.id}`}</strong>
          <span className="text-[12px] text-slate-500">
            {p.dibuat_pada ? new Date(p.dibuat_pada).toLocaleDateString("id-ID") : ""}
          </span>
        </div>
        <div className="text-[13px] text-slate-600 mb-4">
          {p.teks ? `"${p.teks}" (${p.font || "-"})` : "Gambar kustom"} • {p.panjang_cm} × {p.lebar_cm} cm
        </div>

        <div className="border-t border-slate-200 pt-3 space-y-2 text-[13px]">
          {(p.detail || []).map((d, i) => (
            <div key={i} className="flex justify-between">
              <span>Baju Size {d.ukuran} × {d.jumlah}</span>
              <span>{rupiah(d.harga_baju * d.jumlah)}</span>
            </div>
          ))}
          <div className="flex justify-between">
            <span>Bordir × {totalQty}</span>
            <span>{rupiah((p.harga_bordir || 0) * totalQty)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t border-slate-200 pt-2">
            <span>Subtotal</span>
            <span>{rupiah(p.total_harga)}</span>
          </div>
          {diskon && (
            <div className="flex justify-between text-green-600 font-semibold">
              <span>Diskon {diskon.kode}</span>
              <span>−{rupiah(diskon.diskon)}</span>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5 mb-4">
        <div className="font-bold text-[13px] mb-3 uppercase text-slate-600">Kupon</div>
        {diskon ? (
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-green-600 font-semibold">{diskon.kode} terpasang</span>
            <button onClick={() => { setDiskon(null); setKode(""); }} className="text-[12px] text-red-600 font-semibold cursor-pointer bg-transparent border-0">
              Lepas
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input value={kode} onChange={(e) => setKode(e.target.value.toUpperCase())} placeholder="Kode kupon" className="flex-1 uppercase" />
            <Button variant="outline" size="md" onClick={handleCek}>Pakai</Button>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold text-[14px] uppercase">Total bayar</span>
          <strong className="text-[20px]">{rupiah(totalBayar)}</strong>
        </div>
        {p.metode_pembayaran && (
          <div className="text-[12px] text-slate-500 mb-3">Terakhir via {p.metode_pembayaran}</div>
        )}
        <Button variant="primary" size="md" full disabled={bayarLoading} onClick={handleBayar}>
          {bayarLoading ? "Memproses..." : `Bayar ${rupiah(totalBayar)}`}
        </Button>
        <Button variant="outline" size="md" full className="mt-2" onClick={() => navigate("/pesanan-saya")}>
          Kembali
        </Button>
        <p className="text-[11px] text-slate-400 text-center mt-3">
          Pembayaran aman via Midtrans (QRIS, GoPay, VA Bank, gerai retail).
        </p>
      </Card>
    </div>
  );
}
