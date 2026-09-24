import api from "./api";

let scriptPromise = null;

function loadSnap(clientKey) {
  if (window.snap) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  const snapUrl =
    import.meta.env?.VITE_MIDTRANS_SNAP_URL ||
    "https://app.sandbox.midtrans.com/snap/snap.js";

  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = snapUrl;
    s.setAttribute("data-client-key", clientKey);
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null; // Reset promise agar user bisa retry jika koneksi sempat terputus
      reject(new Error("Gagal memuat Midtrans Snap.js"));
    };
    document.body.appendChild(s);
  });

  return scriptPromise;
}

/**
 * Buka popup pembayaran Midtrans Snap.
 * @param {string} token - Snap token dari backend FastAPI
 * @param {Object} callbacks - Callback onSuccess, onPending, onError, onClose
 */
export async function payWithSnap(token, { onSuccess, onPending, onError, onClose } = {}) {
  try {
    if (!window.snap) {
      const res = await api.get("/api/midtrans/client-key");
      await loadSnap(res.data.client_key);
    }

    window.snap.pay(token, {
      onSuccess: (result) => onSuccess?.(result),
      onPending: (result) => onPending?.(result),
      onError: (result) => onError?.(result),
      onClose: () => onClose?.(),
    });
  } catch (err) {
    onError?.(err);
  }
}