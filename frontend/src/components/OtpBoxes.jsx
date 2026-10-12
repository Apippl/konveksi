import { useRef } from "react";

// Input OTP 6 kotak terpisah — digit angka saja, auto-lanjut, paste didukung.
// Curve disamakan dengan card (rounded-xs = 8px) lewat kelas `.otp-box`.
export default function OtpBoxes({ value = "", onChange, disabled = false, length = 6 }) {
  const refs = useRef([]);

  const chars = Array.from({ length }, (_, i) => (value || "")[i] || "");

  function kirim(next) {
    onChange(next.slice(0, length));
  }

  function fokusKe(i) {
    if (i < 0 || i >= length) return;
    refs.current[i]?.focus();
    refs.current[i]?.select?.();
  }

  function handleChange(i, e) {
    const digit = (e.target.value || "").replace(/\D/g, "").slice(-1);
    const next = chars.slice();
    next[i] = digit;
    kirim(next.join(""));
    if (digit && i < length - 1) fokusKe(i + 1);
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = chars.slice();
      if (next[i]) {
        next[i] = "";
        kirim(next.join(""));
      } else if (i > 0) {
        next[i - 1] = "";
        kirim(next.join(""));
        fokusKe(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      fokusKe(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      fokusKe(i + 1);
    }
  }

  function handlePaste(i, e) {
    e.preventDefault();
    const digits = (e.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, length - i);
    if (!digits) return;
    const next = chars.slice();
    for (let k = 0; k < digits.length; k++) next[i + k] = digits[k];
    kirim(next.join(""));
    fokusKe(Math.min(i + digits.length, length - 1));
  }

  return (
    <div className="flex gap-2 sm:gap-2.5" role="group" aria-label="Kode OTP 6 digit">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={1}
          value={c}
          disabled={disabled}
          aria-label={`Digit ke-${i + 1}`}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select?.()}
          className="otp-box h-12 w-full min-w-0 flex-1 border border-steel bg-ink px-0 py-0 text-center text-[18px] font-bold text-paper outline-none transition-colors placeholder:text-[#6f6f6f] disabled:opacity-50"
        />
      ))}
    </div>
  );
}
