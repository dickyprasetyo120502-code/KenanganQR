# KenanganQR - Digital Guest Memory & Photo QR

Aplikasi buku kenangan digital dan berbagi foto tamu berbasis QR Code. Menggunakan **React + TypeScript + Vite** pada frontend, **Express.js REST API** pada backend, dan database **PostgreSQL (SQL)** di cloud.

---

## 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Lucide React, QRCode
- **Backend**: Express.js (Node.js REST API), CORS, Dotenv
- **ORM**: Prisma ORM (Type-safe query builder & schema modeling)
- **Database**: PostgreSQL (SQL Relasional dengan Foreign Keys, RLS, & Indexes) via Supabase
- **Storage**: Supabase Storage Bucket (`gallery-media`)

---

## 🚀 Cara Menjalankan Proyek

### 1. Jalankan Frontend & Backend Sekaligus (Rekomendasi)
```bash
npm run dev:all
```
Perintah ini akan menjalankan:
- **Express.js REST API** di `http://localhost:5000`
- **Vite Frontend Dev Server** di `http://localhost:5173` (otomatis mem-proxy request `/api/*` ke Express)

### 2. Atau Jalankan Secara Terpisah:
* **Jalankan Express Backend saja**:
  ```bash
  npm run server
  # atau mode auto-reload saat file diubah:
  npm run dev:server
  ```
* **Jalankan Frontend Vite saja**:
  ```bash
  npm run dev
  ```

### 3. Perintah Prisma ORM:
* **Generate Prisma Client**:
  ```bash
  npm run prisma:generate
  ```
* **Buka Prisma Studio (Web GUI database visual)**:
  ```bash
  npm run prisma:studio
  ```
* **Pull skema dari database**:
  ```bash
  npm run prisma:pull
  ```

---

## 📡 Dokumentasi Endpoint REST API (Express.js)

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Status server Express & cek koneksi ke database PostgreSQL |
| `GET` | `/api/galleries` | Mengambil seluruh daftar galeri beserta foto & ucapan tamu |
| `GET` | `/api/galleries/:id` | Mengambil data 1 galeri berdasarkan ID |
| `POST` | `/api/galleries` | Menyimpan / membuat album galeri baru ke tabel `galleries` |
| `PUT` | `/api/galleries/:id` | Mengupdate pengaturan galeri (izin upload, izin pesan, cover, dll) |
| `DELETE` | `/api/galleries/:id` | Menghapus galeri dan relasi foto/pesannya |
| `POST` | `/api/galleries/:id/photos` | Menambahkan foto kenangan ke tabel `gallery_photos` |
| `DELETE` | `/api/galleries/:id/photos/:photoId` | Menghapus foto dari galeri |
| `POST` | `/api/galleries/:id/messages` | Menambahkan ucapan/doa tamu ke tabel `gallery_messages` |
| `DELETE` | `/api/galleries/:id/messages/:msgId` | Menghapus pesan ucapan |
| `POST` | `/api/upload` | Mengunggah gambar ke Storage Bucket `gallery-media` |

---

## 🗄️ Skema Database SQL (PostgreSQL)
Skrip SQL lengkap tersedia di file [`supabase/schema.sql`](./supabase/schema.sql) yang berisi:
1. **Tabel `galleries`**: Menyimpan data album acara (judul, tanggal, kategori, foto sampul, izin upload/pesan).
2. **Tabel `gallery_photos`**: Menyimpan foto-foto tamu dengan *Foreign Key* `REFERENCES galleries(id) ON DELETE CASCADE`.
3. **Tabel `gallery_messages`**: Menyimpan ucapan tamu dengan *Foreign Key* `REFERENCES galleries(id) ON DELETE CASCADE`.
4. **Tabel `profiles`**: Menyimpan profil penyelenggara acara.
5. **Storage Bucket `gallery-media`**: Penyimpanan publik untuk file foto kenangan.
