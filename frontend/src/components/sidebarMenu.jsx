import Icon from "./Icon";

export const SUPERADMIN_MENU = [
  { to: "/superadmin/dashboard", label: "Dashboard Keuangan", icon: <Icon name="chart" /> },
  { to: "/superadmin/pesanan", label: "Riwayat Pesanan", icon: <Icon name="pesan" /> },
  { to: "/superadmin/log", label: "Log Aktivitas", icon: <Icon name="history" /> },
  { to: "/superadmin/akun", label: "Kelola Akun", icon: <Icon name="users" /> },
  { to: "/superadmin/harga", label: "Harga Baju", icon: <Icon name="uang" /> },
  { to: "/superadmin/kupon", label: "Kupon Diskon", icon: <Icon name="persen" /> },
  { to: "/superadmin/toko", label: "Kelola Toko", icon: <Icon name="settings" /> },
  { to: "/superadmin/transfer", label: "Transfer Kepemilikan", icon: <Icon name="transfer" /> },
];

export const ADMIN_MENU = [
  { to: "/admin", label: "Kelola Pesanan", icon: <Icon name="edit" /> },
];
