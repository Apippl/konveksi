import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import Alert from "../components/Alert";

export default function TransferKonfirmasiBaru() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [transferId, setTransferId] = useState(searchParams.get("id") || "");
  
  const [emailBaru, setEmailBaru] = useState(searchParams.get("email") || "");  const [kode, setKode] = useState("");
  const [error, setError] = useState("");
  const [selesai, setSelesai] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleKonfirmasi() {
    setError("");
    if (!transferId || !emailBaru || !kode) {
      setError("Semua kolom wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      await api.post(`/api/superadmin/transfer/${transferId}/konfirmasi-baru`, {
        email_baru: emailBaru,
        kode,
      });
      setSelesai(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Gagal mengonfirmasi transfer.");
    } finally {
      setLoading(false);
    }
  }

  if (selesai) {
    return (
      <div className="max-w-[450px] mt-16 mx-auto px-4">
        <Card className="p-6 text-center">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Transfer Berhasil</h2>
          <p className="text-[13px] text-slate-500 mb-5">
            Akun kamu sekarang punya hak akses superadmin. Silakan login.
          </p>
          <Button variant="primary" size="md" full onClick={() => navigate("/login")}>
            Ke Halaman Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[450px] mt-16 mx-auto px-4">
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Konfirmasi Transfer Ownership</h2>
        <p className="text-[13px] text-slate-500 mb-5">
          Masukkan kode OTP yang dikirim ke email kamu untuk menyelesaikan transfer.
        </p>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <label className="block mb-1.5 text-[13px] font-semibold text-slate-700">ID Transfer</label>
        <Input value={transferId} onChange={(e) => setTransferId(e.target.value)} className="mb-3" />

        <label className="block mb-1.5 text-[13px] font-semibold text-slate-700">Email Kamu</label>
        <Input
          type="email"
          value={emailBaru}
          onChange={(e) => setEmailBaru(e.target.value)}
          className="mb-3"
        />

        <label className="block mb-1.5 text-[13px] font-semibold text-slate-700">Kode OTP</label>
        <Input value={kode} onChange={(e) => setKode(e.target.value)} maxLength={6} className="mb-4" />

        <Button variant="primary" size="md" full disabled={loading} onClick={handleKonfirmasi}>
          {loading ? "Memproses..." : "Konfirmasi Transfer"}
        </Button>
      </Card>
    </div>
  );
}