import { authCardClass, alertClass } from "./ui";

// Titik jahitan mengikuti persis gerigi batas biru-hitam (x 66/72 tiap 2.5%).
const TITIK_JAHIT = (() => {
  const p = ["M70 0"];
  let kiri = true;
  for (let y = 2.5; y < 100; y += 2.5) {
    p.push(`L${kiri ? 66 : 72} ${y}`);
    kiri = !kiri;
  }
  return `${p.join(" ")} L70 100`;
})();

function DekorasiAuth() {
  return (
    <div aria-hidden="true" className="auth-zigzag-bg">
      {/* Garis jahitan putus-putus tepat di atas gerigi */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <polyline
          points={TITIK_JAHIT}
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeDasharray="2 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Siluet jarum + benang di area hitam kanan */}
      <svg
        viewBox="0 0 200 640"
        className="absolute right-[3%] top-1/2 -translate-y-1/2 h-[72vh] w-auto opacity-[0.09] rotate-[12deg]"
      >
        <rect x="94" y="30" width="12" height="470" rx="6" fill="#ffffff" />
        <polygon points="94,500 106,500 100,548" fill="#ffffff" />
        <ellipse cx="100" cy="72" rx="3.6" ry="11" fill="#161616" />
        <path
          d="M100 548 C 70 580, 50 600, 18 622"
          stroke="#ffffff"
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

export default function AuthCard({ title, subtitle, error, footer, children, top }) {
  return (
    <>
      {/* Lapisan background zigzag: fixed full-layar di belakang kartu.
          Taruh sebagai sibling (bukan di dalam kartu) + z -1 agar tidak menimpa isi. */}
      <DekorasiAuth />
      <div className={`${authCardClass} relative z-10`}>
      {top}
      <h2
        className={`mt-0 text-slate-900 text-[20px] font-bold uppercase tracking-[-0.5px] ${
          subtitle ? "mb-2.5" : "mb-5"
        }`}
      >
        {title}
      </h2>

      {subtitle && <p className="text-slate-500 text-[13px] leading-normal mb-5">{subtitle}</p>}

      {error && <div className={alertClass({ variant: "error", className: "mb-4" })}>{error}</div>}

      {children}

      {footer && <p className="mt-5 text-[13px] text-slate-500 text-center">{footer}</p>}
      </div>
    </>
  );
}
