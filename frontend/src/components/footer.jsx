export default function Footer() {
  return (
    <footer className="mt-4 py-6 border-t border-slate-300 flex justify-between items-center flex-wrap gap-4 text-xs text-slate-500 font-[sans-serif]">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-2">
        <strong translate="no" className="text-slate-900 text-[13px] tracking-[0.5px] notranslate">
          KONVEKSI<span className="text-blue-600">BORDIR</span>
        </strong>
        <span className="text-slate-300">|</span>
        <span>Jasa Bordir Kustom & Presisi</span>
      </div>

      {/* Info Operasional & Bantuan */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
          <span>Senin – Sabtu (08.00 – 17.00 WIB)</span>
        </div>

      </div>
    </footer>
  );
}
