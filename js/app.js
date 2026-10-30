// ── Auth Guard ──
const user = JSON.parse(localStorage.getItem('crimeAppUser'));
if (!user) window.location.href = 'login.html';

// ── Map Init ──
// Try your local tileserver first, fallback to OSM
const localTile = 'https://localhost:8090/styles/basic-preview/{z}/{x}/{y}.png';
const osmTile   = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const map = L.map('map', { zoomControl: true }).setView([14.4426, 79.9865], 12);

const tileLayer = L.tileLayer(localTile, {
  maxZoom: 19,
  attribution: 'Local TileServer'
});

tileLayer.on('tileerror', function() {
  L.tileLayer(osmTile, {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);
});

tileLayer.addTo(map);

// ── State ──
let currentFiltered = [];
let heatLayer       = null;
let markersLayer    = L.layerGroup().addTo(map);
let heatVisible     = true;
let markersVisible  = true;

// ── Populate Subdivision Dropdown ──
const subdivisions = [...new Set(crimeData.map(d => d.subDivision))];
const subSelect    = document.getElementById('subdivisionSelect');
const areaSelect   = document.getElementById('areaSelect');

subdivisions.forEach(sd => {
  const opt = document.createElement('option');
  opt.value = sd;
  opt.textContent = sd;
  subSelect.appendChild(opt);
});

// ── Subdivision Change ──
function onSubdivisionChange() {
  const sd = subSelect.value;
  areaSelect.innerHTML = '<option value="">-- Select Area --</option>';

  if (!sd) {
    renderAll(crimeData);
    return;
  }

  const areas = [...new Set(crimeData.filter(d => d.subDivision === sd).map(d => d.area))];
  areas.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    areaSelect.appendChild(opt);
  });

  applyFilters();
}

// ── Area Change ──
function onAreaChange() {
  applyFilters();
}

// ── Apply All Filters ──
function applyFilters() {
  const sd      = subSelect.value;
  const area    = areaSelect.value;
  const offense = document.getElementById('offenseFilter').value;

  let filtered = crimeData;
  if (sd)      filtered = filtered.filter(d => d.subDivision === sd);
  if (area)    filtered = filtered.filter(d => d.area === area);
  if (offense) filtered = filtered.filter(d => d.offenseType === offense);

  currentFiltered = filtered;
  renderAll(filtered);
  updateStats(filtered, area || sd || 'All Areas');

  // Fly to selected area
  if (filtered.length > 0) {
    const avgLat = filtered.reduce((s, d) => s + d.lat, 0) / filtered.length;
    const avgLng = filtered.reduce((s, d) => s + d.lng, 0) / filtered.length;
    map.flyTo([avgLat, avgLng], area ? 15 : 13, { duration: 1.2 });
  }
}

// ── Render Map ──
function renderAll(data) {
  renderHeatmap(data);
  renderMarkers(data);
}

function renderHeatmap(data) {
  if (heatLayer) map.removeLayer(heatLayer);
  const points = data.map(d => [d.lat, d.lng, 1.0]);
  heatLayer = L.heatLayer(points, {
    radius: 35,
    blur: 20,
    maxZoom: 17,
    gradient: { 0.2: '#00f', 0.4: '#0ff', 0.6: '#0f0', 0.8: '#ff0', 1.0: '#f00' }
  });
  if (heatVisible) heatLayer.addTo(map);
}

function renderMarkers(data) {
  markersLayer.clearLayers();

  const offenseColors = {
    'Theft': '#f59e0b',
    'Chain Snatching': '#ef4444',
    'Fraud': '#8b5cf6',
    'Assault': '#dc2626',
    'Drug Peddling': '#10b981',
    'Robbery': '#f97316',
    'Land Dispute Violence': '#6366f1',
    'default': '#3b82f6'
  };

  data.forEach(d => {
    const color = offenseColors[d.offenseType] || offenseColors['default'];

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:14px; height:14px;
        background:${color};
        border:2px solid white;
        border-radius:50%;
        box-shadow: 0 0 6px ${color};
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const marker = L.marker([d.lat, d.lng], { icon });

    marker.bindPopup(`
      <div class="popup-title">👤 ${d.criminalName}</div>
      <div class="popup-row"><span class="popup-label">Sub Division</span><span class="popup-val">${d.subDivision}</span></div>
      <div class="popup-row"><span class="popup-label">Area</span><span class="popup-val">${d.area}</span></div>
      <div class="popup-row"><span class="popup-label">Offense</span><span class="popup-val"><span class="badge">${d.offenseType}</span></span></div>
      <div class="popup-row"><span class="popup-label">Date</span><span class="popup-val">${d.dateOfOffense}</span></div>
      <div class="popup-row"><span class="popup-label">Phone</span><span class="popup-val">${d.phoneNumber}</span></div>
      <div class="popup-row"><span class="popup-label">Remarks</span><span class="popup-val">${d.remarks}</span></div>
      <div class="popup-row"><span class="popup-label">Details</span><span class="popup-val">${d.otherDetails}</span></div>
    `, { maxWidth: 300 });

    markersLayer.addLayer(marker);
  });

  if (!markersVisible) markersLayer.remove();
  else markersLayer.addTo(map);
}

// ── Stats Panel ──
function updateStats(data, label) {
  const box = document.getElementById('statsBox');
  if (data.length === 0) {
    box.innerHTML = '<p>No records found for selection.</p>';
    return;
  }

  const counts = {};
  data.forEach(d => { counts[d.offenseType] = (counts[d.offenseType] || 0) + 1; });
  const topOffense = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  box.innerHTML = `
    <h4>📊 ${label}</h4>
    <div class="stat-row"><span>Total Records</span><span class="stat-val">${data.length}</span></div>
    <div class="stat-row"><span>Top Offense</span><span class="stat-val">${topOffense[0]}</span></div>
    <div class="stat-row"><span>Top Count</span><span class="stat-val">${topOffense[1]}</span></div>
  `;
}

// ── Layer Toggles ──
function toggleHeatmapLayer() {
  heatVisible = document.getElementById('toggleHeatmap').checked;
  if (!heatLayer) return;
  heatVisible ? heatLayer.addTo(map) : map.removeLayer(heatLayer);
}

function toggleMarkersLayer() {
  markersVisible = document.getElementById('toggleMarkers').checked;
  markersVisible ? markersLayer.addTo(map) : markersLayer.remove();
}

// ── Initial Load ──
renderAll(crimeData);