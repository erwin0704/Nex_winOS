/**
 * ==========================================================
 * API.JS — Helper bersama untuk semua halaman statis
 * ==========================================================
 * Versi perbaikan. Perubahan utama:
 *  - FIX: closeProfilePopup() memakai classList (dulu set inline display:none
 *         yang bikin popup profil TIDAK BISA DIBUKA LAGI selamanya).
 *  - FIX: ICONS.camera dulu tidak ada -> tombol ganti foto tampil "undefined".
 *  - FIX: key 'gift' & 'help' dulu didefinisikan dua kali di objek ICONS.
 *  - BARU: escapeHtml() / escapeAttr() untuk mencegah XSS & HTML rusak
 *          saat nama/judul mengandung karakter < > " '.
 *  - BARU: penanganan respons non-JSON (Apps Script kadang balas halaman HTML error).
 *  - BARU: handleApiError() -> auto-logout kalau sesi kadaluarsa.
 * ==========================================================
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbyngtoFKpA8-tMkXbXEXlBWmF3tJruQ4WGRu_uL6NG6n87pNP-pN1bOibJtoD_KVoiu/exec';

/* ============================================================
   ESCAPING (WAJIB dipakai sebelum menyisipkan data ke HTML)
   ============================================================ */

/** Aman untuk teks di dalam elemen HTML. */
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Aman untuk nilai atribut HTML (href, src, value, data-*). */
function escapeAttr(str) {
  return escapeHtml(str);
}

/** Aman untuk string yang masuk ke dalam onclick="fn('...')". */
function escapeJs(str) {
  return String(str == null ? '' : str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/</g, '\\u003C')
    .replace(/\r?\n/g, ' ');
}

/* ============================================================
   KOMUNIKASI KE API
   ============================================================ */

/** Baca respons dengan aman — Apps Script kadang balas HTML, bukan JSON. */
async function parseApiResponse_(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(
      'Server membalas format yang tidak dikenali (kemungkinan URL /exec salah, ' +
      'deployment belum di-set "Anyone", atau script error).'
    );
  }
}

/**
 * Aksi BACA data lewat GET (aman dari CORS preflight).
 * @param {String} action  contoh: 'getDashboard'
 * @param {Object} params  contoh: { produkId: 'xxx' }
 */
async function apiGet(action, params) {
  const query = new URLSearchParams({ action: action, token: getToken() });
  Object.keys(params || {}).forEach(function (k) {
    const v = params[k];
    if (v !== undefined && v !== null) query.append(k, v); // FIX: jangan kirim "undefined"/"null"
  });
  const res = await fetch(API_URL + '?' + query.toString());
  return parseApiResponse_(res);
}

/**
 * Aksi UBAH data (login, daftar, create, delete, dst).
 * WAJIB Content-Type text/plain supaya tidak kena blokir CORS preflight.
 */
async function apiPost(action, params) {
  const body = JSON.stringify(Object.assign({ action: action, token: getToken() }, params || {}));
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: body
  });
  return parseApiResponse_(res);
}

/**
 * Kalau server bilang sesi tidak valid/kadaluarsa, bersihkan sesi lokal
 * dan lempar ke halaman login. Kembalikan true kalau memang di-handle.
 */
function handleSessionExpired(res) {
  if (!res || res.success) return false;
  const msg = String(res.message || '').toLowerCase();
  if (msg.indexOf('kadaluarsa') !== -1 || msg.indexOf('tidak valid') !== -1 || msg.indexOf('login ulang') !== -1) {
    clearToken();
    localStorage.removeItem('member_session');
    window.location.href = 'login.html';
    return true;
  }
  return false;
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

/** Halaman yang WAJIB login. */
function requireAuth() {
  if (!getToken()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

/**
 * Halaman khusus admin.
 * CATATAN KEAMANAN: ini cuma penjaga TAMPILAN. Validasi admin yang
 * sesungguhnya WAJIB ada di server (Admin.gs), karena localStorage
 * gampang diedit siapa pun lewat DevTools.
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
    // Tetap lanjut logout walau request gagal — yang penting sisi lokal bersih
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
  if (!document.body) return;
  const div = document.createElement('div');
  div.id = 'globalLoadingOverlay';
  div.className = 'loading-overlay';
  div.innerHTML = '<div class="loading-box"><div class="loading-spinner-wrap"><div class="loading-spinner"></div><div class="loading-spinner-inner"></div><div class="loading-dot"></div></div><div class="loading-text" id="globalLoadingText">Memproses...</div></div>';
  document.body.appendChild(div);
}

function showLoading(message) {
  ensureLoadingOverlay();
  const t = document.getElementById('globalLoadingText');
  if (t) t.textContent = message || 'Memproses...';
  const o = document.getElementById('globalLoadingOverlay');
  if (o) o.classList.add('show');
}

function hideLoading() {
  const el = document.getElementById('globalLoadingOverlay');
  if (el) el.classList.remove('show');
}

/* ============================================================
   TOAST NOTIFIKASI
   ============================================================ */

function ensureToast() {
  if (document.getElementById('globalToast')) return;
  if (!document.body) return;
  const div = document.createElement('div');
  div.id = 'globalToast';
  div.className = 'toast';
  document.body.appendChild(div);
}

let _toastTimer = null;
function showToast(msg) {
  hideLoading();
  ensureToast();
  const t = document.getElementById('globalToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer); // FIX: toast beruntun dulu saling potong
  _toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
}

/* ============================================================
   HELPER FORM MESSAGE
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
   FAQ ACCORDION & SMOOTH SCROLL (Landing)
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
   IKON SVG
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
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
  // FIX: 'gift' & 'help' dulu didefinisikan 2x (definisi kedua menimpa yang pertama). Sekarang 1x.
  gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"></rect><path d="M12 8v13"></path><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8"></path><path d="M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8"></path></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 5"></path><path d="M12 17h.01"></path></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path></svg>',
  bookOpen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z"></path></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>',
  fileText: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
  // FIX: dulu ICONS.camera dipakai di mountSidebar tapi TIDAK PERNAH didefinisikan
  //      -> tombol "ganti foto profil" merender teks "undefined".
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>'
};

/* ============================================================
   SIDEBAR (dipakai di dashboard/produk/video/prompt/admin)
   ============================================================ */

function mountSidebar(activeKey) {
  const mountEl = document.getElementById('sidebarMount');
  if (!mountEl) return;

  const session = getSession() || {};
  const isAdmin = session.role === 'admin';
  const collapsed = localStorage.getItem('sidebar_collapsed') === 'true';
  const nama = session.nama || '';

  const items = [
    { key: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: 'home' },
    { key: 'prompt', label: 'Prompt Library', href: 'prompt.html', icon: 'list' }
  ];
  if (isAdmin) items.push({ key: 'admin', label: 'Admin Panel', href: 'admin.html', icon: 'settings' });

  const navHtml = items.map(function (it) {
    return '<a class="sidebar-link ' + (it.key === activeKey ? 'active' : '') + '" href="' + it.href + '">' +
      '<span class="ic">' + ICONS[it.icon] + '</span>' +
      '<span class="label">' + escapeHtml(it.label) + '</span>' +
      '</a>';
  }).join('');

  const avatarHtml = session.avatar
    ? '<img src="' + escapeAttr(session.avatar) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
    : escapeHtml((nama || '?').charAt(0).toUpperCase());

  mountEl.outerHTML =
    '<aside class="sidebar ' + (collapsed ? 'collapsed' : '') + '" id="mainSidebar">' +
    '<div class="sidebar-top">' +
    '<div class="sidebar-brand">Studio Kamu<span style="color:var(--accent)">.</span></div>' +
    '<button class="sidebar-toggle" onclick="toggleSidebar()" aria-label="Sembunyikan/tampilkan menu">' + ICONS.chevronLeft + '</button>' +
    '</div>' +
    '<nav class="sidebar-nav">' + navHtml + '</nav>' +
    '<div class="sidebar-divider"></div>' +
    '<div class="sidebar-user" onclick="toggleProfilePopup(event)" style="cursor:pointer;">' +
    '<div class="avatar" id="sidebarAvatar">' + avatarHtml + '</div>' +
    '<div style="overflow:hidden;">' +
    '<div class="sidebar-user-name">' + escapeHtml(nama) + '</div>' +
    '<div class="sidebar-user-role">' + (isAdmin ? 'Admin' : 'Member') + '</div>' +
    '</div>' +
    '</div>' +
    '</aside>' +

    '<div id="profilePopupOverlay" class="profile-popup-overlay" onclick="if(event.target===this) toggleProfilePopup(event)">' +
    '<div class="profile-popup" onclick="event.stopPropagation()">' +

    '<div class="profile-popup-head">' +
    '<div class="profile-avatar-edit">' +
    '<div class="avatar" id="popupAvatar" style="width:56px;height:56px;font-size:20px;">' + avatarHtml + '</div>' +
    '<label class="avatar-edit-btn" title="Ganti foto profil">' + ICONS.camera +
    '<input type="file" accept="image/*" style="display:none;" onchange="handleAvatarFile(event)">' +
    '</label>' +
    '</div>' +
    '<div><div style="font-weight:700;font-size:15px;">' + escapeHtml(nama) + '</div>' +
    '<div style="font-size:12px;color:var(--ink-soft);">' + escapeHtml(session.email || (isAdmin ? 'Admin' : 'Member')) + '</div></div>' +
    '</div>' +

    '<div class="profile-popup-body">' +

    '<div class="profile-section-label">Nama Tampilan</div>' +
    '<div class="field" style="margin-bottom:10px;"><input type="text" id="profileNamaInput" value="' + escapeAttr(nama) + '"></div>' +
    '<div id="profileMsg" class="form-msg"></div>' +
    '<button class="btn btn-primary btn-sm btn-block" style="margin-bottom:16px;" onclick="saveProfile()">Simpan Nama</button>' +

    '<div class="profile-divider"></div>' +

    '<div class="profile-section-label">Ganti Password</div>' +
    '<div class="field" style="margin-bottom:8px;"><input type="password" id="oldPasswordInput" autocomplete="current-password" placeholder="Password lama"></div>' +
    '<div class="field" style="margin-bottom:10px;"><input type="password" id="newPasswordInput" autocomplete="new-password" placeholder="Password baru (min. 6 karakter)"></div>' +
    '<div id="passwordMsg" class="form-msg"></div>' +
    '<button class="btn btn-outline btn-sm btn-block" style="margin-bottom:16px;" onclick="savePassword()">Simpan Password</button>' +

    '<div class="profile-divider"></div>' +

    '<div class="theme-toggle-row">' +
    '<span class="profile-section-label" style="margin:0;">Tema Tampilan</span>' +
    '<button class="theme-switch" id="themeSwitchBtn" onclick="toggleTheme()" aria-label="Ganti tema gelap/terang"><span class="theme-switch-knob"></span></button>' +
    '</div>' +

    '<div class="profile-divider"></div>' +

    '<button class="logout-link" onclick="logout()">' + ICONS.logout + ' Keluar</button>' +

    '</div>' +
    '</div>' +
    '</div>';

  // FIX: ikon panah collapse dulu tidak sinkron saat halaman baru dibuka.
  const toggleBtn = document.querySelector('#mainSidebar .sidebar-toggle');
  if (toggleBtn) toggleBtn.style.transform = collapsed ? 'rotate(180deg)' : 'rotate(0deg)';

  updateThemeSwitchUI();
}

/* ============================================================
   PROFIL: AVATAR, NAMA, PASSWORD
   ============================================================ */

function handleAvatarFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showFormMessage('profileMsg', 'File harus berupa gambar.', 'error'); return; }

  const reader = new FileReader();
  reader.onload = function (ev) {
    const img = new Image();
    img.onload = function () {
      const size = 96;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2, sy = (img.height - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
      saveAvatar(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = function () { showFormMessage('profileMsg', 'Gambar tidak bisa dibaca.', 'error'); };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = ''; // FIX: supaya file yang sama bisa dipilih ulang
}

async function saveAvatar(dataUrl) {
  showLoading('Menyimpan foto profil...');
  try {
    const res = await apiPost('updateAvatar', { avatarData: dataUrl });
    hideLoading();
    if (handleSessionExpired(res)) return;
    if (!res.success) { showFormMessage('profileMsg', res.message, 'error'); return; }
    const session = getSession() || {};
    session.avatar = dataUrl;
    setSession(session);
    document.querySelectorAll('#sidebarAvatar, #popupAvatar').forEach(function (el) {
      el.innerHTML = '<img src="' + escapeAttr(dataUrl) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    });
    showFormMessage('profileMsg', 'Foto profil berhasil diperbarui.', 'success');
  } catch (err) {
    hideLoading();
    showFormMessage('profileMsg', 'Gagal terhubung ke server: ' + err.message, 'error');
  }
}

async function saveProfile() {
  const nama = document.getElementById('profileNamaInput').value.trim();
  if (!nama) { showFormMessage('profileMsg', 'Nama tidak boleh kosong.', 'error'); return; }
  showLoading('Menyimpan profil...');
  try {
    const res = await apiPost('updateProfile', { nama: nama });
    hideLoading();
    if (handleSessionExpired(res)) return;
    if (!res.success) { showFormMessage('profileMsg', res.message, 'error'); return; }
    const session = getSession() || {};
    session.nama = nama;
    setSession(session);
    showFormMessage('profileMsg', 'Nama berhasil diperbarui.', 'success');
    // FIX: sapaan di dashboard & inisial avatar ikut ter-update, bukan cuma sidebar.
    document.querySelectorAll('.sidebar-user-name').forEach(function (el) { el.textContent = nama; });
    const greet = document.getElementById('greetingNama');
    if (greet) greet.textContent = nama;
    if (!session.avatar) {
      document.querySelectorAll('#sidebarAvatar, #popupAvatar, #greetingAvatar').forEach(function (el) {
        el.textContent = nama.charAt(0).toUpperCase();
      });
    }
  } catch (err) {
    hideLoading();
    showFormMessage('profileMsg', 'Gagal terhubung ke server: ' + err.message, 'error');
  }
}

async function savePassword() {
  const oldPassword = document.getElementById('oldPasswordInput').value;
  const newPassword = document.getElementById('newPasswordInput').value;
  if (!oldPassword || !newPassword) { showFormMessage('passwordMsg', 'Isi password lama dan baru.', 'error'); return; }
  if (newPassword.length < 6) { showFormMessage('passwordMsg', 'Password baru minimal 6 karakter.', 'error'); return; }
  showLoading('Menyimpan password...');
  try {
    const res = await apiPost('changePassword', { oldPassword: oldPassword, newPassword: newPassword });
    hideLoading();
    if (!res.success) { showFormMessage('passwordMsg', res.message, 'error'); return; }
    showFormMessage('passwordMsg', res.message || 'Password berhasil diubah.', 'success');
    document.getElementById('oldPasswordInput').value = '';
    document.getElementById('newPasswordInput').value = '';
  } catch (err) {
    hideLoading();
    showFormMessage('passwordMsg', 'Gagal terhubung ke server: ' + err.message, 'error');
  }
}

/* ============================================================
   TEMA GELAP / TERANG
   ============================================================ */

function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeSwitchUI();
}

function updateThemeSwitchUI() {
  const btn = document.getElementById('themeSwitchBtn');
  if (!btn) return;
  const isDark = (document.documentElement.getAttribute('data-theme') || 'light') === 'dark';
  btn.classList.toggle('on', isDark);
}

initTheme();

/* ============================================================
   POPUP PROFIL & DROPDOWN NOTIFIKASI
   ============================================================ */

function toggleProfilePopup(e) {
  if (e) e.stopPropagation();
  const el = document.getElementById('profilePopupOverlay');
  if (!el) return;
  el.classList.toggle('show');
}

/**
 * FIX PENTING: versi lama memakai `el.style.display = 'none'`.
 * Karena CSS-nya `.profile-popup-overlay.show { display:flex }`,
 * inline style itu MENANG dan popup profil jadi tidak pernah bisa muncul
 * lagi setelah user meng-klik di mana pun sekali saja.
 */
function closeProfilePopup() {
  const el = document.getElementById('profilePopupOverlay');
  if (el) el.classList.remove('show');
}

function toggleSidebar() {
  const el = document.getElementById('mainSidebar');
  if (!el) return;
  const collapsed = el.classList.toggle('collapsed');
  localStorage.setItem('sidebar_collapsed', collapsed);
  const btn = el.querySelector('.sidebar-toggle');
  if (btn) btn.style.transform = collapsed ? 'rotate(180deg)' : 'rotate(0deg)';
}

/** Tutup dropdown/popup saat klik di luar area-nya. */
document.addEventListener('click', function (e) {
  const dd = document.getElementById('notifDropdown');
  if (dd && !e.target.closest('#notifDropdown') && !e.target.closest('#notifBtn') && !e.target.closest('.notif-bell-btn')) {
    dd.classList.remove('show');
    if (dd.style.display === 'block') dd.style.display = 'none';
  }
  if (!e.target.closest('#profilePopupOverlay') && !e.target.closest('.sidebar-user')) {
    closeProfilePopup();
  }
});

/* ============================================================
   PROGRESS RING
   ============================================================ */

function progressRingSVG(percent, size) {
  const isSmall = size === 'small';
  const dim = isSmall ? 44 : 54;
  const r = isSmall ? 18 : 24;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Math.round(percent || 0)));
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
