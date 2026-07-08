/**
 * ==========================================================
 * API.JS — Helper bersama untuk semua halaman statis
 * ==========================================================
 * PENTING: ganti nilai API_URL di bawah dengan URL /exec Apps Script kamu
 * setelah Tahap A selesai di-deploy.
 * ==========================================================
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbyngtoFKpA8-tMkXbXEXlBWmF3tJruQ4WGRu_uL6NG6n87pNP-pN1bOibJtoD_KVoiu/exec';

/* ============================================================
   KOMUNIKASI KE API
   ============================================================ */

/**
 * Panggil aksi yang sifatnya BACA data, lewat GET (aman dari CORS).
 * @param {String} action - nama aksi, contoh: 'getDashboard'
 * @param {Object} params - parameter tambahan, contoh: { produkId: 'xxx' }
 */
async function apiGet(action, params) {
  const query = new URLSearchParams({ action: action, token: getToken(), ...(params || {}) });
  const res = await fetch(API_URL + '?' + query.toString());
  return res.json();
}

/**
 * Panggil aksi yang sifatnya UBAH data (login, daftar, create, delete, dst).
 * WAJIB pakai Content-Type: text/plain supaya tidak kena blokir CORS preflight.
 * @param {String} action
 * @param {Object} params - parameter tambahan (selain action & token)
 */
async function apiPost(action, params) {
  const body = JSON.stringify({ action: action, token: getToken(), ...(params || {}) });
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: body
  });
  return res.json();
}

/* ============================================================
   AUTENTIKASI (token disimpan di localStorage)
   ============================================================ */

function getToken() {
  return localStorage.getItem('member_token') || '';
}

function setToken(token) {
  localStorage.setItem('member_token', token);
}

function clearToken() {
  localStorage.removeItem('member_token');
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem('member_session') || 'null');
  } catch (err) {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem('member_session', JSON.stringify(session));
}

/**
 * Panggil di halaman yang WAJIB login (dashboard, produk, dll).
 * Kalau tidak ada token, langsung lempar ke halaman login.
 */
function requireAuth() {
  if (!getToken()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

/**
 * Panggil di halaman khusus admin (admin.html).
 * Kalau bukan admin, lempar ke dashboard.
 */
function requireAdmin() {
  if (!requireAuth()) return false;
  const session = getSession();
  if (!session || session.role !== 'admin') {
    window.location.href = 'dashboard.html';
    return false;
  }
  return true;
}

async function logout() {
  showLoading('Keluar dari akun...');
  try {
    await apiPost('logout', {});
  } catch (err) {
    // Tetap lanjut logout walau request gagal - yang penting sisi lokal bersih
  }
  clearToken();
  localStorage.removeItem('member_session');
  window.location.href = 'index.html';
}

/* ============================================================
   POPUP LOADING GLOBAL
   ============================================================ */

function ensureLoadingOverlay() {
  if (document.getElementById('globalLoadingOverlay')) return;
  const div = document.createElement('div');
  div.id = 'globalLoadingOverlay';
  div.className = 'loading-overlay';
  div.innerHTML = '<div class="loading-box"><div class="loading-spinner"></div><div class="loading-text" id="globalLoadingText">Memproses...</div></div>';
  document.body.appendChild(div);
}

function showLoading(message) {
  ensureLoadingOverlay();
  document.getElementById('globalLoadingText').textContent = message || 'Memproses...';
  document.getElementById('globalLoadingOverlay').classList.add('show');
}

function hideLoading() {
  const el = document.getElementById('globalLoadingOverlay');
  if (el) el.classList.remove('show');
}

/* ============================================================
   TOAST NOTIFIKASI (dipakai terutama di Admin Panel)
   ============================================================ */

function ensureToast() {
  if (document.getElementById('globalToast')) return;
  const div = document.createElement('div');
  div.id = 'globalToast';
  div.className = 'toast';
  document.body.appendChild(div);
}

function showToast(msg) {
  hideLoading();
  ensureToast();
  const t = document.getElementById('globalToast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 2200);
}

/* ============================================================
   HELPER FORM MESSAGE (dipakai di Login)
   ============================================================ */

function showFormMessage(elId, message, type) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = message;
  el.className = 'form-msg show ' + (type === 'success' ? 'success' : 'error');
}

function hideFormMessage(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = 'form-msg';
}

function setButtonLoading(btnEl, isLoading, loadingText, normalText) {
  if (!btnEl) return;
  if (isLoading && !btnEl.dataset.originalText) {
    btnEl.dataset.originalText = btnEl.textContent;
  }
  btnEl.disabled = isLoading;
  btnEl.textContent = isLoading ? (loadingText || 'Memproses...') : (normalText || btnEl.dataset.originalText || 'Kirim');
}

/* ============================================================
   FAQ ACCORDION & SMOOTH SCROLL (dipakai di Landing)
   ============================================================ */

function initFaqAccordion() {
  document.querySelectorAll('.faq-item').forEach(function (item) {
    const question = item.querySelector('.faq-q');
    if (!question) return;
    question.addEventListener('click', function () {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        openItem.classList.remove('open');
      });
      if (!isOpen) item.classList.add('open');
    });
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId.length < 2) return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initFaqAccordion();
  initSmoothScroll();
  ensureLoadingOverlay();
  ensureToast();
});