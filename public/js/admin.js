async function adminFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    if (window.location.pathname !== '/admin-login.html') window.location.href = '/admin-login.html';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed');
  }
  return res.json();
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const formData = Object.fromEntries(new FormData(loginForm).entries());
      const msg = document.getElementById('admin-login-message');
      try {
        await adminFetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        window.location.href = '/admin-dashboard.html';
      } catch (err) {
        msg.textContent = err.message;
      }
    };
    return;
  }

  if (document.getElementById('pending-brands')) {
    loadAdminDashboard();
  }
});

async function loadAdminDashboard() {
  await loadPendingBrands();
  await loadPendingPoints();
  document.getElementById('run-monthly').onclick = async () => {
    const res = await adminFetch('/api/admin/run-monthly-billing', { method: 'POST' });
    document.getElementById('billing-output').textContent = JSON.stringify(res, null, 2);
  };
  document.getElementById('run-annual').onclick = async () => {
    const res = await adminFetch('/api/admin/run-annual-billing', { method: 'POST' });
    document.getElementById('billing-output').textContent = JSON.stringify(res, null, 2);
  };
  document.getElementById('admin-logout').onclick = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin-login.html';
  };
}

async function loadPendingBrands() {
  const container = document.getElementById('pending-brands');
  const brands = await adminFetch('/api/admin/brands/pending');
  if (!brands.length) {
    container.innerHTML = '<p>No pending brands.</p>';
    return;
  }
  container.innerHTML = brands
    .map(
      (b) => `
        <div class="card">
          <strong>${b.name}</strong> (${b.email})<br>Status: ${b.status}
          <div class="btn-row" style="margin-top:8px;">
            <button class="btn" onclick="approveBrand(${b.id})">Approve</button>
            <button class="btn secondary" onclick="rejectBrand(${b.id})">Reject</button>
          </div>
        </div>`
    )
    .join('');
}

async function loadPendingPoints() {
  const container = document.getElementById('pending-points');
  const points = await adminFetch('/api/admin/supply-points/pending');
  if (!points.length) {
    container.innerHTML = '<p>No pending supply points.</p>';
    return;
  }
  container.innerHTML = points
    .map(
      (p) => `
        <div class="card">
          <strong>${p.title || 'Facility'}</strong> — ${p.brand_name}<br>${p.address || ''}<br>${p.ethical_highlight || ''}
          <div class="btn-row" style="margin-top:8px;">
            <button class="btn" onclick="approvePoint(${p.id})">Approve</button>
            <button class="btn secondary" onclick="rejectPoint(${p.id})">Reject</button>
          </div>
        </div>`
    )
    .join('');
}

async function approveBrand(id) {
  await adminFetch(`/api/admin/brands/${id}/approve`, { method: 'POST' });
  loadPendingBrands();
}

async function rejectBrand(id) {
  await adminFetch(`/api/admin/brands/${id}/reject`, { method: 'POST' });
  loadPendingBrands();
}

async function approvePoint(id) {
  await adminFetch(`/api/admin/supply-points/${id}/approve`, { method: 'POST' });
  loadPendingPoints();
}

async function rejectPoint(id) {
  await adminFetch(`/api/admin/supply-points/${id}/reject`, { method: 'POST' });
  loadPendingPoints();
}
