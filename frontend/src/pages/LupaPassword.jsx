import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import AuthCard from "../components/AuthCard";
import Input from "../components/Input";
import Button from "../components/Button";
import { labelClass } from "../components/ui";

export default function LupaPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim();

    try {
      await api.post("/api/auth/forgot-password", { email: cleanEmail });
      navigate("/reset-password", { state: { email: cleanEmail } });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0]?.msg || "Format email tidak valid.");
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Gagal mengirim kode OTP reset password.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Lupa Password"
      subtitle="Masukkan email akunmu. Kami akan mengirim kode OTP untuk mengatur ulang password."
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

        <Button type="submit" full disabled={loading} className="mt-1.5">
          {loading ? "Mengirim..." : "Kirim Kode OTP"}
        </Button>
      </form>
    </AuthCard>
  );
}