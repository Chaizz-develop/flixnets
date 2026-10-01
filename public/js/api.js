// api.js — pembantu autentikasi & pemanggilan API, dipakai di semua halaman.
const API_BASE = '/api';

const Auth = {
  getToken() {
    return localStorage.getItem('flixnets_token');
  },
  getUser() {
    try { return JSON.parse(localStorage.getItem('flixnets_user')); }
    catch { return null; }
  },
  setSession(token, user) {
    localStorage.setItem('flixnets_token', token);
    localStorage.setItem('flixnets_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('flixnets_token');
    localStorage.removeItem('flixnets_user');
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  isAdmin() {
    const u = this.getUser();
    return !!u && u.role === 'admin';
  },
  logout() {
    this.clearSession();
    window.location.href = 'login.html';
  },
  // Panggil di halaman yang wajib login. adminOnly=true untuk halaman admin.
  guard(adminOnly = false) {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    if (adminOnly && !this.isAdmin()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }
};

async function api(path, options = {}) {
  const token = Auth.getToken();
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (token) headers.Authorization = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
  let data = null;
  try { data = await res.json(); } catch { /* respons tanpa body JSON */ }

  if (res.status === 401) {
    // Sesi tidak valid/kedaluwarsa — kembalikan ke halaman login.
    Auth.clearSession();
    if (!location.pathname.endsWith('login.html')) window.location.href = 'login.html';
  }
  if (!res.ok) throw new Error((data && data.error) || 'Terjadi kesalahan pada server.');
  return data;
}

async function apiUpload(path, formData) {
  const token = Auth.getToken();
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, { method: 'POST', headers, body: formData });
  let data = null;
  try { data = await res.json(); } catch { /* respons tanpa body JSON */ }
  if (!res.ok) throw new Error((data && data.error) || 'Terjadi kesalahan pada server.');
  return data;
}

function streamUrl(videoId) {
  return `${API_BASE}/videos/${videoId}/stream?token=${encodeURIComponent(Auth.getToken() || '')}`;
}

function fmtBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return v.toFixed(v < 10 && i > 0 ? 1 : 0) + ' ' + units[i];
}
