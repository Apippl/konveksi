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
    <div className="max-w-[1400px] mx-auto px-0 pt-3 pb-6 sm:px-4 sm:py-4">
      <PengumumanBanner />
      {/* Mobile: sambutan teks saja, tanpa foto — ringan di Android */}
      <div className="sm:hidden bg-white border border-slate-300 rounded-xs p-5 animate-hero-fade overflow-hidden min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[1px] text-slate-500 m-0 mb-1.5">
          Selamat datang di
        </p>
        <h1 translate="no" className="text-slate-900 text-[28px] leading-[1.15] font-bold uppercase tracking-[-0.5px] m-0 notranslate break-words">
          {judulA}<span className="text-blue-600">{judulB}</span>
        </h1>
        <p className="text-slate-600 text-[13px] leading-relaxed mt-2.5 mb-5 break-words">
          {subjudul}
        </p>
        <div className="flex flex-col gap-2.5 min-w-0">
          <Link
            to="/register"
            translate="no"
            className="block box-border w-full max-w-full bg-slate-900 text-white px-6 py-3 rounded-xs text-[13px] font-bold uppercase no-underline notranslate text-center"
          >
            Mulai Pesan
          </Link>
          <Link
            to="/login"
            translate="no"
            className="block box-border w-full max-w-full bg-white text-slate-900 border border-slate-300 px-6 py-3 rounded-xs text-[13px] font-bold uppercase no-underline notranslate text-center"
          >
            Masuk
          </Link>
        </div>
      </div>

      {/* Desktop/tablet: hero foto tetap */}
      {/* Hero banner — simpan fotonya sebagai `frontend/public/hero-bordir.jpg` */}
      <div className="hidden sm:flex relative overflow-hidden border border-slate-300 rounded-xs min-h-[480px] md:min-h-[560px] items-center animate-hero-fade">
        <img
          src="/hero-bordir.jpg"
          alt="Mesin bordir konveksi"
          className="absolute inset-0 w-full h-full object-cover animate-hero-zoom"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        {/* Fade kiri agar teks terbaca + fade bawah menyatu ke background */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-page via-page/20 to-transparent" />

        <div className="relative p-6 sm:p-8 md:p-16 max-w-[680px] w-full min-w-0 box-border">
          <h1 translate="no" className="text-white text-[30px] sm:text-[38px] md:text-[48px] leading-tight font-bold uppercase tracking-[-0.5px] m-0 drop-shadow-lg notranslate break-words">
            {judulA}<span className="text-blue-600">{judulB}</span>
          </h1>
          <p className="text-slate-200 text-[14px] md:text-[15px] leading-relaxed mt-3 mb-6 md:mb-8 drop-shadow break-words">
            {subjudul}
          </p>
          <div className="flex flex-col min-[420px]:flex-row gap-2.5 sm:gap-3 justify-start items-stretch min-[420px]:items-center flex-wrap min-w-0">
            <Link
              to="/register"
              translate="no"
              className="inline-flex justify-center items-center box-border w-full min-[420px]:w-auto max-w-full shrink-0 bg-slate-900 text-white px-6 py-3 rounded-xs text-[13px] font-bold uppercase no-underline notranslate text-center"
            >
              Mulai Pesan
            </Link>
            <Link
              to="/login"
              translate="no"
              className="inline-flex justify-center items-center box-border w-full min-[420px]:w-auto max-w-full shrink-0 bg-white text-slate-900 border border-slate-300 px-6 py-3 rounded-xs text-[13px] font-bold uppercase no-underline notranslate text-center"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
        {steps.map((s) => (
          <div key={s.no} className="bg-white border border-slate-300 rounded-xs p-4 sm:p-5">
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
      <div className="bg-slate-100 border border-slate-200 rounded-xs p-4 sm:p-5 mt-2 text-[12.5px] sm:text-[13px] leading-relaxed text-slate-600">
        Sudah punya akun? <Link to="/login" className="text-blue-600 font-semibold">Masuk di sini</Link>.
      </div>
      </div>
    </div>
  );
}
