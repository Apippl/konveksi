import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import KelolaUser from "./KelolaUser";
import KelolaPengelola from "./KelolaPengelola";

// Satu halaman dua tab: Pelanggan (pembeli) & Pengelola (admin).
// Logika + proteksi tetap pisah — gate OTP hanya di tab Pengelola.
export default function KelolaAkun() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") === "pengelola" ? "pengelola" : "pelanggan");

  const tabClass = (aktif) =>
    `flex-1 p-2.5 rounded-xs border border-slate-900 font-semibold cursor-pointer text-xs uppercase tracking-[0.5px] min-h-[44px] ${
      aktif ? "bg-slate-900 text-white" : "bg-white text-slate-900"
    }`;

  return (
    <div className="max-w-[800px] mt-6 mx-auto px-0 pb-6 sm:px-4 sm:pb-0 min-w-0">
      <h2 className="text-slate-900 text-[22px] font-bold uppercase tracking-[-0.3px] mb-2">
        Kelola Akun
      </h2>
      <p className="text-[13px] text-slate-500 mb-5">
        Kelola akun pelanggan dan pengelola dalam satu tempat.
      </p>

      <div className="flex gap-2 mb-5">
        <button type="button" onClick={() => setTab("pelanggan")} className={tabClass(tab === "pelanggan")}>
          Pelanggan
        </button>
        <button type="button" onClick={() => setTab("pengelola")} className={tabClass(tab === "pengelola")}>
          Pengelola
        </button>
      </div>

      {tab === "pelanggan" ? <KelolaUser tanpaHeader /> : <KelolaPengelola tanpaHeader />}
    </div>
  );
}
