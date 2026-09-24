import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useState, lazy, Suspense } from "react";
import Swal from "sweetalert2";
import Register from "./pages/Register";
import Login from "./pages/Login";
import VerifikasiOtp from "./pages/VerifikasiOtp";
import LupaPassword from "./pages/LupaPassword";
import ResetPassword from "./pages/ResetPassword";
import LengkapiProfil from "./pages/LengkapiProfil";
import ProfilSaya from "./pages/ProfilSaya";
// Halaman superadmin di-lazy agar tidak ikut ke-bundle client umum.
const DashboardKeuangan = lazy(() => import("./pages/DashboardKeuangan"));
const KelolaPengelola = lazy(() => import("./pages/KelolaPengelola"));
const KelolaUser = lazy(() => import("./pages/KelolaUser"));
const KelolaHarga = lazy(() => import("./pages/KelolaHarga"));
const KelolaKupon = lazy(() => import("./pages/KelolaKupon"));
const KelolaToko = lazy(() => import("./pages/KelolaToko"));
const KelolaPengumuman = lazy(() => import("./pages/KelolaPengumuman"));
const LogAktivitas = lazy(() => import("./pages/LogAktivitas"));
const TransferOwnership = lazy(() => import("./pages/TransferOwnership"));
import TransferKonfirmasiBaru from "./pages/TransferKonfirmasiBaru";
import Desain from "./pages/Desain";
import Landing from "./pages/Landing";
import PesananSaya from "./pages/PesananSaya";
import Checkout from "./pages/Checkout";
import Nota from "./pages/Nota";
import Admin from "./pages/Admin";
import Footer from "./components/footer";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { SUPERADMIN_MENU, ADMIN_MENU } from "./components/sidebarMenu";
import { Guard, GuestOnly, ProfilGuard } from "./components/Guards";
import { getUser, homePath } from "./auth";

export default function App() {
  const user = getUser();
  const navigate = useNavigate();
  const [sidebarRamping, setSidebarRamping] = useState(false);

  async function logout() {
    const r = await Swal.fire({
      title: "Keluar Akun?",
      text: "Kamu harus masuk lagi untuk memesan atau mengelola toko.",
      showCancelButton: true,
      confirmButtonText: "Ya, Keluar",
      cancelButtonText: "Batal",
      confirmButtonColor: "#cd2c01",
      cancelButtonColor: "#3d3d3d",
    });
    if (!r.isConfirmed) return;
    localStorage.clear();
    sessionStorage.removeItem("pendingVerifyEmail");
    navigate("/login", { replace: true });
  }

  return (
    <div className="font-[ui-sans-serif,system-ui,-apple-system,sans-serif] h-screen bg-page flex flex-col overflow-hidden">
      <Header user={user} onLogout={logout} />

      <div className="flex flex-1 min-h-0 flex-col md:flex-row overflow-hidden">
        {user && user.role === "superadmin" && (
          <Sidebar title="Menu Superadmin" items={SUPERADMIN_MENU} user={user} onLogout={logout} ramping={sidebarRamping} onToggle={() => setSidebarRamping((v) => !v)} />
        )}
        {user && user.role === "admin" && (
          <Sidebar title="Menu Admin" items={ADMIN_MENU} user={user} onLogout={logout} ramping={sidebarRamping} onToggle={() => setSidebarRamping((v) => !v)} />
        )}

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <main className="flex-1 min-w-0 min-h-0 overflow-y-auto box-border p-4 md:py-6">
          <Routes>
            <Route path="/" element={user ? <Navigate to={homePath(user)} replace /> : <Landing />} />
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
            <Route path="/verifikasi-otp" element={<VerifikasiOtp />} />
            <Route path="/lupa-password" element={<GuestOnly><LupaPassword /></GuestOnly>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/lengkapi-profil" element={<ProfilGuard><LengkapiProfil /></ProfilGuard>} />
            <Route path="/profil-saya" element={<ProfilGuard><ProfilSaya /></ProfilGuard>} />
            <Route path="/desain" element={<Guard><Desain /></Guard>} />
            <Route path="/pesanan-saya" element={<Guard><PesananSaya /></Guard>} />
            <Route path="/checkout/:id" element={<Guard><Checkout /></Guard>} />
            <Route path="/nota/:id" element={<Guard><Nota /></Guard>} />
            <Route path="/admin" element={<Guard adminOnly><Admin /></Guard>} />
            <Route path="/transfer-konfirmasi" element={<TransferKonfirmasiBaru />} />
            <Route path="/superadmin/*" element={
              <Suspense fallback={<div className="p-10 text-center text-slate-500">Memuat...</div>}>
                <Routes>
                  <Route path="dashboard" element={<Guard role="superadmin"><DashboardKeuangan /></Guard>} />
                  <Route path="users" element={<Guard role="superadmin"><KelolaUser /></Guard>} />
                  <Route path="harga" element={<Guard role="superadmin"><KelolaHarga /></Guard>} />
                  <Route path="kupon" element={<Guard role="superadmin"><KelolaKupon /></Guard>} />
                  <Route path="toko" element={<Guard role="superadmin"><KelolaToko /></Guard>} />
                  <Route path="pengelola" element={<Guard role="superadmin"><KelolaPengelola /></Guard>} />
                  <Route path="pengumuman" element={<Guard role="superadmin"><KelolaPengumuman /></Guard>} />
                  <Route path="log" element={<Guard role="superadmin"><LogAktivitas /></Guard>} />
                  <Route path="pesanan" element={<Guard role="superadmin"><Admin readOnly /></Guard>} />
                  <Route path="transfer" element={<Guard role="superadmin"><TransferOwnership /></Guard>} />
                </Routes>
              </Suspense>
            } />

            {/* Catch-all route jika URL tidak ditemukan */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </main>

          <div className="px-4 md:px-6 shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}
