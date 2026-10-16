/* CoolRoute presentation UI (hackathon)
   A lightweight visual layer over the existing prototype.
   Original map, Dortmund data loaders, route state and click handlers stay intact.
   Route geometry, estimates, and the 32°C weather card are illustrative demo data.
*/
(() => {
  if (typeof render !== 'function' || typeof screenHome !== 'function' ||
      typeof ROUTES === 'undefined' || typeof icon !== 'function') {
    console.error('CoolRoute presentation UI: load after app.js');
    return;
  }

  const routeIcon = id => icon(id === 'fastest' ? 'walk' : id === 'balanced' ? 'leaf' : 'tree', 21);
  const demoLabel = '<span class="cr-demo-tag">DEMO</span>';
  const navOrder = [['home','home','Home'], ['explore','map','Map'], ['ideas','ideas','Ideas'], ['profile','user','Profile']];

  bottom = function(active='home') {
    return `<nav class="bottom-nav" aria-label="Main navigation">${navOrder.map(([screen,ic,label]) =>
      `<button type="button" data-action="go" data-screen="${screen}" class="${screen===active?'active':''}" aria-label="${label}" ${screen===active?'aria-current="page"':''}>${icon(ic,21)}<span>${label}</span></button>`).join('')}</nav>`;
  };

  screenHome = function() {
    return `<div class="page with-bottom cr-home-page">
      <div class="scroll-area">
        <section class="home-hero cr-home-hero">
          <div class="home-hero-inner">
            <div class="home-top">
              <div class="brand"><span class="cr-leaf-symbol">${icon('leaf',25)}</span><span>coolroute.<small>DORTMUND</small></span></div>
              <button type="button" data-action="go" data-screen="profile" class="avatar-btn" aria-label="Profile">${icon('user',18)}</button>
            </div>
            <div class="cr-hero-copy"><h2>Stay cool,<br>Dortmund.</h2><p>Cooler routes. Greener places.<br>One more comfortable city.</p></div>
          </div>
        </section>
        <section class="cr-home-content">
          <div class="cr-heat-card">
            <span class="cr-heat-sun">${icon('sun',31)}</span>
            <div class="cr-heat-copy"><div class="cr-heat-top"><strong>32°C</strong><span class="cr-heat-pill">Example heat</span></div><b>Summer day in Dortmund</b><p>Take a shaded route and keep hydrated.</p></div>
            ${demoLabel}
          </div>
          <div class="cr-section-heading"><h3>Explore CoolRoute</h3><span>Find your way around</span></div>
          <div class="cr-home-actions">
            <button type="button" data-action="go" data-screen="route" class="cr-home-action"><span class="cr-action-icon cr-blue">${icon('walk',24)}</span><b>Find a route</b>${icon('next',15)}</button>
            <button type="button" data-action="go" data-screen="explore" class="cr-home-action"><span class="cr-action-icon cr-green">${icon('map',23)}</span><b>Explore map</b>${icon('next',15)}</button>
            <button type="button" data-action="go" data-screen="ideas" class="cr-home-action"><span class="cr-action-icon cr-yellow">${icon('ideas',23)}</span><b>City ideas</b>${icon('next',15)}</button>
            <button type="button" data-action="go" data-screen="tips" class="cr-home-action"><span class="cr-action-icon cr-teal">${icon('sun',23)}</span><b>Stay cool tips</b>${icon('next',15)}</button>
          </div>
          <div class="cr-home-footnote">Hackathon prototype · Route estimates and weather are illustrative.</div>
        </section>
      </div>
      ${bottom('home')}
    </div>`;
  };

  screenRoute = function() {
    const locations = [...new Set([...STARTS, ...DESTINATIONS])];
    return page(head('Find a route'), `<div class="cr-route-form">
      <div class="cr-form-section cr-location-card">
        <div class="cr-location-field"><span class="cr-location-dot start">${icon('pin',17)}</span><div><label for="startSelect">FROM</label><select id="startSelect">${optionList(locations,state.start)}</select></div></div>
        <div class="cr-location-separator"></div>
        <div class="cr-location-field"><span class="cr-location-dot finish">${icon('pin',17)}</span><div><label for="endSelect">TO</label><select id="endSelect">${optionList(locations,state.end)}</select></div></div>
        <button class="cr-swap" type="button" data-action="swap" aria-label="Swap starting point and destination">${icon('swap',19)}</button>
      </div>
      <h3 class="cr-form-heading">Travel mode</h3>
      <div class="cr-mode-row">${[['Walking','walk'],['Cycling','bike'],['Wheelchair','wheel']].map(([mode,ic])=>`<button type="button" data-action="mode" data-mode="${mode}" class="cr-mode ${mode===state.mode?'selected':''}" aria-pressed="${mode===state.mode}">${icon(ic,19)}<span>${mode}</span></button>`).join('')}</div>
      <h3 class="cr-form-heading">Route preference</h3>
      <div class="cr-preference-row">${[['fastest','Fastest','Quickest','clock'],['balanced','Balanced','Good mix','leaf'],['shade','More shade','Greener','tree']].map(([id,name,sub,ic])=>`<button type="button" data-action="preference" data-preference="${id}" class="cr-preference ${id===state.preference?'selected':''}" aria-pressed="${id===state.preference}"><span>${icon(ic,25)}</span><b>${name}</b><small>${sub}</small></button>`).join('')}</div>
      <button class="primary-btn cr-route-submit" data-action="calculate">Show routes ${icon('arrow',19)}</button>
      <p class="cr-route-note">Demo routes only · Not verified for live navigation or wheelchair accessibility.</p>
    </div>`);
  };

  screenResults = function() {
    const cards = ['fastest','balanced','shade'].map(id => {
      const r = ROUTES[id];
      return `<button type="button" data-action="detail" data-route="${id}" class="cr-result-card ${id} ${state.selectedRoute===id?'selected':''}">
        <span class="cr-result-icon">${routeIcon(id)}</span>
        <span class="cr-result-main"><b>${r.name}</b><small>${r.km.toFixed(1)} km · ${formatMins(r.mins)}</small></span>
        <span class="cr-result-metric">${icon('tree',16)}<b>${r.shade}%</b><small>shade*</small></span>${icon('next',18)}
      </button>`;
    }).join('');
    return `<div class="page cr-results-page">${head('Route results')}
      ${mapBox('results','cr-results-map')}
      <div class="cr-results-sheet">
        <div class="cr-results-top"><h3>Choose your route</h3><span class="cr-demo-tag">SAMPLE ROUTES</span></div>
        ${cards}
        <button type="button" class="cr-text-button" data-action="go" data-screen="compare">Compare all routes ${icon('arrow',17)}</button>
        <p class="cr-quiet-note">* Shade, route geometry and travel time are illustrative estimates.</p>
      </div>
    </div>`;
  };

  screenCompare = function() {
    const ids=['fastest','balanced','shade'];
    const tiles=ids.map(id => {const r=ROUTES[id];return `<button type="button" class="cr-compare-tile ${id} ${state.selectedRoute===id?'active':''}" data-action="selectRoute" data-route="${id}" aria-pressed="${state.selectedRoute===id}">${routeIcon(id)}<b>${r.name}</b><small>${r.km.toFixed(1)} km</small><small>${formatMins(r.mins)}</small></button>`;}).join('');
    const values=[['Potential shade','shade',60,'%','tree'],['Parks','parks',3,'','leaf'],['Rest spots','benches',12,'','bench'],['Water points','water',4,'','water']].map(([name,key,max,unit,ic])=>{
      return `<div class="cr-metric"><div class="cr-metric-name">${icon(ic,18)}<span>${name}</span></div><div class="cr-metric-bars">${ids.map(id=>{let r=ROUTES[id];return `<div><b>${r[key]}${unit}</b><span class="cr-bar-track"><span class="cr-bar-fill ${id}" style="width:${Math.round(r[key]/max*100)}%"></span></span></div>`;}).join('')}</div></div>`;
    }).join('');
    return page(head('Compare routes'), `<div class="cr-compare-content">
      <div class="cr-compare-tiles">${tiles}</div>
      <h3 class="cr-form-heading">Environmental indicators</h3>
      <div class="cr-metrics">${values}</div>
      <div class="cr-info-line">${icon('info',17)}<span>Values demonstrate the comparison feature; they are not live route calculations.</span></div>
      <button type="button" class="primary-btn cr-compare-cta" data-action="detail" data-route="${state.selectedRoute}">View ${ROUTES[state.selectedRoute].name} route ${icon('arrow',17)}</button>
    </div>`);
  };

  screenDetail = function() {
    const r = ROUTES[state.selectedRoute];
    const current = state.detailsTab;
    const stops=[['City centre','Shops and historic streets','home'],['Phoenix See','Lakeside walking and seating','water'],['Westfalenpark','Trees, lawns and park paths','tree']];
    const highlights=stops.map(([name,desc,ic],i)=>`<div class="cr-stop"><span class="cr-stop-num">${i+1}</span><span class="cr-stop-icon">${icon(ic,19)}</span><div><b>${name}</b><small>${desc}</small></div>${icon('next',15)}</div>`).join('');
    let content='';
    if (current==='overview') {
      content=`<div class="cr-detail-summary"><span class="cr-detail-icon">${routeIcon(state.selectedRoute)}</span><div><h3>${r.name} route</h3><small>${r.km.toFixed(1)} km · ${formatMins(r.mins)}</small></div><span class="cr-detail-stat">${r.shade}% shade*</span></div><p class="cr-detail-description">${r.description}</p><h4 class="cr-detail-subtitle">Route highlights</h4>${highlights}`;
    } else if (current==='environment') {
      content=`<div class="cr-environment-list"><div>${icon('tree',20)}<span>Potential shade</span><b>${r.shade}%</b></div><div>${icon('leaf',20)}<span>Parks</span><b>${r.parks}</b></div><div>${icon('bench',20)}<span>Rest spots</span><b>${r.benches}</b></div><div>${icon('water',20)}<span>Water points</span><b>${r.water}</b></div></div><p class="cr-quiet-note">These figures are demo values, not calculated from the Dortmund datasets.</p>`;
    } else {
      content=`<div class="cr-steps">${['Start near Dortmund Hauptbahnhof','Continue through the city','Follow the sample highlighted path','Pass nearby green spaces','Finish near Westfalenpark'].map((s,i)=>`<div class="cr-step"><span>${i+1}</span><div><b>${s}</b><small>Illustrative instruction</small></div></div>`).join('')}</div>`;
    }
    return `<div class="page cr-detail-page">${head('Route details')}${mapBox('detail','cr-detail-map')}
      <div class="cr-detail-tabs">${[['overview','Overview'],['environment','Comfort'],['steps','Steps']].map(([tab,title])=>`<button type="button" data-action="tab" data-tab="${tab}" class="${tab===current?'active':''}" aria-pressed="${tab===current}">${title}</button>`).join('')}</div>
      <div class="scroll-area"><div class="cr-detail-content">${content}<p class="cr-quiet-note">* Demo route. Do not rely on it for actual directions.</p></div></div>
      <div class="cr-detail-footer"><button type="button" data-action="navigate" class="primary-btn">Try demo navigation ${icon('arrow',18)}</button></div>
    </div>`;
  };

  screenNavigation = function() {
    const r=ROUTES[state.selectedRoute];
    const steps=['Head toward the city centre','Continue on the sample route','Follow the greener corridor','Proceed toward Westfalenpark','You have reached the end of the demo'];
    const remaining=Math.max(0,Math.round(r.mins*(4-state.navStep)/4));
    return `<div class="navigation-screen cr-nav-page">
      ${mapBox('navigation','nav-map')}
      <div class="navigation-banner cr-nav-banner"><span class="cr-turn-arrow">${state.navStep===4?'✓':'↱'}</span><div><strong>${state.navStep===4?'Arrived':state.navStep===0?'200 m':`Step ${state.navStep+1}`}</strong><small>${steps[state.navStep]}</small></div><span class="cr-demo-tag">DEMO</span></div>
      <div class="cr-nav-panel"><div class="cr-nav-stats"><div><strong>${formatMins(remaining)}</strong><small>${r.km.toFixed(1)} km · ${r.name} route</small></div><button type="button" data-action="endNav" class="cr-end-btn">End</button></div>
      <div class="nav-progress"><div style="width:${state.navStep*25}%"></div></div>
      <div class="cr-nav-metrics"><span>${icon('tree',17)} ${r.shade}% shade*</span><span>${icon('clock',17)} Demo journey</span></div>
      <div class="cr-nav-buttons"><button type="button" data-action="prevStep" ${state.navStep===0?'disabled':''}>${icon('back',16)} Previous</button><button type="button" data-action="nextStep">${state.navStep===4?'Finish demo':'Next step'} ${icon('arrow',16)}</button></div>
      <p class="cr-nav-disclaimer">Simulation only — not usable for real-world navigation.</p></div>
    </div>`;
  };

  // Upgrade only the selected presentation screens. Everything else, including
  // Leaflet layers and the climate-sensor refresh cycle, remains original.
  render();
})();
