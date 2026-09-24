import { useEffect, useState } from "react";
import api from "../api";

// Banner pengumuman aktif (public). Dipakai di Landing + Desain.
export default function PengumumanBanner() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get("/api/pengumuman/aktif")
      .then((res) => setData(res.data))
      .catch(() => setData(null));
  }, []);

  if (!data) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xs p-4 mb-4">
      <div className="font-bold text-[13px] text-slate-900 mb-1">{data.judul}</div>
      <div className="text-[13px] text-slate-600 whitespace-pre-line">{data.isi}</div>
    </div>
  );
}
