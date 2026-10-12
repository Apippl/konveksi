import { useState } from "react";

const WA_URL = "https://wa.me/6285760284491";
const EMAIL = "konveksihitam@gmail.com";

function Chevron({ terbuka }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 transition-transform duration-150 ${terbuka ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function WaIcon({ className = "h-4 w-4 shrink-0" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.1-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1.1 2.2-.2 3.9a11.6 11.6 0 0 0 4.5 4.2c1.7.8 2.4.9 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.1-.5-.3Z" />
    </svg>
  );
}

function MailIcon({ className = "h-4 w-4 shrink-0" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

export default function Footer() {
  // Mobile: accordion 1 kolom. Brand terbuka default, WA & email tertutup.
  const [buka, setBuka] = useState({ brand: true, wa: false, email: false });
  const toggle = (key) => setBuka((v) => ({ ...v, [key]: !v[key] }));

  const tombolAccordion =
    "flex w-full items-center justify-between gap-3 py-3 min-h-[44px] bg-transparent border-0 cursor-pointer text-left text-slate-900 text-[13px] font-bold uppercase tracking-[0.5px]";

  return (
    <footer
      className="mt-4 border-t border-slate-300 text-xs text-slate-500 px-1"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* ===== Mobile: 1 kolom accordion (ikut scroll main) ===== */}
      <div className="sm:hidden py-1">
        {/* 1. Brand — terbuka default */}
        <div className="border-b border-slate-200">
          <button type="button" onClick={() => toggle("brand")} aria-expanded={buka.brand} className={tombolAccordion}>
            <span translate="no" className="notranslate">
              KONVEKSI<span className="text-blue-600">BORDIR</span>
            </span>
            <Chevron terbuka={buka.brand} />
          </button>
          {buka.brand && (
            <p className="m-0 pb-3.5 text-[12.5px] leading-relaxed">Jasa Bordir Kustom &amp; Presisi</p>
          )}
        </div>

        {/* 2. Kontak WA — ikon saja, tap buka chat (nomor tidak ditampilkan) */}
        <div className="border-b border-slate-200">
          <button type="button" onClick={() => toggle("wa")} aria-expanded={buka.wa} className={tombolAccordion}>
            <span className="flex items-center gap-2">
              <WaIcon />
              WhatsApp
            </span>
            <Chevron terbuka={buka.wa} />
          </button>
          {buka.wa && (
            <div className="pb-3.5">
              <a
                href={WA_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Chat WhatsApp admin"
                className="flex w-full box-border items-center justify-center gap-2 bg-slate-900 text-white no-underline px-4 py-3 rounded-xs text-[12px] font-bold uppercase tracking-[0.5px] min-h-[44px]"
              >
                <WaIcon />
                Chat Admin
              </a>
            </div>
          )}
        </div>

        {/* 3. Email — ikon saja, tap buka mail (alamat tidak ditampilkan mentah) */}
        <div className="border-b border-slate-200">
          <button type="button" onClick={() => toggle("email")} aria-expanded={buka.email} className={tombolAccordion}>
            <span className="flex items-center gap-2">
              <MailIcon />
              Email
            </span>
            <Chevron terbuka={buka.email} />
          </button>
          {buka.email && (
            <div className="pb-3.5">
              <a
                href={`mailto:${EMAIL}`}
                aria-label="Kirim email ke toko"
                className="flex w-full box-border items-center justify-center gap-2 bg-white text-slate-900 border border-slate-300 no-underline px-4 py-3 rounded-xs text-[12px] font-bold uppercase tracking-[0.5px] min-h-[44px]"
              >
                <MailIcon />
                Kirim Email
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ===== Desktop: tetap sebaris ===== */}
      <div className="hidden sm:flex flex-row justify-between items-center gap-4 py-5 sm:py-6 text-center sm:text-left">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-2">
          <strong translate="no" className="text-slate-900 text-[13px] tracking-[0.5px] notranslate">
            KONVEKSI<span className="text-blue-600">BORDIR</span>
          </strong>
          <span className="text-slate-300">|</span>
          <span>Jasa Bordir Kustom & Presisi</span>
        </div>

        {/* Kontak ikon-only: tap buka, tanpa tampilkan nomor/email */}
        <div className="flex items-center gap-3">
          <a
            href={WA_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat WhatsApp admin"
            title="Chat WhatsApp admin"
            className="inline-flex items-center justify-center w-8 h-8 text-slate-500 no-underline hover:text-slate-900 transition-colors"
          >
            <WaIcon className="h-5 w-5 shrink-0" />
          </a>
          <a
            href={`mailto:${EMAIL}`}
            aria-label="Kirim email ke toko"
            title="Kirim email ke toko"
            className="inline-flex items-center justify-center w-8 h-8 text-slate-500 no-underline hover:text-slate-900 transition-colors"
          >
            <MailIcon className="h-5 w-5 shrink-0" />
          </a>
        </div>
      </div>
    </footer>
  );
}
