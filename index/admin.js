'use strict';

const API = '';
const TOKEN_KEY = 'evocore_admin_token';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  token: localStorage.getItem(TOKEN_KEY) || null,
  user: null,
  contacts: [],
  services: [],
  products: [],
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function toast(msg, type = 'success') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `toast toast-${type}`;
  setTimeout(() => el.classList.add('hidden'), 3000);
}

async function api(path, opts = {}) {
  const headers = opts.headers || {};
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  if (opts.body && !(opts.body instanceof FormData) && typeof opts.body !== 'string') {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(API + path, { ...opts, headers });
  let data;
  try { data = await res.json(); } catch { data = { success: false, message: 'Invalid response.' }; }
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    state.token = null;
    showLogin();
    throw new Error(data.message || 'Unauthorized');
  }
  if (!res.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${res.status}).`);
  }
  return data;
}

function showLogin() {
  $('#loginScreen').classList.remove('hidden');
  $('#dashboard').classList.add('hidden');
}

function showDashboard() {
  $('#loginScreen').classList.add('hidden');
  $('#dashboard').classList.remove('hidden');
  loadAll();
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#loginText').classList.add('hidden');
  $('#loginSpinner').classList.remove('hidden');
  $('#loginError').classList.add('hidden');
  try {
    const username = $('#loginUsername').value.trim();
    const password = $('#loginPassword').value;
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Login failed.');
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem(TOKEN_KEY, data.token);
    $('#currentUser').textContent = data.user.username;
    showDashboard();
  } catch (err) {
    $('#loginError').textContent = err.message;
    $('#loginError').classList.remove('hidden');
  } finally {
    $('#loginText').classList.remove('hidden');
    $('#loginSpinner').classList.add('hidden');
  }
});

$('#logoutBtn').addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  state.token = null;
  state.user = null;
  showLogin();
});

$$('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    $$('.tab').forEach(b => b.classList.toggle('active', b === btn));
    $$('[data-panel]').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== target));
  });
});

async function loadStats() {
  try {
    const { data } = await api('/api/admin/stats');
    $('#statsGrid').innerHTML = `
      <div class="card stat-card"><div class="v gold">${data.contacts_unread}</div><div class="l">Unread messages</div></div>
      <div class="card stat-card"><div class="v">${data.contacts_total}</div><div class="l">Total submissions</div></div>
      <div class="card stat-card"><div class="v">${data.services_total}</div><div class="l">Services</div></div>
      <div class="card stat-card"><div class="v">${data.products_total}</div><div class="l">Products</div></div>
    `;
  } catch (err) { /* handled in api() */ }
}

async function loadContacts() {
  const wrap = $('#contactsTableWrap');
  wrap.innerHTML = '<div class="empty">Loading…</div>';
  try {
    const { data } = await api('/api/contact');
    state.contacts = data;
    if (!data.length) { wrap.innerHTML = '<div class="empty">No submissions yet.</div>'; return; }
    wrap.innerHTML = `
      <table class="table">
        <thead><tr>
          <th>Status</th><th>Name</th><th>Email</th><th>Phone</th>
          <th>Service</th><th>Message</th><th>Received</th><th></th>
        </tr></thead>
        <tbody>
          ${data.map(c => `
            <tr>
              <td><span class="badge ${c.is_read ? 'badge-read' : 'badge-unread'}">${c.is_read ? 'Read' : 'New'}</span></td>
              <td>${esc(c.name)}${c.company ? `<br><span style="color:var(--muted);font-size:.8rem;">${esc(c.company)}</span>` : ''}</td>
              <td><a href="mailto:${esc(c.email)}" class="gold">${esc(c.email)}</a></td>
              <td>${c.phone ? `<a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : '—'}</td>
              <td>${esc(c.service || '—')}${c.budget ? `<br><span style="color:var(--muted);font-size:.8rem;">${esc(c.budget)}</span>` : ''}</td>
              <td style="max-width: 320px; white-space: pre-wrap;">${esc(c.message)}</td>
              <td style="color:var(--muted);font-size:.8rem;">${esc(c.created_at)}</td>
              <td class="whitespace-nowrap">
                <button class="btn btn-ghost btn-sm" data-action="toggle-read" data-id="${c.id}" data-read="${c.is_read}">
                  ${c.is_read ? 'Mark unread' : 'Mark read'}
                </button>
                <button class="btn btn-danger btn-sm" data-action="delete-contact" data-id="${c.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    wrap.innerHTML = `<div class="empty">Failed to load: ${esc(err.message)}</div>`;
  }
}

$('#refreshContacts').addEventListener('click', () => { loadContacts(); loadStats(); });

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  try {
    if (action === 'toggle-read') {
      await api(`/api/contact/${id}`, { method: 'PATCH', body: { is_read: btn.dataset.read === '1' ? 0 : 1 } });
      loadContacts(); loadStats();
    } else if (action === 'delete-contact') {
      if (!confirm('Delete this submission?')) return;
      await api(`/api/contact/${id}`, { method: 'DELETE' });
      toast('Submission deleted.'); loadContacts(); loadStats();
    } else if (action === 'delete-service') {
      if (!confirm('Delete this service?')) return;
      await api(`/api/services/${id}`, { method: 'DELETE' });
      toast('Service deleted.'); loadServices(); loadStats();
    } else if (action === 'delete-product') {
      if (!confirm('Delete this product?')) return;
      await api(`/api/products/${id}`, { method: 'DELETE' });
      toast('Product deleted.'); loadProducts(); loadStats();
    } else if (action === 'edit-service') {
      openServiceModal(state.services.find(s => s.id == id));
    } else if (action === 'edit-product') {
      openProductModal(state.products.find(p => p.id == id));
    }
  } catch (err) {
    toast(err.message, 'error');
  }
});

async function loadServices() {
  const wrap = $('#servicesTableWrap');
  wrap.innerHTML = '<div class="empty">Loading…</div>';
  try {
    const { data } = await api('/api/services/all');
    state.services = data;
    if (!data.length) { wrap.innerHTML = '<div class="empty">No services yet.</div>'; return; }
    wrap.innerHTML = `
      <table class="table">
        <thead><tr><th></th><th>Title</th><th>Slug</th><th>Status</th><th>Order</th><th></th></tr></thead>
        <tbody>
          ${data.map(s => `
            <tr>
              <td>${s.image ? `<img src="${esc(s.image)}" class="thumb" alt="">` : '<div class="thumb"></div>'}</td>
              <td><strong>${esc(s.title)}</strong><br><span style="color:var(--muted);font-size:.8rem;">${esc(s.short_description || '')}</span></td>
              <td style="color:var(--muted);font-family:monospace;">${esc(s.slug)}</td>
              <td><span class="badge ${s.is_published ? 'badge-published' : 'badge-draft'}">${s.is_published ? 'Published' : 'Draft'}</span></td>
              <td>${s.sort_order}</td>
              <td class="whitespace-nowrap">
                <button class="btn btn-ghost btn-sm" data-action="edit-service" data-id="${s.id}">Edit</button>
                <button class="btn btn-danger btn-sm" data-action="delete-service" data-id="${s.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    wrap.innerHTML = `<div class="empty">Failed to load: ${esc(err.message)}</div>`;
  }
}

async function loadProducts() {
  const wrap = $('#productsTableWrap');
  wrap.innerHTML = '<div class="empty">Loading…</div>';
  try {
    const { data } = await api('/api/products/all');
    state.products = data;
    if (!data.length) { wrap.innerHTML = '<div class="empty">No products yet.</div>'; return; }
    wrap.innerHTML = `
      <table class="table">
        <thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Status</th><th>Order</th><th></th></tr></thead>
        <tbody>
          ${data.map(p => `
            <tr>
              <td>${p.image ? `<img src="${esc(p.image)}" class="thumb" alt="">` : '<div class="thumb"></div>'}</td>
              <td><strong>${esc(p.name)}</strong><br><span style="color:var(--muted);font-size:.8rem;">${esc(p.short_description || '')}</span></td>
              <td>${esc(p.category || '—')}</td>
              <td>${esc(p.price || '—')}</td>
              <td><span class="badge ${p.is_published ? 'badge-published' : 'badge-draft'}">${p.is_published ? 'Published' : 'Draft'}</span></td>
              <td>${p.sort_order}</td>
              <td class="whitespace-nowrap">
                <button class="btn btn-ghost btn-sm" data-action="edit-product" data-id="${p.id}">Edit</button>
                <button class="btn btn-danger btn-sm" data-action="delete-product" data-id="${p.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    wrap.innerHTML = `<div class="empty">Failed to load: ${esc(err.message)}</div>`;
  }
}

function openModal(html) {
  const bg = $('#modalBg');
  bg.innerHTML = `<div class="modal">${html}</div>`;
  bg.classList.add('active');
  bg.onclick = (e) => { if (e.target === bg) closeModal(); };
}
function closeModal() {
  const bg = $('#modalBg');
  bg.classList.remove('active');
  bg.innerHTML = '';
}

function openServiceModal(s) {
  const isNew = !s;
  s = s || { features: [], tags: [], is_published: true, sort_order: 0 };
  openModal(`
    <h3 class="text-xl font-bold mb-4">${isNew ? 'New service' : 'Edit service'}</h3>
    <form id="serviceForm" class="space-y-3">
      <div><label class="label">Title *</label><input class="input" name="title" required value="${esc(s.title || '')}"></div>
      <div><label class="label">Slug (auto if blank)</label><input class="input" name="slug" value="${esc(s.slug || '')}"></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label">Icon (Font Awesome)</label><input class="input" name="icon" placeholder="fa-globe" value="${esc(s.icon || '')}"></div>
        <div><label class="label">Sort order</label><input class="input" type="number" name="sort_order" value="${s.sort_order || 0}"></div>
      </div>
      <div><label class="label">Short description</label><input class="input" name="short_description" value="${esc(s.short_description || '')}"></div>
      <div><label class="label">Full description</label><textarea class="textarea" name="description" rows="4">${esc(s.description || '')}</textarea></div>
      <div><label class="label">Features (comma-separated)</label><input class="input" name="features" value="${esc((s.features || []).join(', '))}"></div>
      <div><label class="label">Tags (comma-separated)</label><input class="input" name="tags" value="${esc((s.tags || []).join(', '))}"></div>
      <div><label class="label">Image upload</label><input class="input" type="file" name="image" accept="image/*"></div>
      <div><label class="label">Current image path</label><input class="input" name="image_path" value="${esc(s.image || '')}" placeholder="/images/digital.jpeg or /uploads/..."></div>
      <label class="flex items-center gap-2"><input type="checkbox" name="is_published" ${s.is_published ? 'checked' : ''}> Published</label>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" class="btn btn-ghost" onclick="closeModalGlobal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isNew ? 'Create' : 'Save'}</button>
      </div>
    </form>
  `);
  $('#serviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const features = String(fd.get('features') || '').split(',').map(x => x.trim()).filter(Boolean);
    const tags = String(fd.get('tags') || '').split(',').map(x => x.trim()).filter(Boolean);
    fd.set('features', JSON.stringify(features));
    fd.set('tags', JSON.stringify(tags));
    fd.set('is_published', fd.get('is_published') ? '1' : '0');
    const file = fd.get('image');
    if (!file || !file.size) fd.delete('image');
    const imagePath = fd.get('image_path');
    fd.delete('image_path');
    if (imagePath && (!file || !file.size)) fd.set('image', imagePath);
    try {
      await api(isNew ? '/api/services' : `/api/services/${s.id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: fd,
      });
      toast(isNew ? 'Service created.' : 'Service updated.');
      closeModal(); loadServices(); loadStats();
    } catch (err) { toast(err.message, 'error'); }
  });
}


function openProductModal(p) {
  const isNew = !p;
  p = p || { features: [], is_published: true, sort_order: 0 };
  openModal(`
    <h3 class="text-xl font-bold mb-4">${isNew ? 'New product' : 'Edit product'}</h3>
    <form id="productForm" class="space-y-3">
      <div><label class="label">Name *</label><input class="input" name="name" required value="${esc(p.name || '')}"></div>
      <div><label class="label">Slug (auto if blank)</label><input class="input" name="slug" value="${esc(p.slug || '')}"></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="label">Category</label><input class="input" name="category" value="${esc(p.category || '')}"></div>
        <div><label class="label">Price</label><input class="input" name="price" placeholder="From KES 25,000" value="${esc(p.price || '')}"></div>
      </div>
      <div><label class="label">Short description</label><input class="input" name="short_description" value="${esc(p.short_description || '')}"></div>
      <div><label class="label">Full description</label><textarea class="textarea" name="description" rows="4">${esc(p.description || '')}</textarea></div>
      <div><label class="label">Features (comma-separated)</label><input class="input" name="features" value="${esc((p.features || []).join(', '))}"></div>
      <div><label class="label">Sort order</label><input class="input" type="number" name="sort_order" value="${p.sort_order || 0}"></div>
      <div><label class="label">Image upload</label><input class="input" type="file" name="image" accept="image/*"></div>
      <div><label class="label">Current image path</label><input class="input" name="image_path" value="${esc(p.image || '')}" placeholder="/images/... or /uploads/..."></div>
      <label class="flex items-center gap-2"><input type="checkbox" name="is_published" ${p.is_published ? 'checked' : ''}> Published</label>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" class="btn btn-ghost" onclick="closeModalGlobal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isNew ? 'Create' : 'Save'}</button>
      </div>
    </form>
  `);
  $('#productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const features = String(fd.get('features') || '').split(',').map(x => x.trim()).filter(Boolean);
    fd.set('features', JSON.stringify(features));
    fd.set('is_published', fd.get('is_published') ? '1' : '0');
    const file = fd.get('image');
    if (!file || !file.size) fd.delete('image');
    const imagePath = fd.get('image_path');
    fd.delete('image_path');
    if (imagePath && (!file || !file.size)) fd.set('image', imagePath);
    try {
      await api(isNew ? '/api/products' : `/api/products/${p.id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: fd,
      });
      toast(isNew ? 'Product created.' : 'Product updated.');
      closeModal(); loadProducts(); loadStats();
    } catch (err) { toast(err.message, 'error'); }
  });
}

function openChangePasswordModal() {
  openModal(`
    <h3 class="text-xl font-bold mb-4">Change password</h3>
    <form id="pwForm" class="space-y-3">
      <div><label class="label">Current password</label><input class="input" type="password" name="current_password" required></div>
      <div><label class="label">New password (min 6 chars)</label><input class="input" type="password" name="new_password" minlength="6" required></div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" class="btn btn-ghost" onclick="closeModalGlobal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Update password</button>
      </div>
    </form>
  `);
  $('#pwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/api/admin/change-password', {
        method: 'POST',
        body: { current_password: fd.get('current_password'), new_password: fd.get('new_password') }
      });
      toast('Password updated.'); closeModal();
    } catch (err) { toast(err.message, 'error'); }
  });
}

window.closeModalGlobal = closeModal;

$('#newServiceBtn').addEventListener('click', () => openServiceModal(null));
$('#newProductBtn').addEventListener('click', () => openProductModal(null));
$('#changePwBtn').addEventListener('click', openChangePasswordModal);

function loadAll() {
  loadStats();
  loadContacts();
  loadServices();
  loadProducts();
}

(async function init() {
  if (state.token) {
    try {
      const { user } = await api('/api/admin/me');
      state.user = user;
      $('#currentUser').textContent = user.username || 'admin';
      showDashboard();
      return;
    } catch { /* fall through to login */ }
  }
  showLogin();
})();
