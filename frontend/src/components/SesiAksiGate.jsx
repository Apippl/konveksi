import { useEffect, useState } from "react";
import api from "../api";
import Card from "./Card";
import Input from "./Input";
import Button from "./Button";
import Alert from "./Alert";

export default function SesiAksiGate({ children }) {
  const [berlakuHingga, setBerlakuHingga] = useState(null);
  const [sisaDetik, setSisaDetik] = useState(0);
  const [otpDikirim, setOtpDikirim] = useState(false);
  const [kode, setKode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mengecek, setMengecek] = useState(true);

  // Saat halaman dibuka (termasuk pindah menu lalu balik), tanya backend
  // apakah sesi 15 menit masih aktif — jangan minta OTP ulang kalau iya.
  useEffect(() => {
    api
      .get("/api/superadmin/sesi-aksi/status")
      .then((res) => {
        if (res.data?.aktif && res.data.berlaku_hingga) {
          setBerlakuHingga(new Date(res.data.berlaku_hingga + "Z"));
        }
      })
      .catch(() => {})
      .finally(() => setMengecek(false));
  }, []);

  useEffect(() => {
    if (!berlakuHingga) return;
    const interval = setInterval(() => {
      const sisa = Math.floor((berlakuHingga.getTime() - Date.now()) / 1000);
      if (sisa <= 0) {
        setSisaDetik(0);
        setBerlakuHingga(null);
        setOtpDikirim(false);
        clearInterval(interval);
      } else {
        setSisaDetik(sisa);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [berlakuHingga]);

  async function mintaOtp() {
    setError("");
    setLoading(true);
    try {
      await api.post("/api/superadmin/minta-otp-aksi");
      setOtpDikirim(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Gagal mengirim kode OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function verifikasi() {
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/superadmin/verifikasi-otp-aksi", { kode });
      setBerlakuHingga(new Date(res.data.berlaku_hingga + "Z"));
      setKode("");
    } catch (err) {
      setError(err.response?.data?.detail || "Kode OTP salah atau kedaluwarsa.");
    } finally {
      setLoading(false);
    }
  }

  const sesiAktif = berlakuHingga && sisaDetik > 0;

  if (sesiAktif) {
    const menit = Math.floor(sisaDetik / 60);
    const detik = sisaDetik % 60;
  if (mengecek) {
    return <p className="text-slate-500 text-sm">Mengecek sesi...</p>;
  }

  return (
      <div>
        <div className="mb-4 px-3 py-2 rounded-xs bg-green-50 border border-green-200 text-[12px] text-green-700 font-semibold flex justify-between items-center">
          <span>Sesi aksi sensitif aktif</span>
          <span className="font-[family-name:var(--font-mono)]">
            Sisa {menit}:{String(detik).padStart(2, "0")}
          </span>
        </div>
        {children}
      </div>
    );
  }

  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold text-slate-600 uppercase tracking-[0.5px] mt-0 mb-3">
        Verifikasi Diperlukan
      </h3>
      <p className="text-[13px] text-slate-500 mb-4">
        Aksi ini sensitif, verifikasi OTP dulu lewat email. Sesi berlaku 15 menit setelah
        verifikasi, jadi kamu bisa lakukan beberapa aksi tanpa verifikasi ulang.
      </p>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {!otpDikirim ? (
        <Button variant="primary" size="md" disabled={loading} onClick={mintaOtp}>
          {loading ? "Mengirim..." : "Kirim Kode OTP ke Email"}
        </Button>
      ) : (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              placeholder="Kode OTP (6 digit)"
              maxLength={6}
            />
          </div>
          <Button variant="primary" size="md" disabled={loading || kode.length < 6} onClick={verifikasi}>
            {loading ? "Memverifikasi..." : "Verifikasi"}
          </Button>
        </div>
      )}
    </Card>
  );
}