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


async def kirim_otp_email(email: str, kode: str, tujuan: str) -> bool:
    if tujuan == "daftar":
        judul = "Kode Verifikasi Pendaftaran Akun"
        keterangan = "Kode OTP untuk verifikasi pendaftaran akun kamu adalah:"
    else:
        judul = "Kode Reset Password"
        keterangan = "Kode OTP untuk mengatur ulang password kamu adalah:"

    text_content = f"{judul}\n\n{keterangan} {kode}\n\nKode ini berlaku selama 5 menit. Jangan berikan ke siapa pun!"

    html_content = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>{judul}</h2>
        <p>{keterangan}</p>
        <h1 style="color: #1a202c; letter-spacing: 4px;">{kode}</h1>
        <p>Kode ini berlaku selama 5 menit. Jangan berikan kode ini ke siapa pun!</p>
    </div>
    """

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