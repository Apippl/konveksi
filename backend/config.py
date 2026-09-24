import os
import secrets
import logging
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = secrets.token_urlsafe(48)
    logging.getLogger(__name__).warning(
        "SECRET_KEY belum diset di .env; memakai kunci acak sementara "
        "(semua token akan invalid setiap server restart)."
    )
elif len(SECRET_KEY) < 32 or SECRET_KEY.lower().startswith("change-me"):
    # Kunci pendek/placeholder bisa di-brute force, sehingga penyerang dapat
    # memalsukan JWT dan menjadi user siapa pun. Lebih baik gagal start daripada
    # jalan dengan kunci lemah.
    raise RuntimeError(
        "SECRET_KEY terlalu pendek atau masih placeholder. "
        "Set di .env minimal 32 karakter acak, contoh generate:\n"
        '  python -c "import secrets; print(secrets.token_urlsafe(48))"'
    )
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24)))

MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
MAIL_FROM = os.getenv("MAIL_FROM", MAIL_USERNAME)
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))

MIDTRANS_SERVER_KEY = os.getenv("MIDTRANS_SERVER_KEY", "")
MIDTRANS_CLIENT_KEY = os.getenv("MIDTRANS_CLIENT_KEY", "")
MIDTRANS_IS_PRODUCTION = os.getenv("MIDTRANS_IS_PRODUCTION", "false").lower() in ("true", "1", "t")

# Fail-fast: kalau variabel wajib kosong, lebih baik server gagal start dengan
# pesan jelas daripada jalan lalu error aneh saat kirim email / bayar.
_variabel_wajib = {
    "MAIL_USERNAME": MAIL_USERNAME,
    "MAIL_PASSWORD": MAIL_PASSWORD,
    "MIDTRANS_SERVER_KEY": MIDTRANS_SERVER_KEY,
    "MIDTRANS_CLIENT_KEY": MIDTRANS_CLIENT_KEY,
}
_kosong = [nama for nama, nilai in _variabel_wajib.items() if not nilai]
if _kosong:
    raise RuntimeError(
        "Variabel .env berikut wajib diisi tapi masih kosong: "
        + ", ".join(_kosong)
        + ". Salin dari .env.example lalu isi nilainya."
    )