import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "../api";
import AuthCard from "../components/AuthCard";
import Input from "../components/Input";
import Button from "../components/Button";
import { labelClass } from "../components/ui";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const emailAwal = location.state?.email || "";

  const [email, setEmail] = useState(emailAwal);
  const [kode, setKode] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (passwordBaru.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    if (passwordBaru !== konfirmasi) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);

    const cleanEmail = email.trim();
    const cleanKode = kode.trim();

    try {
      await api.post("/api/auth/reset-password", {
        email: cleanEmail,
        kode: cleanKode,
        password_baru: passwordBaru,
      });
      navigate("/login", { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0]?.msg || "Format data tidak valid.");
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Gagal mengubah password. Pastikan kode OTP benar.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Atur Ulang Password"
      subtitle="Masukkan kode OTP dari email beserta password baru kamu."
      error={error}
      footer={
        <Link to="/login" className="text-blue-600 font-semibold no-underline">
          Kembali ke Masuk
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <label className={labelClass}>Email</label>
          <Input
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className={labelClass}>Kode OTP</label>
          <Input
            type="text"
            placeholder="123456"
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            maxLength={6}
            required
            disabled={loading}
            className="tracking-[2px] font-semibold"
          />
        </div>

        <div>
          <label className={labelClass}>Password Baru</label>
          <Input
            type="password"
            placeholder="Minimal 6 karakter"
            value={passwordBaru}
            onChange={(e) => setPasswordBaru(e.target.value)}
            required
            minLength={6}
            disabled={loading}
          />
        </div>

        <div>
          <label className={labelClass}>Konfirmasi Password</label>
          <Input
            type="password"
            placeholder="Ulangi password baru"
            value={konfirmasi}
            onChange={(e) => setKonfirmasi(e.target.value)}
            required
            minLength={6}
            disabled={loading}
          />
        </div>

        <Button type="submit" full disabled={loading} className="mt-1.5">
          {loading ? "Menyimpan..." : "Simpan Password Baru"}
        </Button>
      </form>
    </AuthCard>
  );
}