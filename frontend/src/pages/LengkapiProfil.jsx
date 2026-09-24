import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import Card from "../components/Card";
import Input from "../components/Input";
import Textarea from "../components/Textarea";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { labelClass, pesanError } from "../components/ui";

export default function LengkapiProfil() {
  // Ambil data user awal dari localStorage
  const userLokal = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const [nama, setNama] = useState(userLokal.nama || "");
  const [email] = useState(userLokal.email || ""); // Email hanya untuk display (read-only)
  const [noTelepon, setNoTelepon] = useState(userLokal.no_telepon || "");
  const [alamat, setAlamat] = useState(userLokal.alamat || "");
  const [kodePos, setKodePos] = useState(userLokal.kode_pos || "");
  const [kota, setKota] = useState(userLokal.kota || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.put("/api/profile", {
        nama: nama.trim(),
        no_telepon: noTelepon.trim(),
        alamat: alamat.trim(),
        kode_pos: kodePos.trim(),
        kota: kota.trim(),
      });

      localStorage.setItem("user", JSON.stringify(res.data));
      navigate("/desain", { replace: true });
    } catch (err) {
      setError(pesanError(err, "Gagal menyimpan profil."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-[400px] mt-[60px] mx-auto p-6 box-border">
      <h2 className="mt-0 mb-2 text-slate-900 text-[20px] font-bold uppercase tracking-[-0.5px]">
        Lengkapi Profil
      </h2>
      <p className="mt-0 mb-5 text-slate-500 text-[13px]">
        Data ini diperlukan supaya pesanan bordir kamu bisa dikirim dengan benar.
      </p>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <label className={labelClass}>Email (Tidak dapat diubah)</label>
          <Input
            type="email"
            value={email}
            disabled
            className="bg-slate-100 text-slate-500 cursor-not-allowed opacity-80"
          />
        </div>

        <div>
          <label className={labelClass}>Nama Lengkap</label>
          <Input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            required
            disabled={loading}
            placeholder="Nama lengkap kamu"
          />
        </div>

        <div>
          <label className={labelClass}>Nomor Telepon</label>
          <Input
            type="tel"
            value={noTelepon}
            onChange={(e) => setNoTelepon(e.target.value)}
            required
            disabled={loading}
            placeholder="08xxxxxxxxxx"
          />
        </div>

        <div>
          <label className={labelClass}>Alamat Lengkap</label>
          <Textarea
            value={alamat}
            onChange={(e) => setAlamat(e.target.value)}
            required
            disabled={loading}
            className="min-h-[70px]"
            placeholder="Jalan, nomor rumah, RT/RW, kecamatan"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelClass}>Kota</label>
            <Input
              value={kota}
              onChange={(e) => setKota(e.target.value)}
              required
              disabled={loading}
              placeholder="Kota / Kabupaten"
            />
          </div>
          <div className="flex-1">
            <label className={labelClass}>Kode Pos</label>
            <Input
              value={kodePos}
              onChange={(e) => setKodePos(e.target.value)}
              required
              disabled={loading}
              placeholder="12345"
            />
          </div>
        </div>

        <Button type="submit" full disabled={loading} className="mt-1.5">
          {loading ? "Menyimpan..." : "Simpan & Lanjutkan"}
        </Button>
      </form>
    </Card>
  );
}