// db.js — penyimpanan data sederhana berbasis file JSON.
// Dipakai agar proyek ini bisa langsung dijalankan tanpa perlu memasang
// database eksternal (tidak ada dependensi native yang perlu dikompilasi).

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], videos: [] }, null, 2));
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    // Berkas rusak — mulai ulang dengan data kosong daripada menghentikan server.
    const fresh = { users: [], videos: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(fresh, null, 2));
    return fresh;
  }
}

function writeDb(data) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readDb, writeDb };
