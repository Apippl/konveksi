import Input from "./Input";

// Input uang: ketik digit mentah, tampil format ribuan otomatis (2000 -> 2.000).
// value = digit mentah (number|string), onChange menerima string digit.
function formatRibuan(v) {
  const digits = String(v ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

export default function RupiahInput({ value, onChange, maxDigits = 13, ...props }) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatRibuan(value)}
      placeholder="0"
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, maxDigits))}
      {...props}
    />
  );
}
