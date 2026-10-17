/* CoolRoute Skyline Home — visual presentation layer only.
 * This file deliberately does not alter live-map.js, route calculations,
 * existing environment datasets, profile translations or GPS navigation.
 */
(() => {
  'use strict';
  if (window.CoolRouteSkylineHomeInstalled) return;
  if (typeof screenHome !== 'function' || typeof render !== 'function' ||
      typeof bottom !== 'function' || typeof state === 'undefined' ||
      !document.querySelector('.phone-glass')) {
    console.error('Skyline Home: missing expected CoolRoute app components.');
    return;
  }
  window.CoolRouteSkylineHomeInstalled = true;

  const copy = {
    en: {
      eyebrow: 'COOLROUTE · DORTMUND', title: 'Stay cool,', city: 'Dortmund.',
      desc: 'Discover cooler routes, greener places and ideas for a healthier city.',
      routes: 'Find a route', places: 'Cool places', ideas: 'Suggestions', tips: 'Stay cool tips',
      explore: 'Explore Dortmund', placesText: 'Find real shaded spots, drinking fountains and cool indoor spaces.',
      browse: 'See cool places', cityLabel: 'Dortmund',
      welcome: 'Dortmund is greener on the way.'
    },
    de: {
      eyebrow: 'COOLROUTE · DORTMUND', title: 'Bleib cool,', city: 'Dortmund.',
      desc: 'Entdecke kühlere Wege, mehr Grün und Ideen für ein gesünderes Dortmund.',
      routes: 'Route finden', places: 'Kühle Orte', ideas: 'Vorschläge', tips: 'Hitzetipps',
      explore: 'Dortmund entdecken', placesText: 'Finde echte Schattenplätze, Trinkbrunnen und kühle Innenräume.',
      browse: 'Kühle Orte ansehen', cityLabel: 'Dortmund',
      welcome: 'Dortmund ist grüner unterwegs.'
    },
    simple: {
      eyebrow: 'COOLROUTE · DORTMUND', title: 'Bleib cool,', city: 'Dortmund.',
      desc: 'Finde Wege mit mehr Schatten. Entdecke grüne und kühle Orte.',
      routes: 'Weg finden', places: 'Kühle Orte', ideas: 'Ideen', tips: 'Tipps bei Hitze',
      explore: 'Dortmund entdecken', placesText: 'Hier findest du Schatten, Trinkwasser und kühle Räume.',
      browse: 'Orte ansehen', cityLabel: 'Dortmund',
      welcome: 'Kühl unterwegs in Dortmund.'
    }
  };

  function t() {
    let language = 'en';
    try { language = localStorage.getItem('cr-hack-lang') || (document.documentElement.lang === 'de' ? 'de' : 'en'); }
    catch (_) { language = document.documentElement.lang === 'de' ? 'de' : 'en'; }
    return copy[language] || copy.en;
  }

  const leaf = `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none">
    <path d="M7 31C8 13 27 6 43 5c-2 24-14 39-30 35C9 39 7 35 7 31Z" fill="#06996d"/>
    <path d="M6 44C15 28 27 19 39 12" stroke="#e6fff3" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M19 27 18 16M27 21l8 2" stroke="#e6fff3" stroke-width="1.7" stroke-linecap="round"/>
  </svg>`;

  function svgIcon(name) {
    const symbols = {
      walk: '<path d="m13 4-2 6-4 3m6-9 4 4-1 5-4 2-2 6m4-8 5 6m-13-7 6-1"/><circle cx="14" cy="2.8" r="1.8"/>',
      tree: '<path d="m12 2 7 10h-3l4 5H4l4-5H5zM12 17v5"/>',
      idea: '<path d="M8 15a7 7 0 1 1 8 0l-1 3H9zm1 5h6m-5 3h4"/>',
      temp: '<path d="M10 15V5a3 3 0 0 1 6 0v10a5 5 0 1 1-6 0Z"/><path d="M13 10v10"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 22c0-5 3-8 8-8s8 3 8 8"/>',
      arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
      pin: '<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbols[name] || symbols.arrow}</svg>`;
  }

  // Preserve the live climate widget from the previous UI, including its data refresh.
  const previousHome = screenHome;
  function inheritedWeather() {
    try {
      const template = document.createElement('template');
      template.innerHTML = previousHome();
      const weather = template.content.querySelector('.crh-weather');
      return weather ? weather.outerHTML : '';
    } catch (error) {
      console.warn('Skyline Home: previous weather card unavailable', error);
      return '';
    }
  }

  screenHome = function () {
    const c = t();
    const weather = inheritedWeather();
    const quick = [
      ['route', 'walk', c.routes, 'sky-blue'],
      ['explore', 'tree', c.places, 'sky-green'],
      ['ideas', 'idea', c.ideas, 'sky-amber'],
      ['tips', 'temp', c.tips, 'sky-coral']
    ];
    return `<div class="page with-bottom crs-home">
      <div class="crs-home-scroll">
        <header class="crs-hero">
          <div class="crs-hero-art" aria-hidden="true"></div>
          <div class="crs-brandbar">
            <span class="crs-brand"><span class="crs-brand-leaf">${leaf}</span>
              <span class="crs-brand-name">coolroute<span class="crs-brand-dot">.</span><small>D O R T M U N D</small></span></span>
            <button type="button" class="crs-profile-button" data-action="go" data-screen="profile" aria-label="Profile">${svgIcon('user')}</button>
          </div>
          <div class="crs-hero-copy">
            <div class="crs-hero-title"><span>${c.title}</span><span>${c.city}</span></div>
            <p>${c.desc}</p>
          </div>
        </header>
        <div class="crs-home-body">
          ${weather ? `<div class="crs-weather-card">${weather}</div>` : ''}
          <h2 class="crs-section-title">${c.explore}</h2>
          <nav class="crs-actions" aria-label="Explore CoolRoute">
            ${quick.map(([screen, ico, label, color]) => `<button class="crs-action" data-action="go" data-screen="${screen}" type="button"><span class="crs-action-ico ${color}">${svgIcon(ico)}</span><span>${label}</span><span class="crs-action-arrow" aria-hidden="true">↗</span></button>`).join('')}
          </nav>
          <p class="crs-photo-note">${c.eyebrow}</p>
        </div>
      </div>
      ${bottom('home')}
    </div>`;
  };

  // Remove redundant full-screen onboarding. The new short skyline is a startup
  // transition, not an extra screen with navigation buttons or fake statistics.
  const oldReset = typeof reset === 'function' ? reset : null;
  let splashTimer;
  function showSkyline() {
    const shell = document.querySelector('.phone-glass');
    if (!shell) return;
    shell.querySelectorAll('.crh-splash, .crs-launch').forEach(n => n.remove());
    clearTimeout(splashTimer);
    const splash = document.createElement('div');
    splash.className = 'crs-launch';
    splash.setAttribute('role', 'status');
    splash.setAttribute('aria-label', 'Opening CoolRoute Dortmund');
    splash.innerHTML = `<div class="crs-launch-art" aria-hidden="true"><svg viewBox="0 0 330 118"><path d="M9 103H38V76H52V103H78V85H98V103H124V72H140V103H161V29L165 12L169 29V103H196V68H212V103H235V52H250V103H275V83H291V103H322"/></svg></div><strong>coolroute<span>.</span></strong><small>DORTMUND</small>`;
    shell.append(splash);
    requestAnimationFrame(() => splash.classList.add('is-on'));
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 350 : 1100;
    splashTimer = window.setTimeout(() => {
      splash.classList.add('is-gone');
      window.setTimeout(() => splash.remove(), 240);
    }, duration);
  }

  if (oldReset) {
    reset = function () {
      oldReset();
      state.screen = 'home';
      state.prev = 'home';
      render();
      showSkyline();
    };
  }
  // app.js registered its reset handler with addEventListener('click', reset)
  // before this add-on loaded; that direct function reference cannot be replaced
  // by reassigning reset alone. Intercept the click in capture phase.
  const resetButton = document.getElementById('resetDemoOutside');
  if (resetButton) resetButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    reset();
  }, true);

  // The previous onboarding state may be activated by the hackathon UI on the
  // first page visit. Always land directly on Home after the skyline transition.
  if (state.screen === 'intro') state.screen = 'home';
  render();
  showSkyline();
})();
