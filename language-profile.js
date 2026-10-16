/* Move the existing CoolRoute language selector into Profile.
 * Requires the hackathon UI and three-tab add-ons; load last.
 * No language state or translations are duplicated.
 */
(() => {
  'use strict';
  if (typeof screenProfile !== 'function' || typeof render !== 'function' ||
      typeof state === 'undefined' || !document.querySelector('#app')) {
    console.error('Language Profile add-on: CoolRoute is not ready.');
    return;
  }
  if (window.CoolRouteLanguageProfileInstalled) return;
  window.CoolRouteLanguageProfileInstalled = true;

  const options = [
    ['en', 'English'],
    ['de', 'Deutsch'],
    ['simple', 'Einfaches Deutsch']
  ];
  const heading = { en: 'Language', de: 'Sprache', simple: 'Sprache' };
  const hint = {
    en: 'Choose the language used in CoolRoute.',
    de: 'Wähle die Sprache für CoolRoute.',
    simple: 'Hier kannst du die Sprache ändern.'
  };
  const savedLanguage = () => {
    try {
      const value = localStorage.getItem('cr-hack-lang');
      return heading[value] ? value : 'en';
    } catch (_) { return 'en'; }
  };

  const originalProfile = screenProfile;
  screenProfile = function(...args) {
    const markup = originalProfile(...args);
    const current = savedLanguage();
    const settings = `<section class="crl-settings" aria-labelledby="crl-title">
      <h3 id="crl-title">${heading[current]}</h3>
      <p class="crl-hint">${hint[current]}</p>
      <div class="crh-language crl-options" role="group" aria-label="Language / Sprache">
        ${options.map(([id, label]) => `<button type="button" data-crh="language" data-lang="${id}" class="${id === current ? 'active' : ''}" aria-pressed="${id === current}">${label}</button>`).join('')}
      </div>
    </section>`;
    // Put Language before Quick links, leaving the rest of the Profile unchanged.
    if (!markup.includes('cr3-profile-links')) {
      console.warn('Language Profile add-on: expected three-tab Profile structure missing.');
      return markup;
    }
    return markup.replace(/(<h3>[^<]*<\/h3>\s*<div class="cr3-profile-links">)/, settings + '$1');
  };

  const previousRender = render;
  render = function(...args) {
    const result = previousRender(...args);
    // Remove the selectors originally rendered into Home, onboarding, route,
    // comparison, and other pages. Only Profile retains language controls.
    document.querySelectorAll('#app .crh-language').forEach(element => {
      if (!element.closest('.crl-settings')) element.remove();
    });
    document.getElementById('crh-floating-lang')?.remove();
    return result;
  };

  render();
})();
