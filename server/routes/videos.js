const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { readDb, writeDb } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

// Sengaja TIDAK ada fileFilter: admin bebas mengunggah video format,
// codec, maupun bahasa (audio/subtitle) apa saja. Batas hanya ukuran berkas.
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 } // maksimum 5 GB per video
});

function toPublicVideo(v) {
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    genre: v.genre,
    teamMembers: v.teamMembers || [],
    duration: v.duration || 0,
    language: v.language,
    rating: v.rating,
    year: v.year,
    uploaderName: v.uploaderName,
    originalName: v.originalName,
    mimetype: v.mimetype,
    size: v.size,
    createdAt: v.createdAt
  };
}

// GET /api/videos — daftar semua video yang sudah diunggah (butuh login)
router.get('/', requireAuth, (req, res) => {
  const db = readDb();
  const videos = db.videos
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(toPublicVideo);
  res.json({ videos });
});

// POST /api/videos — unggah video baru (khusus admin)
// Field form-data: video (file, bebas format), title, description,
// genre, language (bebas, mis. "Indonesia", "Inggris", "Jepang", dll),
// rating, year
router.post('/', requireAuth, requireAdmin, upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File video wajib diunggah.' });

  const { title, description, genre, language, rating, year, teamMembers, duration } = req.body || {};
  if (!title || !String(title).trim()) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Judul video wajib diisi.' });
  }

  let members = [];
  if (Array.isArray(teamMembers)) members = teamMembers;
  else {
    try { members = JSON.parse(String(teamMembers || '[]')); } catch { members = String(teamMembers || '').split(',').map(x => x.trim()).filter(Boolean); }
  }
  members = members.map(x => String(x).trim()).filter(Boolean);
  if (members.length < 2 || members.length > 3) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Setiap video harus memiliki tim 2 sampai 3 orang.' });
  }
  const durationSec = Number(duration);
  if (!Number.isFinite(durationSec) || durationSec < 60 || durationSec > 300) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Durasi video harus antara 1 sampai 5 menit.' });
  }

  const allowedGenres = ['Aksi', 'Drama', 'Komedi', 'Horor', 'Sci-Fi'];
  if (!allowedGenres.includes(String(genre).trim())) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Pilih salah satu dari 5 genre tugas: Aksi, Drama, Komedi, Horor, atau Sci-Fi.' });
  }

  const db = readDb();
  const video = {
    id: crypto.randomUUID(),
    title: String(title).trim(),
    description: description ? String(description).trim() : '',
    genre: String(genre).trim(),
    teamMembers: members,
    duration: durationSec,
    language: language ? String(language).trim() : 'Bebas',
    rating: rating ? String(rating).trim() : 'SU',
    year: year ? Number(year) : new Date().getFullYear(),
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype || 'application/octet-stream',
    size: req.file.size,
    uploaderId: req.user.id,
    uploaderName: req.user.name,
    createdAt: new Date().toISOString()
  };
  db.videos.push(video);
  writeDb(db);

  res.status(201).json({ video: toPublicVideo(video) });
});

// GET /api/videos/:id/stream — streaming video dengan dukungan HTTP Range
// (agar bisa di-seek/maju-mundur seperti pemutar video pada umumnya)
router.get('/:id/stream', requireAuth, (req, res) => {
  const db = readDb();
  const video = db.videos.find(v => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: 'Video tidak ditemukan.' });

  const filePath = path.join(UPLOAD_DIR, video.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Berkas video tidak ditemukan di server.' });
  }

  const stat = fs.statSync(filePath);
  const range = req.headers.range;
  const contentType = video.mimetype || 'video/mp4';

  if (!range) {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  const start = match && match[1] ? parseInt(match[1], 10) : 0;
  const end = match && match[2] ? parseInt(match[2], 10) : stat.size - 1;
  const safeEnd = Math.min(end, stat.size - 1);
  const chunkSize = safeEnd - start + 1;

  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${safeEnd}/${stat.size}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunkSize,
    'Content-Type': contentType
  });
  fs.createReadStream(filePath, { start, end: safeEnd }).pipe(res);
});

// DELETE /api/videos/:id — hapus video (khusus admin)
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const db = readDb();
  const idx = db.videos.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Video tidak ditemukan.' });

  const [video] = db.videos.splice(idx, 1);
  writeDb(db);

  const filePath = path.join(UPLOAD_DIR, video.filename);
  fs.unlink(filePath, () => {}); // biarkan gagal secara diam jika berkas sudah tidak ada

  res.json({ ok: true });
});

module.exports = router;
