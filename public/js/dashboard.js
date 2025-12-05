async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    window.location.href = '/login.html';
    return Promise.reject('Unauthorized');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed');
  }
  return res.json();
}

function statusClass(status) {
  if (status === 'ACTIVE') return 'status-active';
  if (status === 'INACTIVE') return 'status-inactive';
  return 'status-pending';
}

async function loadBrand() {
  const brand = await fetchJson('/api/brand/me');
  const banner = document.getElementById('status-banner');
  banner.className = `status-bar ${statusClass(brand.status)}`;
  banner.textContent = `Status: ${brand.status}`;
  renderProfileForm(brand);
  renderAccountActions(brand.status);
  return brand;
}

function renderProfileForm(brand) {
  const form = document.getElementById('profile-form');
  form.innerHTML = `
    <label>Name</label><input name="name" value="${brand.name || ''}" required>
    <label>Description</label><textarea name="description" rows="3">${brand.description || ''}</textarea>
    <label>Logo URL</label><input name="logo_url" value="${brand.logo_url || ''}">
    <label>Story</label><textarea name="story" rows="3">${brand.story || ''}</textarea>
    <label>Categories (comma separated)</label><input name="categories" value="${brand.categories || ''}">
    <label>Contact Name</label><input name="contact_name" value="${brand.contact_name || ''}">
    <button class="btn" type="submit">Save</button>
  `;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    await fetchJson('/api/brand/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    document.getElementById('status-banner').insertAdjacentText('beforeend', ' • Saved');
  };
}

async function loadPoints(mapObj) {
  const points = await fetchJson('/api/brand/supply-points');
  MapHelpers.refreshMarkers(mapObj, points);
  const list = document.getElementById('points-list');
  if (!points.length) {
    list.innerHTML = '<p>No supply chain points yet.</p>';
  } else {
    list.innerHTML = `<table class="table"><tr><th>Title</th><th>Address</th><th>Status</th></tr>
      ${points
        .map(
          (p) => `<tr><td>${p.title || ''}</td><td>${p.address || ''}</td><td><span class="badge ${p.status === 'APPROVED' ? 'active' : p.status === 'REJECTED' ? 'inactive' : 'pending'}">${p.status}</span></td></tr>`
        )
        .join('')}</table>`;
  }
}

function renderPointForm(mapObj) {
  const form = document.getElementById('point-form');
  form.innerHTML = `
    <label>Title</label><input name="title" required>
    <label>Description</label><textarea name="description" rows="2"></textarea>
    <label>Address</label><input name="address">
    <label>Latitude</label><input name="latitude" type="number" step="0.000001">
    <label>Longitude</label><input name="longitude" type="number" step="0.000001">
    <label>Ethical Highlight</label><input name="ethical_highlight">
    <label>Photo URL</label><input name="photo_url">
    <button class="btn" type="submit">Add Point</button>
  `;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.latitude = data.latitude ? Number(data.latitude) : null;
    data.longitude = data.longitude ? Number(data.longitude) : null;
    await fetchJson('/api/brand/supply-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    form.reset();
    loadPoints(mapObj);
  };
}

async function loadSubscription() {
  const section = document.getElementById('subscription-section');
  const sub = await fetchJson('/api/brand/subscription');
  if (!sub) {
    section.innerHTML = `
      <p>No active subscription.</p>
      <button class="btn" data-plan="MONTHLY">Start Monthly</button>
      <button class="btn secondary" data-plan="ANNUAL">Start Annual</button>
    `;
  } else {
    const renew = sub.renewal_date ? new Date(sub.renewal_date).toLocaleDateString() : '—';
    section.innerHTML = `<p>Plan: <strong>${sub.plan_type}</strong> • Status: ${sub.status} • Renews: ${renew}</p>
      <div class="btn-row" style="margin-top:8px;">
        <button class="btn" id="manage-billing">Manage billing</button>
      </div>`;
  }
  section.querySelectorAll('button[data-plan]').forEach((btn) => {
    btn.onclick = async () => {
      try {
        const data = await fetchJson('/api/brand/checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan_type: btn.dataset.plan }),
        });
        if (data.url) window.location.href = data.url;
      } catch (err) {
        alert(err.message);
      }
    };
  });
  const portalBtn = document.getElementById('manage-billing');
  if (portalBtn) {
    portalBtn.onclick = async () => {
      try {
        const data = await fetchJson('/api/brand/portal-session', { method: 'POST' });
        if (data.url) window.location.href = data.url;
      } catch (err) {
        alert(err.message);
      }
    };
  }
}

async function loadInvoices() {
  const container = document.getElementById('invoice-list');
  const invoices = await fetchJson('/api/brand/invoices');
  if (!invoices.length) {
    container.innerHTML = '<p>No invoices yet.</p>';
    return;
  }
  container.innerHTML = `<table class="table"><tr><th>Amount</th><th>Plan</th><th>Due</th><th>Status</th></tr>
    ${invoices
      .map(
        (inv) => `<tr><td>$${inv.amount.toFixed(2)}</td><td>${inv.plan_type}</td><td>${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : ''}</td><td>${inv.status}</td></tr>`
      )
      .join('')}</table>`;
}

function renderAccountActions(status) {
  const container = document.getElementById('account-actions');
  container.innerHTML = '';
  if (status === 'ACTIVE') {
    const btn = document.createElement('button');
    btn.className = 'btn secondary';
    btn.textContent = 'Deactivate account';
    btn.onclick = async () => {
      await fetchJson('/api/brand/deactivate', { method: 'POST' });
      loadBrand();
    };
    container.appendChild(btn);
  } else if (status === 'INACTIVE') {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = 'Request reactivation';
    btn.onclick = async () => {
      await fetchJson('/api/brand/request-reactivation', { method: 'POST' });
      loadBrand();
    };
    container.appendChild(btn);
  } else {
    container.textContent = 'No account actions available.';
  }
}

async function init() {
  const brand = await loadBrand();
  const mapObj = MapHelpers.initMap('brand-map');
  renderPointForm(mapObj);
  await loadPoints(mapObj);
  await loadSubscription();
  await loadInvoices();
  document.getElementById('logout-btn').onclick = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };
}

document.addEventListener('DOMContentLoaded', init);
