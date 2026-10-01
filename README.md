# FlixNets — Tugas Website Film/Video

Platform streaming sederhana bergaya Netflix untuk tugas sekolah.

## Tema
- Hitam: background utama
- Biru: tombol, navigasi, aksen utama
- Emas: highlight dan aksen premium
- Responsive: HP, tablet, laptop, dan desktop

## Ketentuan tugas
5 genre wajib:
1. Aksi
2. Drama
3. Komedi
4. Horor
5. Sci-Fi

Setiap video yang diunggah admin wajib:
- durasi 60–300 detik (1–5 menit)
- memiliki 2–3 anggota tim
- menggunakan salah satu dari 5 genre di atas

## Menjalankan di Windows
Pastikan Node.js sudah terpasang.

```bash
npm install
npm start
```

Buka `http://localhost:3000`.

## Seeder admin
Tidak ada `php artisan db:seed` karena proyek ini bukan Laravel. Akun admin dibuat otomatis saat server pertama kali berjalan.

Default dari `.env.example`:
- Email: `admin@flixnets.local`
- Password: `admin123`

Salin `.env.example` menjadi `.env` jika ingin mengatur sendiri kredensial admin.

```bash
copy .env.example .env
npm install
npm start
```

Data tersimpan di `data/db.json`. Jika ingin reset database lokal, matikan server lalu hapus `data/db.json`, kemudian jalankan `npm start` lagi.

## Upload video
Login sebagai admin → Panel Admin → isi judul, genre, anggota tim, durasi → pilih video → upload.

## Hosting
Deploy folder proyek ke hosting/server yang mendukung Node.js. Set environment variable `PORT`, `JWT_SECRET`, `ADMIN_EMAIL`, dan `ADMIN_PASSWORD` di server. Pastikan folder `uploads` dan `data` dapat ditulis oleh aplikasi.
