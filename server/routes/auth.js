const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { readDb, writeDb } = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt };
}

// POST /api/auth/register — daftar akun baru (selalu peran "user")
router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nama, email, dan kata sandi wajib diisi.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
  }

  const db = readDb();
  const exists = db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  if (exists) return res.status(409).json({ error: 'Email sudah terdaftar. Silakan masuk.' });

  const user = {
    id: crypto.randomUUID(),
    name: String(name).trim(),
    email: String(email).toLowerCase().trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'user',
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  writeDb(db);

  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
  }

  const db = readDb();
  const user = db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Email atau kata sandi salah.' });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

// GET /api/auth/me — info pengguna yang sedang login
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
