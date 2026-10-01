require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

const { readDb, writeDb } = require('./db');
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---- API ----
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/admin', adminRoutes);

// ---- Frontend statis ----
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---- Seed akun admin default (hanya jika belum ada) ----
function seedAdmin() {
  const db = readDb();
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@flixnets.local').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const exists = db.users.find(u => u.email === adminEmail);
  if (!exists) {
    db.users.push({
      id: crypto.randomUUID(),
      name: 'Admin FlixNets',
      email: adminEmail,
      passwordHash: bcrypt.hashSync(adminPassword, 10),
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    writeDb(db);
    console.log('============================================');
    console.log('Akun admin default dibuat:');
    console.log('  Email      :', adminEmail);
    console.log('  Kata sandi :', adminPassword);
    console.log('SEGERA login dan ganti kata sandi ini.');
    console.log('============================================');
  }
}

seedAdmin();

app.listen(PORT, () => {
  console.log(`FlixNets server berjalan di http://localhost:${PORT}`);
});
