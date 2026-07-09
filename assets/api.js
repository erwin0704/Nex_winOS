/**
 * ==========================================================
 * API.JS — Helper bersama untuk semua halaman statis
 * ==========================================================
 * PENTING: ganti nilai API_URL di bawah dengan URL /exec Apps Script kamu
 * setelah Tahap A selesai di-deploy.
 * ==========================================================
 */

const API_URL = 'GANTI_DENGAN_URL_EXEC_APPS_SCRIPT_KAMU';

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

/* ============================================================
   IKON SVG (pengganti emoji - dipakai di sidebar, dsb)
   ============================================================ */

const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"></path><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"></path></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8l9 5 9-5Z"></path><path d="M3 8v8l9 5 9-5V8"></path><path d="M12 13v8"></path></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.42.68.7 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"></path></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="M16 17l5-5-5-5"></path><path d="M21 12H9"></path></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"></circle><path d="m10.5 12.5 8-8"></path><path d="m17 6 3 3"></path><path d="m14 9 2 2"></path></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>'
};

/* ============================================================
   SIDEBAR (dipakai bersama di dashboard/produk/video/prompt/admin)
   ============================================================ */

/**
 * Render & pasang sidebar ke dalam elemen dengan id="sidebarMount".
 * @param {String} activeKey - salah satu: 'dashboard', 'prompt', 'admin'
 */
function mountSidebar(activeKey) {
  const mountEl = document.getElementById('sidebarMount');
  if (!mountEl) return;

  const session = getSession() || {};
  const isAdmin = session.role === 'admin';
  const collapsed = localStorage.getItem('sidebar_collapsed') === 'true';

  const items = [
    { key: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: 'home' },
    { key: 'produk', label: 'Produk Saya', href: 'dashboard.html#produk-saya', icon: 'box' },
    { key: 'prompt', label: 'Prompt Library', href: 'prompt.html', icon: 'list' },
    { key: 'update', label: 'Update', href: 'dashboard.html#update', icon: 'bell' }
  ];
  if (isAdmin) items.push({ key: 'admin', label: 'Admin Panel', href: 'admin.html', icon: 'settings' });

  const navHtml = items.map(function (it) {
    return '<a class="sidebar-link ' + (it.key === activeKey ? 'active' : '') + '" href="' + it.href + '">' +
      '<span class="ic">' + ICONS[it.icon] + '</span>' +
      '<span class="label">' + it.label + '</span>' +
      '</a>';
  }).join('');

  mountEl.outerHTML =
    '<aside class="sidebar ' + (collapsed ? 'collapsed' : '') + '" id="mainSidebar">' +
    '<div class="sidebar-top">' +
    '<div class="sidebar-brand">Studio Kamu<span style="color:var(--accent)">.</span></div>' +
    '<button class="sidebar-toggle" onclick="toggleSidebar()" aria-label="Sembunyikan/tampilkan menu">' + ICONS.chevronLeft + '</button>' +
    '</div>' +
    '<nav class="sidebar-nav">' + navHtml + '</nav>' +
    '<div class="sidebar-divider"></div>' +
    '<div class="sidebar-user">' +
    '<div class="avatar">' + ((session.nama || '?').charAt(0).toUpperCase()) + '</div>' +
    '<div style="overflow:hidden;">' +
    '<div class="sidebar-user-name">' + (session.nama || '') + '</div>' +
    '<div class="sidebar-user-role">' + (isAdmin ? 'Admin' : 'Member') + '</div>' +
    '</div>' +
    '<button class="logout-btn" onclick="logout()" title="Keluar">' + ICONS.logout + '</button>' +
    '</div>' +
    '</aside>';
}

function toggleSidebar() {
  const el = document.getElementById('mainSidebar');
  if (!el) return;
  const collapsed = el.classList.toggle('collapsed');
  localStorage.setItem('sidebar_collapsed', collapsed);
  // Ikon panah berbalik arah sesuai status collapsed
  const btn = el.querySelector('.sidebar-toggle');
  if (btn) btn.style.transform = collapsed ? 'rotate(180deg)' : 'rotate(0deg)';
}

/* ============================================================
   PROGRESS RING (signature element - dipakai di Dashboard)
   ============================================================ */

/**
 * @param {Number} percent 0-100
 * @param {String} size - 'small' atau '' (ukuran normal)
 */
function progressRingSVG(percent, size) {
  const isSmall = size === 'small';
  const dim = isSmall ? 44 : 54;
  const r = isSmall ? 18 : 24;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent || 0));
  const offset = c - (clamped / 100) * c;
  const mid = dim / 2;

  return (
    '<div class="progress-ring-wrap ' + (isSmall ? 'small' : '') + '">' +
    '<svg viewBox="0 0 ' + dim + ' ' + dim + '">' +
    '<circle class="progress-ring-track" cx="' + mid + '" cy="' + mid + '" r="' + r + '"></circle>' +
    '<circle class="progress-ring-fill" cx="' + mid + '" cy="' + mid + '" r="' + r + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + offset + '"></circle>' +
    '</svg>' +
    '<div class="progress-ring-label">' + clamped + '%</div>' +
    '</div>'
  );
}
