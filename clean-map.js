/* CoolRoute clean map-first prototype design. No live navigation or route calculations.
   Loads after app.js and presentation-ui.js; never changes Dortmund Open Data layers. */
(() => {
  if (typeof render !== 'function' || typeof svgMap !== 'function' || typeof ROUTES === 'undefined') {
    console.error('CoolRoute clean map UI must load after app.js and presentation-ui.js.');
    return;
  }
  const routeIcon = id => icon(id === 'fastest' ? 'walk' : id === 'balanced' ? 'leaf' : 'tree', 19);
  const titleFor = s => s === 'Dortmund Central Station (Hauptbahnhof)' ? 'Dortmund Hauptbahnhof' : s;
  const map = (kind = 'detail') => `
    <div class="cm-map" role="img" aria-label="Illustrative map showing a sample Dortmund route">
      ${svgMap({type:kind, routeId:state.selectedRoute, zoom:state.zoom, navStep:state.navStep, layers:state.shownLayers})}
      <div class="cm-map-controls"><button data-action="zoomIn" aria-label="Zoom in">+</button><button data-action="zoomOut" aria-label="Zoom out">−</button></div>
      <span class="cm-map-demo">ILLUSTRATIVE MAP</span>
    </div>`;
  const locations = () => `<button type="button" data-action="go" data-screen="route" class="cm-locations" aria-label="Change start and destination">
      <span class="cm-location-line"><span class="cm-location-symbol from"></span><span>${escapeHtml(titleFor(state.start))}</span></span>
      <span class="cm-location-line"><span class="cm-location-symbol to"></span><span>${escapeHtml(state.end)}</span></span>
      <span class="cm-location-edit">${icon('swap',18)}</span>
    </button>`;
  const sheetGrip = '<span class="cm-sheet-grip" aria-hidden="true"></span>';

  screenResults = function() {
    const r=ROUTES[state.selectedRoute];
    return `<div class="page cm-map-page cm-results-page">
      <header class="cm-float-header"><button type="button" data-action="back" aria-label="Go back">${icon('back',20)}</button><span>Find your way</span><button type="button" data-action="go" data-screen="explore" aria-label="Explore city map">${icon('map',19)}</button></header>
      ${map('detail')}
      <div class="cm-map-top">${locations()}</div>
      <section class="cm-bottom-sheet cm-results-sheet">${sheetGrip}
        <div class="cm-sheet-kicker"><span class="cm-dot"></span> SAMPLE ROUTES <span class="cm-kicker-right">${escapeHtml(state.mode)}</span></div>
        <h2>Choose your route</h2>
        <p class="cm-sheet-description">Three ways to reach ${escapeHtml(state.end)}.</p>
        <div class="cm-route-options">${['fastest','balanced','shade'].map(id=>{
          const x=ROUTES[id];return `<button type="button" data-action="detail" data-route="${id}" class="cm-route-option ${id===state.selectedRoute?'is-active':''}">
            <span class="cm-option-icon ${id}">${routeIcon(id)}</span>
            <span class="cm-option-name"><b>${x.name}</b><small>${x.km.toFixed(1)} km · ${formatMins(x.mins)}</small></span>
            <span class="cm-option-shade"><b>${x.shade}%</b><small>shade*</small></span>
            ${icon('next',17)}
          </button>`}).join('')}</div>
        <button type="button" data-action="go" data-screen="compare" class="cm-inline-link">Compare alternatives ${icon('arrow',16)}</button>
        <p class="cm-demotext">* Routes and shade values are demo estimates, not live directions.</p>
      </section>
    </div>`;
  };

  screenDetail = function() {
    const r=ROUTES[state.selectedRoute];
    const segments=[
      ['Start',titleFor(state.start),'pin'],
      ['Through the city','Dortmund city centre · sample path','walk'],
      ['Destination',state.end,'pin']
    ];
    return `<div class="page cm-map-page cm-detail-page">
      <header class="cm-float-header"><button type="button" data-action="back" aria-label="Go back">${icon('back',20)}</button><span>Route overview</span><button type="button" data-action="go" data-screen="explore" aria-label="Explore city map">${icon('map',19)}</button></header>
      ${map('detail')}
      <section class="cm-bottom-sheet cm-detail-sheet">${sheetGrip}
        <div class="cm-summary-title"><span class="cm-option-icon ${state.selectedRoute}">${routeIcon(state.selectedRoute)}</span><div><h2>${r.name} route</h2><p>${r.km.toFixed(1)} km · ${formatMins(r.mins)} · ${escapeHtml(state.mode)}</p></div><span class="cm-eco-pill">${r.shade}% shade*</span></div>
        <div class="cm-route-timeline">${segments.map(([label,place,ic],i)=>`<div class="cm-timeline-item"><span class="cm-timeline-node ${i===segments.length-1?'last':''}">${i===0?'A':i===2?'B':icon(ic,14)}</span><div><small>${label}</small><b>${escapeHtml(place)}</b></div></div>`).join('')}</div>
        <div class="cm-details-metrics"><div>${icon('tree',17)} <b>${r.parks}</b><small>parks*</small></div><div>${icon('bench',17)} <b>${r.benches}</b><small>benches*</small></div><div>${icon('water',17)} <b>${r.water}</b><small>fountains*</small></div></div>
        <button type="button" data-action="navigate" class="cm-blue-cta">Start demo navigation ${icon('arrow',18)}</button>
        <p class="cm-demotext">* Illustrative route and values. Not suitable for real navigation.</p>
      </section>
    </div>`;
  };

  screenNavigation = function() {
    const r=ROUTES[state.selectedRoute];
    if (state.navStep >= 4) {
      return `<div class="page cm-arrived-page"><div class="cm-arrived-content">
          <div class="cm-arrival-illustration"><div class="cm-arrival-circle">${icon('pin',54)}<span class="cm-arrival-check">${icon('check',22)}</span></div><span class="cm-sparkle">✦</span></div>
          <h1>You've arrived</h1><p>at ${escapeHtml(state.end)}</p>
          <div class="cm-arrival-foot"><div class="cm-arrival-leaf">${icon('leaf',21)}</div><b>You chose a ${r.name.toLowerCase()} route.</b><small>Journey completed in demo mode.</small></div>
          <button type="button" data-action="nextStep" class="cm-blue-cta">Done</button>
        </div></div>`;
    }
    const instructions=['Head toward the city centre','Continue along the highlighted route','Keep going toward greener streets','Proceed toward '+state.end];
    const distances=['200 m','450 m','300 m','150 m'];
    const remaining=Math.round(r.mins*(4-state.navStep)/4);
    return `<div class="page cm-map-page cm-navigation-page">
      ${map('navigation')}
      <div class="cm-nav-banner"><span class="cm-nav-turn">↱</span><div><strong>${distances[state.navStep]}</strong><span>${escapeHtml(instructions[state.navStep])}</span></div><span class="cm-nav-live-tag">DEMO</span></div>
      <button type="button" data-action="go" data-screen="detail" class="cm-nav-close" aria-label="Go back to route">${icon('back',20)}</button>
      <section class="cm-bottom-sheet cm-nav-sheet">${sheetGrip}
        <div class="cm-nav-info"><div><h2>${formatMins(remaining)}</h2><p>${r.km.toFixed(1)} km sample route · ${r.name}</p></div><button type="button" data-action="endNav" class="cm-end">End</button></div>
        <div class="cm-nav-track"><span style="width:${state.navStep*25}%"></span></div>
        <div class="cm-nav-bottom"><span>${icon('tree',18)} ${r.shade}% shade*</span><span>Step ${state.navStep+1} of 4</span></div>
        <div class="cm-nav-actions"><button type="button" data-action="prevStep" ${state.navStep===0?'disabled':''}>${icon('back',15)} Previous</button><button type="button" data-action="nextStep">${state.navStep===3?'Arrive':'Next step'} ${icon('arrow',16)}</button></div>
        <p class="cm-demotext">Simulation only · Not live turn-by-turn guidance.</p>
      </section>
    </div>`;
  };

  // Improve the existing form and home without changing intro, live map, or API layers.
  render();
})();
