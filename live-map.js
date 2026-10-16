/* CoolRoute: real municipal points over OpenStreetMap tiles.
 * Requires Leaflet 1.9.4, live-map.css, and the Explore screen mount element.
 * Source: Stadt Dortmund Open Data, Opendatasoft Explore API v2.1.
 */
(() => {
  'use strict';

  const API = 'https://open-data.dortmund.de/api/explore/v2.1/catalog/datasets';
  const DATASETS = {
    trees: { id: 'baumkataster', label: 'Trees', color: '#26875b', icon: '🌳' },
    shade: { id: 'fb60-schattenplatze', label: 'Shade', color: '#0e806b', icon: '☂' },
    water: { id: 'trinkwasserbrunnen', label: 'Water', color: '#1988d1', icon: '💧' },
    indoor: { id: 'kuhle-innenraume', label: 'Cool indoors', color: '#7855b4', icon: '⌂' }
  };
  const SMALL = ['shade', 'water', 'indoor'];
  const TREE_MIN_ZOOM = 16;
  const TREE_LIMIT = 1000; // Prevent a dense viewport from overwhelming a phone.
  const PAGE_SIZE = 100; // Opendatasoft's record-query page size.

  let map = null;
  let groups = {};
  let enabled = { trees: true, shade: true, water: true, indoor: true };
  let busy = new Set();
  let errors = new Map();
  let cachedSmall = {};
  let smallControllers = {};
  let treeController = null;
  let treeRequest = 0;
  let treeViewKey = '';
  let truncatedTrees = false;
  let moveTimer = null;
  let detached = false;

  const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

  function valueOrDash(x) {
    return x !== undefined && x !== null && String(x).trim() !== '' ? html(x) : null;
  }

  function row(label, value) {
    const display = valueOrDash(value);
    return display ? `<div class="cr-popup-row"><dt>${html(label)}</dt><dd>${display}</dd></div>` : '';
  }

  function sourceUrl(key) {
    return `https://open-data.dortmund.de/explore/dataset/${DATASETS[key].id}/`;
  }

  function popupContent(key, item) {
    const meta = DATASETS[key];
    let title, details;
    if (key === 'trees') {
      title = item.art_deutsc || item.art_botani || 'Municipal tree';
      details = row('Botanical name', item.art_botani)
        + row('Planting year', item.pflanzjahr)
        + row('Tree age (years)', item.standalter)
        + row('Crown diameter', item.kronendurc)
        + row('District', item.stadtbezbe);
    } else if (key === 'shade') {
      title = item.schattenplatz || item.art || 'Shaded place';
      details = row('Shade availability', item.beschattung_wann)
        + row('Seating', item.sitzmoglichkeit)
        + row('Low-barrier access', item.zugang_barrierearm)
        + row('Green area', item.im_grunen)
        + row('Notes', item.sonstiges)
        + row('District', item.stadtbezirk);
    } else if (key === 'water') {
      title = item.objektname || item.bezeichnung || 'Drinking fountain';
      details = row('Street/location', item.strasse)
        + row('Description', item.i_beschr)
        + row('Additional info', item.i_zusinfo)
        + row('District', item.stadtbezbe);
    } else {
      title = item.innenraum || item.art || 'Cool indoor space';
      details = row('Opening hours', item.offnungszeiten_detail || item.offnungszeiten)
        + row('Air conditioning', item.klimatisiert)
        + row('Drinking water', item.trinkwasser)
        + row('Toilet', item.toilette)
        + row('Low-barrier access', item.zugang_barrierearm)
        + row('Notes', item.sonstiges)
        + row('District', item.stadtbezirk);
    }
    return `<section class="cr-popup-card">
      <div class="cr-popup-type" style="color:${meta.color}">${html(meta.label)}</div>
      <h3>${html(title)}</h3>
      <dl>${details || '<p>No additional details provided.</p>'}</dl>
      <a href="${sourceUrl(key)}" target="_blank" rel="noopener noreferrer">Official Dortmund dataset ↗</a>
    </section>`;
  }

  // Dortmund's API supplies [latitude, longitude] in geo_point_2d.
  function coordinate(item) {
    const p = item.geo_point_2d;
    if (Array.isArray(p) && p.length >= 2) {
      const lat = Number(p[0]), lon = Number(p[1]);
      return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
    }
    if (p && typeof p === 'object') {
      const lat = Number(p.lat), lon = Number(p.lon ?? p.lng);
      return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
    }
    return null;
  }

  function pointsToLayer(key, rows) {
    if (!map) return;
    const group = groups[key];
    group.clearLayers();
    for (const item of rows) {
      const position = coordinate(item);
      if (!position) continue;
      const marker = key === 'trees'
        ? L.circleMarker(position, { radius: 4.5, weight: 1, color: '#ffffff', fillColor: DATASETS[key].color, fillOpacity: .86 })
        : L.marker(position, {
            icon: L.divIcon({
              className: 'cr-pin-wrap',
              html: `<span class="cr-pin" style="--pin-color:${DATASETS[key].color}" aria-hidden="true"><span class="cr-pin-symbol">${DATASETS[key].icon}</span></span>`,
              iconSize: [28, 34], iconAnchor: [14, 30], popupAnchor: [0, -26]
            })
          });
      marker.bindPopup(() => popupContent(key, item), { maxWidth: 285, minWidth: 200, autoPanPadding: [14, 14] });
      group.addLayer(marker);
    }
    refreshStatus();
  }

  function queryUrl(id, offset, where) {
    const url = new URL(`${API}/${id}/records`);
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('offset', String(offset));
    if (where) url.searchParams.set('where', where);
    return url.toString();
  }

  async function fetchAll(key, { where = '', cap = 2500, signal } = {}) {
    const output = [];
    let count = 0;
    do {
      const response = await fetch(queryUrl(DATASETS[key].id, output.length, where), { signal });
      if (!response.ok) throw new Error(`Dortmund API returned HTTP ${response.status}`);
      const data = await response.json();
      const current = Array.isArray(data.results) ? data.results : [];
      count = Number(data.total_count || 0);
      output.push(...current);
      if (!current.length || output.length >= cap) break;
    } while (output.length < count);
    return { rows: output.slice(0, cap), truncated: output.length < count, total: count };
  }

  function refreshButtons() {
    const root = document.getElementById('cr-layer-controls');
    if (!root) return;
    for (const [key, active] of Object.entries(enabled)) {
      const b = root.querySelector(`[data-cr-layer="${key}"]`);
      if (!b) continue;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    }
  }

  function refreshStatus() {
    const el = document.getElementById('cr-map-status');
    if (!el || !map) return;
    const currentBounds = map.getBounds();
    const count = Object.entries(groups).reduce((sum, [key, group]) => {
      if (!enabled[key]) return sum;
      let visible = 0;
      group.eachLayer(layer => {
        if (layer.getLatLng && currentBounds.contains(layer.getLatLng())) visible++;
      });
      return sum + visible;
    }, 0);
    const notice = [];
    if (busy.size) notice.push('Loading data…');
    if (errors.size) notice.push(`Dataset error: ${Array.from(errors.keys()).map(k => DATASETS[k].label).join(', ')}`);
    if (enabled.trees && map.getZoom() < TREE_MIN_ZOOM) notice.push('Zoom to level 16 for trees');
    if (enabled.trees && truncatedTrees) notice.push('Tree results capped; zoom in further');
    el.textContent = `${count.toLocaleString()} points in view${notice.length ? ' · ' + notice.join(' · ') : ''}`;
    el.title = errors.size ? Array.from(errors.values()).join('\n') : '';
  }

  function addSmallLayer(key) {
    if (cachedSmall[key]) {
      pointsToLayer(key, cachedSmall[key]);
      return;
    }
    smallControllers[key]?.abort();
    const ctl = new AbortController();
    smallControllers[key] = ctl;
    busy.add(key);
    errors.delete(key);
    refreshStatus();
    fetchAll(key, { signal: ctl.signal })
      .then(({ rows }) => {
        if (detached || ctl.signal.aborted) return;
        cachedSmall[key] = rows;
        pointsToLayer(key, rows);
      })
      .catch(err => {
        if (err.name !== 'AbortError' && !detached) errors.set(key, err.message);
      })
      .finally(() => {
        if (smallControllers[key] === ctl) {
          busy.delete(key);
          delete smallControllers[key];
        }
        refreshStatus();
      });
  }

  function updateTrees() {
    if (!map) return;
    if (!enabled.trees || map.getZoom() < TREE_MIN_ZOOM) {
      if (treeController) treeController.abort();
      treeController = null;
      groups.trees.clearLayers();
      treeViewKey = '';
      truncatedTrees = false;
      busy.delete('trees');
      refreshStatus();
      return;
    }
    const b = map.getBounds();
    const rounded = n => n.toFixed(6);
    const bbox = [rounded(b.getSouth()), rounded(b.getWest()), rounded(b.getNorth()), rounded(b.getEast())];
    const key = bbox.join(',');
    if (treeViewKey === key) { refreshStatus(); return; }
    if (treeController) treeController.abort();
    treeController = null;
    treeViewKey = key;
    groups.trees.clearLayers();
    truncatedTrees = false;
    const ctl = new AbortController();
    treeController = ctl;
    const request = ++treeRequest;
    busy.add('trees');
    errors.delete('trees');
    refreshStatus();
    const where = `in_bbox(geo_point_2d, ${bbox.join(', ')})`;
    fetchAll('trees', { where, cap: TREE_LIMIT, signal: ctl.signal })
      .then(({ rows, truncated }) => {
        if (detached || ctl.signal.aborted || request !== treeRequest) return;
        truncatedTrees = truncated;
        pointsToLayer('trees', rows);
      })
      .catch(err => {
        if (err.name !== 'AbortError' && !detached && request === treeRequest) {
          treeViewKey = ''; // A subsequent pan/zoom can retry.
          errors.set('trees', err.message);
        }
      })
      .finally(() => {
        if (request === treeRequest) {
          busy.delete('trees');
          if (treeController === ctl) treeController = null;
        }
        refreshStatus();
      });
  }

  function toggleLayer(key) {
    if (!map || !(key in enabled)) return;
    enabled[key] = !enabled[key];
    if (enabled[key]) {
      groups[key].addTo(map);
      if (key === 'trees') updateTrees();
      else if (!cachedSmall[key]) addSmallLayer(key);
    } else {
      map.removeLayer(groups[key]);
      if (key === 'trees') updateTrees();
    }
    refreshButtons();
    refreshStatus();
  }

  function mount() {
    const node = document.getElementById('cr-live-map');
    if (!node || map) return;
    detached = false;
    errors.clear();
    busy.clear();
    truncatedTrees = false;
    treeViewKey = '';
    if (!window.L) {
      node.innerHTML = '<p class="cr-map-error">Leaflet did not load. Check your internet connection.</p>';
      return;
    }
    map = L.map(node, { zoomControl: false, preferCanvas: true, minZoom: 10, maxZoom: 19 })
      .setView([51.5136, 7.4653], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    groups = Object.fromEntries(Object.keys(DATASETS).map(k => [k, L.layerGroup()]));
    for (const [key, group] of Object.entries(groups)) {
      if (enabled[key]) group.addTo(map);
    }
    const controls = document.getElementById('cr-layer-controls');
    if (controls) {
      controls.addEventListener('click', event => {
        const button = event.target.closest('[data-cr-layer]');
        if (button) toggleLayer(button.dataset.crLayer);
      });
    }
    refreshButtons();
    for (const key of SMALL) if (enabled[key]) addSmallLayer(key);
    map.on('moveend', () => {
      if (moveTimer) clearTimeout(moveTimer);
      moveTimer = setTimeout(() => { if (map) updateTrees(); }, 180);
      refreshStatus();
    });
    updateTrees();
    requestAnimationFrame(() => map?.invalidateSize());
  }

  function unmount() {
    detached = true;
    if (moveTimer) clearTimeout(moveTimer);
    moveTimer = null;
    if (treeController) treeController.abort();
    treeController = null;
    for (const ctl of Object.values(smallControllers)) ctl.abort();
    smallControllers = {};
    treeRequest++;
    treeViewKey = '';
    busy.clear();
    errors.clear();
    if (map) map.remove();
    map = null;
    groups = {};
  }

  window.CoolRouteMap = { mount, unmount };
})();
