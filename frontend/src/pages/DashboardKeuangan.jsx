import { useEffect, useState } from "react";
import api from "../api";
import Card from "../components/Card";
import Swal from "sweetalert2";

function formatRupiah(n) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

function KartuStat({ label, nilai, warna = "text-slate-900" }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${warna}`}>{nilai}</div>
    </Card>
  );
}

export default function DashboardKeuangan() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api
      .get("/api/superadmin/dashboard")
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.get("/api/superadmin/dashboard/export-csv", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "laporan_keuangan.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      Swal.fire({
        title: "Gagal Export",
        text: err.response?.data?.detail || "Gagal mengunduh laporan.",
        confirmButtonColor: "#273d8a",
      });
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="p-10 text-center text-slate-500">Memuat dashboard...</div>;
  if (!data) return <div className="p-10 text-center text-red-500">Gagal memuat data.</div>;

  return (
    <div className="max-w-[1100px] mt-6 mx-auto px-4">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-slate-900 text-[22px] font-bold uppercase tracking-[-0.3px]">
          Dashboard Keuangan
        </h2>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-slate-900 text-white px-4 py-2.5 rounded-xs text-[12px] font-bold uppercase cursor-pointer disabled:opacity-50"
        >
          {exporting ? "Mengunduh..." : "Export CSV"}
        </button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
        <KartuStat label="Total Pendapatan" nilai={formatRupiah(data.total_pendapatan)} warna="text-green-600" />
        <KartuStat label="Pendapatan Bulan Ini" nilai={formatRupiah(data.pendapatan_bulan_ini)} warna="text-blue-600" />
        <KartuStat label="Total Pesanan" nilai={data.jumlah_pesanan} />
        <KartuStat label="Pesanan Lunas" nilai={data.jumlah_lunas} warna="text-green-600" />
      </div>

      <h3 className="text-sm font-bold text-slate-600 uppercase tracking-[0.5px] mb-3">
        Rincian Status Pesanan
      </h3>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
        <KartuStat label="Pending" nilai={data.jumlah_pending} warna="text-amber-600" />
        <KartuStat label="Diproses" nilai={data.jumlah_diproses} warna="text-blue-600" />
        <KartuStat label="Dikirim" nilai={data.jumlah_dikirim} warna="text-purple-600" />
        <KartuStat label="Selesai" nilai={data.jumlah_selesai} warna="text-green-600" />
        <KartuStat label="Batal" nilai={data.jumlah_batal} warna="text-red-600" />
      </div>
    </div>
  );
}