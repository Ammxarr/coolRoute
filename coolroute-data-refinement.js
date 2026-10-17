/* CoolRoute · editorial data catalog + sources disclosure. No fabricated measurements. */
(() => {
  'use strict';
  if (window.CoolRouteDataRefinementInstalled) return;
  if (typeof render !== 'function' || !document.querySelector('.phone-glass')) return;
  window.CoolRouteDataRefinementInstalled = true;

  const CATALOG = [
    ['Trees & canopy','baumkataster','trees','Route shade modeling'],
    ['Shaded outdoor places','fb60-schattenplatze','shade','Route greenery / shade'],
    ['Drinking fountains','trinkwasserbrunnen','water','Facilities along the route'],
    ['Cool indoor places','kuhle-innenraume','indoor','Facilities along the route'],
    ['Latest climate readings','klimasensoren-aktuelle-messungen','readings','Air temperature for modeled exposure'],
    ['Climate station locations','klimasensoren-standorte','stations','Station information'],
    ['Public toilets','offentliche-toiletten','toilet','Facilities along the route'],
    ['Accessible toilets','offentliche-toiletten-behindertengerecht','accessible','Facilities along the route'],
    ['Public transport stops','haltestellen','transit','Facilities along the route'],
    ['Playgrounds','spielplatze','playground','Facilities along the route']
  ];
  const EN = {
    button:'Data & sources',subtitle:'How CoolRoute uses real Dortmund data',title:'Data behind CoolRoute',
    intro:'Original datasets from Stadt Dortmund, combined with pedestrian routes from Valhalla / OpenStreetMap.',
    used:'Connected to CoolRoute',potential:'Potential future additions — not connected',
    limitations:'What the model does and does not know',
    model:'Tree canopy and municipal shade locations are used to estimate direct-sun exposure along candidate paths. Recent air-temperature sensors allow an experimental mean-radiant-temperature proxy (not measured or validated MRT). Only available walking routes are compared.',
    sources:'Live source status is shown after a route calculation. An empty status does not mean a dataset has no records.',
    impact:'Some street properties, opening hours, wheelchair accessibility, building shade and shopping-centre cooling have not been independently verified. Missing or incomplete records remain unknown rather than counting as zero.',
    extra1:'Smart benches (Stadt Dortmund Open Data)',extra2:'Public seating / rest spots (OpenStreetMap)',extra3:'Shopping centres / indoor facilities (OpenStreetMap)',extra4:'Historical sensor measurements (Dortmund Open Data)',
    close:'Close',waiting:'Not yet queried',partial:'Partial coverage',ready:'Records retrieved',missing:'Request unavailable'
  };
  const DE = {
    button:'Daten & Quellen',subtitle:'Wie CoolRoute echte Dortmunder Daten nutzt',title:'Daten hinter CoolRoute',
    intro:'Offene Daten der Stadt Dortmund, kombiniert mit Fußwegen von Valhalla / OpenStreetMap.',
    used:'In CoolRoute angebunden',potential:'Mögliche Ergänzungen — noch nicht angebunden',
    limitations:'Grenzen der Berechnung',
    model:'Baumkronen und erfasste Schattenplätze dienen zur Schätzung direkter Sonneneinstrahlung entlang berechneter Wege. Mit aktuellen Lufttemperaturen ist ein experimenteller MRT-Näherungswert möglich – keine gemessene oder validierte MRT. Verglichen werden nur verfügbare Wege.',
    sources:'Der Ladezustand erscheint nach einer Routenberechnung. Ohne Ladezustand sind nicht automatisch null Datensätze vorhanden.',
    impact:'Straßeneigenschaften, Öffnungszeiten, Rollstuhleignung, Gebäudeschatten und Einkaufszentren wurden nicht durchgängig überprüft. Fehlende Daten gelten als unbekannt, nicht als null.',
    extra1:'Smarte Bänke (Stadt Dortmund Open Data)',extra2:'Öffentliche Sitzplätze (OpenStreetMap)',extra3:'Einkaufszentren / Innenräume (OpenStreetMap)',extra4:'Historische Klimamessdaten (Open Data Dortmund)',
    close:'Schließen',waiting:'Noch nicht abgefragt',partial:'Teilweise geladen',ready:'Einträge geladen',missing:'Abruf fehlgeschlagen'
  };
  const SIMPLE = {
    ...DE, button:'Woher sind die Daten?',title:'Unsere Daten',used:'Diese Daten nutzen wir',potential:'Diese Daten nutzen wir noch nicht',
    limitations:'Was wir noch nicht wissen',
    model:'Wir suchen Bäume und Orte mit Schatten. Wir nutzen Lufttemperaturen, wenn sie aktuell sind. Daraus schätzen wir Hitze. Es ist kein gemessener MRT-Wert. Wir vergleichen nur die Wege, die wir finden.',
    impact:'Nicht alle Orte und Wege sind vollständig geprüft. Manchmal fehlen Angaben.'
  };
  const lang=()=>{try{return localStorage.getItem('cr-hack-lang')||'en';}catch{return 'en';}};
  const t=()=>lang()==='simple'?SIMPLE:lang()==='de'?DE:EN;
  const safe=str=>String(str).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const DATA_LINK='https://open-data.dortmund.de/explore/dataset/';
  const OSM='https://www.openstreetmap.org/';

  function addProfileEntry(){
    if (typeof state==='undefined' || state.screen!=='profile') return;
    const pane=document.querySelector('.crp-profile');
    if(!pane || pane.querySelector('[data-crd-info]')) return;
    const button=document.createElement('button');
    button.type='button';button.className='crd-info-link';button.setAttribute('data-crd-info','');
    button.innerHTML='<span class="crd-info-symbol" aria-hidden="true">i</span><span><strong>'+safe(t().button)+'</strong><small>'+safe(t().subtitle)+'</small></span><span class="crd-chevron" aria-hidden="true">›</span>';
    const ref=pane.querySelector('.crp-intro');
    if(ref)ref.insertAdjacentElement('afterend',button);else pane.prepend(button);
  }
  let dialog=null;
  function closeDialog(){if(dialog){dialog.remove();dialog=null;}document.removeEventListener('keydown',escapeHandler);}
  function escapeHandler(ev){if(ev.key==='Escape')closeDialog();}
  function showDialog(){
    closeDialog(); const tr=t(), sources=window.CoolRouteRouting?.sources||{};
    const entries=CATALOG.map(([label,slug,key,purpose])=>{
      const status=sources[key];let badge=tr.waiting;
      if(status){badge=status.ok?(status.limited?tr.partial:tr.ready):status.pending?tr.waiting:tr.missing;}
      const count=(status?.ok&&Number.isFinite(status.count))?' · '+status.count:'';
      const tag=status?.limited?'crd-partial':status?.ok?'crd-success':'crd-muted';
      return '<li class="crd-source"><a href="'+DATA_LINK+encodeURIComponent(slug)+'/" target="_blank" rel="noopener noreferrer">'
        +'<strong>'+safe(label)+'</strong><span>↗</span></a><p>'+safe(purpose)+'</p><small class="'+tag+'">'+safe(badge+count)+'</small></li>';
    }).join('');
    const modal=document.createElement('section');dialog=modal;modal.className='crd-overlay';modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','crd-heading');
    modal.innerHTML='<div class="crd-sheet"><header><h2 id="crd-heading">'+safe(tr.title)+'</h2><button type="button" data-crd-close aria-label="'+safe(tr.close)+'">×</button></header>'
      +'<div class="crd-sheet-scroll"><p class="crd-lede">'+safe(tr.intro)+'</p><h3>'+safe(tr.used)+'</h3>'
      +'<ul class="crd-source-list">'+entries+'</ul>'
      +'<div class="crd-routing-source"><b>Walking network</b><a href="'+OSM+'" target="_blank" rel="noopener noreferrer">OpenStreetMap / Valhalla ↗</a></div>'
      +'<h3>'+safe(tr.potential)+'</h3><div class="crd-future"><p><a href="'+DATA_LINK+'fb1-ii-smart-city-smarte-banke/" target="_blank" rel="noopener">'+safe(tr.extra1)+'</a></p>'
      +'<p><a href="https://www.openstreetmap.org" target="_blank" rel="noopener">'+safe(tr.extra2)+'</a></p>'
      +'<p><a href="https://www.openstreetmap.org" target="_blank" rel="noopener">'+safe(tr.extra3)+'</a></p>'+'<p><a href="'+DATA_LINK+'klimasensoren-messdaten/" target="_blank" rel="noopener">'+safe(tr.extra4)+'</a></p></div>'
      +'<h3>'+safe(tr.limitations)+'</h3><p>'+safe(tr.model)+'</p><p>'+safe(tr.impact)+'</p><p class="crd-small">'+safe(tr.sources)+'</p></div></div>';
    document.querySelector('.phone-glass').append(modal);
    modal.querySelector('[data-crd-close]')?.focus();
    document.addEventListener('keydown',escapeHandler);
  }
  const prevRender=render;
  render=function(...args){const result=prevRender(...args);if(dialog)closeDialog();addProfileEntry();return result;};
  document.getElementById('app').addEventListener('click',event=>{if(event.target.closest('[data-crd-info]')){event.preventDefault();showDialog();}},true);
  document.querySelector('.phone-glass').addEventListener('click',event=>{
    if(event.target.closest('[data-crd-close]') || event.target.classList.contains('crd-overlay'))closeDialog();
  });
  addProfileEntry();
})();
