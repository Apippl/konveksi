import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import Swal from "sweetalert2";
import { statusClass, pesanError } from "../components/ui";
import Input from "../components/Input";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";

const STATUS_PESANAN = ["Pending", "Diproses", "Dikirim", "Selesai", "Batal"];

function linkWhatsApp(no) {
  if (!no) return null;
  const digit = String(no).replace(/\D/g, "");
  if (!digit) return null;
  const intl = digit.startsWith("0") ? "62" + digit.slice(1) : digit;
  return `https://wa.me/${intl}`;
}

export default function Admin({ readOnly = false }) {
  const [pesananList, setPesananList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cari, setCari] = useState("");
  const [dariTanggal, setDariTanggal] = useState("");
  const [sampaiTanggal, setSampaiTanggal] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [halaman, setHalaman] = useState(1);
  const PER_HALAMAN = 20;
  const navigate = useNavigate();

  const fetchPesanan = async () => {
    try {
      const res = await api.get("/api/pesanan");
      setPesananList(res.data);
    } catch {
      setPesananList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api
      .get("/api/pesanan")
      .then((res) => setPesananList(res.data))
      .catch(() => setPesananList([]))
      .finally(() => setLoading(false));
  }, []);

  function ubahFilter(setter) {
    return (e) => {
      setter(e.target.value);
      setHalaman(1);
    };
  }

  const handleUpdateStatus = async (id, statusBaru) => {
    try {
      await api.put(`/api/pesanan/${id}`, { status: statusBaru });
      fetchPesanan();
    } catch (err) {
      Swal.fire({
        title: "Gagal Update",
        text: pesanError(err, "Gagal memperbarui status."),
        confirmButtonText: "OK",
        confirmButtonColor: "#273d8a",
      });
    }
  };

  const handlePilihStatus = async (id, statusBaru) => {
    if (statusBaru === "Dikirim") {
      const result = await Swal.fire({
        title: "Tandai Sudah Dikirim?",
        text: "Setelah ini status tidak bisa diubah lagi lewat dropdown. Pesanan hanya bisa berpindah ke Selesai lewat konfirmasi pelanggan atau tombol selesaikan manual.",
        showCancelButton: true,
        confirmButtonText: "Ya, Sudah Dikirim",
        cancelButtonText: "Batal",
        confirmButtonColor: "#273d8a",
        cancelButtonColor: "#3d3d3d",
      });
      if (!result.isConfirmed) return;
    }
    handleUpdateStatus(id, statusBaru);
  };

  const handleSelesaikanManual = async (id) => {
    const result = await Swal.fire({
      title: "Konfirmasi Manual Selesai?",
      text: "Gunakan ini kalau pelanggan tidak merespon konfirmasi penerimaan. Pastikan barang memang sudah diterima.",
      showCancelButton: true,
      confirmButtonText: "Ya, Tandai Selesai",
      cancelButtonText: "Batal",
      confirmButtonColor: "#273d8a",
      cancelButtonColor: "#3d3d3d",
    });
    if (!result.isConfirmed) return;

    try {
      await api.put(`/api/pesanan/${id}/selesaikan-manual`);
      fetchPesanan();
    } catch (err) {
      Swal.fire({
        title: "Gagal",
        text: pesanError(err, "Gagal menandai pesanan selesai."),
        confirmButtonColor: "#273d8a",
      });
    }
  };

  const handleUpdateHargaBordir = async (id, hargaBordir) => {
    if (hargaBordir === "" || isNaN(hargaBordir)) return;

    try {
      await api.put(`/api/pesanan/${id}`, { harga_bordir: parseInt(hargaBordir) });
      fetchPesanan();
      Swal.fire({
        title: "Berhasil",
        text: "Biaya bordir & link pembayaran berhasil disimpan.",
        customClass: { popup: "swal-accent-success" },
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        title: "GAGAL UPDATE",
        text: pesanError(err, "Gagal memperbarui harga."),
        confirmButtonText: "OK",
        confirmButtonColor: "#273d8a",
      });
    }
  };

  const handleDownloadDst = async (pesananId, teks) => {
    try {
      const response = await api.get(`/api/pesanan/${pesananId}/download-dst`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const safeTeks = teks ? teks.replace(/[^a-zA-Z0-9]/g, "_") : "Bordir";
      link.setAttribute("download", `PESANAN_${pesananId}_${safeTeks}.dst`);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      Swal.fire({
        title: "Gagal Unduh",
        text: pesanError(err, "Gagal mendownload file DST."),
        confirmButtonText: "OK",
        confirmButtonColor: "#273d8a",
      });
    }
  };

  // File upload sekarang dilindungi login, jadi tidak bisa dibuka lewat <a href>.
  // Kita ambil sebagai blob lewat axios (Authorization header otomatis terpasang),
  // lalu buka object URL-nya di tab baru.
  const lihatGambar = async (gambarUrl) => {
    try {
      const res = await api.get(gambarUrl, { responseType: "blob" });
      const objectUrl = window.URL.createObjectURL(res.data);
      window.open(objectUrl, "_blank", "noopener");
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60000);
    } catch (err) {
      Swal.fire({
        title: "Gagal Buka",
        text: pesanError(err, "Gagal membuka gambar."),
        confirmButtonText: "OK",
        confirmButtonColor: "#273d8a",
      });
    }
  };

  const handleHapusPesanan = async (pesananId) => {
    const result = await Swal.fire({
      title: "Hapus Pesanan?",
      text: `Data pesanan #${pesananId} akan dihapus permanen.`,
      showCancelButton: true,
      confirmButtonText: "Hapus Permanen",
      cancelButtonText: "Batal",
      customClass: { popup: "swal-accent-danger" },
      confirmButtonColor: "#cd2c01",
      cancelButtonColor: "#3d3d3d",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/pesanan/${pesananId}`);
        fetchPesanan();
      } catch (err) {
        Swal.fire({
          title: "Gagal",
          text: pesanError(err, "Gagal menghapus pesanan."),
          confirmButtonColor: "#273d8a",
        });
      }
    }
  };

  const pesananTerfilter = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return pesananList.filter((item) => {
      if (statusFilter && (item.status || "Pending") !== statusFilter) return false;

      const tanggal = item.dibuat_pada ? String(item.dibuat_pada).slice(0, 10) : "";
      if (dariTanggal && tanggal < dariTanggal) return false;
      if (sampaiTanggal && tanggal > sampaiTanggal) return false;

      if (q) {
        const gabungan = [
          item.kode_pesanan,
          item.nama_pelanggan,
          item.no_telepon,
          item.teks,
          item.catatan,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!gabungan.includes(q)) return false;
      }
      return true;
    });
  }, [pesananList, cari, dariTanggal, sampaiTanggal, statusFilter]);

  const totalHalaman = Math.max(1, Math.ceil(pesananTerfilter.length / PER_HALAMAN));
  const pesananHalamanIni = pesananTerfilter.slice(
    (halaman - 1) * PER_HALAMAN,
    halaman * PER_HALAMAN
  );

  const rekap = useMemo(() => {
    // Bandingkan tanggal-UTC dengan tanggal-UTC (DB simpan UTC-naive),
    // bukan hari-lokal, agar rekap tidak salah di sekitar tengah malam.
    const hariIni = new Date().toISOString().slice(0, 10);
    return {
      masuk: pesananList.filter((p) => p.dibuat_pada && String(p.dibuat_pada).slice(0, 10) === hariIni).length,
      harga: pesananList.filter((p) => p.gambar_url && (p.harga_bordir ?? 0) <= 0).length,
      bayar: pesananList.filter((p) => p.status_pembayaran !== "Lunas" && (p.total_harga ?? 0) > 0).length,
      kirim: pesananList.filter((p) => p.status === "Diproses").length,
    };
  }, [pesananList]);

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Memuat data pesanan...</div>;
  }

  const kartuRekap = [
    { label: "Masuk hari ini", nilai: rekap.masuk, warna: "text-blue-600" },
    { label: "Perlu harga", nilai: rekap.harga, warna: "text-amber-600" },
    { label: "Belum bayar", nilai: rekap.bayar, warna: "text-amber-600" },
    { label: "Siap kirim", nilai: rekap.kirim, warna: "text-green-600" },
  ];

  return (
    <div className="max-w-[1280px] mt-6 mx-auto px-4">
      <h2 className="font-[family-name:var(--font-display)] mb-4 text-slate-900 text-[22px] font-bold uppercase tracking-[-0.3px]">
        {readOnly ? "Riwayat Pesanan" : "Panel Admin: Kelola Pesanan"}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {kartuRekap.map((k) => (
          <div key={k.label} className="bg-white border border-slate-300 rounded-xs px-4 py-3">
            <div className="text-[11px] font-semibold uppercase text-slate-500">{k.label}</div>
            <div className={`text-xl font-bold ${k.warna}`}>{k.nilai}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="grow min-w-[220px]">
          <label className="block mb-1 text-[11px] font-semibold uppercase text-slate-500">
            Cari
          </label>
          <Input
            type="text"
            value={cari}
            onChange={ubahFilter(setCari)}
            placeholder="Kode, nama, no. WA, atau teks..."
          />
        </div>
        <div>
          <label className="block mb-1 text-[11px] font-semibold uppercase text-slate-500">
            Dari Tanggal
          </label>
          <Input
            type="date"
            value={dariTanggal}
            onChange={ubahFilter(setDariTanggal)}
          />
        </div>
        <div>
          <label className="block mb-1 text-[11px] font-semibold uppercase text-slate-500">
            Sampai Tanggal
          </label>
          <Input
            type="date"
            value={sampaiTanggal}
            onChange={ubahFilter(setSampaiTanggal)}
          />
        </div>
        <div>
          <label className="block mb-1 text-[11px] font-semibold uppercase text-slate-500">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={ubahFilter(setStatusFilter)}
            className="px-3 py-2.5 rounded-xs border border-slate-300 bg-white text-[13px] text-slate-900 outline-none"
          >
            <option value="">Semua Status</option>
            {STATUS_PESANAN.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {(cari || dariTanggal || sampaiTanggal || statusFilter) && (
          <button
            onClick={() => {
              setCari("");
              setDariTanggal("");
              setSampaiTanggal("");
              setStatusFilter("");
              setHalaman(1);
            }}
            className="px-3 py-2.5 rounded-xs border border-slate-300 bg-white text-[12px] font-semibold text-slate-600 cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      <div className="border border-slate-300 overflow-x-auto bg-white">
        <table className="w-full border-collapse text-left table-fixed min-w-[1150px]">
          <thead>
            <tr className="bg-slate-100 text-xs text-slate-600 border-b border-slate-300 uppercase">
              <th className="px-2.5 py-3 w-[11%]">Kode Pesanan</th>
              <th className="px-2.5 py-3 w-[8%]">Tanggal</th>
              <th className="px-2.5 py-3 w-[14%]">Pelanggan</th>
              <th className="px-2.5 py-3 w-[18%]">Detail</th>
              <th className="px-2.5 py-3 w-[14%]">Harga</th>
              <th className="px-2.5 py-3 w-[7%]">Bayar</th>
              <th className="px-2.5 py-3 w-[11%]">Status</th>
              <th className="px-2.5 py-3 w-[17%] text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pesananHalamanIni.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <EmptyState>
                    {pesananList.length === 0
                      ? "Belum ada pesanan masuk."
                      : "Tidak ada pesanan yang cocok dengan filter."}
                  </EmptyState>
                </td>
              </tr>
            ) : (
              pesananHalamanIni.map((item) => {
                const currentStatusStyle = statusClass(item.status || "Pending");
                const statusBayar = item.status_pembayaran || "Belum Bayar";

                const terkunciBayar = !!item.midtrans_order_id && statusBayar !== "Lunas";
                const statusTerkunci = ["Dikirim", "Selesai", "Batal"].includes(item.status);
                const wa = linkWhatsApp(item.no_telepon);

                const totalJumlah = item.detail && item.detail.length > 0
                  ? item.detail.reduce((sum, d) => sum + d.jumlah, 0)
                  : (item.jumlah || 1);

                return (
                  <tr
                    key={item.id}
                    className="border-b border-slate-200 text-[13px] text-slate-900"
                  >
                    <td className="px-2.5 py-3 font-bold font-[family-name:var(--font-mono)] break-all">
                      {item.kode_pesanan || `BRD-${String(item.id).padStart(4, "0")}`}
                    </td>

                    <td className="px-2.5 py-3 text-xs text-slate-600">
                      {item.dibuat_pada
                        ? new Date(item.dibuat_pada).toLocaleDateString("id-ID")
                        : "-"}
                    </td>

                    <td className="px-2.5 py-3">
                      <div className="font-semibold break-words">
                        {item.nama_pelanggan || "-"}
                      </div>
                      {wa ? (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[12px] text-green-700 no-underline"
                        >
                          WA: {item.no_telepon}
                        </a>
                      ) : (
                        <span className="text-[12px] text-slate-400">WA: -</span>
                      )}
                    </td>

                    <td className="px-2.5 py-3">
                      <div className="flex flex-col gap-1.5">
                        <div
                          className="font-semibold break-words leading-tight"
                          style={{ fontFamily: item.teks ? item.font || "inherit" : "inherit" }}
                        >
                          {item.teks || (
                            <span className="text-slate-400 font-normal">(Gambar Kustom)</span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 leading-snug">
                          Dimensi: {item.panjang_cm} × {item.lebar_cm} cm
                          {item.font && item.teks ? ` • ${item.font}` : ""}
                        </div>

                        {/* Rincian Ukuran & Jumlah dari detail */}
                        <div className="space-y-0.5">
                          {item.detail && item.detail.length > 0 ? (
                            item.detail.map((d, idx) => (
                              <div key={idx} className="text-[11px] text-slate-700">
                                • Size <strong>{d.ukuran}</strong> ({d.jumlah} pcs)
                              </div>
                            ))
                          ) : (
                            <div className="text-[11px] text-slate-700">
                              • Size <strong>{item.ukuran || "M"}</strong> ({item.jumlah || 1} pcs)
                            </div>
                          )}
                        </div>

                        {item.warna && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <span>Warna:</span>
                            <span
                              className="inline-block w-3 h-3 rounded-[2px] border border-slate-300 shrink-0"
                              style={{ backgroundColor: item.warna }}
                            />
                            <span className="font-[family-name:var(--font-mono)]">{item.warna}</span>
                          </div>
                        )}

                        {item.catatan && (
                          <div
                            className="text-[11px] text-slate-400 italic border-t border-slate-100 pt-1.5 overflow-hidden text-ellipsis"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                            }}
                            title={item.catatan}
                          >
                            "{item.catatan}"
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-2.5 py-3 whitespace-nowrap font-[family-name:var(--font-mono)]">
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        {item.detail && item.detail.length > 0 ? (
                          item.detail.map((d, idx) => (
                            <div key={idx}>
                              Baju ({d.ukuran}): Rp {(d.harga_baju ?? 0).toLocaleString("id-ID")} × {d.jumlah}
                            </div>
                          ))
                        ) : (
                          <div>
                            Baju: Rp {(item.harga_baju ?? 0).toLocaleString("id-ID")} × {item.jumlah || 1}
                          </div>
                        )}
                      </div>

                      {item.harga_bordir > 0 ? (
                        <div className="text-[11px] text-slate-500 mt-1">
                          Bordir: Rp {item.harga_bordir.toLocaleString("id-ID")} × {totalJumlah}
                        </div>
                      ) : readOnly ? (
                        <span className="text-[11px] text-amber-600">Menunggu admin</span>
                      ) : (
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="text-[11px] text-amber-600">Bordir belum diset</span>
                          <input
                            type="number"
                            placeholder="Set biaya bordir..."
                            onBlur={(e) => handleUpdateHargaBordir(item.id, e.target.value)}
                            className="w-full px-1.5 py-1 rounded-xs border border-slate-300 text-[11px] outline-none"
                          />
                        </div>
                      )}

                      <div className="mt-1 font-bold">
                        Total: Rp {(item.total_harga ?? 0).toLocaleString("id-ID")}
                      </div>
                    </td>

                    <td className="px-2.5 py-3">
                      {item.snap_token ? (
                        <>
                          <StatusBadge status={statusBayar} />
                          {item.metode_pembayaran && (
                            <span className="block text-[10px] text-slate-500 mt-1">via {item.metode_pembayaran}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400">-</span>
                      )}
                    </td>

                    {/* Status Pesanan */}
                    <td className="px-2.5 py-3">
                      {readOnly ? (
                        <StatusBadge status={item.status || "Pending"} />
                      ) : statusTerkunci ? (
                        item.status === "Dikirim" ? (
                          // "Selesai" manual dimasukkan ke dropdown (khusus beta).
                          <select
                            value="Dikirim"
                            onChange={(e) => {
                              if (e.target.value === "Selesai") handleSelesaikanManual(item.id);
                            }}
                            title="Pesanan sudah dikirim. Pilih Selesai untuk konfirmasi manual (beta)."
                            className={`px-2 py-1.5 rounded-xs text-[11px] font-bold outline-none w-full border cursor-pointer ${currentStatusStyle}`}
                          >
                            <option value="Dikirim">Dikirim</option>
                            <option value="Selesai">Selesai (Manual)</option>
                          </select>
                        ) : (
                          <StatusBadge status={item.status} />
                        )
                      ) : (
                        <>
                          <select
                            value={item.status || "Pending"}
                            onChange={(e) => handlePilihStatus(item.id, e.target.value)}
                            disabled={terkunciBayar}
                            title={terkunciBayar ? "Menunggu pembayaran Midtrans lunas sebelum bisa diproses" : ""}
                            className={`px-2 py-1.5 rounded-xs text-[11px] font-bold outline-none w-full border ${currentStatusStyle} ${
                              terkunciBayar ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Diproses">Diproses</option>
                            <option value="Dikirim">Dikirim</option>
                            <option value="Batal">Batal</option>
                          </select>
                          {terkunciBayar && (
                            <span className="block text-[10px] text-amber-600 mt-1">Menunggu bayar</span>
                          )}
                        </>
                      )}
                    </td>

                    <td className="px-2.5 py-3">
                      <div className="flex items-center justify-center gap-1 flex-nowrap">
                        {item.gambar_url ? (
                          <button
                            onClick={() => lihatGambar(item.gambar_url)}
                            className="bg-blue-600 text-white px-2 py-[5px] rounded-xs border-0 cursor-pointer text-[11px] font-bold"
                          >
                            Img
                          </button>
                        ) : item.teks && item.font && !readOnly ? (
                          <button
                            onClick={() => handleDownloadDst(item.id, item.teks)}
                            className="bg-slate-900 text-white px-2 py-[5px] rounded-xs border-0 cursor-pointer text-[11px] font-bold"
                          >
                            .DST
                          </button>
                        ) : null}

                        <button
                          onClick={() => navigate(`/nota/${item.id}`)}
                          className="bg-transparent text-slate-700 border border-slate-300 px-1.5 py-1 rounded-xs cursor-pointer text-[11px] font-bold"
                        >
                          Nota
                        </button>

                        {!readOnly && (
                          <button
                            onClick={() => handleHapusPesanan(item.id)}
                            className="bg-transparent text-red-600 border border-red-200 px-1.5 py-1 rounded-xs cursor-pointer text-[11px] font-bold"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        halaman={halaman}
        totalHalaman={totalHalaman}
        totalItems={pesananTerfilter.length}
        perHalaman={PER_HALAMAN}
        onHalamanChange={setHalaman}
        itemLabel="pesanan"
      />
    </div>
  );
}