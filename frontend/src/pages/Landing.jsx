import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import PengumumanBanner from "../components/PengumumanBanner";
import JahitDivider from "../components/JahitDivider";

// Landing page sederhana: apa itu, cara pesan 3 langkah, tombol mulai.
export default function Landing() {
  const [judulA, setJudulA] = useState("Konveksi");
  const [judulB, setJudulB] = useState("Bordir");
  const [subjudul, setSubjudul] = useState("Pesan bordir custom dengan mudah: teks atau gambar, harga jelas, bayar online.");

  useEffect(() => {
    api
      .get("/api/pengaturan/publik")
      .then((res) => {
        const d = res.data || {};
        if (d.judul_a) setJudulA(d.judul_a);
        if (d.judul_b) setJudulB(d.judul_b);
        if (d.subjudul) setSubjudul(d.subjudul);
      })
      .catch(() => {});
  }, []);
  const steps = [
    { no: "1", title: "Pilih desain", desc: "Ketik teks bordir atau upload gambar/logo kamu." },
    { no: "2", title: "Tunggu harga admin", desc: "Khusus gambar, admin menentukan biaya bordir dulu." },
    { no: "3", title: "Bayar & lacak", desc: "Bayar via Midtrans, pantau status sampai diterima." },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4">
      <PengumumanBanner />
      {/* Hero banner — simpan fotonya sebagai `frontend/public/hero-bordir.jpg` */}
      <div className="relative overflow-hidden border border-slate-300 rounded-xs min-h-[560px] flex items-center animate-hero-fade">
        <img
          src="/hero-bordir.jpg"
          alt="Mesin bordir konveksi"
          className="absolute inset-0 w-full h-full object-cover animate-hero-zoom"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        {/* Fade kiri agar teks terbaca + fade bawah menyatu ke background */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-page via-page/20 to-transparent" />

        <div className="relative p-8 md:p-16 max-w-[680px] text-left">
          <h1 translate="no" className="text-white text-[38px] md:text-[48px] leading-tight font-bold uppercase tracking-[-0.5px] m-0 drop-shadow-lg notranslate">
            {judulA}<span className="text-blue-600">{judulB}</span>
          </h1>
          <p className="text-slate-200 text-[15px] mt-3 mb-8 drop-shadow">
            {subjudul}
          </p>
          <div className="flex gap-3 justify-start flex-wrap">
            <Link
              to="/register"
              translate="no"
              className="bg-slate-900 text-white px-6 py-3 rounded-xs text-[13px] font-bold uppercase no-underline notranslate"
            >
              Mulai Pesan
            </Link>
            <Link
              to="/login"
              translate="no"
              className="bg-white text-slate-900 border border-slate-300 px-6 py-3 rounded-xs text-[13px] font-bold uppercase no-underline notranslate"
            >
              Masuk
            </Link>
          </div>
        </div>
      </div>

      {/* Cara pesan */}
      <div>
      <JahitDivider />
      <h2 className="text-slate-900 text-[15px] font-bold uppercase tracking-[0.5px] mt-2 mb-3">
        Cara pesan
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {steps.map((s) => (
          <div key={s.no} className="bg-white border border-slate-300 rounded-xs p-5">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[14px] mb-3">
              {s.no}
            </div>
            <div className="font-bold text-[14px] text-slate-900 mb-1">{s.title}</div>
            <div className="text-[13px] text-slate-500">{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Info singkat */}
      <JahitDivider />
      <div className="bg-slate-100 border border-slate-200 rounded-xs p-5 mt-2 text-[13px] text-slate-600">
        Sudah punya akun? <Link to="/login" className="text-blue-600 font-semibold">Masuk di sini</Link>.
        Butuh bantuan? Hubungi admin via WhatsApp yang tertera di halaman pesanan.
      </div>
      </div>
    </div>
  );
}
