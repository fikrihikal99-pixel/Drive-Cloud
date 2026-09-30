# Arsip Sekolah Ciluar 1

Aplikasi penyimpanan dokumen sekolah. File disimpan di Google Drive akun Anda sendiri lewat OAuth; login aplikasi memakai satu akun admin.

> **Catatan:** versi ini memakai OAuth (bukan Service Account), karena Service Account tidak punya kuota penyimpanan sendiri. File akan tersimpan memakai kuota Google Drive akun Google yang Anda pakai saat otorisasi.

## 1. Jalankan di komputer (opsional, untuk uji coba)

```bash
npm install
cp .env.example .env.local
# isi .env.local dengan nilai asli Anda
npm run dev
```

Buka http://localhost:3000

## 2. Unggah ke GitHub

```bash
git init
git add .
git commit -m "Arsip Sekolah Ciluar 1"
```

Buat repository baru di github.com (bisa **Private**), lalu:

```bash
git remote add origin https://github.com/USERNAME/arsip-sekolah.git
git branch -M main
git push -u origin main
```

`.env.local` tidak akan ikut terunggah (sudah ada di `.gitignore`), jadi kunci Anda tetap aman.

## 3. Deploy ke Vercel (gratis)

1. Buka vercel.com, login dengan akun GitHub Anda.
2. Klik **Add New → Project**, pilih repository `arsip-sekolah`.
3. Di bagian **Environment Variables**, isi 4 nilai berikut (jangan diisi di file, isi lewat form Vercel):

   | Nama | Isi |
   |---|---|
   | `ADMIN_PASSWORD` | password login Anda |
   | `DRIVE_FOLDER_ID` | ID folder Drive tujuan (dari URL folder, bagian setelah `/folders/`) |
   | `GOOGLE_CLIENT_ID` | dari OAuth Client ID bertipe **Web application** |
   | `GOOGLE_CLIENT_SECRET` | dari OAuth Client ID yang sama |
   | `GOOGLE_REFRESH_TOKEN` | dari OAuth Playground (lihat bagian "Cara mendapatkan Refresh Token" di bawah) |
   | `SESSION_SECRET` | string acak panjang, bebas |

4. Klik **Deploy**. Tunggu 1–2 menit.
5. Buka URL yang diberikan Vercel (mis. `arsip-sekolah.vercel.app`), login dengan `admin` dan password Anda.

## 4. Cara mendapatkan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan GOOGLE_REFRESH_TOKEN

1. Buka console.cloud.google.com, pilih project Anda.
2. **APIs & Services → OAuth consent screen** → External → isi nama app & email → tambahkan email Anda sebagai Test user.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. **Application type: Web application.**
5. Di **Authorized redirect URIs**, tambahkan: `https://developers.google.com/oauthplayground`
6. Klik **Create**. Salin **Client ID** dan **Client Secret**.
7. Buka developers.google.com/oauthplayground → ikon ⚙ → centang **"Use your own OAuth credentials"** → isi Client ID dan Client Secret dari langkah 6.
8. Di kolom kiri, cari **Drive API v3**, centang scope `https://www.googleapis.com/auth/drive`.
9. Klik **Authorize APIs**, login dengan akun Google yang akan dipakai menyimpan file, klik **Allow**.
10. Klik **Exchange authorization code for tokens**.
11. Salin nilai **Refresh token** yang muncul (diawali `1//`).

Simpan ketiga nilai ini (Client ID, Client Secret, Refresh Token) langsung ke environment variable Vercel — jangan dibagikan ke siapa pun, termasuk lewat chat atau screenshot, karena nilai ini setara dengan akses penuh ke Google Drive Anda.

## 5. Folder tujuan

Karena file kini tersimpan pakai akun Google Anda sendiri (bukan Service Account), folder Drive **tidak perlu dibagikan (share) ke siapa pun** — cukup pastikan folder itu ada di Drive akun yang Anda pakai saat otorisasi di langkah 9 di atas, dan `DRIVE_FOLDER_ID` sesuai dengan ID folder tersebut.

## 5. Update aplikasi nanti

Setiap kali ada perubahan kode (dari Anda atau dari saya), jalankan:

```bash
git add .
git commit -m "perubahan"
git push
```

Vercel otomatis mem-build ulang dan online-kan versi terbaru dalam 1–2 menit.

## Struktur folder

```
pages/
  login.js          -> halaman login
  index.js          -> dashboard utama (daftar file, upload, dst)
  api/login.js       -> proses login
  api/logout.js
  api/drive/list.js    -> daftar file & folder
  api/drive/upload.js  -> upload file
  api/drive/download.js -> unduh/pratinjau file
  api/drive/action.js  -> hapus, ganti nama, buat folder
lib/
  auth.js   -> sesi login (cookie bertanda tangan)
  drive.js  -> koneksi ke Google Drive API
```

## Masalah umum

- **"GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, atau GOOGLE_REFRESH_TOKEN belum diatur"** — cek ketiga environment variable itu sudah terisi di Vercel, lalu **Redeploy**.
- **"invalid_grant" saat memuat file** — Refresh Token sudah tidak berlaku (biasanya karena Client Secret pernah direset, atau akses dicabut di myaccount.google.com/permissions). Ulangi proses di bagian 4 untuk dapat Refresh Token baru.
- **"File not found" saat upload** — pastikan `DRIVE_FOLDER_ID` benar dan folder itu ada di Drive akun yang sama dengan yang dipakai saat otorisasi OAuth.
- **redirect_uri_mismatch di OAuth Playground** — pastikan OAuth Client ID bertipe **Web application** (bukan Desktop app), dan redirect URI persis `https://developers.google.com/oauthplayground`.
- **Ukuran file ditolak** — batas upload saat ini 50 MB per file (bisa diubah di `pages/api/drive/upload.js`, cari `MAX_SIZE`).
