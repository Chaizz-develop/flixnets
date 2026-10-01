const express = require('express');
const { readDb, writeDb } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/users — daftar semua pengguna
router.get('/users', (req, res) => {
  const db = readDb();
  const users = db.users
    .slice()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt }));
  res.json({ users });
});

// PATCH /api/admin/users/:id/role — ubah peran pengguna (user <-> admin)
router.patch('/users/:id/role', (req, res) => {
  const { role } = req.body || {};
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Peran tidak valid. Gunakan "user" atau "admin".' });
  }

  const db = readDb();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

  if (user.id === req.user.id && role !== 'admin') {
    return res.status(400).json({ error: 'Tidak bisa menurunkan peran akun Anda sendiri.' });
  }

  user.role = role;
  writeDb(db);
  res.json({ ok: true });
});

// DELETE /api/admin/users/:id — hapus pengguna
router.delete('/users/:id', (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Tidak bisa menghapus akun Anda sendiri.' });
  }

  const db = readDb();
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

  db.users.splice(idx, 1);
  writeDb(db);
  res.json({ ok: true });
});

module.exports = router;
