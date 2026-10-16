/* CoolRoute — full-screen navigation and route-aware environmental overlays.
 * UI only: consumes CoolRouteRouting.routeList/features; never modifies route scores.
 */
(() => {
  'use strict';
  if (!window.CoolRouteRouting || !window.L || typeof screenNavigation !== 'function') {
    console.error('CoolRoute navigation UI: requires Leaflet and coolroute-routing.js');
    return;
  }
  const engine = window.CoolRouteRouting;
  const app = document.getElementById('app');
  const labels = {
    en: {next:'Next instruction',distance:'to next step',preview:'Route preview',waiting:'Waiting for GPS…',ready:'Position updated',off:'Off route — return to the mapped path',left:'remaining',eta:'estimated',end:'End',route:'Route',layers:'Map details',all:'All',trees:'Trees',water:'Water',indoor:'Cool places',shade:'Shade',toilet:'Toilets',accessible:'Accessible toilets',transit:'Transit',playground:'Playgrounds',noLocation:'Waiting for GPS. Preview only.',noData:'No location data loaded for this layer',treeNote:'Green highlights indicate approximate vicinity of mapped trees/shaded sites, not precise canopy boundaries.',recenter:'Center on my position',nextStep:'Next step',walking:'Pedestrian route',noRoute:'Select a route first'},
    de: {next:'Nächste Anweisung',distance:'bis zum nächsten Schritt',preview:'Wegvorschau',waiting:'Warte auf GPS…',ready:'Standort aktualisiert',off:'Abseits der Route — gehe zurück zum Weg',left:'verbleibend',eta:'geschätzt',end:'Beenden',route:'Weg',layers:'Kartendetails',all:'Alle',trees:'Bäume',water:'Wasser',indoor:'Kühle Orte',shade:'Schatten',toilet:'Toiletten',accessible:'Barrierefreie WCs',transit:'Haltestellen',playground:'Spielplätze',noLocation:'GPS noch nicht verfügbar. Nur Vorschau.',noData:'Keine Daten für diese Kategorie geladen',treeNote:'Grüne Flächen zeigen nur die ungefähre Nähe von Bäumen und Schattenorten, keine genauen Kronenflächen.',recenter:'Standort zentrieren',nextStep:'Nächster Schritt',walking:'Fußweg',noRoute:'Wähle zuerst einen Weg'},
    simple: {next:'Als Nächstes',distance:'bis zum nächsten Schritt',preview:'Weg ansehen',waiting:'Warte auf deinen Standort…',ready:'Standort gefunden',off:'Du bist nicht auf dem Weg. Geh zum Weg zurück.',left:'noch',eta:'ungefähr',end:'Stopp',route:'Weg',layers:'Orte auf der Karte',all:'Alle',trees:'Bäume',water:'Wasser',indoor:'Kühle Orte',shade:'Schatten',toilet:'Toiletten',accessible:'Barrierefreie WCs',transit:'Bus und Bahn',playground:'Spielplätze',noLocation:'Dein Standort fehlt noch. Du siehst eine Vorschau.',noData:'Für diese Orte gibt es keine Daten',treeNote:'Grün bedeutet: Hier sind Bäume oder Schattenplätze in der Nähe. Das ist keine genaue Schatten-Karte.',recenter:'Meinen Ort zeigen',nextStep:'Nächster Schritt',walking:'Weg zu Fuß',noRoute:'Such zuerst einen Weg'}
  };
  const categories = ['trees','water','indoor','shade','toilet','accessible','transit','playground'];
  const icons = {
    trees:'M12 22V13m0 0-6 3 6-14 6 14-6-3Z',
    water:'M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Z',
    indoor:'M4 20V8l8-5 8 5v12M9 20v-6h6v6M8 10h.01M16 10h.01',
    shade:'M12 2v20M4 9c2-5 14-5 16 0H4m-2 5h20',
    toilet:'M7 3h10v18H7zM12 8v6M15 11h-6',
    accessible:'M12 3v7h6M12 10v6h4M11 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM6 14a6 6 0 1 0 11 4',
    transit:'M5 4h14v12H5zM7 19h10M8 16l-2 4m10-4 2 4',
    playground:'M3 21h18M5 20l7-14 7 14M9 14h6M6 8h12'
  };
  const colors = {trees:'#16835c',water:'#087bd6',indoor:'#7950b6',shade:'#289b72',toilet:'#52687c',accessible:'#385ac8',transit:'#63758b',playground:'#d18c23'};
  const sources = {trees:'baumkataster',water:'trinkwasserbrunnen',indoor:'kuhle-innenraume',shade:'fb60-schattenplatze',toilet:'offentliche-toiletten',accessible:'offentliche-toiletten-behindertengerecht',transit:'haltestellen',playground:'spielplatze'};
  const config = {trees:true, water:true, indoor:true,shade:true,toilet:false,accessible:false,transit:false,playground:!!engine.withKids};
  let currentLayers = null;
  const lang = () => {try{return localStorage.getItem('cr-hack-lang')||'en';}catch{return 'en';}};
  const word = id => (labels[lang()]||labels.en)[id]||labels.en[id]||id;
  const safe = value => String(value??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toMeters = (a,b) => {const r=Math.PI/180,p1=a[0]*r,p2=b[0]*r,d1=(b[0]-a[0])*r,d2=(b[1]-a[1])*r;return 12742000*Math.asin(Math.min(1,Math.sqrt(Math.sin(d1/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(d2/2)**2)));};
  const fmt = m => m>=1000?(m/1000).toFixed(1)+' km':Math.max(0,Math.round(m/10)*10)+' m';
  const curRoute = () => engine.routeList?.find(r=>r.id===state.selectedRoute)||engine.routeList?.[0];
  function project(p,a,b){
    const lat=p[0]*Math.PI/180, sx=111320*Math.cos(lat),sy=111320;
    const ax=(a[1]-p[1])*sx,ay=(a[0]-p[0])*sy,bx=(b[1]-p[1])*sx,by=(b[0]-p[0])*sy;
    const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy;
    const fraction=den?Math.min(1,Math.max(0,-(ax*dx+ay*dy)/den)):0;
    return {distance:Math.hypot(ax+fraction*dx,ay+fraction*dy),fraction};
  }
  function pathProgress(coords,position){
    if(!coords?.length || !position)return null;
    let total=0,best={distance:Infinity,along:0,index:0},lengths=[];
    for(let i=0;i<coords.length-1;i++){
      const step=toMeters(coords[i],coords[i+1]);lengths.push(step);
      const hit=project(position,coords[i],coords[i+1]);
      if(hit.distance<best.distance)best={distance:hit.distance,along:total+step*hit.fraction,index:i};
      total+=step;
    }
    return {...best,total,remaining:Math.max(0,total-best.along),lengths};
  }
  function cumulative(coords,index){let value=0;for(let i=0;i<Math.min(index,coords.length-1);i++)value+=toMeters(coords[i],coords[i+1]);return value;}
  function instructions(r){
    const maneuvers=r?.maneuvers||[];
    if(!maneuvers.length)return {text:word('walking'),distance:null};
    const p=pathProgress(r.coords,engine.gps);
    if(!p){const ix=Math.min(Math.max(0,engine.liveInstruction||0),maneuvers.length-1);return {text:maneuvers[ix]?.instruction||word('walking'),distance:null};}
    const upcoming=maneuvers.find(m=>cumulative(r.coords,m.index)>p.along+6);
    const m=upcoming||maneuvers[maneuvers.length-1];
    return {text:m.instruction||word('walking'),distance:Math.max(0,cumulative(r.coords,m.index)-p.along),off:p.distance>65};
  }
  function markerSvg(kind){return `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icons[kind]}"/></svg>`;}
  function chip(kind){return `<button type="button" class="crnav-chip ${config[kind]?'active':''}" data-crnav="toggle" data-kind="${kind}" aria-pressed="${config[kind]}">${markerSvg(kind)}<span>${safe(word(kind))}</span></button>`;}
  const previousNavigation = screenNavigation;
  screenNavigation = function(){
    const r=curRoute();if(!r)return previousNavigation();
    const progress=pathProgress(r.coords,engine.gps),remaining=progress?Math.min(r.km*1000,r.km*1000*(progress.remaining/Math.max(1,progress.total))):r.km*1000;
    const minutes=progress?Math.max(1,Math.ceil(r.minutes*remaining/Math.max(1,r.km*1000))):r.minutes;
    const inst=instructions(r),status=engine.gps?word('ready'):(engine.gpsOn?word('waiting'):word('preview'));
    return `<div class="page crr-page crr-map-page crnav-page" aria-label="${safe(word('walking'))}">
      <div class="crr-map-wrap crnav-map-wrap"><div id="crr-live-route-map" class="crr-real-map" role="application" aria-label="${safe(word('route'))} map"></div></div>
      <div class="crnav-instruction"><div class="crr-nav-banner"><div class="crnav-turn-icon">↱</div><div class="crnav-turn-content"><div class="crnav-next-distance">${inst.distance===null?word('next'):fmt(inst.distance)}</div><p>${safe(inst.text)}</p><small class="crnav-status">${inst.off?word('off'):status}</small></div></div></div>
      <div class="crnav-tools"><button type="button" class="crnav-tool-toggle" data-crnav="layers" aria-expanded="false">${markerSvg('trees')} ${safe(word('layers'))} <span>⌄</span></button><div class="crnav-chips" hidden>${categories.map(chip).join('')}</div></div>
      <div class="crnav-map-actions"><button type="button" data-crnav="recenter" aria-label="${safe(word('recenter'))}" title="${safe(word('recenter'))}">⌖</button></div>
      <div class="crr-sheet crr-nav-sheet crnav-bottom"><div class="crnav-bottom-row"><div class="crnav-remaining"><strong>${Math.max(1,minutes)} min</strong><span class="crnav-distance">${fmt(remaining)} ${safe(word('left'))}</span></div><button type="button" data-crr="end" class="crnav-end">${safe(word('end'))}</button></div><div class="crnav-route-type">${safe(word('route'))}: ${safe(state.selectedRoute==='shade'?(lang()==='de'?'Kühlster Kandidat':'Coolest candidate'):state.selectedRoute==='balanced'?(lang()==='de'?'Ausgewogen':'Balanced'):(lang()==='de'?'Schnellster':'Fastest'))} · ${safe(word('eta'))}</div>
      <div class="crnav-bottom-footer"><span class="crnav-data-note">${safe(word('treeNote'))}</span>${!engine.gps?`<button data-crr="next" class="crnav-preview-step" type="button">${safe(word('nextStep'))} →</button>`:''}</div></div>
    </div>`;
  };
  // Observe the map lifecycle exposed by the routing add-on. Do not modify its calculations.
  let leafRef=engine.leaf;
  Object.defineProperty(engine,'leaf',{configurable:true,enumerable:true,get(){return leafRef;},set(next){leafRef=next;if(next?.map)setTimeout(()=>setupMap(next),0);}});
  let gpsRef=engine.gps;
  Object.defineProperty(engine,'gps',{configurable:true,enumerable:true,get(){return gpsRef;},set(next){gpsRef=next;if(next)setTimeout(refreshGPS,0);}});
  function nearRoute(point,coords){
    if(!Array.isArray(point)||point.length<2 || !Number.isFinite(+point[0])||!Number.isFinite(+point[1]))return Infinity;
    let min=Infinity;
    for(let i=1;i<coords.length;i++){const d=project(point,coords[i-1],coords[i]).distance;if(d<min)min=d;}
    return min;
  }
  function iconMarker(kind,count=0){const color=colors[kind];return L.divIcon({className:'crnav-pin-wrap',html:`<div class="crnav-pin" style="--pin:${color}">${markerSvg(kind)}${count>1?`<span>${count}</span>`:''}</div>`,iconSize:[32,32],iconAnchor:[16,30],popupAnchor:[0,-29]});}
  function addPin(group,kind,row,map,count=0){
    const title=safe(row.name||word(kind)),name=word(kind),url='https://open-data.dortmund.de/explore/dataset/'+sources[kind]+'/';
    const countNote=count>1?`${count} ${word('trees')} (${lang()==='de'?'geladene Einträge':'loaded records'})`:name;
    const popup=`<div class="crnav-popup"><strong>${title}</strong><p>${safe(countNote)}</p><a href="${url}" target="_blank" rel="noopener noreferrer">Dortmund Open Data ↗</a></div>`;
    L.marker(row.at,{icon:iconMarker(kind,count),title:row.name||name,keyboard:true}).bindPopup(popup).addTo(group);
  }
  function drawLayer(kind,group,map,route){
    const source=engine.sources?.[kind];if(!source?.ok)return;
    const rows=(engine.features?.[kind]||[]).filter(p=>p.at&&nearRoute(p.at,route.coords)<(kind==='trees'?75:kind==='water'?115:160));
    if(kind==='trees'){
      // Grid-cluster the *returned* municipal records to avoid hundreds of markers.
      const cells=new Map();for(const row of rows){const key=Math.round(row.at[0]*1000)+','+Math.round(row.at[1]*1000);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(row);}
      const groups=[...cells.values()].sort((a,b)=>b.length-a.length).slice(0,24);
      for(const trees of groups){const pos=[trees.reduce((s,p)=>s+p.at[0],0)/trees.length,trees.reduce((s,p)=>s+p.at[1],0)/trees.length],row={at:pos,name:trees.length===1?trees[0].name:trees.length+' '+word('trees')};
        // Visual highlight is a vicinity cue, not a claimed canopy footprint.
        L.circle(pos,{pane:'crnav-shade-pane',radius:20,color:'#62a980',weight:0,fillColor:'#46ba78',fillOpacity:.16,interactive:false}).addTo(group);
        addPin(group,kind,row,map,trees.length);
      }
    } else {
      for(const row of rows.slice(0,50)){
        if(kind==='shade')L.circle(row.at,{pane:'crnav-shade-pane',radius:32,color:'#5cae81',weight:0,fillColor:'#4eb985',fillOpacity:.17,interactive:false}).addTo(group);
        addPin(group,kind,row,map);
      }
    }
  }
  function setLayers(){if(!currentLayers||state.screen!=='navigation')return;const {map,groups,route}=currentLayers;for(const kind of categories){const group=groups[kind];group.clearLayers();if(config[kind])drawLayer(kind,group,map,route);}}
  function setupMap(ref){
    if(state.screen!=='navigation'||!ref.map||!ref.map.getContainer()?.isConnected)return;
    const r=curRoute();if(!r)return;
    const map=ref.map;
    if(!map.getPane('crnav-shade-pane'))map.createPane('crnav-shade-pane');map.getPane('crnav-shade-pane').style.zIndex=310;
    const groups={};for(const cat of categories)groups[cat]=L.layerGroup().addTo(map);
    currentLayers={map,groups,route:r};setLayers();
    // Keep the existing street tiles; mute saturation to emphasize routes and environmental pins.
    if(engine.gps)map.setView(engine.gps,17,{animate:false});
    else map.fitBounds(L.latLngBounds(r.coords),{paddingTopLeft:[35,190],paddingBottomRight:[35,205],maxZoom:16,animate:false});
    map.invalidateSize();
    // Attribution remains in Leaflet's built-in control.
    refreshGPS();
  }
  function refreshGPS(){
    if(state.screen!=='navigation')return;
    const r=curRoute();if(!r)return;
    const inst=instructions(r),progress=pathProgress(r.coords,engine.gps);
    const turn=document.querySelector('.crnav-turn-content p');if(turn)turn.textContent=inst.text;
    const distance=document.querySelector('.crnav-next-distance');if(distance)distance.textContent=inst.distance===null?word('next'):fmt(inst.distance);
    const status=document.querySelector('.crnav-status');if(status)status.textContent=inst.off?word('off'):(engine.gps?word('ready'):word('noLocation'));
    const remain=document.querySelector('.crnav-distance');if(remain&&progress)remain.textContent=fmt(Math.min(r.km*1000,Math.max(0,r.km*1000*progress.remaining/Math.max(1,progress.total))))+' '+word('left');
    const eta=document.querySelector('.crnav-remaining strong');if(eta&&progress)eta.textContent=Math.max(1,Math.ceil(r.minutes*progress.remaining/Math.max(1,progress.total)))+' min';
    if(engine.gps&&engine.leaf?.map===currentLayers?.map&&progress?.distance<180){try{currentLayers.map.panTo(engine.gps,{animate:true,duration:.3});}catch{}}
  }
  app.addEventListener('click',event=>{
    const button=event.target.closest('button[data-crnav]');if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(state.screen!=='navigation')return;
    const action=button.dataset.crnav;
    if(action==='layers'){
      const chips=document.querySelector('.crnav-chips');if(!chips)return;
      chips.hidden=!chips.hidden;button.setAttribute('aria-expanded',String(!chips.hidden));
    }
    if(action==='toggle'){
      const kind=button.dataset.kind;if(!categories.includes(kind))return;
      config[kind]=!config[kind];button.classList.toggle('active',config[kind]);button.setAttribute('aria-pressed',String(config[kind]));setLayers();
    }
    if(action==='recenter'){
      const m=engine.leaf?.map;if(!m)return;
      if(engine.gps)m.setView(engine.gps,17,{animate:true});
      else{const r=curRoute();if(r)m.fitBounds(L.latLngBounds(r.coords),{paddingTopLeft:[25,185],paddingBottomRight:[25,200],maxZoom:16});}
    }
  },true);
  window.CoolRouteNavigation={version:'1.0',config,refresh:setLayers,pathProgress};
})();
