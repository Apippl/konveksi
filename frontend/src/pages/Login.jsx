import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import AuthCard from "../components/AuthCard";
import Input from "../components/Input";
import Button from "../components/Button";
import { labelClass } from "../components/ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [belumVerifikasi, setBelumVerifikasi] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBelumVerifikasi(false);
    setLoading(true);

    const cleanEmail = email.trim();

    try {
      const res = await api.post("/api/auth/login", {
        email: cleanEmail,
        password,
      });

      const user = res.data.user;
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(user));

      if (user.role === "superadmin") {
        navigate("/superadmin/dashboard", { replace: true });
      } else if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (!user.profil_lengkap) {
        navigate("/lengkapi-profil", { replace: true });
      } else {
        navigate("/desain", { replace: true });
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setBelumVerifikasi(true);
        setError("Akun belum diverifikasi.");
      } else {
        setError("Email atau password tidak valid.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Masuk"
      error={error}
      footer={
        <>
          Belum punya akun?{" "}
          <Link to="/register" className="text-blue-600 font-semibold no-underline">
            Daftar
          </Link>
        </>
      }
      top={
        <div translate="no" className="text-center font-extrabold text-[18px] text-slate-900 tracking-[-0.5px] uppercase notranslate mb-4">
          Konveksi<span className="text-blue-600">Bordir</span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <label className={labelClass}>Email</label>
          <Input
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setBelumVerifikasi(false); }}
            required
            disabled={loading}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={`${labelClass} mb-0`}>Password</label>
            <Link
              to="/lupa-password"
              className="text-blue-600 text-[12px] font-semibold no-underline"
            >
              Lupa password?
            </Link>
          </div>
          <Input
            type="password"
            placeholder="Masukkan password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setBelumVerifikasi(false); }}
            required
            disabled={loading}
          />
        </div>

        {belumVerifikasi ? (
          <Button
            type="button"
            variant="accent"
            full
            className="mt-1.5"
            onClick={() => navigate("/verifikasi-otp", { state: { email: email.trim() } })}
          >
            Lanjut Verifikasi Akun
          </Button>
        ) : (
          <Button type="submit" full className="mt-1.5" disabled={loading}>
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        )}
      </form>
    </AuthCard>
  );
}
