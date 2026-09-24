import { useState } from "react";
import api from "../api";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import Alert from "../components/Alert";
import SesiAksiGate from "../components/SesiAksiGate";

export default function TransferOwnership() {
  const [tahap, setTahap] = useState(1); // 1: mulai, 2: konfirmasi kode dari email lama, 3: selesai
  const [emailBaru, setEmailBaru] = useState("");
  const [transferId, setTransferId] = useState(null);
  const [kode, setKode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [linkKonfirmasi, setLinkKonfirmasi] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleMulai() {
    setError("");
    if (!emailBaru) {
      setError("Isi email pemilik baru dulu.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/api/superadmin/transfer/mulai", { email_baru: emailBaru });
      setTransferId(res.data.transfer_id);
      setInfo(res.data.message);
      setTahap(2);
    } catch (err) {
      setError(err.response?.data?.detail || "Gagal memulai transfer.");
    } finally {
      setLoading(false);
    }
  }

  async function handleKonfirmasiLama() {
    setError("");
    setLoading(true);
    try {
      const res = await api.post(`/api/superadmin/transfer/${transferId}/konfirmasi-lama`, { kode });
      setInfo(res.data.message);
      setLinkKonfirmasi(
        res.data.link_konfirmasi ||
          `${window.location.origin}/transfer-konfirmasi?id=${transferId}&email=${encodeURIComponent(emailBaru)}`
      );
      setTahap(3);
    } catch (err) {
      setError(err.response?.data?.detail || "Kode salah atau kedaluwarsa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[800px] mt-6 mx-auto px-4">
      <h2 className="text-slate-900 text-[22px] font-bold uppercase tracking-[-0.3px] mb-2">
        Transfer Ownership
      </h2>
      <p className="text-[13px] text-slate-500 mb-5">
        Memindahkan hak akses superadmin ke pemilik baru lewat 2 tahap verifikasi email.
      </p>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {tahap === 1 && (
        <SesiAksiGate>
          <Card className="p-5">
            <label className="block mb-1.5 text-[13px] font-semibold text-slate-700">
              Email Pemilik Baru
            </label>
            <Input
              type="email"
              value={emailBaru}
              onChange={(e) => setEmailBaru(e.target.value)}
              placeholder="pemilik.baru@email.com"
              className="mb-4"
            />
            <p className="text-[12px] text-amber-600 mb-4">
              Pastikan email ini sudah terdaftar dan terverifikasi di sistem sebelum transfer.
            </p>
            <Button variant="danger" size="md" disabled={loading} onClick={handleMulai}>
              {loading ? "Memproses..." : "Mulai Transfer Ownership"}
            </Button>
          </Card>
        </SesiAksiGate>
      )}

      {tahap === 2 && (
        <Card className="p-5">
          {info && <Alert variant="info" className="mb-4">{info}</Alert>}
          <label className="block mb-1.5 text-[13px] font-semibold text-slate-700">
            Kode OTP dari Email Kamu (Superadmin Saat Ini)
          </label>
          <Input
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            placeholder="Kode OTP (6 digit)"
            maxLength={6}
            className="mb-4"
          />
          <Button variant="primary" size="md" disabled={loading || kode.length < 6} onClick={handleKonfirmasiLama}>
            {loading ? "Memverifikasi..." : "Konfirmasi & Lanjut ke Tahap 2"}
          </Button>
        </Card>
      )}

      {tahap === 3 && (
        <Card className="p-5">
          <Alert variant="success" className="mb-4">
            {info}
          </Alert>
          <p className="text-[13px] text-slate-600 mb-3">
            Kode OTP <strong>dan link konfirmasi</strong> sudah dikirim otomatis ke email{" "}
            <strong className="text-slate-900">{emailBaru}</strong>. Pemilik baru tinggal membuka
            emailnya, klik tombol <strong>Buka Halaman Konfirmasi</strong>, lalu masukkan kode OTP.
            Tidak perlu kirim link manual.
          </p>

          <details className="text-[12px] text-slate-500">
            <summary className="cursor-pointer select-none">Email tidak masuk? Tampilkan link cadangan</summary>
            <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xs p-3 font-[family-name:var(--font-mono)] break-all select-all">
              {linkKonfirmasi}
            </div>
          </details>
        </Card>
      )}
    </div>
  );
}