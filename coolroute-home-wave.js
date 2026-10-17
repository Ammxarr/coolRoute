/* CoolRoute Wave Home — Home presentation only; routing/data/other screens untouched. */
(() => {
  'use strict';
  if (window.CoolRouteWaveHomeInstalled) return;
  if (typeof screenHome !== 'function' || typeof bottom !== 'function' ||
      typeof render !== 'function' || typeof state === 'undefined') {
    console.error('CoolRoute Wave Home: required CoolRoute screen functions not found.');
    return;
  }
  window.CoolRouteWaveHomeInstalled = true;

  const previousHome = screenHome;
  const phrases = {
    en: {
      title: 'Stay cool,', city: 'Dortmund.', route: 'Plan a cool route',
      report: 'Report a problem', impact: 'Your impact', tips: 'Heat tips',
      cool: 'No heat today.\nEnjoy your walk!',
      mild: 'A warmer day.\nTake some water.',
      hot: 'Hot outside.\nTake breaks.',
      unknown: 'Temperature\nunavailable.'
    },
    de: {
      title: 'Bleib cool,', city: 'Dortmund.', route: 'Kühle Route planen',
      report: 'Problem melden', impact: 'Dein Beitrag', tips: 'Hitzetipps',
      cool: 'Heute ist es kühl.\nGuten Spaziergang!',
      mild: 'Heute wird es wärmer.\nNimm Wasser mit.',
      hot: 'Draußen ist es heiß.\nMach Pausen.',
      unknown: 'Temperatur\nnicht verfügbar.'
    },
    simple: {
      title: 'Bleib cool,', city: 'Dortmund.', route: 'Kühlen Weg finden',
      report: 'Problem melden', impact: 'Dein Beitrag', tips: 'Tipps bei Hitze',
      cool: 'Heute ist es kühl.\nViel Spaß draußen!',
      mild: 'Es ist etwas warm.\nTrink genug Wasser.',
      hot: 'Es ist heiß.\nMach Pausen.',
      unknown: 'Wir kennen die\nTemperatur nicht.'
    }
  };
  function language() {
    try { return localStorage.getItem('cr-hack-lang') || 'en'; }
    catch (_) { return 'en'; }
  }
  const html = text => String(text).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function icon(name) {
    const paths = {
      walk: '<circle cx="14" cy="3.6" r="2"/><path d="m10.5 8 4 1.8 3.6 5M12 9 9.3 14.5 5 16m7.1-1.5-1.6 7.8M15 15l4.2 6.5"/>',
      alert: '<path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5m0 3v.2"/>',
      leaf: '<path d="M21 3C11 3 4 7 4 15c0 3 2 6 6 6 7 0 11-9 11-18Z"/><path d="M3 22c4-9 9-13 15-16"/>',
      thermometer: '<path d="M10 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/><path d="M13 10v9"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  }
  function makeHiddenReadingSource() {
    // Preserve the original, live climate component under the new Home layout.
    // Its existing API refresh code still updates .crh-weather, as before.
    try {
      const template = document.createElement('template');
      template.innerHTML = previousHome();
      const source = template.content.querySelector('.crh-weather');
      return source ? `<div class="crh-weather crw-climate-source" hidden aria-hidden="true">${source.innerHTML}</div>` : '';
    } catch (error) {
      console.warn('Wave Home: original temperature unavailable', error);
      return '';
    }
  }
  const actions = [
    ['route','walk','route'],
    ['ideas','alert','report'],
    ['changed','leaf','impact'],
    ['tips','thermometer','tips']
  ];
  screenHome = function () {
    const t = phrases[language()] || phrases.en;
    const source = makeHiddenReadingSource();
    return `<div class="page with-bottom crw-home">
      <main class="crw-scroll">
        <section class="crw-hero" aria-label="Dortmund skyline illustration">
          <div class="crw-hero-image" aria-hidden="true"></div>
          <h1 class="crw-heading"><span>${html(t.title)}</span><span>${html(t.city)}</span></h1>
          <svg class="crw-wave" viewBox="0 0 390 50" preserveAspectRatio="none" aria-hidden="true"><path fill="#ffffff" d="M0 13 C80 -15 136 27 221 40 C296 47 344 -2 390 14 V50 H0Z"/></svg>
        </section>
        <div class="crw-content">
          <section class="crw-weather" aria-label="Dortmund temperature and weather advice">
            <strong class="crw-temp" data-crw-temp>— °C</strong>
            <p class="crw-heat-message" data-crw-advice aria-live="polite">${html(t.unknown)}</p>
          </section>
          <div class="crw-actions" aria-label="Main CoolRoute actions">
            ${actions.map(([screen, symbol, label],i) =>
              `<button type="button" class="crw-action crw-action-${i+1}" data-action="go" data-screen="${screen}">${icon(symbol)}<span>${html(t[label])}</span></button>`).join('')}
          </div>
          ${source}
        </div>
      </main>
      ${bottom('home')}
    </div>`;
  };

  let readingObserver = null;
  function applyReading() {
    const host = document.querySelector('.crw-home');
    if (!host) return;
    const raw = host.querySelector('.crw-climate-source [data-crh-temp]')?.textContent || '';
    const found = raw.match(/-?\d+(?:[.,]\d+)?/);
    const value = found ? Number(found[0].replace(',', '.')) : NaN;
    const t = phrases[language()] || phrases.en;
    const temp = host.querySelector('[data-crw-temp]');
    const advice = host.querySelector('[data-crw-advice]');
    if (!temp || !advice) return;
    // Never fabricate a reading when the real municipal data is missing.
    const formatted = Number.isFinite(value) ? raw.trim() : '— °C';
    const summary = Number.isFinite(value) ?
      value < 24 ? t.cool : value < 29 ? t.mild : t.hot : t.unknown;
    if (temp.textContent !== formatted) temp.textContent = formatted;
    if (advice.textContent !== summary) advice.textContent = summary;
  }
  function afterRender() {
    readingObserver?.disconnect();
    const source = document.querySelector('.crw-home .crw-climate-source');
    if (source) {
      readingObserver = new MutationObserver(applyReading);
      readingObserver.observe(source, {childList:true, characterData:true, subtree:true});
    }
    applyReading();
  }
  const oldRender = render;
  render = function (...args) {
    const result = oldRender(...args);
    afterRender();
    return result;
  };
  if (state.screen === 'home') render();
})();
