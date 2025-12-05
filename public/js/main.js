document.addEventListener('DOMContentLoaded', () => {
  const brandsList = document.getElementById('brands-list');
  if (brandsList) {
    fetch('/api/public/brands')
      .then((r) => r.json())
      .then((brands) => {
        if (!brands.length) {
          brandsList.innerHTML = '<p>No approved brands yet.</p>';
          return;
        }
        brandsList.innerHTML = brands
          .map((b) => {
            const logo = b.logo_url || 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=400&q=80';
            return `
              <div class="card">
                <div style="display:flex; gap:12px; align-items:center;">
                  <img src="${logo}" alt="${b.name} logo" style="width:60px; height:60px; border-radius:12px; object-fit:cover;">
                  <div>
                    <h4 style="margin:0 0 4px;">${b.name}</h4>
                    <p style="margin:0; color:#6b7280;">${b.description || ''}</p>
                  </div>
                </div>
                <p style="margin-top:10px; color:#4b5563;">${b.story || ''}</p>
                <a class="btn secondary" href="/brand-public.html?id=${b.id}">View brand</a>
              </div>`;
          })
          .join('');
      });
  }

  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = Object.fromEntries(new FormData(regForm).entries());
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const msg = document.getElementById('register-message');
      if (res.ok) {
        msg.textContent = 'Your application is submitted and pending review.';
        regForm.reset();
      } else {
        const data = await res.json();
        msg.textContent = data.error || 'Registration failed';
      }
    });
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = Object.fromEntries(new FormData(loginForm).entries());
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const msg = document.getElementById('login-message');
      if (res.ok) {
        const data = await res.json();
        if (data.pending) {
          document.getElementById('pending-banner').style.display = 'block';
        }
        window.location.href = '/dashboard.html';
      } else {
        const data = await res.json();
        msg.textContent = data.error || 'Login failed';
      }
    });
  }

  const publicMapEl = document.getElementById('public-map');
  if (publicMapEl) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const mapObj = MapHelpers.initMap('public-map');

    // Brand detail map
    if (id) {
      fetch(`/api/public/brands/${id}`)
        .then(async (r) => {
          if (!r.ok) throw new Error('Brand not found');
          return r.json();
        })
        .then((data) => {
          document.getElementById('brand-name').textContent = data.brand.name;
          document.getElementById('brand-description').textContent = data.brand.description || '';
          document.getElementById('brand-story').textContent = data.brand.story || '';
          const logoEl = document.getElementById('brand-logo');
          if (logoEl) logoEl.src = data.brand.logo_url || 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=400&q=80';
          MapHelpers.refreshMarkers(mapObj, data.points);
          if (!data.points.length) {
            document.getElementById('facility-list').innerHTML = '<p>No approved facilities yet.</p>';
          } else {
            document.getElementById('facility-list').innerHTML = data.points
              .map(
                (p) => `<div class="card"><strong>${p.title || 'Facility'}</strong><br>${p.address || ''}<br>${p.ethical_highlight || ''}</div>`
              )
              .join('');
          }
        })
        .catch(() => {
          document.getElementById('brand-info').innerHTML = '<p>Brand not found or not active.</p>';
        });
    } else {
      // Landing map with all approved points
      fetch('/api/public/points')
        .then((r) => r.json())
        .then((points) => {
          const mapped = points.map((p) => ({
            ...p,
            status: 'APPROVED',
            title: `${p.brand_name} — ${p.title || 'Facility'}`,
          }));
          MapHelpers.refreshMarkers(mapObj, mapped);
        });
    }
  }
});
