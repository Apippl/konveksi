import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import api from "../api";
import Card from "../components/Card";
import Input from "../components/Input";
import Textarea from "../components/Textarea";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { labelClass } from "../components/ui";

export default function ProfilSaya() {
  // Ambil data user awal dari localStorage sebagai cadangan
  const userLokal = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const [nama, setNama] = useState(userLokal.nama || "");
  const [email, setEmail] = useState(userLokal.email || "");
  const [noTelepon, setNoTelepon] = useState(userLokal.no_telepon || "");
  const [alamat, setAlamat] = useState(userLokal.alamat || "");
  const [kodePos, setKodePos] = useState(userLokal.kode_pos || "");
  const [kota, setKota] = useState(userLokal.kota || "");
  const [role, setRole] = useState(userLokal.role || "client");

  const isAdmin = ["admin", "superadmin"].includes(role);
  // Admin & superadmin tidak boleh ganti nama (dikelola lewat menu pengelola),
  // dan tidak punya alamat pengiriman karena mereka tidak memesan bordir.
  const bolehUbahNama = !isAdmin;

  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Ambil data profil terbaru dari server backend saat komponen di-mount
  useEffect(() => {
    async function loadProfil() {
      try {
        const res = await api.get("/api/profile");
        const data = res.data;

        setNama(data.nama || "");
        setEmail(data.email || "");
        setNoTelepon(data.no_telepon || "");
        setAlamat(data.alamat || "");
        setKodePos(data.kode_pos || "");
        setKota(data.kota || "");
        setRole(data.role || "client");

        // Sinkronkan ke localStorage
        localStorage.setItem("user", JSON.stringify(data));
      } catch {
        // Profil tetap memakai data lokal jika fetch gagal; tidak log ke console prod.
      } finally {
        setFetching(false);
      }
    }

    loadProfil();
  }, []);

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

      // Update data di localStorage
      localStorage.setItem("user", JSON.stringify(res.data));

      Swal.fire({
        title: "Berhasil",
        text: "Data profil kamu berhasil diperbarui.",
        customClass: { popup: "swal-accent-success" },
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0]?.msg || "Format input tidak valid.");
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Gagal menyimpan profil.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="max-w-[400px] mt-[60px] mx-auto text-center text-slate-500 text-sm">
        Memuat data profil...
      </div>
    );
  }

  return (
    <Card className="max-w-[400px] mt-[60px] mx-auto p-6 box-border">
      <h2 className="mt-0 mb-2 text-slate-900 text-[20px] font-bold uppercase tracking-[-0.5px]">
        Profil Saya
      </h2>
      <p className="mt-0 mb-5 text-slate-500 text-[13px]">
        {isAdmin
          ? "Kelola informasi akun kamu di sini."
          : "Kelola informasi akun dan alamat pengiriman pesanan kamu di sini."}
      </p>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <label className={labelClass}>Email</label>
          <Input
            type="email"
            value={email}
            disabled
            className="bg-slate-100 text-slate-500 cursor-not-allowed opacity-80"
          />
        </div>

        <div>
          <label className={labelClass}>
            Nama Lengkap{bolehUbahNama ? "" : " (Tidak dapat diubah)"}
          </label>
          <Input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            required
            disabled={loading || !bolehUbahNama}
            className={bolehUbahNama ? "" : "bg-slate-100 text-slate-500 cursor-not-allowed opacity-80"}
            placeholder="Nama lengkap kamu"
          />
        </div>

        {!isAdmin && (
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
        )}

        {!isAdmin && (
          <>
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
          </>
        )}

        {isAdmin ? (
          <p className="text-[12px] text-slate-500 m-0">
            Identitas akun ini dikelola oleh superadmin lewat menu{" "}
            <strong className="text-slate-900">Kelola Pengelola</strong>. Hubungi superadmin
            untuk perubahan data.
          </p>
        ) : (
          <Button type="submit" full disabled={loading} className="mt-1.5">
            {loading ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        )}
      </form>
    </Card>
  );
}