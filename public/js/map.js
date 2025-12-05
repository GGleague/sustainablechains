(function(){
  function initMap(containerId) {
    const map = L.map(containerId).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    return { map, layer };
  }

  function refreshMarkers(mapObj, points) {
    if (!mapObj) return;
    mapObj.layer.clearLayers();
    const bounds = [];
    points.forEach(p => {
      if (p.latitude && p.longitude) {
        const color = p.status === 'APPROVED' ? 'green' : p.status === 'REJECTED' ? 'red' : 'orange';
        const marker = L.circleMarker([p.latitude, p.longitude], {
          radius: 8,
          color,
          fillColor: color,
          fillOpacity: 0.8
        });
        marker.bindPopup(`<strong>${p.title || 'Facility'}</strong><br>${p.address || ''}<br>Status: ${p.status}`);
        marker.addTo(mapObj.layer);
        bounds.push([p.latitude, p.longitude]);
      }
    });
    if (bounds.length) {
      mapObj.map.fitBounds(bounds, { padding: [20, 20] });
    }
  }

  window.MapHelpers = { initMap, refreshMarkers };
})();
