const jwt = require('jsonwebtoken');
const { readDb } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'ganti-secret-ini-di-file-.env';

function getTokenFromReq(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  // Elemen <video> / <img> tidak bisa mengirim header kustom, jadi izinkan
  // token dikirim lewat query string untuk endpoint streaming.
  if (req.query && req.query.token) return req.query.token;
  return null;
}

function requireAuth(req, res, next) {
  const token = getTokenFromReq(req);
  if (!token) {
    return res.status(401).json({ error: 'Belum login. Silakan masuk terlebih dahulu.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = readDb();
    const user = db.users.find(u => u.id === payload.id);
    if (!user) return res.status(401).json({ error: 'Sesi tidak valid.' });
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Halaman/aksi ini khusus untuk admin.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, JWT_SECRET };
