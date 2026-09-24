import { statusClass, statusBadgeClass } from "./ui";

// Label pendek khusus status bayar yang kepanjangan di kolom sempit.
// Teks lengkap tetap ada di tooltip (title).
const LABEL_PENDEK = {
  "Belum Bayar": "Belum",
  "Belum Lunas": "Belum",
};

export default function StatusBadge({ status }) {
  return (
    <span title={status} className={`${statusBadgeClass} ${statusClass(status)}`}>
      {LABEL_PENDEK[status] || status}
    </span>
  );
}
