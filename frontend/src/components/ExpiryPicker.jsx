import { useMemo } from "react";
import Input from "./Input";

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

/**
 * Picker kadaluarsa kupon yang ramah:
 * - preset sekali klik (tanpa batas / +7 hari / +30 hari / akhir bulan)
 * - input tanggal terpisah dari jam (jam opsional, default 23:59)
 * - preview bahasa Indonesia + peringatan kalau tanggal sudah lewat
 *
 * value: "" | "YYYY-MM-DD" | "YYYY-MM-DDTHH:MM"
 */
export default function ExpiryPicker({ value, onChange }) {
  const { tanggal, jam, pakaiJam } = useMemo(() => {
    if (!value) return { tanggal: "", jam: "23:59", pakaiJam: false };
    const [tgl, wkt] = String(value).split("T");
    if (!wkt || wkt.slice(0, 5) === "23:59") return { tanggal: tgl, jam: "23:59", pakaiJam: false };
    return { tanggal: tgl, jam: wkt.slice(0, 5), pakaiJam: true };
  }, [value]);

  const kirim = (tgl, pakai, wkt = "23:59") => {
    if (!tgl) {
      onChange("");
      return;
    }
    onChange(pakai ? `${tgl}T${wkt}` : `${tgl}T23:59`);
  };

  const preset = [
    { label: "Tanpa batas", aksi: () => onChange("") },
    { label: "+7 hari", aksi: () => kirim(tambahHari(hariIniLokal(), 7), false) },
    { label: "+30 hari", aksi: () => kirim(tambahHari(hariIniLokal(), 30), false) },
    { label: "Akhir bulan", aksi: () => kirim(akhirBulanIni(), false) },
  ];

  const lewat = sudahLewat(value);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {preset.map((p) => {
          const aktif =
            (p.label === "Tanpa batas" && !value) ||
            (value && tanggal === tambahHari(hariIniLokal(), 7) && p.label === "+7 hari") ||
            (value && tanggal === tambahHari(hariIniLokal(), 30) && p.label === "+30 hari") ||
            (value && tanggal === akhirBulanIni() && p.label === "Akhir bulan");
          return (
            <button
              key={p.label}
              type="button"
              onClick={p.aksi}
              className={`px-2.5 py-1.5 rounded-xs border text-[11px] font-bold cursor-pointer transition-colors ${
                aktif
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <div>
          <Input
            type="date"
            aria-label="Tanggal kadaluarsa"
            value={tanggal}
            min={hariIniLokal()}
            onChange={(e) => kirim(e.target.value, pakaiJam, jam)}
          />
        </div>
        {tanggal && (
          <button
            type="button"
            onClick={() => onChange("")}
            title="Hapus tanggal"
            className="px-3 py-2.5 rounded-xs border border-slate-300 bg-white text-slate-500 text-[12px] font-bold cursor-pointer hover:text-red-600 hover:border-red-300"
          >
            ✕
          </button>
        )}
      </div>

      {tanggal && (
        <label className="flex items-center gap-2 mt-2 cursor-pointer text-[12px] text-slate-600 font-semibold">
          <input
            type="checkbox"
            checked={pakaiJam}
            onChange={(e) => kirim(tanggal, e.target.checked, jam === "23:59" ? "17:00" : jam)}
            className="w-4 h-4"
          />
          Atur jam spesifik
          {pakaiJam ? (
            <Input
              type="time"
              aria-label="Jam kadaluarsa"
              value={jam}
              onChange={(e) => kirim(tanggal, true, e.target.value || "23:59")}
              className="!w-auto px-2 py-1.5"
            />
          ) : (
            <span className="text-slate-400 font-normal">(default 23:59)</span>
          )}
        </label>
      )}

      <p className={`text-[12px] mt-2 mb-0 ${lewat ? "text-red-600 font-bold" : "text-slate-500"}`}>
        {value ? (
          <>
            Berlaku sampai: <strong>{formatExpiryID(value)}</strong>
            {lewat ? " — tanggal ini sudah lewat!" : ""}
          </>
        ) : (
          "Kupon berlaku selamanya sampai dinonaktifkan."
        )}
      </p>
    </div>
  );
}
