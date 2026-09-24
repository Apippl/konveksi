from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterInput(BaseModel):
    nama: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    nama: str
    email: EmailStr
    role: str
    is_verified: bool = False
    is_active: bool = True
    no_telepon: Optional[str] = None
    alamat: Optional[str] = None
    kode_pos: Optional[str] = None
    kota: Optional[str] = None
    profil_lengkap: bool

    class Config:
        from_attributes = True


class ProfileUpdateInput(BaseModel):
    nama: str = Field(..., min_length=2, max_length=100)
    no_telepon: str = Field(..., max_length=20)
    alamat: str = Field(..., max_length=500)
    kode_pos: str = Field(..., max_length=10)
    kota: str = Field(..., max_length=100)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PesananDetailOut(BaseModel):
    id: int
    ukuran: str
    jumlah: int
    harga_baju: int
    subtotal: int

    class Config:
        from_attributes = True


class PesananOut(BaseModel):
    id: int
    user_id: int
    kode_pesanan: Optional[str] = None
    teks: Optional[str] = None
    font: Optional[str] = None
    warna: Optional[str] = None
    panjang_cm: float
    lebar_cm: float
    gambar_url: Optional[str] = None
    catatan: Optional[str] = None
    harga_bordir: int
    total_harga: int
    total_jumlah: int
    status: str
    status_pembayaran: str
    metode_pembayaran: Optional[str] = None
    kode_kupon: Optional[str] = None
    diskon: int = 0
    midtrans_order_id: Optional[str] = None
    snap_token: Optional[str] = None
    nama_pelanggan: Optional[str] = None
    no_telepon: Optional[str] = None
    dibuat_pada: datetime
    detail: List[PesananDetailOut] = []

    class Config:
        from_attributes = True


class VerifyOtpInput(BaseModel):
    email: EmailStr
    kode: str = Field(..., min_length=6, max_length=6)


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    email: EmailStr
    kode: str = Field(..., min_length=6, max_length=6)
    password_baru: str = Field(..., min_length=6, max_length=128)


class SnapResponse(BaseModel):
    snap_token: str


class StatusPembayaranOut(BaseModel):
    status_pembayaran: str


class UkuranQtyInput(BaseModel):
    ukuran: str
    jumlah: int


class PesananUpdateInput(BaseModel):
    status: Optional[str] = Field(None, pattern="^(Pending|Diproses|Dikirim|Batal)$")
    harga_bordir: Optional[int] = Field(None, ge=0, le=100_000_000)


# --- TAMBAHAN BARU ---

class VerifikasiOtpAksiInput(BaseModel):
    kode: str = Field(..., min_length=6, max_length=6)


class BuatPengelolaInput(BaseModel):
    nama: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class PengelolaOut(BaseModel):
    id: int
    nama: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


class UpdatePengelolaInput(BaseModel):
    nama: str = Field(..., min_length=2, max_length=100)


class TransferMulaiInput(BaseModel):
    email_baru: EmailStr


class TransferKonfirmasiLamaInput(BaseModel):
    kode: str = Field(..., min_length=6, max_length=6)


class TransferKonfirmasiBaruInput(BaseModel):
    email_baru: EmailStr
    kode: str = Field(..., min_length=6, max_length=6)


class DashboardKeuanganOut(BaseModel):
    total_pendapatan: int
    pendapatan_bulan_ini: int
    jumlah_pesanan: int
    jumlah_lunas: int
    jumlah_pending: int
    jumlah_diproses: int
    jumlah_dikirim: int
    jumlah_selesai: int
    jumlah_batal: int


# --- Kelola user/client (superadmin) ---

class UserAdminOut(BaseModel):
    id: int
    nama: str
    email: EmailStr
    role: str
    is_verified: bool
    is_active: bool
    no_telepon: Optional[str] = None
    kota: Optional[str] = None
    profil_lengkap: bool

    class Config:
        from_attributes = True


class UserAdminUpdateInput(BaseModel):
    nama: Optional[str] = Field(None, min_length=2, max_length=100)
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = None


class UserAdminResetPasswordInput(BaseModel):
    password_baru: str = Field(..., min_length=6, max_length=128)


# --- Kupon diskon (superadmin) ---

class KuponOut(BaseModel):
    kode: str
    tipe: str
    nilai: int
    min_total: int
    maks_potongan: Optional[int] = None
    expiry: Optional[datetime] = None
    aktif: bool

    class Config:
        from_attributes = True


class KuponInput(BaseModel):
    kode: str = Field(..., min_length=3, max_length=30, pattern="^[A-Za-z0-9_-]+$")
    tipe: str = Field(..., pattern="^(persen|nominal)$")
    nilai: int = Field(..., ge=1, le=100_000_000)
    min_total: int = Field(0, ge=0, le=100_000_000)
    maks_potongan: Optional[int] = Field(None, ge=1, le=100_000_000)
    expiry: Optional[datetime] = None
    aktif: bool = True


class CekKuponOut(BaseModel):
    kode: str
    diskon: int
    total_bayar: int


# --- Audit log (superadmin, read-only) ---

class AuditLogOut(BaseModel):
    id: int
    aktor_email: str
    aktor_role: str
    aksi: str
    target: str
    detail: Optional[str] = None
    dibuat_pada: datetime

    class Config:
        from_attributes = True


# --- Harga baju per ukuran (superadmin, editable) ---

class HargaUkuranOut(BaseModel):
    ukuran: str
    harga: int

    class Config:
        from_attributes = True


class HargaUkuranInput(BaseModel):
    ukuran: str = Field(..., min_length=1, max_length=5)
    harga: int = Field(..., ge=0, le=100_000_000)


# --- Pengaturan toko (maintenance + konten landing) ---

class PengaturanPublikOut(BaseModel):
    tutup: bool = False
    pesan_tutup: str = ""
    judul_a: str = "Konveksi"
    judul_b: str = "Bordir"
    subjudul: str = ""


class PengaturanUpdateInput(BaseModel):
    tutup: Optional[bool] = None
    pesan_tutup: Optional[str] = Field(None, max_length=500)
    judul_a: Optional[str] = Field(None, max_length=50)
    judul_b: Optional[str] = Field(None, max_length=50)
    subjudul: Optional[str] = Field(None, max_length=300)


# --- Notifikasi webhook Midtrans (mentah, signature diverifikasi manual) ---

class MidtransNotifInput(BaseModel):
    order_id: Optional[str] = None
    status_code: Optional[str] = None
    gross_amount: Optional[str] = None
    signature_key: Optional[str] = None
    transaction_status: Optional[str] = None
    payment_type: Optional[str] = None
    bank: Optional[str] = None
    store: Optional[str] = None
    acquirer: Optional[str] = None

    class Config:
        extra = "allow"


# --- Pengumuman / broadcast (superadmin) ---

class PengumumanOut(BaseModel):
    id: int
    judul: str
    isi: str
    aktif: bool
    dibuat_pada: datetime

    class Config:
        from_attributes = True


class PengumumanInput(BaseModel):
    judul: str = Field(..., min_length=3, max_length=150)
    isi: str = Field(..., min_length=3, max_length=1000)
    aktif: bool = True