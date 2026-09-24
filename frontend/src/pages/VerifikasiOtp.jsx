import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "../api";
import AuthCard from "../components/AuthCard";
import Input from "../components/Input";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { labelClass, pesanError } from "../components/ui";

export default function VerifikasiOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  // Kunci email ke akun yang dikirimi OTP (anti salah ketik / coba-coba email lain).
  // sessionStorage agar tetap terkunci walau halaman di-refresh (location.state hilang saat refresh).
  const emailDariAlur = location.state?.email || sessionStorage.getItem("pendingVerifyEmail") || "";
  const emailTerkunci = emailDariAlur !== "";

  const [email, setEmail] = useState(emailDariAlur);
  const [kode, setKode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [mengirimUlang, setMengirimUlang] = useState(false);

  useEffect(() => {
    if (location.state?.email) {
      sessionStorage.setItem("pendingVerifyEmail", location.state.email);
    }
  }, [location.state]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      const cleanKode = kode.trim();

      const res = await api.post("/api/auth/verify-otp", {
        email: cleanEmail,
        kode: cleanKode,
      });

      const user = res.data.user;
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(user));
      sessionStorage.removeItem("pendingVerifyEmail");

      // Direct redirect sesuai role & kelengkapan profil
      if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (!user.profil_lengkap) {
        navigate("/lengkapi-profil", { replace: true });
      } else {
        navigate("/desain", { replace: true });
      }
    } catch (err) {
      setError(pesanError(err, "Gagal melakukan verifikasi OTP."));
    } finally {
      setLoading(false);
    }
  }

  async function handleKirimUlang() {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Isi email terlebih dahulu sebelum meminta kode ulang.");
      return;
    }

    setError("");
    setInfo("");
    setMengirimUlang(true);

    try {
      const res = await api.post("/api/auth/resend-otp", { email: cleanEmail });
      setInfo(res.data.message || "Kode OTP baru berhasil dikirim.");
    } catch (err) {
      setError(pesanError(err, "Gagal mengirim ulang kode OTP."));
    } finally {
      setMengirimUlang(false);
    }
  }

  return (
    <AuthCard
      title="Verifikasi Akun"
      subtitle="Kode OTP telah dikirim ke email kamu (cek juga folder Spam). Masukkan 6 digit kodenya di bawah."
      error={error}
      footer={
        <Link to="/login" className="text-blue-600 font-semibold no-underline">
          Kembali ke Masuk
        </Link>
      }
    >
      {info && (
        <Alert variant="success" className="mb-4">
          {info}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <label className={labelClass}>Email</label>
          <Input
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={emailTerkunci || loading || mengirimUlang}
            className={emailTerkunci ? "bg-slate-100 text-slate-500 cursor-not-allowed opacity-80" : ""}
          />
          {emailTerkunci && (
            <p className="text-[12px] text-slate-500 mt-1.5">
              Kode dikirim ke email ini dan tidak bisa diubah. Bukan email kamu?{" "}
              <Link
                to="/register"
                onClick={() => sessionStorage.removeItem("pendingVerifyEmail")}
                className="text-blue-600 font-semibold no-underline"
              >
                Daftar ulang
              </Link>
            </p>
          )}
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
            disabled={loading || mengirimUlang}
            className="tracking-[2px] font-semibold"
          />
        </div>

        <Button type="submit" full disabled={loading || mengirimUlang} className="mt-1.5">
          {loading ? "Memverifikasi..." : "Verifikasi"}
        </Button>
      </form>

      <Button
        type="button"
        variant="outline"
        full
        disabled={loading || mengirimUlang}
        onClick={handleKirimUlang}
        className="mt-3"
      >
        {mengirimUlang ? "Mengirim..." : "Kirim Ulang Kode OTP"}
      </Button>
    </AuthCard>
  );
}