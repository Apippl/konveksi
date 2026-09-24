from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float, func, Index
from sqlalchemy.orm import relationship
from database import Base

_UTF8MB4 = {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"}


class User(Base):
    __tablename__ = "user"
    __table_args__ = _UTF8MB4

    id = Column(Integer, primary_key=True, index=True)
    nama = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="client", index=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    
    otp_code = Column(String(6), nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    
    # Tambahan kolom untuk verifikasi aksi sensitif (Ganti Password, Transfer Kepemilikan, dll)
    otp_aksi = Column(String(6), nullable=True)
    otp_aksi_expiry = Column(DateTime, nullable=True)
    sesi_aksi_valid_hingga = Column(DateTime, nullable=True)
    otp_attempts = Column(Integer, nullable=False, default=0)
    
    no_telepon = Column(String(20), nullable=True)
    alamat = Column(String(500), nullable=True)
    kode_pos = Column(String(10), nullable=True)
    kota = Column(String(100), nullable=True)

    pesanan = relationship("Pesanan", back_populates="user", cascade="all, delete-orphan")

    @property
    def profil_lengkap(self):
        return bool(self.no_telepon and self.alamat and self.kode_pos and self.kota)


class Pesanan(Base):
    __tablename__ = "pesanan"
    __table_args__ = (
        Index("ix_pesanan_user_status", "user_id", "status"),
        Index("ix_pesanan_status_bayar", "status_pembayaran"),
        _UTF8MB4,
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)

    teks = Column(String(200), nullable=True)
    font = Column(String(100), nullable=True)
    warna = Column(String(20), nullable=True)

    panjang_cm = Column(Float, nullable=False)
    lebar_cm = Column(Float, nullable=False)

    gambar_url = Column(String(255), nullable=True)
    catatan = Column(String(500), nullable=True)
    kode_pesanan = Column(String(30), unique=True, index=True, nullable=True)

    # Biaya bordir per pcs, SAMA untuk semua baris ukuran dalam satu pesanan
    # (karena desainnya satu, bordirnya sama, cuma baju yang beda ukuran).
    harga_bordir = Column(Integer, nullable=False, default=0)
    total_harga = Column(Integer, nullable=False, default=0)

    status = Column(String(30), nullable=False, default="Pending", index=True)
    status_pembayaran = Column(String(20), nullable=False, default="Belum Bayar", index=True)
    metode_pembayaran = Column(String(50), nullable=True)
    kode_kupon = Column(String(30), nullable=True)
    diskon = Column(Integer, nullable=False, default=0)
    midtrans_order_id = Column(String(50), nullable=True, index=True)
    snap_token = Column(String(255), nullable=True)
    dibuat_pada = Column(DateTime, nullable=False, server_default=func.now())

    user = relationship("User", back_populates="pesanan")
    detail = relationship("PesananDetail", back_populates="pesanan", cascade="all, delete-orphan")

    @property
    def nama_pelanggan(self):
        return self.user.nama if self.user else None

    @property
    def no_telepon(self):
        return self.user.no_telepon if self.user else None

    @property
    def total_jumlah(self):
        # Total pcs dari semua ukuran digabung, dipakai buat tampilan ringkas.
        return sum(d.jumlah for d in self.detail)


class PesananDetail(Base):
    __tablename__ = "pesanan_detail"
    __table_args__ = _UTF8MB4

    id = Column(Integer, primary_key=True, index=True)
    pesanan_id = Column(Integer, ForeignKey("pesanan.id"), nullable=False, index=True)
    ukuran = Column(String(5), nullable=False, default="M")
    jumlah = Column(Integer, nullable=False, default=1)

    # Snapshot harga baju per pcs untuk ukuran ini, disimpan saat order dibuat
    # supaya kalau HARGA_UKURAN berubah di kemudian hari, riwayat pesanan lama tidak ikut berubah.
    harga_baju = Column(Integer, nullable=False, default=0)

    pesanan = relationship("Pesanan", back_populates="detail")

    @property
    def subtotal(self):
        return (self.harga_baju + self.pesanan.harga_bordir) * self.jumlah


class TransferOwnership(Base):
    __tablename__ = "transfer_ownership"
    __table_args__ = (
        Index("ix_transfer_email_status", "email_baru", "status"),
        _UTF8MB4,
    )

    id = Column(Integer, primary_key=True, index=True)
    superadmin_lama_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    email_baru = Column(String(150), nullable=False, index=True)
    
    otp_lama = Column(String(6), nullable=True)
    otp_lama_expiry = Column(DateTime, nullable=True)
    
    otp_baru = Column(String(6), nullable=True)
    otp_baru_expiry = Column(DateTime, nullable=True)
    
    # Status alur: menunggu_konfirmasi_lama -> menunggu_konfirmasi_baru -> selesai / batal
    status = Column(String(30), nullable=False, default="menunggu_konfirmasi_lama", index=True)
    otp_attempts = Column(Integer, nullable=False, default=0)
    dibuat_pada = Column(DateTime, nullable=False, server_default=func.now())
    
    superadmin_lama = relationship("User", foreign_keys=[superadmin_lama_id])


class Pengumuman(Base):
    __tablename__ = "pengumuman"
    __table_args__ = _UTF8MB4

    id = Column(Integer, primary_key=True, index=True)
    judul = Column(String(150), nullable=False)
    isi = Column(String(1000), nullable=False)
    aktif = Column(Boolean, nullable=False, default=True, index=True)
    dibuat_oleh_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    dibuat_pada = Column(DateTime, nullable=False, server_default=func.now())

    dibuat_oleh = relationship("User", foreign_keys=[dibuat_oleh_id])


class HargaUkuran(Base):
    __tablename__ = "harga_ukuran"
    __table_args__ = _UTF8MB4

    ukuran = Column(String(5), primary_key=True)
    harga = Column(Integer, nullable=False, default=45000)


class Kupon(Base):
    __tablename__ = "kupon"
    __table_args__ = _UTF8MB4

    kode = Column(String(30), primary_key=True)
    # tipe: "persen" (nilai 1-100) atau "nominal" (rupiah)
    tipe = Column(String(10), nullable=False, default="persen")
    nilai = Column(Integer, nullable=False, default=0)
    min_total = Column(Integer, nullable=False, default=0)
    maks_potongan = Column(Integer, nullable=True)
    expiry = Column(DateTime, nullable=True)
    aktif = Column(Boolean, nullable=False, default=True, index=True)


class Pengaturan(Base):
    __tablename__ = "pengaturan"
    __table_args__ = _UTF8MB4

    kunci = Column(String(50), primary_key=True)
    nilai = Column(String(2000), nullable=False, default="")


class AuditLog(Base):
    __tablename__ = "audit_log"
    __table_args__ = (
        Index("ix_audit_aksi_waktu", "aksi", "dibuat_pada"),
        _UTF8MB4,
    )

    id = Column(Integer, primary_key=True, index=True)
    aktor_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    aktor_email = Column(String(150), nullable=False, default="-")
    aktor_role = Column(String(20), nullable=False, default="-")
    aksi = Column(String(50), nullable=False, index=True)
    target = Column(String(200), nullable=False, default="-")
    detail = Column(String(500), nullable=True)
    dibuat_pada = Column(DateTime, nullable=False, server_default=func.now())

    aktor = relationship("User", foreign_keys=[aktor_id])