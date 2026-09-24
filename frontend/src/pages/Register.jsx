import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import AuthCard from "../components/AuthCard";
import Input from "../components/Input";
import Button from "../components/Button";
import { labelClass, pesanError } from "../components/ui";

export default function Register() {
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      await api.post("/api/auth/register", {
        nama: nama.trim(),
        email: cleanEmail,
        password,
      });

      navigate("/verifikasi-otp", { state: { email: cleanEmail } });
    } catch (err) {
      setError(pesanError(err, "Gagal mendaftar. Silakan coba lagi."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Daftar Akun"
      top={
        <div translate="no" className="text-center font-extrabold text-[18px] text-slate-900 tracking-[-0.5px] uppercase notranslate mb-4">
          Konveksi<span className="text-blue-600">Bordir</span>
        </div>
      }
      error={error}
      footer={
        <>
          Sudah punya akun?{" "}
          <Link to="/login" className="text-blue-600 font-semibold no-underline">
            Masuk
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <label className={labelClass}>Nama Lengkap</label>
          <Input
            placeholder="Nama lengkap"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            required
            disabled={loading}
          />
        </div>

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
          <label className={labelClass}>Password</label>
          <Input
            type="password"
            placeholder="Minimal 6 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
          />
        </div>

        <Button type="submit" full className="mt-1.5" disabled={loading}>
          {loading ? "Mendaftarkan..." : "Daftar"}
        </Button>
      </form>
    </AuthCard>
  );
}