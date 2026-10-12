import { useEffect, useRef } from "react";
import Swal from "sweetalert2";

// Notifikasi penanda popup beneran (pengganti inline alert).
// Dipasang seperti biasa: {error && <Alert variant="error">{error}</Alert>}
// Muncul sebagai popup auto-tutup; tidak merender apa pun di halaman.
// timeout (ms): 0 = nempel sampai di-tap Tutup. Popup aksi/konfirmasi tidak lewat sini.
const AKSEN = {
  error: "swal-accent-danger",
  success: "swal-accent-success",
  info: "swal-accent-warning",
};

let terakhirTampil = { teks: "", waktu: 0 };

export default function Alert({ variant = "error", timeout, children }) {
  const teks = typeof children === "string" ? children : "";
  const sudahTampil = useRef("");

  useEffect(() => {
    if (!teks || sudahTampil.current === teks) return;
    const sekarang = Date.now();
    if (terakhirTampil.teks === teks && sekarang - terakhirTampil.waktu < 800) return;
    sudahTampil.current = teks;
    terakhirTampil = { teks, waktu: sekarang };
    const durasi = timeout ?? (variant === "error" ? 3500 : 2200);
    Swal.fire({
      text: teks,
      customClass: { popup: AKSEN[variant] || "", container: "swal-penanda" },
      ...(durasi > 0
        ? { timer: durasi, showConfirmButton: false }
        : { confirmButtonText: "Tutup", confirmButtonColor: "#273d8a" }),
    });
  }, [teks, variant, timeout]);

  return null;
}
