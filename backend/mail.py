import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import MAIL_FROM, MAIL_PASSWORD, MAIL_PORT, MAIL_SERVER, MAIL_USERNAME

logger = logging.getLogger(__name__)


async def _kirim_email(email: str, judul: str, text_content: str, html_content: str) -> bool:
    """Helper umum: bangun pesan multipart lalu kirim via SMTP di thread terpisah."""
    message = MIMEMultipart("alternative")
    message["Subject"] = judul
    message["From"] = MAIL_FROM or MAIL_USERNAME
    message["To"] = email

    message.attach(MIMEText(text_content, "plain", "utf-8"))
    message.attach(MIMEText(html_content, "html", "utf-8"))

    def send_email() -> bool:
        try:
            with smtplib.SMTP(MAIL_SERVER, MAIL_PORT, timeout=10) as server:
                server.starttls()
                server.login(MAIL_USERNAME, MAIL_PASSWORD)
                server.sendmail(message["From"], [email], message.as_string())
            return True
        except Exception as e:
            logger.error(f"Gagal mengirim email ke {email}: {e}")
            return False

    return await asyncio.to_thread(send_email)


_TEMPLATE_OTP = {
    "daftar": {
        "judul": "Verifikasi Pendaftaran Akun",
        "headline": "Selesaikan pendaftaran akunmu",
        "deskripsi": "Masukkan kode berikut di halaman verifikasi untuk mengaktifkan akun kamu:",
        "peringatan": "Jika kamu tidak mendaftar akun, abaikan email ini.",
    },
    "reset": {
        "judul": "Reset Password",
        "headline": "Atur ulang password-mu",
        "deskripsi": "Masukkan kode berikut di halaman reset password untuk membuat password baru:",
        "peringatan": "Jika kamu tidak meminta reset password, abaikan email ini dan pastikan akunmu aman.",
    },
    "aksi": {
        "judul": "Verifikasi Aksi Sensitif",
        "headline": "Konfirmasi aksi penting",
        "deskripsi": (
            "Masukkan kode berikut di halaman admin untuk melanjutkan aksi sensitif "
            "(kelola pengelola / pengaturan penting):"
        ),
        "peringatan": "Jangan lanjutkan dan segera ganti password jika kamu tidak meminta kode ini.",
    },
    "transfer_lama": {
        "judul": "Konfirmasi Transfer Kepemilikan (Tahap 1)",
        "headline": "Setujui pelepasan kepemilikan?",
        "deskripsi": (
            "Masukkan kode berikut di halaman transfer untuk menyetujui pelepasan "
            "peran superadmin (tahap 1 dari 2):"
        ),
        "peringatan": "Abaikan email ini dan segera ganti password jika kamu tidak memulai transfer ini.",
    },
}

_TEMPLATE_OTP_NETRAL = {
    "judul": "Kode Verifikasi",
    "headline": "Kode verifikasi kamu",
    "deskripsi": "Masukkan kode berikut di halaman verifikasi:",
    "peringatan": "Jika kamu tidak meminta kode ini, abaikan email ini.",
}


def _bungkus_html_otp(judul: str, headline: str, deskripsi: str, kode: str, peringatan: str) -> str:
    # Inline CSS + layout tabel-sederhana agar rapi di Gmail/Outlook.
    # Tidak ada JS/tombol copy di email (di-strip klien email), jadi kode dibuat
    # mudah diblok sekaligus via user-select:all + instruksi salin manual.
    return f"""
    <div style="background-color:#f1f5f9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <div style="background:#0f172a;color:#ffffff;padding:18px 24px;">
          <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:0.7;">Konveksi Bordir Simple</div>
          <div style="font-size:18px;font-weight:bold;margin-top:4px;">{judul}</div>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#0f172a;">{headline}</p>
          <p style="margin:0 0 16px;font-size:14px;color:#334155;">{deskripsi}</p>
          <div style="background:#f8fafc;border:1px dashed #94a3b8;border-radius:8px;text-align:center;padding:18px 12px;margin:0 0 8px;">
            <div style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:bold;letter-spacing:8px;color:#0f172a;user-select:all;-webkit-user-select:all;-ms-user-select:all;">{kode}</div>
          </div>
          <p style="margin:0 0 16px;font-size:12px;color:#64748b;text-align:center;">Blok kode di atas lalu salin (ketuk-tahan / Ctrl+C).</p>
          <p style="margin:0 0 16px;font-size:13px;color:#334155;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px 12px;">Kode berlaku <strong>5 menit</strong> sejak dikirim.</p>
          <div style="margin:0 0 16px;font-size:13px;color:#7f1d1d;background:#fef2f2;border-left:4px solid #dc2626;border-radius:0 6px 6px 0;padding:10px 12px;">Jangan bagikan kode ini ke siapa pun. {peringatan}</div>
          <p style="margin:0;font-size:12px;color:#94a3b8;">Email otomatis, jangan dibalas.</p>
        </div>
      </div>
    </div>
    """


async def kirim_otp_email(email: str, kode: str, tujuan: str) -> bool:
    tpl = _TEMPLATE_OTP.get(tujuan, _TEMPLATE_OTP_NETRAL)
    judul = tpl["judul"]

    text_content = (
        f"{judul} — Konveksi Bordir Simple\n\n"
        f"{tpl['headline']}\n"
        f"{tpl['deskripsi']} {kode}\n\n"
        "Kode berlaku 5 menit. Jangan berikan ke siapa pun!\n"
        f"{tpl['peringatan']}"
    )

    html_content = _bungkus_html_otp(judul, tpl["headline"], tpl["deskripsi"], kode, tpl["peringatan"])

    return await _kirim_email(email, judul, text_content, html_content)


async def kirim_email_transfer_ownership(email: str, kode: str, link: str) -> bool:
    """Email ke pemilik baru: berisi kode OTP + link halaman konfirmasi sekali klik."""
    judul = "Konfirmasi Transfer Kepemilikan Akun"

    text_content = (
        "Kamu ditunjuk sebagai pemilik (superadmin) baru.\n\n"
        f"Kode OTP: {kode}\n\n"
        f"Buka link berikut untuk menyelesaikan konfirmasi:\n{link}\n\n"
        "Kode & link berlaku 5 menit. Jangan bagikan ke siapa pun!"
    )

    html_content = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>{judul}</h2>
        <p>Kamu ditunjuk sebagai pemilik (superadmin) baru. Masukkan kode OTP berikut di halaman konfirmasi:</p>
        <h1 style="color: #1a202c; letter-spacing: 4px;">{kode}</h1>
        <p style="margin: 24px 0;">
            <a href="{link}" style="background-color: #273d8a; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 2px; font-weight: bold;">
                Buka Halaman Konfirmasi
            </a>
        </p>
        <p>Atau salin link ini ke browser kamu:</p>
        <p style="word-break: break-all; color: #273d8a;">{link}</p>
        <p>Kode &amp; link berlaku 5 menit. Jangan bagikan ke siapa pun!</p>
    </div>
    """

    return await _kirim_email(email, judul, text_content, html_content)