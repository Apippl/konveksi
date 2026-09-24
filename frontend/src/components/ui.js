export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/* ---------------- Buttons ---------------- */
const buttonBase =
  "inline-flex items-center justify-center gap-2 box-border rounded-xs uppercase tracking-[0.5px] cursor-pointer transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

const buttonVariants = {
  primary: "bg-brand text-white border-0 font-bold hover:bg-brand-soft",
  accent: "bg-brand text-white border border-brand font-semibold hover:bg-brand-soft",
  outline: "bg-transparent text-paper border border-graphite font-semibold hover:bg-graphite",
  danger: "bg-danger text-white border-0 font-bold hover:bg-danger-soft",
  info: "bg-graphite text-brand-soft border border-steel font-bold hover:bg-steel",
  ghost: "bg-transparent text-muted border-0 font-semibold hover:bg-graphite hover:text-paper",
  // Dulu gaya pop-art kuning; sekarang disatukan ke aksi utama (biru brand).
  popPrimary: "bg-brand text-white border-0 font-bold hover:bg-brand-soft",
};

const buttonSizes = {
  xs: "px-2 py-1 text-[11px]",
  sm: "px-3 py-1.5 text-[11px]",
  nav: "px-3.5 py-1.5 text-[13px]",
  md: "px-3 py-2.5 text-[13px]",
  lg: "p-3 text-[13px]",
  xl: "px-6 py-3.5 text-sm",
};

export function buttonClass({ variant = "primary", size = "md", full = false, className = "" } = {}) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], full && "w-full", className);
}

/* ---------------- Inputs ---------------- */
export const inputClass =
  "w-full box-border px-3 py-2.5 rounded-xs border border-steel bg-ink text-paper text-sm transition-colors duration-150 placeholder:text-[#6f6f6f] disabled:bg-graphite disabled:text-muted";

export const textareaClass = cn(inputClass, "resize-y");

/* ---------------- Labels ---------------- */
export const labelClass = "block mb-1.5 font-semibold text-[13px] text-paper";

/* ---------------- Cards ---------------- */
export const cardClass = "bg-ink border border-steel rounded-xs";
export const authCardClass = cn(cardClass, "max-w-[400px] mt-[60px] mx-auto p-6");

/* Kartu preview (dulu pop-art); tetap terang agar desain bordir tetap kontras. */
export const popCardClass = "bg-[#f3f1ec] border border-graphite";

/* ---------------- Alerts ---------------- */
const alertBase = "px-3 py-2.5 rounded-xs border text-[13px]";
const alertVariants = {
  error: "bg-[#2a1713] border-[#5a2a20] text-danger-soft",
  success: "bg-[#14231a] border-[#2b4a37] text-success-soft",
  info: "bg-[#1e2540] border-[#39456f] text-brand-soft",
};

export function alertClass({ variant = "error", className = "" } = {}) {
  return cn(alertBase, alertVariants[variant], className);
}

/* ---------------- Status badge ---------------- */
const statusMap = {
  Pending: "bg-warning/15 text-warning-soft border-warning/30",
  Diproses: "bg-brand-soft/15 text-brand-soft border-brand-soft/30",
  Dikirim: "bg-brand/40 text-white border-brand",
  Selesai: "bg-success/15 text-success-soft border-success/30",
  Batal: "bg-danger/15 text-danger-soft border-danger/30",
  Lunas: "bg-success/15 text-success-soft border-success/30",
  Gagal: "bg-danger/15 text-danger-soft border-danger/30",
  "Belum Bayar": "bg-warning/15 text-warning-soft border-warning/30",
};

export function statusClass(status) {
  return statusMap[status] || "bg-graphite text-muted border-steel";
}

export const statusBadgeClass = "px-2 py-[3px] rounded-xs text-[11px] font-bold uppercase border";

/* ---------------- Error parsing ---------------- */
export function pesanError(err, defaultMsg = "Terjadi kesalahan.") {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) return detail[0]?.msg || defaultMsg;
  if (typeof detail === "string") return detail;
  return defaultMsg;
}
