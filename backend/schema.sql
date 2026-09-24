-- Konveksi Bordir Simple — clean deployment schema (no dummy data)
-- Charset utf8mb4 / collation utf8mb4_unicode_ci for emoji + special chars
-- Engine InnoDB. Apply with: mysql -u root -p konveksi_simple < schema.sql

CREATE DATABASE IF NOT EXISTS `konveksi_simple`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `konveksi_simple`;

CREATE TABLE IF NOT EXISTS `user` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nama` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'client',
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `otp_code` VARCHAR(6) NULL,
  `otp_expiry` DATETIME NULL,
  `otp_aksi` VARCHAR(6) NULL,
  `otp_aksi_expiry` DATETIME NULL,
  `sesi_aksi_valid_hingga` DATETIME NULL,
  `otp_attempts` INT NOT NULL DEFAULT 0,
  `no_telepon` VARCHAR(20) NULL,
  `alamat` VARCHAR(500) NULL,
  `kode_pos` VARCHAR(10) NULL,
  `kota` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_email` (`email`),
  KEY `ix_user_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pesanan` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `teks` VARCHAR(200) NULL,
  `font` VARCHAR(100) NULL,
  `warna` VARCHAR(20) NULL,
  `panjang_cm` DOUBLE NOT NULL,
  `lebar_cm` DOUBLE NOT NULL,
  `gambar_url` VARCHAR(255) NULL,
  `catatan` VARCHAR(500) NULL,
  `kode_pesanan` VARCHAR(30) NULL,
  `harga_bordir` INT NOT NULL DEFAULT 0,
  `total_harga` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(30) NOT NULL DEFAULT 'Pending',
  `status_pembayaran` VARCHAR(20) NOT NULL DEFAULT 'Belum Bayar',
  `metode_pembayaran` VARCHAR(50) NULL,
  `kode_kupon` VARCHAR(30) NULL,
  `diskon` INT NOT NULL DEFAULT 0,
  `midtrans_order_id` VARCHAR(50) NULL,
  `snap_token` VARCHAR(255) NULL,
  `dibuat_pada` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pesanan_kode` (`kode_pesanan`),
  KEY `ix_pesanan_user_id` (`user_id`),
  KEY `ix_pesanan_user_status` (`user_id`, `status`),
  KEY `ix_pesanan_status_bayar` (`status_pembayaran`),
  CONSTRAINT `fk_pesanan_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pesanan_detail` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pesanan_id` INT NOT NULL,
  `ukuran` VARCHAR(5) NOT NULL DEFAULT 'M',
  `jumlah` INT NOT NULL DEFAULT 1,
  `harga_baju` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `ix_detail_pesanan_id` (`pesanan_id`),
  CONSTRAINT `fk_detail_pesanan` FOREIGN KEY (`pesanan_id`) REFERENCES `pesanan` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transfer_ownership` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `superadmin_lama_id` INT NOT NULL,
  `email_baru` VARCHAR(150) NOT NULL,
  `otp_lama` VARCHAR(6) NULL,
  `otp_lama_expiry` DATETIME NULL,
  `otp_baru` VARCHAR(6) NULL,
  `otp_baru_expiry` DATETIME NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'menunggu_konfirmasi_lama',
  `otp_attempts` INT NOT NULL DEFAULT 0,
  `dibuat_pada` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_transfer_lama_id` (`superadmin_lama_id`),
  KEY `ix_transfer_email_status` (`email_baru`, `status`),
  CONSTRAINT `fk_transfer_user` FOREIGN KEY (`superadmin_lama_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pengumuman` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `judul` VARCHAR(150) NOT NULL,
  `isi` VARCHAR(1000) NOT NULL,
  `aktif` TINYINT(1) NOT NULL DEFAULT 1,
  `dibuat_oleh_id` INT NULL,
  `dibuat_pada` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_pengumuman_aktif` (`aktif`),
  CONSTRAINT `fk_pengumuman_user` FOREIGN KEY (`dibuat_oleh_id`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `harga_ukuran` (
  `ukuran` VARCHAR(5) NOT NULL,
  `harga` INT NOT NULL DEFAULT 45000,
  PRIMARY KEY (`ukuran`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `harga_ukuran` (`ukuran`, `harga`) VALUES
  ('S', 35000), ('M', 45000), ('L', 55000),
  ('XL', 65000), ('XXL', 75000), ('XXXL', 85000);

CREATE TABLE IF NOT EXISTS `kupon` (
  `kode` VARCHAR(30) NOT NULL,
  `tipe` VARCHAR(10) NOT NULL DEFAULT 'persen',
  `nilai` INT NOT NULL DEFAULT 0,
  `min_total` INT NOT NULL DEFAULT 0,
  `maks_potongan` INT NULL,
  `expiry` DATETIME NULL,
  `aktif` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`kode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pengaturan` (
  `kunci` VARCHAR(50) NOT NULL,
  `nilai` VARCHAR(2000) NOT NULL DEFAULT '',
  PRIMARY KEY (`kunci`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `aktor_id` INT NULL,
  `aktor_email` VARCHAR(150) NOT NULL DEFAULT '-',
  `aktor_role` VARCHAR(20) NOT NULL DEFAULT '-',
  `aksi` VARCHAR(50) NOT NULL,
  `target` VARCHAR(200) NOT NULL DEFAULT '-',
  `detail` VARCHAR(500) NULL,
  `dibuat_pada` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_audit_aksi` (`aksi`),
  KEY `ix_audit_aksi_waktu` (`aksi`, `dibuat_pada`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`aktor_id`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
