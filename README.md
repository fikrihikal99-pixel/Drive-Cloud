# Arsip Sekolah Ciluar 1

Aplikasi penyimpanan dokumen sekolah. File disimpan di Google Drive lewat Service Account; login memakai satu akun admin.

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
   | `DRIVE_FOLDER_ID` | `1EoDXVUWfwcg9fHR2M2JkS81jAZ_f-nSS` |
   | `GOOGLE_SERVICE_ACCOUNT_JSON` | seluruh isi file kunci JSON, disalin apa adanya |
   | `SESSION_SECRET` | string acak panjang, bebas (mis. hasil dari https://1password.com/password-generator/) |

4. Klik **Deploy**. Tunggu 1–2 menit.
5. Buka URL yang diberikan Vercel (mis. `arsip-sekolah.vercel.app`), login dengan `admin` dan password Anda.

## 4. Pastikan folder Drive sudah dibagikan

Folder Drive `1EoDXVUWfwcg9fHR2M2JkS81jAZ_f-nSS` harus di-share ke email service account sebagai **Editor**:
`drivec1-75@cloud-sdn-ciluar-1.iam.gserviceaccount.com`

Tanpa ini, upload akan gagal dengan error izin ditolak.

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

- **"GOOGLE_SERVICE_ACCOUNT_JSON belum diatur"** — cek environment variable di Vercel sudah terisi dan berisi JSON lengkap (`{...}`).
- **"File not found" / izin ditolak saat upload** — folder Drive belum di-share ke email service account sebagai Editor.
- **Ukuran file ditolak** — batas upload saat ini 50 MB per file (bisa diubah di `pages/api/drive/upload.js`, cari `MAX_SIZE`).
