import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import Swal from "sweetalert2";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import { pesanError } from "../components/ui";

const ALUR = ["Pending", "Diproses", "Dikirim", "Selesai"];

function Timeline({ status }) {
  if (status === "Batal") {
    return (
      <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xs bg-red-50 border border-red-200 text-[12px] font-bold text-red-600 uppercase">
        Pesanan dibatalkan
      </div>
    );
  }
  const idx = Math.max(0, ALUR.indexOf(status || "Pending"));
  return (
    <div className="flex items-center mb-3 px-1" aria-label={`Status: ${status}`}>
      {ALUR.map((s, i) => (
        <div key={s} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                i < idx ? "bg-green-600 text-white" : i === idx ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              {i < idx ? "✓" : i + 1}
            </span>
            <span className={`text-[9px] font-bold uppercase whitespace-nowrap ${i <= idx ? "text-slate-900" : "text-slate-400"}`}>
              {s}
            </span>
          </div>
          {i < ALUR.length - 1 && (
            <div className={`h-0.5 flex-1 mx-1 mb-4 rounded-full ${i < idx ? "bg-green-600" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function PesananSaya() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchPesanan = useCallback(async () => {
    try {
      const res = await api.get("/api/pesanan");
      const data = res.data;
      setList(data);

      const pendingMidtrans = data.filter(
        (p) => p.status_pembayaran === "Belum Bayar" && p.midtrans_order_id
      );

      if (pendingMidtrans.length > 0) {
        await Promise.allSettled(
          pendingMidtrans.map((p) => api.get(`/api/pesanan/${p.id}/cek-status`))
        );
        const updatedRes = await api.get("/api/pesanan");
        setList(updatedRes.data);
      }
    } catch {
      setList((prev) => prev);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api
      .get("/api/pesanan")
      .then((res) => {
        const data = res.data;
        const pendingMidtrans = data.filter(
          (p) => p.status_pembayaran === "Belum Bayar" && p.midtrans_order_id
        );
        if (pendingMidtrans.length === 0) return data;
        return Promise.allSettled(
          pendingMidtrans.map((p) => api.get(`/api/pesanan/${p.id}/cek-status`))
        ).then(() => api.get("/api/pesanan").then((r) => r.data));
      })
      .then((data) => setList(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleHapusPesanan = async (pesananId) => {
    const result = await Swal.fire({
      title: "Batalkan Pesanan?",
      text: `Pesanan #${pesananId} akan dibatalkan/dihapus.`,
      showCancelButton: true,
      confirmButtonText: "Ya, Batalkan",
      cancelButtonText: "Batal",
      reverseButtons: true,
      customClass: { popup: "swal-accent-danger" },
      confirmButtonColor: "#cd2c01",
      cancelButtonColor: "#3d3d3d",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/pesanan/${pesananId}`);
        Swal.fire({
          title: "Berhasil",
          text: "Pesanan berhasil dibatalkan.",
          customClass: { popup: "swal-accent-success" },
          timer: 1500,
          showConfirmButton: false,
        });
        fetchPesanan();
      } catch (err) {
        Swal.fire({
          title: "Gagal",
          text: pesanError(err, "Gagal membatalkan pesanan."),
          confirmButtonColor: "#273d8a",
        });
      }
    }
  };

  const handleBayar = (p) => {
    navigate(`/checkout/${p.id}`);
  };

  const handleKonfirmasiTerima = async (pesananId) => {
    const result = await Swal.fire({
      title: "Konfirmasi Barang Diterima?",
      text: "Pastikan bordir sudah kamu terima dan sesuai pesanan sebelum konfirmasi.",
      customClass: { popup: "swal-accent-success" },
      showCancelButton: true,
      confirmButtonText: "Ya, Sudah Diterima",
      cancelButtonText: "Belum",
      confirmButtonColor: "#3e8e62",
      cancelButtonColor: "#3d3d3d",
    });
    if (!result.isConfirmed) return;

    try {
      await api.put(`/api/pesanan/${pesananId}/konfirmasi-terima`);
      Swal.fire({
        title: "Terima Kasih!",
        text: "Konfirmasi penerimaan berhasil disimpan.",
        customClass: { popup: "swal-accent-success" },
        timer: 1500,
        showConfirmButton: false,
      });
      fetchPesanan();
    } catch (err) {
      Swal.fire({
        title: "Gagal",
        text: pesanError(err, "Gagal mengonfirmasi penerimaan."),
        confirmButtonColor: "#273d8a",
      });
    }
  };

  const perluAksi = (p) => {
    const sudahDinilai = (p.harga_bordir ?? 0) > 0;
    const bisaBayar = sudahDinilai && (p.total_harga ?? 0) > 0 && p.status_pembayaran !== "Lunas";
    const isPending = p.status === "Pending" || !p.status;
    return bisaBayar || isPending;
  };
  const tagihan = list.filter(perluAksi);
  const riwayat = list.filter((p) => !perluAksi(p));

  return (
    <div className="max-w-[650px] mt-6 mx-auto px-3">
      <h2 className="text-slate-900 mb-5 text-[20px] font-bold uppercase">
        Pesanan Saya
      </h2>

      {loading ? (
        <p className="text-slate-500">Memuat riwayat pesanan...</p>
      ) : list.length === 0 ? (
        <EmptyState className="bg-white rounded-xs border border-slate-300 text-slate-500">
          Belum ada pesanan yang dibuat.
        </EmptyState>
      ) : (
        <>
          {tagihan.length > 0 && (
            <>
              <h3 className="text-slate-900 text-[13px] font-bold uppercase tracking-[0.5px] mb-3">
                Perlu dibayar ({tagihan.length})
              </h3>
              {tagihan.map(renderKartu)}
            </>
          )}
          {riwayat.length > 0 && (
            <>
              <h3 className="text-slate-900 text-[13px] font-bold uppercase tracking-[0.5px] mb-3 mt-6">
                Riwayat
              </h3>
              {riwayat.map(renderKartu)}
            </>
          )}
        </>
      )}
    </div>
  );

  function renderKartu(p) {
          const isPending = p.status === "Pending" || !p.status;
          const sudahDikirim = p.status === "Dikirim";
          const sudahDinilai = (p.harga_bordir ?? 0) > 0;
          // Jangan izinkan bayar sebelum admin mengisi biaya bordir (mode gambar),
          // kalau tidak client bisa bayar harga baju saja.
          const bisaBayar = sudahDinilai && (p.total_harga ?? 0) > 0 && p.status_pembayaran !== "Lunas";

          return (
            <div
              key={p.id}
              className="bg-white border border-slate-300 rounded-xs p-4 mb-4 box-border"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-slate-500">
                  Kode Pesanan: <strong>{p.kode_pesanan || `#${p.id}`}</strong>
                  {" • "}
                  {p.dibuat_pada
                    ? new Date(p.dibuat_pada).toLocaleDateString("id-ID")
                    : "Baru saja"}
                </span>
                <StatusBadge status={p.status || "Pending"} />
              </div>

              <Timeline status={p.status || "Pending"} />

              <div className="bg-[#f3f1ec] p-4 rounded-xs text-center mb-3 border border-dashed border-[#c8c8c8]">
                <span
                  className="text-[20px] font-semibold text-[#272727]"
                  style={{
                    fontFamily: p.font || "sans-serif",
                    color: p.warna || undefined,
                  }}
                >
                  {p.teks || "(Gambar Kustom)"}
                </span>
              </div>

              <div className="mb-3">
                <div className="flex justify-between items-start gap-3 text-[13px] text-slate-700">
                  <div>
                    Font: <strong>{p.font || "-"}</strong> • Dimensi:{" "}
                    <strong>
                      {p.panjang_cm} × {p.lebar_cm} cm
                    </strong>
                    {p.warna && (
                      <>
                        {" "}
                        • Warna:{" "}
                        <span
                          className="inline-block w-3 h-3 align-middle border border-slate-300"
                          style={{ backgroundColor: p.warna }}
                        />{" "}
                        <strong className="font-[family-name:var(--font-mono)]">
                          {p.warna}
                        </strong>
                      </>
                    )}

                    {/* Rincian Ukuran & Jumlah dari relasi detail */}
                    <div className="mt-2 space-y-1">
                      <span className="text-[12px] text-slate-500 block">Rincian Ukuran:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {p.detail && p.detail.length > 0 ? (
                          p.detail.map((d, idx) => (
                            <span
                              key={idx}
                              className="bg-slate-100 border border-slate-200 text-slate-800 text-[12px] px-2 py-0.5 rounded-xs"
                            >
                              Size <strong>{d.ukuran}</strong> ({d.jumlah} pcs) @ Rp {(d.harga_baju ?? 0).toLocaleString("id-ID")}
                            </span>
                          ))
                        ) : (
                          <span className="text-[12px] text-slate-700">
                            Size <strong>{p.ukuran || "M"}</strong> • <strong>{p.jumlah || 1} pcs</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right whitespace-nowrap">
                    <span className="text-[12px] text-slate-500 block">
                      Bordir:{" "}
                      <strong>
                        {sudahDinilai
                          ? `Rp ${p.harga_bordir.toLocaleString("id-ID")}`
                          : "(menunggu admin)"}
                      </strong>
                    </span>
                    <div className="mt-1">
                      Total:{" "}
                      <strong className="text-slate-900 text-sm">
                        {sudahDinilai
                          ? `Rp ${p.total_harga.toLocaleString("id-ID")}`
                          : "Nego via WA"}
                      </strong>
                    </div>
                    {(p.diskon ?? 0) > 0 && (
                      <div className="mt-1 text-[12px]">
                        <span className="text-green-600 font-semibold">
                          Diskon {p.kode_kupon || ""}: −Rp {p.diskon.toLocaleString("id-ID")}
                        </span>
                        <div className="mt-0.5">
                          Bayar:{" "}
                          <strong className="text-slate-900 text-sm">
                            Rp {((p.total_harga ?? 0) - (p.diskon ?? 0)).toLocaleString("id-ID")}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {sudahDinilai && (
                  <div className="text-[12px] text-slate-500 mt-2">
                    Pembayaran:{" "}
                    <strong
                      className={
                        p.status_pembayaran === "Lunas"
                          ? "text-green-600"
                          : "text-amber-600"
                      }
                    >
                      {p.status_pembayaran}
                    </strong>
                    {p.metode_pembayaran && (
                      <span className="text-slate-500"> via {p.metode_pembayaran}</span>
                    )}
                  </div>
                )}
              </div>

              {sudahDikirim && (
                <div className="mb-3 p-3 rounded-xs bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
                  <span className="text-[12px] text-blue-700">
                    Pesanan sudah dikirim. Konfirmasi kalau barang sudah kamu terima.
                  </span>
                  <button
                    onClick={() => handleKonfirmasiTerima(p.id)}
                    className="bg-green-600 text-white px-3 py-2 rounded-xs border-0 cursor-pointer text-[11px] font-bold uppercase whitespace-nowrap"
                  >
                    Konfirmasi Diterima
                  </button>
                </div>
              )}

              {(bisaBayar || isPending) && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex justify-end items-center gap-2">
                  {isPending && (
                    <button
                      onClick={() => handleHapusPesanan(p.id)}
                      className="bg-transparent text-red-600 border border-red-200 px-2.5 py-[5px] rounded-xs cursor-pointer text-[11px] font-bold uppercase transition-all duration-150 ease-[ease] hover:bg-red-600 hover:text-white"
                    >
                      Batalkan Pesanan
                    </button>
                  )}

                  {bisaBayar && (
                    <button
                      onClick={() => handleBayar(p)}
                      className="bg-slate-900 text-white px-3.5 py-2 rounded-xs border-0 cursor-pointer text-[11px] font-bold uppercase"
                    >
                      Bayar Sekarang
                    </button>
                  )}

                  {sudahDinilai && (
                    <button
                      onClick={() => navigate(`/nota/${p.id}`)}
                      className="bg-transparent text-slate-700 border border-slate-300 px-3 py-2 rounded-xs cursor-pointer text-[11px] font-bold uppercase"
                    >
                      Nota
                    </button>
                  )}
                  </div>
                </div>
              )}
            </div>
          );
  }
}