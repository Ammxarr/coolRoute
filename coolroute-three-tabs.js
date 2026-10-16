/* CoolRoute: three-tab navigation. Load AFTER all other CoolRoute add-ons.
   Only changes the bottom navigation and the existing Profile screen.
   The map, route planner, Dortmund datasets, and navigation remain untouched.
*/
(() => {
  'use strict';
  if (typeof bottom !== 'function' || typeof screenProfile !== 'function' ||
      typeof page !== 'function' || typeof head !== 'function' || typeof icon !== 'function') {
    console.error('CoolRoute three-tab add-on: app.js is not ready.');
    return;
  }

  const LANG = {
    en: {
      map:'Map',home:'Home',profile:'Profile',title:'Profile',guest:'Guest profile',
      subtitle:'Explore Dortmund without creating an account.',
      quick:'Quick links',route:'Plan a route',ideas:'Suggestions',tips:'Cooling tips',
      settings:'Settings',about:'About CoolRoute',note:'Hackathon prototype · No account required'
    },
    de: {
      map:'Karte',home:'Start',profile:'Profil',title:'Profil',guest:'Gastprofil',
      subtitle:'Dortmund entdecken – ohne ein Konto zu erstellen.',
      quick:'Schnellzugriff',route:'Route planen',ideas:'Vorschläge',tips:'Hitzetipps',
      settings:'Einstellungen',about:'Über CoolRoute',note:'Hackathon-Prototyp · Kein Konto nötig'
    },
    simple: {
      map:'Karte',home:'Start',profile:'Profil',title:'Profil',guest:'Du bist Gast',
      subtitle:'Du kannst die App ohne Anmeldung nutzen.',
      quick:'Weitere Seiten',route:'Weg planen',ideas:'Ideen',tips:'Tipps bei Hitze',
      settings:'Einstellungen',about:'Über die App',note:'Das ist eine Test-App. Keine Anmeldung nötig.'
    }
  };

  function currentLabels() {
    let value = 'en';
    try { value = localStorage.getItem('cr-hack-lang') || 'en'; } catch (_) {}
    return LANG[value] || LANG.en;
  }

  // Assigning these functions (instead of changing app.js) keeps the add-on reversible.
  bottom = function(active = 'home') {
    const text = currentLabels();
    const selected = active === 'explore' ? 'explore' :
      active === 'profile' ? 'profile' : 'home';
    const tabs = [
      ['explore', 'map', text.map],
      ['home', 'home', text.home],
      ['profile', 'user', text.profile]
    ];
    return `<nav class="bottom-nav cr3-tabs" aria-label="Main navigation">${tabs.map(([screen, symbol, name]) =>
      `<button type="button" data-action="go" data-screen="${screen}" class="cr3-tab ${screen === selected ? 'active' : ''}"${screen === selected ? ' aria-current="page"' : ''} aria-label="${name}">${icon(symbol, 23)}<span>${name}</span></button>`
    ).join('')}</nav>`;
  };

  screenProfile = function() {
    const t = currentLabels();
    const links = [
      ['route', 'walk', t.route],
      ['ideas', 'ideas', t.ideas],
      ['tips', 'temp', t.tips],
      ['settings', 'settings', t.settings],
      ['about', 'info', t.about]
    ];
    const body = `<div class="cr3-profile">
      <div class="cr3-profile-banner">
        <div class="cr3-guest-icon" aria-hidden="true">${icon('user', 29)}</div>
        <div><h2>${t.guest}</h2><p>${t.subtitle}</p></div>
      </div>
      <h3>${t.quick}</h3>
      <div class="cr3-profile-links">${links.map(([screen,symbol,name]) =>
        `<button type="button" class="cr3-profile-link" data-action="go" data-screen="${screen}">${icon(symbol, 21)}<span>${name}</span>${icon('next', 17)}</button>`
      ).join('')}</div>
      <p class="cr3-profile-note">${t.note}</p>
    </div>`;
    return page(head(t.title), body, 'profile', 'cr3-profile-page');
  };

  if (typeof render === 'function') render();
})();
