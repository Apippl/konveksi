import csv
import hashlib
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
import io
import logging
import os
import re
import secrets
import threading
import time
from typing import Optional
import uuid
import json

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, status, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import inspect, text
from sqlalchemy.orm import joinedload, Session

import auth
from midtrans_config import snap, core_api, CLIENT_KEY, SERVER_KEY
from database import Base, SessionLocal, engine, get_db
from mail import kirim_otp_email, kirim_email_transfer_ownership
import models
import schemas

# Try import pyembroidery safely at top level
try:
    import pyembroidery  # type: ignore[import-not-found]
except ImportError:
    pyembroidery = None

app = FastAPI(title="Konveksi Bordir Simple")
logger = logging.getLogger(__name__)

# ---- Rate limiting via slowapi (IP-based, melengkapi rate_limit per-email di bawah) ----
# Multi-worker: set REDIS_URL=redis://redis:6379 agar counter shared.
# Single-worker/dev: REDIS_URL=memory:// (default).
try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware
    from fastapi.responses import JSONResponse

    _redis_url = os.getenv("REDIS_URL", "memory://")
    try:
        limiter = Limiter(
            key_func=get_remote_address,
            storage_uri=_redis_url,
            strategy="fixed-window",
            default_limits=[],
        )
    except Exception:
        logger.warning("REDIS_URL tidak valid (%s); fallback ke memory.", _redis_url)
        limiter = Limiter(key_func=get_remote_address, default_limits=[])
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
    if _redis_url.startswith("redis"):
        logger.info("Rate limit storage: Redis (%s)", _redis_url)
    else:
        logger.info("Rate limit storage: memory (set REDIS_URL untuk multi-worker).")

    @app.exception_handler(RateLimitExceeded)
    async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Terlalu banyak permintaan. Coba lagi nanti."},
        )
except ImportError:  # slowapi belum terinstall (dev) — fallback ke rate_limit in-memory
    def limiter_limit(*_a, **_k):
        def deco(fn):
            return fn
        return deco

    class _DummyLimiter:
        def limit(self, *_a, **_k):
            return limiter_limit(*_a, **_k)

    limiter = _DummyLimiter()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
_origins_env = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://192.168.137.1:5173",
)
origins = [o.strip() for o in _origins_env.split(",") if o.strip()]

# allow_credentials=True + allow_origins="*" dilarang oleh spesifikasi CORS dan
# berbahaya: browser akan mengizinkan situs mana pun mengirim cookie/kredensial.
# Jadi kalau "*" dipakai, matikan credentials.
if "*" in origins:
    logger.warning("CORS_ORIGINS berisi '*'; allow_credentials dimatikan demi keamanan.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials="*" not in origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Opsional: batasi Host header yang diterima (cegah host header injection).
_allowed_hosts = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "").split(",") if h.strip()]
if _allowed_hosts:
    from starlette.middleware.trustedhost import TrustedHostMiddleware

    app.add_middleware(TrustedHostMiddleware, allowed_hosts=_allowed_hosts)

# ---- Security headers ----
# Header tambahan di setiap respons: mencegah clickjacking, sniffing tipe file,
# kebocoran referrer, dan (lewat CSP) membatasi sumber script/gambar/iframe.
SECURITY_HEADERS_ENABLED = os.getenv("SECURITY_HEADERS_ENABLED", "true").lower() in ("true", "1", "t")
HSTS_ENABLED = os.getenv("HSTS_ENABLED", "false").lower() in ("true", "1", "t")

# CSP default disesuaikan dengan app: boleh load Midtrans Snap + CDN Swagger UI.
# Bisa ditimpa lewat env CSP_POLICY tanpa mengubah kode.
CSP_POLICY = os.getenv(
    "CSP_POLICY",
    "default-src 'self'; "
    "img-src 'self' data:; "
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net "
    "https://app.sandbox.midtrans.com https://app.midtrans.com; "
    "frame-src 'self' https://app.sandbox.midtrans.com https://app.midtrans.com; "
    "connect-src 'self' https://app.sandbox.midtrans.com https://app.midtrans.com; "
    "font-src 'self' data:; "
    "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
)


@app.middleware("http")
async def tambah_security_headers(request: Request, call_next):
    response = await call_next(request)
    if SECURITY_HEADERS_ENABLED:
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault(
            "Permissions-Policy", "geolocation=(), microphone=(), camera=()"
        )
        response.headers.setdefault("Content-Security-Policy", CSP_POLICY)
        # HSTS hanya saat sudah https; kalau tidak, browser bisa "terpaksa" https
        # dan app lokal jadi tidak bisa dibuka.
        if HSTS_ENABLED:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
    return response

Base.metadata.create_all(bind=engine)


def pastikan_kolom_baru():
    """Migrasi ringan: pastikan struktur tabel pesanan dan pesanan_detail sinkron.

    Setiap DDL dibungkus try/except agar aman saat multi-worker (--workers N):
    dua worker yang start bersamaan bisa lolos `inspect` bersamaan lalu ALTER
    bersamaan; worker kedua akan kena duplicate-column dan harus diabaikan.
    """
    def _alter(sql: str) -> None:
        try:
            with engine.begin() as conn:
                conn.execute(text(sql))
        except Exception:
            pass  # kolom sudah ada (dibuat worker lain) atau DB tidak mendukung

    inspector = inspect(engine)
    with engine.begin() as conn:
        # Cek dan perbarui tabel pesanan
        if inspector.has_table("pesanan"):
            kolom = {c["name"] for c in inspector.get_columns("pesanan")}
            if "jumlah" in kolom:
                try:
                    conn.execute(text("ALTER TABLE pesanan DROP COLUMN jumlah"))
                except Exception:
                    pass
            # Hapus kolom harga_baju yang nyasar di tabel pesanan utama
            if "harga_baju" in kolom:
                try:
                    conn.execute(text("ALTER TABLE pesanan DROP COLUMN harga_baju"))
                except Exception:
                    pass
    if inspector.has_table("pesanan"):
        kolom = {c["name"] for c in inspector.get_columns("pesanan")}
        if "warna" not in kolom:
            _alter("ALTER TABLE pesanan ADD COLUMN warna VARCHAR(20) NULL")
        if "metode_pembayaran" not in kolom:
            _alter("ALTER TABLE pesanan ADD COLUMN metode_pembayaran VARCHAR(50) NULL")
        if "kode_kupon" not in kolom:
            _alter("ALTER TABLE pesanan ADD COLUMN kode_kupon VARCHAR(30) NULL")
        if "diskon" not in kolom:
            _alter("ALTER TABLE pesanan ADD COLUMN diskon INT DEFAULT 0")

    # Cek dan perbarui tabel pesanan_detail
    if inspector.has_table("pesanan_detail"):
        kolom_detail = {c["name"] for c in inspector.get_columns("pesanan_detail")}
        if "harga_baju" not in kolom_detail:
            _alter("ALTER TABLE pesanan_detail ADD COLUMN harga_baju INT DEFAULT 0")
        if "jumlah" not in kolom_detail:
            _alter("ALTER TABLE pesanan_detail ADD COLUMN jumlah INT DEFAULT 1")
        if "ukuran" not in kolom_detail:
            _alter("ALTER TABLE pesanan_detail ADD COLUMN ukuran VARCHAR(10) NULL")

    # Cek dan perbarui tabel user (kolom verifikasi aksi sensitif)
    if inspector.has_table("user"):
        kolom_user = {c["name"] for c in inspector.get_columns("user")}
        if "otp_aksi" not in kolom_user:
            _alter("ALTER TABLE user ADD COLUMN otp_aksi VARCHAR(6) NULL")
        if "otp_aksi_expiry" not in kolom_user:
            _alter("ALTER TABLE user ADD COLUMN otp_aksi_expiry DATETIME NULL")
        if "sesi_aksi_valid_hingga" not in kolom_user:
            _alter("ALTER TABLE user ADD COLUMN sesi_aksi_valid_hingga DATETIME NULL")
        if "otp_attempts" not in kolom_user:
            _alter("ALTER TABLE user ADD COLUMN otp_attempts INT DEFAULT 0")
        if "is_active" not in kolom_user:
            _alter("ALTER TABLE user ADD COLUMN is_active TINYINT(1) DEFAULT 1")

    # Cek dan perbarui tabel transfer_ownership
    if inspector.has_table("transfer_ownership"):
        kolom_transfer = {c["name"] for c in inspector.get_columns("transfer_ownership")}
        if "otp_attempts" not in kolom_transfer:
            _alter("ALTER TABLE transfer_ownership ADD COLUMN otp_attempts INT DEFAULT 0")


pastikan_kolom_baru()


def seed_harga_ukuran():
    """Isi tabel harga_ukuran dari default saat kosong, lalu muat ke memori."""
    db = SessionLocal()
    try:
        ada = db.query(models.HargaUkuran).count()
        if ada == 0:
            for ukuran, harga in HARGA_UKURAN_DEFAULT.items():
                db.add(models.HargaUkuran(ukuran=ukuran, harga=harga))
            db.commit()
        for row in db.query(models.HargaUkuran).all():
            HARGA_UKURAN[row.ukuran] = row.harga
    except Exception:
        db.rollback()
        logger.exception("Gagal seed/muat harga ukuran")
    finally:
        db.close()


def muat_ulang_harga_ukuran(db: Session) -> None:
    HARGA_UKURAN.clear()
    HARGA_UKURAN.update(HARGA_UKURAN_DEFAULT)
    for row in db.query(models.HargaUkuran).all():
        HARGA_UKURAN[row.ukuran] = row.harga


def label_metode_bayar(hasil: dict) -> Optional[str]:
    """Ubah respons Midtrans jadi label Indonesia (DANA tidak ada di Midtrans)."""
    tipe = (hasil.get("payment_type") or "").lower()
    if tipe == "qris":
        acq = (hasil.get("acquirer") or "").lower()
        return f"QRIS ({acq.upper()})" if acq else "QRIS"
    if tipe == "gopay":
        return "GoPay"
    if tipe == "shopeepay":
        return "ShopeePay"
    if tipe == "dana":
        return "DANA"
    if tipe == "ovo":
        return "OVO"
    if tipe == "linkaja":
        return "LinkAja"
    if tipe == "bank_transfer":
        bank = (hasil.get("bank") or "").upper()
        return f"Transfer Bank {bank}" if bank else "Transfer Bank"
    if tipe == "echannel":
        return "Mandiri Virtual Account"
    if tipe == "bca_klikpay":
        return "BCA KlikPay"
    if tipe == "bri_epay":
        return "BRI ePay"
    if tipe == "cimb_clicks":
        return "CIMB Clicks"
    if tipe == "danamon_online":
        return "Danamon Online"
    if tipe == "cstore":
        toko = (hasil.get("store") or "").upper()
        return f"Gerai {toko}" if toko else "Gerai Retail"
    if tipe == "credit_card":
        bank = (hasil.get("bank") or "").upper()
        return f"Kartu Kredit {bank}" if bank else "Kartu Kredit"
    if tipe == "akulaku":
        return "Akulaku"
    if tipe == "kredivo":
        return "Kredivo"
    return tipe.upper() if tipe else None

os.makedirs("uploads", exist_ok=True)
# Catatan keamanan: file upload TIDAK lagi disajikan lewat StaticFiles tanpa auth.
# Endpoint /uploads/{filename} (di bawah) mensyaratkan login.

HARGA_UKURAN_DEFAULT = {
    "S": 35000,
    "M": 45000,
    "L": 55000,
    "XL": 65000,
    "XXL": 75000,
    "XXXL": 85000,
}
# Nilai awal; angka resmi dibaca dari tabel harga_ukuran (bisa diubah superadmin).
HARGA_UKURAN = dict(HARGA_UKURAN_DEFAULT)
seed_harga_ukuran()
HARGA_PER_CM2 = 1000
EKSTENSI_GAMBAR_VALID = {".png", ".jpg", ".jpeg", ".webp"}
MAX_UKURAN_FILE = 10 * 1024 * 1024  # 10 MB
SESI_AKSI_MENIT = 15

NAMA_FILE_UPLOAD = re.compile(r"^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$")
MEDIA_TYPE_GAMBAR = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}


@app.get("/uploads/{filename}")
def ambil_upload(filename: str, user: models.User = Depends(auth.get_current_user)):
    """Sajikan file upload hanya untuk user yang sudah login.

    Sebelumnya folder uploads dipasang lewat StaticFiles sehingga siapa pun
    bisa mengunduh gambar orang lain. Sekarang wajib login, dan nama file
    divalidasi ketat agar tidak bisa keluar dari folder uploads.
    """
    if not NAMA_FILE_UPLOAD.match(filename):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File tidak ditemukan")

    ext = os.path.splitext(filename)[1].lower()
    if ext not in EKSTENSI_GAMBAR_VALID:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File tidak ditemukan")

    path = os.path.join("uploads", filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File tidak ditemukan")

    return FileResponse(
        path=path,
        media_type=MEDIA_TYPE_GAMBAR.get(ext, "application/octet-stream"),
        headers={
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, max-age=3600",
        },
    )


def generate_dst_pesanan(
    teks: str,
    font_folder: str,
    output_path: str,
    target_panjang_cm: float = None,
    target_lebar_cm: float = None,
):
    if not pyembroidery:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Library pyembroidery belum terinstall di server"
        )

    pattern = pyembroidery.EmbPattern()
    pattern.add_stitch_absolute(0, 0, 0)

    x_offset = 0
    spasi_width = 150
    jarak_huruf = 20

    base_dir = os.path.dirname(os.path.abspath(__file__))
    fonts_dir = os.path.abspath(os.path.join(base_dir, "assets", "fonts"))
    target_font = re.sub(r"[^a-z0-9_-]", "", (font_folder or "sans").lower().strip()) or "sans"
    font_dir = os.path.join(fonts_dir, target_font)

    if not os.path.abspath(font_dir).startswith(fonts_dir) or not os.path.exists(font_dir):
        font_dir = os.path.join(fonts_dir, "sans")

    has_valid_stitches = False

    for char in teks.upper():
        if char == " ":
            x_offset += spasi_width
            continue

        file_dst_huruf = os.path.join(font_dir, f"{char}.dst")

        if os.path.exists(file_dst_huruf):
            letter_pattern = pyembroidery.read_dst(file_dst_huruf)

            if letter_pattern and len(letter_pattern.stitches) > 0:
                letter_pattern.translate(x_offset, 0)
                pattern.stitches.extend(letter_pattern.stitches)
                has_valid_stitches = True

                bounds = letter_pattern.bounds()
                lebar_huruf = bounds[2] - bounds[0]
                x_offset += lebar_huruf + jarak_huruf

    if not has_valid_stitches:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tidak ada file font '.dst' yang valid ditemukan di folder: assets/fonts/{target_font}"
        )

    if target_panjang_cm and target_lebar_cm:
        bounds = pattern.bounds()
        lebar_asli = bounds[2] - bounds[0]
        tinggi_asli = bounds[3] - bounds[1]

        if lebar_asli > 0 and tinggi_asli > 0:
            scale_x = (target_panjang_cm * 100) / lebar_asli
            scale_y = (target_lebar_cm * 100) / tinggi_asli
            pattern.scale(scale_x, scale_y)

    pyembroidery.write_dst(pattern, output_path)


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


MAKS_PERCOBAAN_OTP = 5

# Rate limit login sederhana (in-memory, per email).
_login_gagal = defaultdict(deque)
_lock_login = threading.Lock()
LOGIN_MAKS_GAGAL = 5
LOGIN_JENDELA_DETIK = 300


def login_diblokir(email: str) -> bool:
    with _lock_login:
        q = _login_gagal[email]
        batas = time.time() - LOGIN_JENDELA_DETIK
        while q and q[0] < batas:
            q.popleft()
        return len(q) >= LOGIN_MAKS_GAGAL


def catat_gagal_login(email: str) -> None:
    with _lock_login:
        _login_gagal[email].append(time.time())


def reset_gagal_login(email: str) -> None:
    with _lock_login:
        _login_gagal.pop(email, None)


# Rate limit generik (in-memory) untuk endpoint sensitif seperti register/OTP.
_riwayat_aksi = defaultdict(deque)
_lock_aksi = threading.Lock()


def rate_limit(action: str, key: str, maks: int, jendela_detik: int) -> None:
    """Batasi jumlah pemanggilan sebuah aksi per key (mis. email atau IP).

    Menyimpan timestamp pemanggilan dalam deque; yang lebih tua dari jendela
    dibuang, lalu jika jumlah dalam jendela sudah >= maks -> tolak 429.
    """
    ident = f"{action}:{key}"
    with _lock_aksi:
        q = _riwayat_aksi[ident]
        batas = time.time() - jendela_detik
        while q and q[0] < batas:
            q.popleft()
        if len(q) >= maks:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Terlalu banyak permintaan. Coba lagi nanti.",
            )
        q.append(time.time())


def ip_klien(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def buat_kode_otp() -> str:
    return "".join(str(secrets.randbelow(10)) for _ in range(6))


def validasi_isi_gambar(isi: bytes, ext: str) -> bool:
    """Cek magic bytes supaya file yang diupload benar-benar gambar, bukan hanya ekstensinya."""
    if ext in (".jpg", ".jpeg"):
        return isi[:3] == b"\xff\xd8\xff"
    if ext == ".png":
        return isi[:8] == b"\x89PNG\r\n\x1a\n"
    if ext == ".webp":
        return len(isi) >= 12 and isi[:4] == b"RIFF" and isi[8:12] == b"WEBP"
    return False


def aman_csv(nilai) -> str:
    """Cegah CSV formula injection saat nilai dibuka di Excel."""
    s = "" if nilai is None else str(nilai)
    if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + s
    return s


MIDTRANS_NAMA_MAKS = 50


def nama_item_midtrans(nama: str) -> str:
    """Midtrans menolak item_details[].name yang lebih dari 50 karakter."""
    return (nama or "")[:MIDTRANS_NAMA_MAKS]


def catat_audit(db: Session, aktor: models.User, aksi: str, target: str, detail: str = None) -> None:
    """Tulis jejak aksi sensitif; ikut commit transaksi pemanggil (flush saja)."""
    try:
        db.add(models.AuditLog(
            aktor_id=aktor.id if aktor else None,
            aktor_email=aktor.email if aktor else "-",
            aktor_role=aktor.role if aktor else "-",
            aksi=aksi,
            target=target,
            detail=detail,
        ))
        db.flush()
    except Exception:
        logger.exception("Gagal catat audit %s", aksi)


def buat_kode_pesanan(db: Session) -> str:
    """Kode pesanan profesional berurutan per hari, contoh: BRD-20260919-0001."""
    tanggal = utc_now().strftime("%Y%m%d")
    prefix = f"BRD-{tanggal}-"
    terakhir = (
        db.query(models.Pesanan)
        .filter(models.Pesanan.kode_pesanan.like(f"{prefix}%"))
        .order_by(models.Pesanan.kode_pesanan.desc())
        .first()
    )
    urut = 1
    if terakhir and terakhir.kode_pesanan:
        try:
            urut = int(terakhir.kode_pesanan.rsplit("-", 1)[-1]) + 1
        except ValueError:
            urut = 1
    return f"{prefix}{urut:04d}"


def hitung_diskon(kupon: models.Kupon, total: int) -> int:
    """Hitung rupiah diskon; 0 jika kupon tidak layak pakai."""
    if not kupon or not kupon.aktif:
        return 0
    if kupon.expiry and kupon.expiry < utc_now():
        return 0
    if total < (kupon.min_total or 0):
        return 0
    if kupon.tipe == "persen":
        potongan = total * min(kupon.nilai, 100) // 100
        if kupon.maks_potongan:
            potongan = min(potongan, kupon.maks_potongan)
    else:
        potongan = min(kupon.nilai, total)
    return max(0, int(potongan))


def ambil_kupon_aktif(db: Session, kode: str) -> Optional[models.Kupon]:
    if not kode:
        return None
    return db.query(models.Kupon).filter(
        models.Kupon.kode == kode.strip().upper(),
        models.Kupon.aktif == True,  # noqa: E712
    ).first()


def buat_snap_token(
    pesanan: models.Pesanan,
    db: Session,
    user: models.User = None,
) -> str:
    user = user or pesanan.user

    kode = pesanan.kode_pesanan or f"PESANAN-{pesanan.id}"
    order_id = f"{kode}-{int(time.time())}-{uuid.uuid4().hex[:4]}"
    pesanan.midtrans_order_id = order_id
    pesanan.snap_token = None

    nama_item = pesanan.teks or "Bordir Custom"
    item_details = []

    for d in pesanan.detail:
        item_details.append({
            "id": f"baju-{pesanan.id}-{d.id}",
            "price": int(d.harga_baju),
            "quantity": d.jumlah,
            "name": nama_item_midtrans(f"Kaos Size {d.ukuran}"),
        })
        if pesanan.harga_bordir and pesanan.harga_bordir > 0:
            detail_warna = f", {pesanan.warna}" if pesanan.warna else ""
            nama_bordir = (
                f"Bordir {d.ukuran}: {nama_item} "
                f"({pesanan.panjang_cm}x{pesanan.lebar_cm}cm{detail_warna})"
            )
            item_details.append({
                "id": f"bordir-{pesanan.id}-{d.id}",
                "price": int(pesanan.harga_bordir),
                "quantity": d.jumlah,
                "name": nama_item_midtrans(nama_bordir),
            })

    diskon = int(pesanan.diskon or 0)
    if diskon > 0:
        item_details.append({
            "id": f"diskon-{pesanan.id}",
            "price": -diskon,
            "quantity": 1,
            "name": nama_item_midtrans(f"Diskon {pesanan.kode_kupon or ''}"),
        })

    param = {
        "transaction_details": {
            "order_id": order_id,
            "gross_amount": max(0, int(pesanan.total_harga) - diskon),
        },
        "item_details": item_details,
        "customer_details": {
            "first_name": user.nama,
            "email": user.email,
            "phone": user.no_telepon or "",
        },
        "callbacks": {
            "finish": f"{FRONTEND_URL}/pesanan-saya",
        },
    }

    transaksi = snap.create_transaction(param)
    pesanan.snap_token = transaksi["token"]
    pesanan.status_pembayaran = "Belum Bayar"
    db.commit()
    db.refresh(pesanan)
    return pesanan.snap_token


@app.post("/api/auth/register")
@limiter.limit("10/hour")
async def register(request: Request, data: schemas.RegisterInput, db: Session = Depends(get_db)):
    # Batasi spam pendaftaran/OTP per email dan per IP.
    rate_limit("register-email", data.email.lower(), 3, 3600)
    rate_limit("register-ip", ip_klien(request), 10, 3600)

    pesan = {"message": "Jika email belum terdaftar, kode verifikasi sudah dikirim ke email tersebut."}

    ada = db.query(models.User).filter(models.User.email == data.email).first()
    if ada:
        # Jangan ungkap apakah email sudah terdaftar (cegah user enumeration).
        return pesan

    kode_otp = buat_kode_otp()

    user = models.User(
        nama=data.nama,
        email=data.email,
        password_hash=auth.hash_password(data.password),
        role="client",
        is_verified=False,
        otp_code=kode_otp,
        otp_expiry=utc_now() + timedelta(minutes=5),
        otp_attempts=0,
    )
    db.add(user)
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Gagal register %s", data.email)
        raise HTTPException(status_code=500, detail="Gagal mendaftarkan akun. Coba lagi.")

    terkirim = await kirim_otp_email(data.email, kode_otp, tujuan="daftar")
    if not terkirim:
        # Detail kegagalan cukup di log server; respons ke klien tetap generik.
        logger.error("Gagal mengirim OTP registrasi ke %s", data.email)
    return pesan


@app.post("/api/auth/login", response_model=schemas.TokenOut)
@limiter.limit("10/minute")
def login(request: Request, data: schemas.LoginInput, db: Session = Depends(get_db)):
    data.email = data.email.strip().lower()
    if login_diblokir(data.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Terlalu banyak percobaan login. Coba lagi beberapa menit.",
        )
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not auth.verify_password(data.password, user.password_hash):
        catat_gagal_login(data.email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email atau password salah")
    if getattr(user, "is_active", True) is False:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akun dinonaktifkan. Hubungi admin.")
    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akun belum diverifikasi. Cek email untuk kode OTP.")
    reset_gagal_login(data.email)
    return schemas.TokenOut(access_token=auth.buat_token(user), user=user)


@app.post("/api/auth/resend-otp")
@limiter.limit("5/hour")
async def resend_otp(request: Request, data: schemas.ForgotPasswordInput, db: Session = Depends(get_db)):
    rate_limit("resend-otp-email", data.email.lower(), 3, 3600)
    rate_limit("resend-otp-ip", ip_klien(request), 10, 3600)

    # Respons selalu sama agar penyerang tidak bisa menebak email mana yang terdaftar.
    pesan = {"message": "Jika email terdaftar dan belum diverifikasi, kode OTP baru sudah dikirim."}

    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or user.is_verified:
        return pesan
    if user.otp_expiry and user.otp_expiry > utc_now() + timedelta(minutes=4):
        return pesan

    kode_otp = buat_kode_otp()
    user.otp_code = kode_otp
    user.otp_expiry = utc_now() + timedelta(minutes=5)
    user.otp_attempts = 0
    db.commit()

    terkirim = await kirim_otp_email(data.email, kode_otp, tujuan="daftar")
    if not terkirim:
        logger.error("Gagal mengirim ulang OTP ke %s", data.email)
    return pesan


@app.post("/api/auth/verify-otp", response_model=schemas.TokenOut)
@limiter.limit("20/hour")
def verify_otp(request: Request, data: schemas.VerifyOtpInput, db: Session = Depends(get_db)):
    rate_limit("verify-otp", data.email.lower(), 10, 900)
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email tidak ditemukan")
    if user.otp_code != data.kode:
        user.otp_attempts = (user.otp_attempts or 0) + 1
        if user.otp_attempts >= MAKS_PERCOBAAN_OTP:
            user.otp_code = None
            user.otp_expiry = None
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kode OTP salah")
    if not user.otp_expiry or user.otp_expiry < utc_now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kode OTP sudah kedaluwarsa")

    user.is_verified = True
    user.otp_code = None
    user.otp_expiry = None
    user.otp_attempts = 0
    db.commit()
    db.refresh(user)

    return schemas.TokenOut(access_token=auth.buat_token(user), user=user)


@app.post("/api/auth/forgot-password")
@limiter.limit("5/hour")
async def forgot_password(request: Request, data: schemas.ForgotPasswordInput, db: Session = Depends(get_db)):
    rate_limit("forgot-pw-email", data.email.lower(), 3, 3600)
    rate_limit("forgot-pw-ip", ip_klien(request), 10, 3600)

    pesan = {"message": "Jika email terdaftar, kode OTP reset password sudah dikirim."}

    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or (user.otp_expiry and user.otp_expiry > utc_now() + timedelta(minutes=4)):
        return pesan

    kode_otp = buat_kode_otp()
    user.otp_code = kode_otp
    user.otp_expiry = utc_now() + timedelta(minutes=5)
    user.otp_attempts = 0
    db.commit()

    terkirim = await kirim_otp_email(data.email, kode_otp, tujuan="reset")
    if not terkirim:
        logger.error("Gagal mengirim email reset password ke %s", data.email)
    return pesan


@app.post("/api/auth/reset-password")
@limiter.limit("10/hour")
def reset_password(request: Request, data: schemas.ResetPasswordInput, db: Session = Depends(get_db)):
    rate_limit("reset-pw", data.email.lower(), 5, 900)
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email tidak ditemukan")
    if user.otp_code != data.kode:
        user.otp_attempts = (user.otp_attempts or 0) + 1
        if user.otp_attempts >= MAKS_PERCOBAAN_OTP:
            user.otp_code = None
            user.otp_expiry = None
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kode OTP salah")
    if not user.otp_expiry or user.otp_expiry < utc_now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kode OTP sudah kedaluwarsa")

    user.password_hash = auth.hash_password(data.password_baru)
    user.is_verified = True
    user.otp_code = None
    user.otp_expiry = None
    user.otp_attempts = 0
    db.commit()

    return {"message": "Password berhasil diubah. Silakan login."}


@app.post("/api/pesanan", response_model=schemas.PesananOut)
def buat_pesanan(
    mode: str = Form(...),
    ukuran_list: str = Form(...),  # JSON string: [{"ukuran":"M","jumlah":3},{"ukuran":"L","jumlah":5}]
    teks: Optional[str] = Form(None),
    font: Optional[str] = Form(None),
    warna: Optional[str] = Form(None),
    panjang_cm: float = Form(...),
    lebar_cm: float = Form(...),
    catatan: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    try:
        daftar_ukuran = json.loads(ukuran_list)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Format ukuran_list tidak valid")

    if not isinstance(daftar_ukuran, list) or len(daftar_ukuran) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Minimal harus ada 1 baris ukuran")

    pesan_tutup = toko_tutup(db)
    if pesan_tutup:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=pesan_tutup)

    gambar_url = None
    teks_final = teks
    font_final = font
    warna_final = warna
    harga_bordir = 0

    if mode == "gambar":
        if not file:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File gambar wajib diupload untuk mode Upload Logo/Gambar")

        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in EKSTENSI_GAMBAR_VALID:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Format file harus PNG/JPG/JPEG/WEBP")

        # Baca maksimal MAX_UKURAN_FILE + 1 byte, jadi file raksasa tidak pernah
        # masuk sepenuhnya ke memori. Kalau kepotong 1 byte saja -> berarti kebesaran.
        isi = file.file.read(MAX_UKURAN_FILE + 1)
        if len(isi) > MAX_UKURAN_FILE:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ukuran file maksimal 10 MB")
        if not validasi_isi_gambar(isi, ext):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Isi file bukan gambar yang valid")

        nama_file = f"{uuid.uuid4().hex}{ext}"
        path_simpan = os.path.join("uploads", nama_file)
        with open(path_simpan, "wb") as f:
            f.write(isi)

        gambar_url = f"/uploads/{nama_file}"
        teks_final = None
        font_final = None
        warna_final = None
    else:
        if not teks or not font:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Teks dan font wajib diisi untuk mode Bordir Teks")

        luas_cm2 = float(panjang_cm) * float(lebar_cm)
        harga_bordir = int(luas_cm2 * HARGA_PER_CM2)

    p = models.Pesanan(
        user_id=user.id,
        kode_pesanan=buat_kode_pesanan(db),
        teks=teks_final,
        font=font_final,
        warna=warna_final,
        panjang_cm=panjang_cm,
        lebar_cm=lebar_cm,
        gambar_url=gambar_url,
        catatan=catatan,
        harga_bordir=harga_bordir,
        total_harga=0,  # dihitung setelah baris detail dibuat
    )
    db.add(p)
    db.flush()  # supaya p.id kebentuk sebelum bikin detail

    total = 0
    for baris in daftar_ukuran:
        ukuran = str(baris.get("ukuran", "M")).upper()
        try:
            jumlah = max(1, int(baris.get("jumlah", 1)))
        except (TypeError, ValueError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Jumlah tidak valid")
        harga_baju = HARGA_UKURAN.get(ukuran, 45000)

        detail = models.PesananDetail(
            pesanan_id=p.id,
            ukuran=ukuran,
            jumlah=jumlah,
            harga_baju=harga_baju,
        )
        db.add(detail)
        total += (harga_baju + harga_bordir) * jumlah

    p.total_harga = total
    from sqlalchemy.exc import IntegrityError

    try:
        db.commit()
    except IntegrityError:
        # Balapan kode_pesanan harian (dua order di detik yang sama):
        # rollback lalu coba sekali lagi dengan kode baru.
        db.rollback()
        p.kode_pesanan = buat_kode_pesanan(db)
        try:
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Gagal simpan pesanan user %s", user.id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gagal menyimpan pesanan. Coba lagi.",
            )
    db.refresh(p)

    # Snap token TIDAK dibuat di sini. Token dibuat saat user menekan
    # "Bayar" di halaman Checkout (/api/pesanan/{id}/bayar), supaya tidak
    # ada transaksi Midtrans ganda / kedaluwarsa.

    return p


@app.get("/api/pesanan", response_model=list[schemas.PesananOut])
def list_pesanan(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    q = db.query(models.Pesanan).options(
        joinedload(models.Pesanan.user),
        joinedload(models.Pesanan.detail)
    )

    if user.role not in ("admin", "superadmin"):
        q = q.filter(models.Pesanan.user_id == user.id)

    if status_filter:
        q = q.filter(models.Pesanan.status == status_filter)

    return q.order_by(models.Pesanan.id.desc()).all()


@app.get("/api/profile", response_model=schemas.UserOut)
def get_profile(user: models.User = Depends(auth.get_current_user)):
    return user


@app.put("/api/profile", response_model=schemas.UserOut)
def update_profile(
    data: schemas.ProfileUpdateInput,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    # Nama hanya boleh diubah oleh client. Identitas admin/superadmin dikelola
    # lewat menu pengelola, jadi perubahan nama dari peran itu diabaikan.
    if user.role not in ("admin", "superadmin"):
        user.nama = data.nama
    user.no_telepon = data.no_telepon
    user.alamat = data.alamat
    user.kode_pos = data.kode_pos
    user.kota = data.kota
    db.commit()
    db.refresh(user)
    return user


# ==================== MIDTRANS SNAP ====================

@app.get("/api/midtrans/client-key")
def get_midtrans_client_key():
    return {"client_key": CLIENT_KEY}


@app.post("/api/pesanan/{pesanan_id}/bayar", response_model=schemas.SnapResponse)
def buat_pembayaran(
    pesanan_id: int,
    kode_kupon: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    pesanan = db.query(models.Pesanan).filter(
        models.Pesanan.id == pesanan_id,
        models.Pesanan.user_id == user.id,
    ).first()
    if not pesanan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pesanan tidak ditemukan")
    # Mode gambar: harga_bordir=0 sampai admin mengisi. Mode teks: dihitung otomatis.
    # Keduanya wajib >0 sebelum bayar, kalau tidak client bisa bayar harga baju saja (underpayment).
    if pesanan.total_harga <= 0 or (pesanan.harga_bordir or 0) <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pesanan ini belum punya harga lengkap (menunggu admin tentukan biaya bordir)")
    if pesanan.status_pembayaran == "Lunas":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pesanan ini sudah dibayar")

    if kode_kupon:
        kupon = ambil_kupon_aktif(db, kode_kupon)
        potongan = hitung_diskon(kupon, int(pesanan.total_harga)) if kupon else 0
        if not kupon or potongan <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kode kupon tidak valid / tidak memenuhi syarat.")
        pesanan.kode_kupon = kupon.kode
        pesanan.diskon = potongan

    if not pesanan.snap_token or not pesanan.midtrans_order_id or kode_kupon:
        buat_snap_token(pesanan, db, user=user)

    return {"snap_token": pesanan.snap_token}


@app.get("/api/pesanan/{pesanan_id}/cek-status")
def cek_status_pembayaran(
    pesanan_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    pesanan = db.query(models.Pesanan).filter(models.Pesanan.id == pesanan_id).first()
    
    if not pesanan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pesanan tidak ditemukan")

    if user.role not in ("admin", "superadmin") and pesanan.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses ditolak")

    if not pesanan.midtrans_order_id:
        return {"status_pembayaran": pesanan.status_pembayaran, "pesan": "Order ID Midtrans belum ada"}

    try:
        hasil = core_api.transactions.status(pesanan.midtrans_order_id)
        status_transaksi = hasil.get('transaction_status')
        
        if status_transaksi in ['capture', 'settlement']:
            pesanan.status_pembayaran = "Lunas"
            pesanan.status = "Diproses"
        elif status_transaksi in ['cancel', 'deny', 'expire']:
            pesanan.status_pembayaran = "Gagal"
            pesanan.status = "Dibatalkan"
        elif status_transaksi == 'pending':
            pesanan.status_pembayaran = "Belum Lunas"

        metode = label_metode_bayar(hasil)
        if metode:
            pesanan.metode_pembayaran = metode

        db.commit()
        db.refresh(pesanan)

        return {"status_pembayaran": pesanan.status_pembayaran, "metode_pembayaran": pesanan.metode_pembayaran}

    except Exception as e:
        db.rollback()
        if "404" in str(e):
            return {
                "status_pembayaran": pesanan.status_pembayaran,
                "pesan": "Transaksi belum tercatat di sistem Midtrans (user belum memilih metode pembayaran)."
            }
        logger.exception("Gagal cek status Midtrans untuk pesanan %s", pesanan_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal memeriksa status pembayaran. Coba lagi nanti."
        )


@app.post("/api/midtrans/notifikasi")
async def notifikasi_midtrans(request: Request, db: Session = Depends(get_db)):
    """Webhook resmi Midtrans: update status walau user tidak pernah buka situs lagi.

    Daftarkan URL ini di dashboard Midtrans (Settings > Notification URL):
    https://domain-anda/api/midtrans/notifikasi
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Body bukan JSON valid.")
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Body bukan JSON valid.")

    data = schemas.MidtransNotifInput(**payload)
    if not data.order_id or not data.signature_key or not data.status_code or data.gross_amount is None:
        raise HTTPException(status_code=400, detail="Payload tidak lengkap.")

    expected = hashlib.sha512(
        f"{data.order_id}{data.status_code}{data.gross_amount}{SERVER_KEY}".encode()
    ).hexdigest()
    if expected != (data.signature_key or "").lower():
        logger.warning("Webhook Midtrans signature tidak valid untuk %s", data.order_id)
        raise HTTPException(status_code=403, detail="Signature tidak valid.")

    pesanan = db.query(models.Pesanan).filter(
        models.Pesanan.midtrans_order_id == data.order_id
    ).first()
    if not pesanan:
        logger.warning("Webhook untuk order tak dikenal: %s", data.order_id)
        return {"status": "ok"}  # 200 agar Midtrans berhenti retry

    status_transaksi = (data.transaction_status or "").lower()
    if status_transaksi in ("capture", "settlement"):
        pesanan.status_pembayaran = "Lunas"
        pesanan.status = "Diproses"
    elif status_transaksi in ("cancel", "deny", "expire"):
        pesanan.status_pembayaran = "Gagal"
        pesanan.status = "Dibatalkan"
    elif status_transaksi == "pending":
        pesanan.status_pembayaran = "Belum Lunas"

    metode = label_metode_bayar(payload)
    if metode:
        pesanan.metode_pembayaran = metode

    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Gagal simpan webhook %s", data.order_id)
        raise HTTPException(status_code=500, detail="Gagal menyimpan.")
    return {"status": "ok"}


@app.get("/api/pesanan/{pesanan_id}", response_model=schemas.PesananOut)
def detail_pesanan(    pesanan_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    pesanan = (
        db.query(models.Pesanan)
        .options(joinedload(models.Pesanan.user), joinedload(models.Pesanan.detail))
        .filter(models.Pesanan.id == pesanan_id)
        .first()
    )
    if not pesanan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pesanan tidak ditemukan")
    if user.role not in ("admin", "superadmin") and pesanan.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses ditolak")
    return pesanan


# ==================== HARGA BAJU (editable superadmin) ====================

@app.get("/api/pengaturan/harga", response_model=list[schemas.HargaUkuranOut])
def list_harga(db: Session = Depends(get_db)):
    rows = db.query(models.HargaUkuran).order_by(models.HargaUkuran.harga.asc()).all()
    if not rows:
        return [schemas.HargaUkuranOut(ukuran=k, harga=v) for k, v in HARGA_UKURAN_DEFAULT.items()]
    return rows


@app.put("/api/superadmin/pengaturan/harga", response_model=list[schemas.HargaUkuranOut])
def ubah_harga(
    data: list[schemas.HargaUkuranInput],
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_superadmin),
):
    if not data:
        raise HTTPException(status_code=400, detail="Daftar harga kosong.")
    try:
        for item in data:
            ukuran = item.ukuran.strip().upper()
            row = db.query(models.HargaUkuran).filter(models.HargaUkuran.ukuran == ukuran).first()
            if row:
                row.harga = item.harga
            else:
                db.add(models.HargaUkuran(ukuran=ukuran, harga=item.harga))
        db.commit()
        muat_ulang_harga_ukuran(db)
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception("Gagal update harga ukuran")
        raise HTTPException(status_code=500, detail="Gagal menyimpan harga.")
    return db.query(models.HargaUkuran).order_by(models.HargaUkuran.harga.asc()).all()


# ==================== KUPON DISKON ====================

@app.get("/api/superadmin/kupon", response_model=list[schemas.KuponOut])
def list_kupon(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_superadmin),
):
    return db.query(models.Kupon).order_by(models.Kupon.kode.asc()).all()


@app.post("/api/superadmin/kupon", response_model=schemas.KuponOut)
def buat_kupon(
    data: schemas.KuponInput,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_superadmin),
):
    kode = data.kode.strip().upper()
    if db.query(models.Kupon).filter(models.Kupon.kode == kode).first():
        raise HTTPException(status_code=400, detail="Kode kupon sudah ada.")
    if data.tipe == "persen" and not (1 <= data.nilai <= 100):
        raise HTTPException(status_code=400, detail="Persen harus 1-100.")
    kupon = models.Kupon(
        kode=kode, tipe=data.tipe, nilai=data.nilai,
        min_total=data.min_total or 0, maks_potongan=data.maks_potongan,
        expiry=data.expiry, aktif=data.aktif,
    )
    db.add(kupon)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Gagal menyimpan kupon.")
    db.refresh(kupon)
    return kupon


@app.put("/api/superadmin/kupon/{kode}", response_model=schemas.KuponOut)
def ubah_kupon(
    kode: str,
    data: schemas.KuponInput,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_superadmin),
):
    kupon = db.query(models.Kupon).filter(models.Kupon.kode == kode.strip().upper()).first()
    if not kupon:
        raise HTTPException(status_code=404, detail="Kupon tidak ditemukan.")
    if data.tipe == "persen" and not (1 <= data.nilai <= 100):
        raise HTTPException(status_code=400, detail="Persen harus 1-100.")
    kupon.tipe = data.tipe
    kupon.nilai = data.nilai
    kupon.min_total = data.min_total or 0
    kupon.maks_potongan = data.maks_potongan
    kupon.expiry = data.expiry
    kupon.aktif = data.aktif
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Gagal menyimpan kupon.")
    db.refresh(kupon)
    return kupon


@app.delete("/api/superadmin/kupon/{kode}")
def hapus_kupon(
    kode: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_superadmin),
):
    kupon = db.query(models.Kupon).filter(models.Kupon.kode == kode.strip().upper()).first()
    if not kupon:
        raise HTTPException(status_code=404, detail="Kupon tidak ditemukan.")
    db.delete(kupon)
    db.commit()
    return {"message": f"Kupon {kupon.kode} dihapus."}


@app.get("/api/pesanan/{pesanan_id}/cek-kupon", response_model=schemas.CekKuponOut)
def cek_kupon(
    pesanan_id: int,
    kode: str = Query(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    pesanan = db.query(models.Pesanan).filter(
        models.Pesanan.id == pesanan_id,
        models.Pesanan.user_id == user.id,
    ).first()
    if not pesanan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pesanan tidak ditemukan")
    kupon = ambil_kupon_aktif(db, kode)
    potongan = hitung_diskon(kupon, int(pesanan.total_harga)) if kupon else 0
    if not kupon or potongan <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kode kupon tidak valid / tidak memenuhi syarat.")
    return schemas.CekKuponOut(kode=kupon.kode, diskon=potongan, total_bayar=int(pesanan.total_harga) - potongan)


# ==================== PENGATURAN TOKO (maintenance + konten) ====================

PENGATURAN_DEFAULT = {
    "tutup": "false",
    "pesan_tutup": "Toko tutup sementara. Pesanan dibuka lagi segera.",
    "judul_a": "Konveksi",
    "judul_b": "Bordir",
    "subjudul": "Pesan bordir custom dengan mudah: teks atau gambar, harga jelas, bayar online.",
}


def baca_pengaturan(db: Session) -> dict:
    hasil = dict(PENGATURAN_DEFAULT)
    for row in db.query(models.Pengaturan).all():
        hasil[row.kunci] = row.nilai
    return hasil


def toko_tutup(db: Session) -> Optional[str]:
    """Return pesan tutup jika toko tutup, else None."""
    row = db.query(models.Pengaturan).filter(models.Pengaturan.kunci == "tutup").first()
    if row and row.nilai.lower() == "true":
        psn = db.query(models.Pengaturan).filter(models.Pengaturan.kunci == "pesan_tutup").first()
        return (psn.nilai if psn and psn.nilai else PENGATURAN_DEFAULT["pesan_tutup"])
    return None


@app.get("/api/pengaturan/publik", response_model=schemas.PengaturanPublikOut)
def pengaturan_publik(db: Session = Depends(get_db)):
    p = baca_pengaturan(db)
    return schemas.PengaturanPublikOut(
        tutup=p["tutup"].lower() == "true",
        pesan_tutup=p["pesan_tutup"],
        judul_a=p["judul_a"],
        judul_b=p["judul_b"],
        subjudul=p["subjudul"],
    )


@app.put("/api/superadmin/pengaturan", response_model=schemas.PengaturanPublikOut)
def ubah_pengaturan(
    data: schemas.PengaturanUpdateInput,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_superadmin),
):
    masuk = data.model_dump(exclude_none=True)
    try:
        for kunci, nilai in masuk.items():
            if kunci == "tutup":
                nilai = "true" if nilai else "false"
            row = db.query(models.Pengaturan).filter(models.Pengaturan.kunci == kunci).first()
            if row:
                row.nilai = str(nilai)
            else:
                db.add(models.Pengaturan(kunci=kunci, nilai=str(nilai)))
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Gagal update pengaturan")
        raise HTTPException(status_code=500, detail="Gagal menyimpan pengaturan.")
    return pengaturan_publik(db)

# =========================================================


@app.put("/api/pesanan/{pesanan_id}", response_model=schemas.PesananOut)
def update_status_pesanan(
    pesanan_id: int,
    payload: schemas.PesananUpdateInput,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.require_admin),
):
    from sqlalchemy.exc import SQLAlchemyError

    pesanan = db.query(models.Pesanan).options(joinedload(models.Pesanan.detail)).filter(models.Pesanan.id == pesanan_id).first()
    if not pesanan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pesanan tidak ditemukan")

    if payload.status is not None:
        status_baru = payload.status
        if pesanan.status in ("Dikirim", "Selesai", "Batal"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Status pesanan ini sudah dikunci dan tidak bisa diubah dari sini.",
            )
        if status_baru == "Selesai":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gunakan konfirmasi penerimaan pelanggan atau tombol selesaikan manual untuk menyelesaikan pesanan.",
            )
        pesanan.status = status_baru

    if payload.harga_bordir is not None:
        if pesanan.status_pembayaran == "Lunas":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pesanan sudah lunas, biaya bordir tidak bisa diubah",
            )
        harga_bordir = payload.harga_bordir

        pesanan.harga_bordir = harga_bordir
        
        # Hitung ulang total harga berdasarkan detail ukuran
        total_baju = sum(d.harga_baju * d.jumlah for d in pesanan.detail)
        total_qty = sum(d.jumlah for d in pesanan.detail)
        pesanan.total_harga = total_baju + (pesanan.harga_bordir * total_qty)
        
        buat_snap_token(pesanan, db, user=pesanan.user)

    if payload.status is not None or payload.harga_bordir is not None:
        catat_audit(
            db, admin, "ubah_pesanan",
            f"#{pesanan_id} {pesanan.kode_pesanan or ''}".strip(),
            f"status={payload.status} harga_bordir={payload.harga_bordir}",
        )

    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Gagal update pesanan %s", pesanan_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal menyimpan perubahan pesanan.",
        )
    db.refresh(pesanan)
    return pesanan


@app.put("/api/pesanan/{pesanan_id}/konfirmasi-terima", response_model=schemas.PesananOut)
def konfirmasi_terima_pelanggan(
    pesanan_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    pesanan = db.query(models.Pesanan).filter(models.Pesanan.id == pesanan_id).first()
    if not pesanan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pesanan tidak ditemukan")
    if pesanan.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses ditolak")
    if pesanan.status != "Dikirim":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pesanan belum berstatus Dikirim")

    pesanan.status = "Selesai"
    db.commit()
    db.refresh(pesanan)
    return pesanan


@app.put("/api/pesanan/{pesanan_id}/selesaikan-manual", response_model=schemas.PesananOut)
def selesaikan_manual(
    pesanan_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.require_admin),
):
    pesanan = db.query(models.Pesanan).filter(models.Pesanan.id == pesanan_id).first()
    if not pesanan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pesanan tidak ditemukan")
    if pesanan.status != "Dikirim":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pesanan belum berstatus Dikirim")

    pesanan.status = "Selesai"
    db.commit()
    db.refresh(pesanan)
    return pesanan


@app.get("/api/pesanan/{pesanan_id}/download-dst")
def download_dst(
    pesanan_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth.require_admin),
):
    pesanan = db.query(models.Pesanan).filter(models.Pesanan.id == pesanan_id).first()
    if not pesanan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pesanan tidak ditemukan")

    if not pesanan.font or not pesanan.teks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pesanan ini berupa gambar kustom, tidak bisa digenerate ke DST")

    output_dir = "generated_dst"
    os.makedirs(output_dir, exist_ok=True)
    file_path = os.path.join(output_dir, f"pesanan_{pesanan.id}.dst")

    generate_dst_pesanan(
        teks=pesanan.teks,
        font_folder=pesanan.font,
        output_path=file_path,
        target_panjang_cm=pesanan.panjang_cm,
        target_lebar_cm=pesanan.lebar_cm,
    )

    # Bersihkan teks pesanan sebelum dipakai di nama file, supaya karakter
    # aneh (newline, kutip, slash) tidak menyusup ke header Content-Disposition.
    teks_aman = re.sub(r"[^A-Za-z0-9_-]", "_", pesanan.teks or "Bordir") or "Bordir"
    return FileResponse(
        path=file_path,
        filename=f"PESANAN_{pesanan.id}_{teks_aman}.dst",
        media_type="application/x-tajima",
    )


@app.delete("/api/pesanan/{pesanan_id}")
def hapus_pesanan(
    pesanan_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    from sqlalchemy.exc import SQLAlchemyError

    pesanan = db.query(models.Pesanan).filter(models.Pesanan.id == pesanan_id).first()
    if not pesanan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pesanan tidak ditemukan")

    if user.role not in ("admin", "superadmin"):
        if pesanan.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses ditolak")
        if pesanan.status != "Pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pesanan yang sudah diproses tidak dapat dihapus",
            )

    try:
        info_hapus = f"#{pesanan.id} {pesanan.kode_pesanan or ''} milik user {pesanan.user_id} (Rp {pesanan.total_harga}, {pesanan.status})".strip()
        catat_audit(db, user, "hapus_pesanan", info_hapus)
        db.delete(pesanan)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Gagal hapus pesanan %s", pesanan_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal menghapus pesanan.",
        )
    return {"message": f"Pesanan #{pesanan_id} berhasil dihapus"}


@app.post("/api/superadmin/minta-otp-aksi")
async def minta_otp_aksi(
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_superadmin),
):
    kode_otp = buat_kode_otp()
    user.otp_aksi = kode_otp
    user.otp_aksi_expiry = utc_now() + timedelta(minutes=5)
    user.otp_attempts = 0
    db.commit()

    terkirim = await kirim_otp_email(user.email, kode_otp, tujuan="reset")
    if not terkirim:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gagal mengirim email OTP. Coba lagi sebentar lagi.",
        )
    return {"message": "Kode OTP untuk aksi sensitif sudah dikirim ke email kamu."}


@app.get("/api/superadmin/sesi-aksi/status")
def status_sesi_aksi(
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_superadmin),
):
    """Cek sisa sesi aksi sensitif (agar pindah halaman tidak minta OTP ulang)."""
    db.refresh(user)
    aktif = bool(user.sesi_aksi_valid_hingga and user.sesi_aksi_valid_hingga > utc_now())
    return {"aktif": aktif, "berlaku_hingga": user.sesi_aksi_valid_hingga if aktif else None}


@app.post("/api/superadmin/verifikasi-otp-aksi")
def verifikasi_otp_aksi(
    data: schemas.VerifikasiOtpAksiInput,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_superadmin),
):
    if user.otp_aksi != data.kode:
        user.otp_attempts = (user.otp_attempts or 0) + 1
        if user.otp_attempts >= MAKS_PERCOBAAN_OTP:
            user.otp_aksi = None
            user.otp_aksi_expiry = None
        db.commit()
        raise HTTPException(status_code=400, detail="Kode OTP salah")
    if not user.otp_aksi_expiry or user.otp_aksi_expiry < utc_now():
        raise HTTPException(status_code=400, detail="Kode OTP sudah kedaluwarsa")

    user.otp_aksi = None
    user.otp_aksi_expiry = None
    user.otp_attempts = 0
    user.sesi_aksi_valid_hingga = utc_now() + timedelta(minutes=SESI_AKSI_MENIT)
    db.commit()

    return {
        "message": f"Sesi aksi sensitif aktif selama {SESI_AKSI_MENIT} menit.",
        "berlaku_hingga": user.sesi_aksi_valid_hingga,
    }


# ==================== MANAJEMEN AKUN PENGELOLA ====================

@app.get("/api/superadmin/pengelola", response_model=list[schemas.PengelolaOut])
def list_pengelola(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_superadmin),
):
    return db.query(models.User).filter(models.User.role == "admin").order_by(models.User.id.desc()).all()


@app.post("/api/superadmin/pengelola", response_model=schemas.PengelolaOut)
def buat_pengelola(
    data: schemas.BuatPengelolaInput,
    db: Session = Depends(get_db),
    aktor: models.User = Depends(auth.require_sesi_aksi_aktif),
):
    ada = db.query(models.User).filter(models.User.email == data.email).first()
    if ada:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")

    pengelola = models.User(
        nama=data.nama,
        email=data.email,
        password_hash=auth.hash_password(data.password),
        role="admin",
        is_verified=True,  # sudah divalidasi lewat sesi aksi superadmin, tidak perlu OTP lagi
    )
    db.add(pengelola)
    try:
        catat_audit(db, aktor, "buat_pengelola", f"{data.email} ({data.nama})")
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Gagal buat pengelola %s", data.email)
        raise HTTPException(status_code=500, detail="Gagal membuat akun pengelola.")
    db.refresh(pengelola)
    return pengelola


@app.delete("/api/superadmin/pengelola/{pengelola_id}")
def hapus_pengelola(
    pengelola_id: int,
    db: Session = Depends(get_db),
    aktor: models.User = Depends(auth.require_sesi_aksi_aktif),
):
    pengelola = db.query(models.User).filter(
        models.User.id == pengelola_id, models.User.role == "admin"
    ).first()
    if not pengelola:
        raise HTTPException(status_code=404, detail="Akun pengelola tidak ditemukan")

    # 1. Simpan email pengelola sebelum dihapus
    email_pengelola = pengelola.email

    # 2. Hapus riwayat transfer ownership yang pernah dibuat oleh superadmin/pengelola ini
    db.query(models.TransferOwnership).filter(
        models.TransferOwnership.superadmin_lama_id == pengelola_id
    ).delete(synchronize_session=False)

    # 3. Hapus akun pengelola
    db.delete(pengelola)
    try:
        catat_audit(db, aktor, "hapus_pengelola", f"#{pengelola_id} {email_pengelola}")
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Gagal hapus pengelola %s", pengelola_id)
        raise HTTPException(status_code=500, detail="Gagal menghapus akun pengelola.")

    return {"message": f"Akun pengelola {email_pengelola} berhasil dihapus"}

@app.put("/api/superadmin/pengelola/{pengelola_id}", response_model=schemas.PengelolaOut)
def ubah_pengelola(
    pengelola_id: int,
    data: schemas.UpdatePengelolaInput,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_sesi_aksi_aktif),
):
    # Satu-satunya tempat nama admin bisa diubah (di Profil Saya sengaja dikunci).
    pengelola = db.query(models.User).filter(
        models.User.id == pengelola_id, models.User.role == "admin"
    ).first()
    if not pengelola:
        raise HTTPException(status_code=404, detail="Akun pengelola tidak ditemukan")

    nama_baru = data.nama.strip()
    if not nama_baru:
        raise HTTPException(status_code=400, detail="Nama tidak boleh kosong")

    pengelola.nama = nama_baru
    db.commit()
    db.refresh(pengelola)
    return pengelola


# ==================== KELOLA USER/CLIENT (superadmin) ====================

@app.get("/api/superadmin/users", response_model=list[schemas.UserAdminOut])
def list_users(
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_superadmin),
):
    query = db.query(models.User).filter(models.User.role == "client")
    if q:
        like = f"%{q.strip()}%"
        query = query.filter((models.User.nama.like(like)) | (models.User.email.like(like)))
    return query.order_by(models.User.id.desc()).limit(100).all()


@app.put("/api/superadmin/users/{user_id}", response_model=schemas.UserAdminOut)
def update_user_admin(
    user_id: int,
    data: schemas.UserAdminUpdateInput,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_superadmin),
):
    target = db.query(models.User).filter(
        models.User.id == user_id, models.User.role == "client"
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    if data.nama is not None:
        nama = data.nama.strip()
        if not nama:
            raise HTTPException(status_code=400, detail="Nama tidak boleh kosong")
        target.nama = nama
    if data.is_verified is not None:
        target.is_verified = data.is_verified
        if data.is_verified:
            target.otp_code = None
            target.otp_expiry = None
            target.otp_attempts = 0
    if data.is_active is not None:
        target.is_active = data.is_active
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Gagal update user %s", user_id)
        raise HTTPException(status_code=500, detail="Gagal menyimpan user.")
    db.refresh(target)
    return target


@app.post("/api/superadmin/users/{user_id}/reset-password")
def reset_password_admin(
    user_id: int,
    data: schemas.UserAdminResetPasswordInput,
    db: Session = Depends(get_db),
    aktor: models.User = Depends(auth.require_superadmin),
):
    target = db.query(models.User).filter(
        models.User.id == user_id, models.User.role == "client"
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    target.password_hash = auth.hash_password(data.password_baru)
    try:
        catat_audit(db, aktor, "reset_password", f"#{user_id} {target.email}")
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Gagal reset password user %s", user_id)
        raise HTTPException(status_code=500, detail="Gagal reset password.")
    return {"message": f"Password {target.email} berhasil direset."}


@app.delete("/api/superadmin/users/{user_id}")
def hapus_user_admin(
    user_id: int,
    db: Session = Depends(get_db),
    aktor: models.User = Depends(auth.require_sesi_aksi_aktif),
):
    from sqlalchemy.exc import SQLAlchemyError

    target = db.query(models.User).filter(
        models.User.id == user_id, models.User.role == "client"
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    email = target.email
    try:
        catat_audit(db, aktor, "hapus_user", f"#{user_id} {email}")
        db.delete(target)  # pesanan ikut terhapus via cascade
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Gagal hapus user %s", user_id)
        raise HTTPException(status_code=500, detail="Gagal menghapus user.")
    return {"message": f"User {email} + riwayat pesanannya dihapus."}


# ==================== AUDIT LOG (read-only superadmin) ====================

@app.get("/api/superadmin/audit-log", response_model=list[schemas.AuditLogOut])
def list_audit_log(
    aksi: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_superadmin),
):
    q = db.query(models.AuditLog)
    if aksi:
        q = q.filter(models.AuditLog.aksi == aksi)
    return q.order_by(models.AuditLog.id.desc()).limit(limit).all()


# ==================== PENGUMUMAN / BROADCAST ====================

@app.get("/api/pengumuman/aktif", response_model=Optional[schemas.PengumumanOut])
def get_pengumuman_aktif(db: Session = Depends(get_db)):
    return (
        db.query(models.Pengumuman)
        .filter(models.Pengumuman.aktif == True)  # noqa: E712
        .order_by(models.Pengumuman.id.desc())
        .first()
    )


@app.get("/api/superadmin/pengumuman", response_model=list[schemas.PengumumanOut])
def list_pengumuman(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_superadmin),
):
    return db.query(models.Pengumuman).order_by(models.Pengumuman.id.desc()).limit(50).all()


@app.post("/api/superadmin/pengumuman", response_model=schemas.PengumumanOut)
def buat_pengumuman(
    data: schemas.PengumumanInput,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_superadmin),
):
    if data.aktif:
        db.query(models.Pengumuman).update({"aktif": False})
    item = models.Pengumuman(
        judul=data.judul.strip(),
        isi=data.isi.strip(),
        aktif=data.aktif,
        dibuat_oleh_id=user.id,
    )
    db.add(item)
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Gagal buat pengumuman")
        raise HTTPException(status_code=500, detail="Gagal menyimpan pengumuman.")
    db.refresh(item)
    return item


@app.put("/api/superadmin/pengumuman/{pengumuman_id}", response_model=schemas.PengumumanOut)
def ubah_pengumuman(
    pengumuman_id: int,
    data: schemas.PengumumanInput,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_superadmin),
):
    item = db.query(models.Pengumuman).filter(models.Pengumuman.id == pengumuman_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Pengumuman tidak ditemukan")
    if data.aktif:
        db.query(models.Pengumuman).filter(models.Pengumuman.id != pengumuman_id).update({"aktif": False})
    item.judul = data.judul.strip()
    item.isi = data.isi.strip()
    item.aktif = data.aktif
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Gagal update pengumuman %s", pengumuman_id)
        raise HTTPException(status_code=500, detail="Gagal menyimpan pengumuman.")
    db.refresh(item)
    return item


@app.delete("/api/superadmin/pengumuman/{pengumuman_id}")
def hapus_pengumuman(
    pengumuman_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_superadmin),
):
    item = db.query(models.Pengumuman).filter(models.Pengumuman.id == pengumuman_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Pengumuman tidak ditemukan")
    db.delete(item)
    db.commit()
    return {"message": "Pengumuman dihapus."}


# ==================== TRANSFER OWNERSHIP ====================

@app.post("/api/superadmin/transfer/mulai")
async def transfer_mulai(
    data: schemas.TransferMulaiInput,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_sesi_aksi_aktif),
):
    if data.email_baru == user.email:
        raise HTTPException(status_code=400, detail="Email baru tidak boleh sama dengan email superadmin sekarang")

    kode_otp = buat_kode_otp()
    transfer = models.TransferOwnership(
        superadmin_lama_id=user.id,
        email_baru=data.email_baru,
        otp_lama=kode_otp,
        otp_lama_expiry=utc_now() + timedelta(minutes=5),
        status="menunggu_konfirmasi_lama",
        otp_attempts=0,
    )
    db.add(transfer)
    db.commit()

    terkirim = await kirim_otp_email(user.email, kode_otp, tujuan="reset")
    if not terkirim:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gagal mengirim email konfirmasi. Coba lagi sebentar lagi.",
        )
    return {"message": "Kode konfirmasi tahap 1 sudah dikirim ke email superadmin saat ini.", "transfer_id": transfer.id}


@app.post("/api/superadmin/transfer/{transfer_id}/konfirmasi-lama")
async def transfer_konfirmasi_lama(
    transfer_id: int,
    data: schemas.TransferKonfirmasiLamaInput,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_superadmin),
):
    transfer = db.query(models.TransferOwnership).filter(
        models.TransferOwnership.id == transfer_id,
        models.TransferOwnership.superadmin_lama_id == user.id,
    ).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Permintaan transfer tidak ditemukan")
    if transfer.status != "menunggu_konfirmasi_lama":
        raise HTTPException(status_code=400, detail="Transfer ini sudah tidak dalam tahap konfirmasi pertama")
    if transfer.otp_lama != data.kode:
        transfer.otp_attempts = (transfer.otp_attempts or 0) + 1
        if transfer.otp_attempts >= MAKS_PERCOBAAN_OTP:
            transfer.status = "batal"
            transfer.otp_lama = None
            transfer.otp_lama_expiry = None
        db.commit()
        raise HTTPException(status_code=400, detail="Kode OTP salah")
    if not transfer.otp_lama_expiry or transfer.otp_lama_expiry < utc_now():
        raise HTTPException(status_code=400, detail="Kode OTP sudah kedaluwarsa")

    kode_otp_baru = buat_kode_otp()
    transfer.otp_lama = None
    transfer.otp_baru = kode_otp_baru
    transfer.otp_baru_expiry = utc_now() + timedelta(minutes=5)
    transfer.otp_attempts = 0
    transfer.status = "menunggu_konfirmasi_baru"
    db.commit()

    # Kirim kode OTP + link halaman konfirmasi langsung ke email pemilik baru,
    # jadi superadmin tidak perlu menyalin link dan mengirim manual.
    link_konfirmasi = (
        f"{FRONTEND_URL}/transfer-konfirmasi"
        f"?id={transfer.id}&email={transfer.email_baru}"
    )
    terkirim = await kirim_email_transfer_ownership(
        transfer.email_baru, kode_otp_baru, link_konfirmasi
    )
    if not terkirim:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gagal mengirim email konfirmasi ke pemilik baru. Coba lagi.",
        )
    return {
        "message": f"Kode & link konfirmasi sudah dikirim ke email {transfer.email_baru}.",
        "link_konfirmasi": link_konfirmasi,
    }


@app.post("/api/superadmin/transfer/{transfer_id}/konfirmasi-baru")
@limiter.limit("10/hour")
def transfer_konfirmasi_baru(
    transfer_id: int,
    request: Request,
    data: schemas.TransferKonfirmasiBaruInput,
    db: Session = Depends(get_db),
):
    """Tidak perlu login sebagai siapapun — pemilik baru mengonfirmasi lewat kode di emailnya."""
    transfer = db.query(models.TransferOwnership).filter(models.TransferOwnership.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Permintaan transfer tidak ditemukan")
    if transfer.status != "menunggu_konfirmasi_baru":
        raise HTTPException(status_code=400, detail="Transfer ini belum siap dikonfirmasi pemilik baru")
    if transfer.email_baru != data.email_baru:
        raise HTTPException(status_code=400, detail="Email tidak cocok dengan permintaan transfer ini")
    if transfer.otp_baru != data.kode:
        transfer.otp_attempts = (transfer.otp_attempts or 0) + 1
        if transfer.otp_attempts >= MAKS_PERCOBAAN_OTP:
            transfer.status = "batal"
            transfer.otp_baru = None
            transfer.otp_baru_expiry = None
        db.commit()
        raise HTTPException(status_code=400, detail="Kode OTP salah")
    if not transfer.otp_baru_expiry or transfer.otp_baru_expiry < utc_now():
        raise HTTPException(status_code=400, detail="Kode OTP sudah kedaluwarsa")

    superadmin_lama = db.query(models.User).filter(models.User.id == transfer.superadmin_lama_id).first()
    pemilik_baru = db.query(models.User).filter(models.User.email == transfer.email_baru).first()

    if not pemilik_baru:
        raise HTTPException(
            status_code=400,
            detail="Email baru belum terdaftar sebagai akun. Daftar dan verifikasi akun itu dulu sebelum transfer ownership.",
        )
    if not superadmin_lama:
        raise HTTPException(status_code=404, detail="Akun superadmin lama tidak ditemukan.")

    pemilik_baru.role = "superadmin"
    superadmin_lama.role = "admin"  # turun jadi pengelola biasa, bukan dihapus aksesnya total
    transfer.status = "selesai"
    transfer.otp_baru = None
    transfer.otp_attempts = 0
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Gagal commit transfer ownership %s", transfer_id)
        raise HTTPException(status_code=500, detail="Gagal menyelesaikan transfer ownership.")

    return {"message": f"Ownership berhasil dipindahkan ke {pemilik_baru.email}."}


# ==================== DASHBOARD KEUANGAN ====================

@app.get("/api/superadmin/dashboard", response_model=schemas.DashboardKeuanganOut)
def dashboard_keuangan(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_superadmin),
):
    semua = db.query(models.Pesanan).all()
    lunas = [p for p in semua if p.status_pembayaran == "Lunas"]

    awal_bulan = utc_now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    lunas_bulan_ini = [p for p in lunas if p.dibuat_pada and p.dibuat_pada >= awal_bulan]

    hitung_status = lambda s: sum(1 for p in semua if p.status == s)

    return {
        "total_pendapatan": sum(p.total_harga for p in lunas),
        "pendapatan_bulan_ini": sum(p.total_harga for p in lunas_bulan_ini),
        "jumlah_pesanan": len(semua),
        "jumlah_lunas": len(lunas),
        "jumlah_pending": hitung_status("Pending"),
        "jumlah_diproses": hitung_status("Diproses"),
        "jumlah_dikirim": hitung_status("Dikirim"),
        "jumlah_selesai": hitung_status("Selesai"),
        # "Dibatalkan" = status otomatis dari Midtrans saat bayar gagal/kadaluarsa.
        "jumlah_batal": hitung_status("Batal") + hitung_status("Dibatalkan"),
    }


@app.get("/api/superadmin/dashboard/export-csv")
def export_csv(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_superadmin),
):
    """Export CSV ringan (bisa langsung dibuka di Excel) — tanpa perlu install library tambahan."""
    pesanan_list = (
        db.query(models.Pesanan)
        .options(joinedload(models.Pesanan.user))
        .filter(models.Pesanan.status_pembayaran == "Lunas")
        .order_by(models.Pesanan.dibuat_pada.desc())
        .all()
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Kode Pesanan", "Tanggal", "Pelanggan", "Total Harga", "Status"])
    for p in pesanan_list:
        writer.writerow([
            aman_csv(p.kode_pesanan or p.id),
            p.dibuat_pada.strftime("%Y-%m-%d") if p.dibuat_pada else "",
            aman_csv(p.nama_pelanggan or "-"),
            p.total_harga,
            aman_csv(p.status),
        ])
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=laporan_keuangan.csv"},
    )


@app.get("/")
def root():
    return {"status": "ok", "message": "Backend jalan"}