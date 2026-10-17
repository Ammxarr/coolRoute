/* CoolRoute: UI-only route copy cleanup.
   Keeps route calculations, diagnostics, sources and settings untouched.
   Removes redundant route-page explanatory copy after each screen render. */
(() => {
  'use strict';
  const patterns = [
    /dog\s*\/\s*kid suitability|mit hund oder kindern|keine verifizierte wegeeignung/i,
    /pedestrian route by valhalla|fußweg:\s*valhalla|fussweg:\s*valhalla|fußweg.*openstreetmap/i,
    /experimental model(?:ed)? exposure|experimentelle modellwerte|keine gemessenen mrt/i,
    /accessibility and dog\s*\/\s*kid|not verified by the current router|nicht auf barrierefreiheit geprüft/i,
    /each card represents a different|jede karte zeigt einen eigenen/i,
    /after sunset there is no direct|nach sonnenuntergang keine direkte/i,
    /shade can change over the day|schatten kann sich im tagesverlauf/i,
    /counts are visible dataset matches|not exhaustive inventories/i,
    /set preferences before finding a route|wünsche vor der routensuche auswählen|sag uns, was dir wichtig ist/i,
    /restricted.access routes cannot yet be certified|barrierefreiheit wird noch nicht geprüft|noch nicht alle hindernisse/i,
    /preferences only:|nur wünsche:|nicht geprüft|nicht verifiziert/i,
    /no recent air temperature.*mrt unavailable|keine aktuellen temperaturdaten.*mrt nicht verfügbar/i,
    /route preference is only compared among available candidates|nur verfügbare routen werden verglichen/i,
    /die hitze ist nur geschätzt\. bitte prüfe deinen weg vor ort/i
  ];

  // This applies only to the routing and pre-navigation panels, never Profile/Data & Sources.
  const copySelector = [
    '.crr-page p.crr-mini',
    '.crr-page p.crr-note',
    '.crr-page .crr-nav-sheet small',
    '.crr-page .crp-route-needs p',
    '.crr-page .crp-before-nav small',
    '.crr-page .crr-panel p',
    '.crr-page .crr-sheet p'
  ].join(',');

  function clean() {
    const app = document.querySelector('#app');
    if (!app) return;
    app.querySelectorAll('.crr-page details.crr-warnings, .crr-page details.crr-sources')
      .forEach(el => el.remove());
    app.querySelectorAll(copySelector).forEach(el => {
      // Do not remove route distances, times, or model indicators themselves.
      const copy = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (patterns.some(pattern => pattern.test(copy))) el.remove();
    });
    document.querySelectorAll('.phone-hint').forEach(el => el.remove());
  }

  let pending = false;
  function scheduleClean() {
    if (pending) return;
    pending = true;
    queueMicrotask(() => { pending = false; clean(); });
  }

  function init() {
    const app = document.querySelector('#app');
    if (!app) return;
    clean();
    const observer = new MutationObserver(records => {
      // Leaflet creates hundreds of tiles and marker DOM elements. Ignore those.
      const relevant = records.some(record => {
        if (!record.addedNodes.length) return false;
        const owner = record.target.nodeType === 1 ? record.target : record.target.parentElement;
        if (owner && owner.closest('.leaflet-container, .leaflet-pane')) return false;
        return true;
      });
      if (relevant) scheduleClean();
    });
    observer.observe(app, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
