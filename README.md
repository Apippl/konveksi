# Konveksi Bordir Simple

Aplikasi pemesanan bordir custom: client desain (teks/gambar) → admin tentukan harga → bayar via Midtrans → lacak status → konfirmasi terima. Role: client, admin, superadmin.

## Tech Stack
- **Database:** MariaDB / MySQL (`utf8mb4_unicode_ci`), driver PyMySQL, ORM SQLAlchemy 2.0
- **Backend:** FastAPI (Python 3.12) + Uvicorn, JWT (python-jose HS256), Midtrans Snap + Core API, slowapi (rate limiting in-memory), SMTP Gmail (OTP)
- **Frontend:** React 19 + Vite 8 + Tailwind CSS v4, axios, react-router-dom 7, SweetAlert2

## Yang dibutuhkan hoster
| Kebutuhan | Keterangan |
|---|---|
| Python 3.12 + MySQL/MariaDB | Backend |
| Node.js 18+ (hanya untuk build) + static hosting dengan SPA fallback | Frontend |
| Akun Midtrans (Server Key + Client Key) + akun Gmail App Password | Kredensial, lihat `.env` |

## 1. Backend
```bash
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
# source venv/bin/activate                      # Linux
pip install -r requirements.txt
cp .env.example .env   # lalu ISI semua variabel di bawah
```

Isi `.env` (wajib, tanpa ini server menolak start):
```
SECRET_KEY=                         # 32+ karakter acak
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=mysql+pymysql://USER:PASS@HOST:3306/konveksi_simple
MAIL_USERNAME= MAIL_PASSWORD= MAIL_FROM= MAIL_SERVER= MAIL_PORT=
MIDTRANS_SERVER_KEY= MIDTRANS_CLIENT_KEY= MIDTRANS_IS_PRODUCTION=false
FRONTEND_URL=https://domain-frontend
CORS_ORIGINS=https://domain-frontend
ALLOWED_HOSTS=domain-backend        # opsional
```

Database (pilih salah satu):
```bash
mysql -u root -p konveksi_simple < schema.sql   # fresh install
# ATAU biarkan auto-migrate saat server pertama start
```

Buat superadmin pertama (tidak ada register superadmin):
```sql
UPDATE user SET role='superadmin', is_verified=1, is_active=1 WHERE email='kamu@email.com';
```

Jalan:
```bash
# lokal
python -m uvicorn main:app --reload
# produksi (atau pakai Procfile/Dockerfile/docker-compose.yml)
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env   # lalu isi:
```
```
VITE_API_BASE_URL=https://domain-backend   # tanpa trailing slash
VITE_MIDTRANS_SNAP_URL=https://app.midtrans.com/snap/snap.js   # sandbox: app.sandbox.midtrans.com
CSP_ENABLED=true
```
```bash
npm run build     # hasil di dist/
npm run preview   # tes lokal
```
Hosting static **wajib SPA fallback** (semua route → `index.html`), kalau tidak refresh di `/nota/5` akan 404.

## 3. Setelah deploy
1. Daftarkan webhook di dashboard Midtrans: `https://domain-backend/api/midtrans/notifikasi`
2. Login superadmin → Kelola Toko → cek teks landing → Kelola Harga → cek harga → buat 1 order uji → bayar sandbox → cek dashboard + nota.
3. Jangan pernah commit file `.env` (sudah di `.gitignore`).

## Template info hosting
- **Backend:** `https://___ (domain backend diisi hoster)`
- **Dashboard Admin:** `https://___/admin` (akun superadmin dari langkah SQL di atas)
