export default function Pagination({
  halaman,
  totalHalaman,
  totalItems,
  perHalaman,
  onHalamanChange,
  itemLabel = "item",
}) {
  if (totalItems === 0) return null;

  const mulai = (halaman - 1) * perHalaman + 1;
  const selesai = Math.min(halaman * perHalaman, totalItems);

  const buttonClass =
    "px-3 py-1.5 rounded-xs border border-graphite bg-graphite text-paper text-[12px] font-semibold hover:bg-steel hover:border-steel transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

  return (
    <div className="flex items-center justify-between mt-4 text-[13px] text-muted">
      <span>
        Menampilkan {mulai}–{selesai} dari {totalItems} {itemLabel}
      </span>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onHalamanChange(Math.max(1, halaman - 1))}
          disabled={halaman === 1}
          className={buttonClass}
        >
          Sebelumnya
        </button>
        <span className="text-[12px] font-semibold text-white">
          Halaman {halaman} / {totalHalaman}
        </span>
        <button
          onClick={() => onHalamanChange(Math.min(totalHalaman, halaman + 1))}
          disabled={halaman === totalHalaman}
          className={buttonClass}
        >
          Selanjutnya
        </button>
      </div>
    </div>
  );
}
