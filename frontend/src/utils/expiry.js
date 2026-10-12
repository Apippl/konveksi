function pad(n) {
  return String(n).padStart(2, "0");
}

export function tanggalLokal(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function hariIniLokal() {
  return tanggalLokal(new Date());
}

export function tambahHari(isoTanggal, n) {
  const [y, m, d] = isoTanggal.split("-").map(Number);
  const t = new Date(y, m - 1, d);
  t.setDate(t.getDate() + n);
  return tanggalLokal(t);
}

export function akhirBulanIni() {
  const now = new Date();
  return tanggalLokal(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

export function formatExpiryID(value) {
  if (!value) return "Tanpa batas waktu";
  const t = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(t.getTime())) return value;
  const adaJam = value.length > 10;
  const tgl = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(t);
  if (!adaJam) return tgl;
  return `${tgl} • ${pad(t.getHours())}.${pad(t.getMinutes())} WIB`;
}

export function sudahLewat(value) {
  if (!value) return false;
  const t = new Date(value.length === 10 ? `${value}T23:59:59` : value);
  return !Number.isNaN(t.getTime()) && t.getTime() < Date.now();
}
