/* CoolRoute Smooth Navigation 2.0
 * An efficient view of the EXISTING routing engine. No calculated route scores are changed.
 * Environmental markers only come from the municipal data already loaded by CoolRouteRouting.
 */
(() => {
  'use strict';
  if (!window.CoolRouteRouting || !window.L || typeof screenNavigation !== 'function' || !document.getElementById('app')) {
    console.warn('Smooth Navigation: missing CoolRouteRouting, Leaflet, or app.');
    return;
  }
  const engine = window.CoolRouteRouting;
  const app = document.getElementById('app');
  const i18n = {
    en: {nav:'Navigation',next:'Next turn',preview:'Route preview',locating:'Finding your location…',gps:'GPS',follow:'Recenter',pause:'Map unlocked',end:'End',left:'remaining',water:'Water',indoor:'Cool places',trees:'Trees',shade:'Shaded places',facilities:'Places',noData:'No mapped places available',off:'You appear to be off the route',nearWater:'Drinking fountain nearby',nearShade:'Shaded place nearby',nearIndoor:'Cool place nearby',recalc:'Recalculate from here',estimated:'Time estimate',progress:'Route progress',manual:'Next instruction',heat:'Experimental shade model',select:'Choose a walking route first'},
    de: {nav:'Navigation',next:'Nächste Abbiegung',preview:'Wegvorschau',locating:'Standort wird gesucht…',gps:'GPS',follow:'Zentrieren',pause:'Karte frei',end:'Beenden',left:'verbleibend',water:'Wasser',indoor:'Kühle Orte',trees:'Bäume',shade:'Schattenplätze',facilities:'Orte',noData:'Keine Orte in den Daten',off:'Du bist vermutlich abseits der Route',nearWater:'Trinkbrunnen in der Nähe',nearShade:'Schattenplatz in der Nähe',nearIndoor:'Kühler Ort in der Nähe',recalc:'Ab hier neu berechnen',estimated:'Geschätzte Zeit',progress:'Wegfortschritt',manual:'Nächster Schritt',heat:'Experimentelles Schattenmodell',select:'Bitte zuerst einen Fußweg wählen'},
    simple: {nav:'Navigation',next:'Gleich abbiegen',preview:'Weg ansehen',locating:'Wir suchen deinen Ort…',gps:'GPS',follow:'Meinen Ort zeigen',pause:'Karte bewegen',end:'Stopp',left:'noch',water:'Trinken',indoor:'Kühle Orte',trees:'Bäume',shade:'Schatten',facilities:'Orte',noData:'Keine Orte gefunden',off:'Du bist vielleicht nicht mehr auf dem Weg',nearWater:'Wasser in der Nähe',nearShade:'Schatten in der Nähe',nearIndoor:'Kühler Ort in der Nähe',recalc:'Neuen Weg suchen',estimated:'Ungefähre Zeit',progress:'So weit bist du',manual:'Nächster Schritt',heat:'Schatten ist geschätzt',select:'Such zuerst einen Weg'}
  };
  function lang(){ try { return localStorage.getItem('cr-hack-lang') || 'en'; }catch { return 'en'; } }
  function tr(k){ return (i18n[lang()] || i18n.en)[k] || i18n.en[k] || k; }
  function html(x){return String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  const kinds=['water','indoor','trees','shade'];
  const palette={water:'#187ed0',indoor:'#7351b3',trees:'#12835e',shade:'#2b8b68'};
  const datasets={water:'trinkwasserbrunnen',indoor:'kuhle-innenraume',trees:'baumkataster',shade:'fb60-schattenplatze'};
  const symbols={water:'💧',indoor:'⌂',trees:'♣',shade:'☂'};
  const chosen={water:true,indoor:true,trees:false,shade:false};
  const geoRad=Math.PI/180;
  const distance=(a,b)=>{const dlat=(b[0]-a[0])*geoRad,dlon=(b[1]-a[1])*geoRad,la=a[0]*geoRad,lb=b[0]*geoRad,s=Math.sin(dlat/2)**2+Math.cos(la)*Math.cos(lb)*Math.sin(dlon/2)**2;return 12742000*Math.asin(Math.min(1,Math.sqrt(s)));};
  const fmt=m=>m>=1000?(m/1000).toFixed(1)+' km':Math.max(0,Math.round(m/10)*10)+' m';
  const route=()=>engine.routeList?.find(r=>r.id===state.selectedRoute) || engine.routeList?.[0];
  let active=null, pendingGPS=false, follow=true, manuallyMovedAt=0, lastCamera=0, pendingOverlays=null, rerouteOffers=0;
  const routeCache=new WeakMap();
  function geometry(r){
    if(routeCache.has(r))return routeCache.get(r);
    const coords=r.coords||[],lengths=[],starts=[];let full=0;
    for(let i=0;i<coords.length-1;i++){starts.push(full);let step=distance(coords[i],coords[i+1]);lengths.push(step);full+=step;}
    const data={coords,lengths,starts,full,maneuvers:(r.maneuvers||[]).map(m=>({...m,offset:starts[Math.min(Math.max(0,m.index),starts.length-1)]||0}))};
    routeCache.set(r,data);return data;
  }
  function closest(point,a,b){
    const x=111320*Math.cos(point[0]*geoRad),y=111320;
    const ax=(a[1]-point[1])*x,ay=(a[0]-point[0])*y;
    const vx=(b[1]-a[1])*x,vy=(b[0]-a[0])*y;
    const vv=vx*vx+vy*vy, t=vv?Math.max(0,Math.min(1,-(ax*vx+ay*vy)/vv)):0;
    return {meters:Math.hypot(ax+vx*t,ay+vy*t),t};
  }
  function progress(r,p){
    if(!r?.coords?.length || !p)return null;
    const g=geometry(r);let nearest={meters:Infinity,along:0,index:0};
    for(let i=0;i<g.lengths.length;i++){
      const v=closest(p,g.coords[i],g.coords[i+1]);
      if(v.meters<nearest.meters)nearest={meters:v.meters,along:g.starts[i]+v.t*g.lengths[i],index:i};
    }
    return {...nearest,full:g.full,remaining:Math.max(0,g.full-nearest.along)};
  }
  function currentTurn(r,p){
    const steps=geometry(r).maneuvers, preview=Math.min(Math.max(0,engine.liveInstruction||0),Math.max(0,steps.length-1));
    if(!steps.length)return {text:tr('nav'),meters:null};
    if(!p)return {text:steps[preview].instruction,meters:null};
    const next=steps.find(m=>m.offset>p.along+5) || steps[steps.length-1];
    return {text:next.instruction || tr('nav'),meters:Math.max(0,next.offset-p.along)};
  }
  function labelForRoute(r){return r.id==='shade'?(lang()==='de'?'Schatten-Alternative':'Cooler candidate'):r.id==='balanced'?(lang()==='de'?'Ausgewogen':'Balanced'):(lang()==='de'?'Schnellster Weg':'Fastest');}
  const legacyNavigation=screenNavigation;
  screenNavigation=function(){
    const r=route(); if(!r)return legacyNavigation();
    const p=progress(r,engine.gps),turn=currentTurn(r,p);
    const remaining=p?Math.min(r.km*1000,r.km*1000*p.remaining/Math.max(1,p.full)):r.km*1000;
    const mins=p?Math.max(1,Math.ceil(r.minutes*remaining/Math.max(1,r.km*1000))):r.minutes;
    return `<div class="page crr-page crr-map-page crnav-page" aria-label="${html(tr('nav'))}">
      <div class="crr-map-wrap crnav-map-wrap"><div id="crr-live-route-map" class="crr-real-map" role="application" aria-label="Walking route map"></div></div>
      <div class="crnav-instruction"><div class="crr-nav-banner"><span class="crnav-turn-icon" aria-hidden="true">↱</span><div class="crnav-turn-content"><strong class="crnav-next-distance">${turn.meters==null?html(tr('preview')):fmt(turn.meters)}</strong><p>${html(turn.text)}</p></div></div></div>
      <div class="crnav-facility-control"><button class="crnav-places-button" type="button" data-crnav="places" aria-expanded="false">♣ ${html(tr('facilities'))} <span aria-hidden="true">⌄</span></button><span class="crnav-nearby" hidden></span><div class="crnav-places-panel" hidden>${kinds.map(k=>`<button type="button" data-crnav="toggle" data-kind="${k}" aria-pressed="${chosen[k]}" class="crnav-filter ${chosen[k]?'on':''}"><span style="color:${palette[k]}">${symbols[k]}</span>${html(tr(k))}</button>`).join('')}</div></div>
      <button type="button" class="crnav-recenter" data-crnav="recenter" title="${html(tr('follow'))}" aria-label="${html(tr('follow'))}">⌖</button>
      <div class="crnav-offroute" hidden><span>${html(tr('off'))}</span><button type="button" data-crnav="recalculate">${html(tr('recalc'))}</button></div>
      <div class="crr-sheet crr-nav-sheet crnav-bottom"><div class="crnav-bottom-row"><div class="crnav-remaining"><strong>${mins} min</strong><span class="crnav-distance">${fmt(remaining)} ${html(tr('left'))}</span></div><button type="button" class="crnav-end" data-crr="end">${html(tr('end'))}</button></div><div class="crnav-summary"><span>${html(labelForRoute(r))}</span><span class="crnav-gps-status">${html(engine.gps?tr('gps'):tr('locating'))}</span></div>${!engine.gps?`<button type="button" class="crnav-preview" data-crr="next">${html(tr('manual'))} →</button>`:''}</div>
    </div>`;
  };
  // Reduce the cost of map creation in BOTH Map and Navigation screens. No new provider/API required.
  if(!L.__coolrouteSmoothOptimized){
    const oldMap=L.map.bind(L),oldTile=L.tileLayer.bind(L);
    L.map=function(node,options={}){
      const target=typeof node==='string'?node:node?.id;
      const isRoute=target==='crr-live-route-map';
      return oldMap(node,{preferCanvas:true,inertia:true,inertiaDeceleration:2800,zoomAnimation:true,fadeAnimation:true,
        ...options,...(isRoute?{scrollWheelZoom:true,tap:false,zoomSnap:1}:{})});
    };
    L.tileLayer=function(url,options={}){
      if(typeof url==='string'&&url.includes('tile.openstreetmap.org'))return oldTile(url,{updateWhenIdle:true,updateWhenZooming:false,keepBuffer:2,updateInterval:250,...options});
      return oldTile(url,options);
    };
    L.__coolrouteSmoothOptimized=true;
  }
  // Monitor when the existing routing engine creates or replaces a Leaflet map.
  let leaf=engine.leaf;
  Object.defineProperty(engine,'leaf',{configurable:true,enumerable:true,get(){return leaf;},set(next){leaf=next;if(next?.map)setTimeout(()=>setup(next),0);}});
  let gps=engine.gps;
  Object.defineProperty(engine,'gps',{configurable:true,enumerable:true,get(){return gps;},set(next){gps=next;if(next&&!pendingGPS){pendingGPS=true;requestAnimationFrame(()=>{pendingGPS=false;onPosition();});}}});
  function pauseFollow(){follow=false;manuallyMovedAt=performance.now();document.querySelector('.crnav-recenter')?.classList.add('paused');}
  function makeSmoothMarker(map,start){
    let initialized=false, raf=0;
    const el=L.divIcon({className:'crnav-location-marker',html:'<span class="crnav-location-pulse"><span class="crnav-location-dot"></span></span>',iconSize:[28,28],iconAnchor:[14,14]});
    const marker=L.marker(start,{icon:el,interactive:false,zIndexOffset:1000,opacity:0}).addTo(map);
    const direct=marker.setLatLng.bind(marker);
    marker.setLatLng=function(latlng){
      const dest=Array.isArray(latlng)?latlng:[latlng.lat,latlng.lng];
      cancelAnimationFrame(raf);
      const from=marker.getLatLng(); const fromArray=[from.lat,from.lng];
      if(!initialized||distance(fromArray,dest)>140){initialized=true;marker.setOpacity(1);direct(dest);return marker;}
      const begin=performance.now(),dur=520;
      function frame(now){if(!map.getContainer()?.isConnected)return;const u=Math.min(1,(now-begin)/dur),k=1-(1-u)**3;
        direct([fromArray[0]+(dest[0]-fromArray[0])*k,fromArray[1]+(dest[1]-fromArray[1])*k]);
        if(u<1)raf=requestAnimationFrame(frame);
      }
      raf=requestAnimationFrame(frame);return marker;
    };
    map.on('unload',()=>cancelAnimationFrame(raf));
    return marker;
  }
  function setup(ref){
    if(state.screen!=='navigation'||!ref.map||!ref.map.getContainer()?.isConnected)return;
    if(active?.map===ref.map)return;
    const map=ref.map,r=route();if(!r)return;
    active={map,route:r,layers:{},built:new Set(),building:new Set(),generation:Date.now()};
    follow=true;rerouteOffers=0;lastCamera=0;
    map.on('dragstart',pauseFollow);
    // On wheel/pinch zoom, leave the user's chosen viewport alone.
    map.on('zoomstart',()=>{if(!active?.cameraUpdating)pauseFollow();});
    map.on('unload',()=>{if(active?.map===map){active=null;}});
    active.cameraUpdating=true;
    if(!engine.gps){map.fitBounds(L.latLngBounds(r.coords),{paddingTopLeft:[20,160],paddingBottomRight:[20,165],maxZoom:16,animate:false});}
    else map.setView(engine.gps,17,{animate:false});
    map.invalidateSize({pan:false});
    follow=true; setTimeout(()=>{if(active?.map===map)active.cameraUpdating=false;},650);
    const marker=makeSmoothMarker(map,engine.gps||r.coords[0]);
    ref.gps=marker;
    // Existing GPS engine updates this marker, while we smooth marker movement and throttle camera panning.
    if(engine.gps)marker.setLatLng(engine.gps);
    const id=active.generation;
    // Defer optional point-of-interest markers until the map is responsive.
    const after=()=>{if(active?.generation===id)for(const k of kinds)if(chosen[k])ensureLayer(k);};
    if('requestIdleCallback' in window)requestIdleCallback(after,{timeout:1000});else setTimeout(after,240);
    updateText();
  }
  function pointNearRoute(point,coords,limit){
    if(!point || point.length!==2 || !Number.isFinite(+point[0]) || !Number.isFinite(+point[1]))return Infinity;
    const p=[+point[0],+point[1]];let best=Infinity;
    // Fast preliminary bounding check (in degrees) before projecting route segments.
    const degrees=limit/105000;
    for(let j=0;j<coords.length-1;j++){
      const a=coords[j],b=coords[j+1];
      if(p[0]<Math.min(a[0],b[0])-degrees||p[0]>Math.max(a[0],b[0])+degrees||p[1]<Math.min(a[1],b[1])-degrees*2||p[1]>Math.max(a[1],b[1])+degrees*2)continue;
      best=Math.min(best,closest(p,a,b).meters);
      if(best<limit*.3)break;
    }
    return best;
  }
  function pinIcon(kind,n){
    return L.divIcon({className:'crnav-point-wrap',html:`<div class="crnav-point" style="--point:${palette[kind]}">${symbols[kind]}${n>1?`<small>${n}</small>`:''}</div>`,iconSize:[29,29],iconAnchor:[14,14]});
  }
  function ensureLayer(kind){
    const ctx=active;if(!ctx||ctx.built.has(kind)||ctx.building.has(kind))return;
    if(!engine.sources?.[kind]?.ok){ctx.built.add(kind);return;}
    ctx.building.add(kind);
    const rows=engine.features?.[kind]||[],r=ctx.route;
    // Limit work and displayed items, even when the original API returns thousands of trees.
    const maxScan=kind==='trees'?1250:400, nearby=[];
    for(const row of rows.slice(0,maxScan)){
      const separation=pointNearRoute(row.at,r.coords,kind==='trees'?45:kind==='shade'?95:130);
      if(Number.isFinite(separation) && separation<(kind==='trees'?45:kind==='shade'?95:130))nearby.push({row,separation});
    }
    nearby.sort((a,b)=>a.separation-b.separation);
    const group=L.layerGroup(),countLimit={water:6,indoor:6,trees:6,shade:4}[kind];
    let selections=[];
    if(kind==='trees'){
      const clusters=new Map();
      for(const o of nearby){const [lat,lon]=o.row.at,key=Math.round(lat*1300)+':'+Math.round(lon*850);
        let c=clusters.get(key);if(!c){c={lat:0,lon:0,n:0,d:o.separation,name:o.row.name};clusters.set(key,c);}
        c.n++;c.lat+=lat;c.lon+=lon;c.d=Math.min(c.d,o.separation);
      }
      selections=[...clusters.values()].sort((a,b)=>b.n-a.n||a.d-b.d).slice(0,countLimit).map(c=>({row:{at:[c.lat/c.n,c.lon/c.n],name:c.n===1?c.name:`${c.n} ${tr('trees')}`},n:c.n}));
    }else{
      for(const o of nearby){if(selections.length>=countLimit)break;
        if(selections.some(x=>distance(x.row.at,o.row.at)<(kind==='shade'?50:24)))continue;
        selections.push({row:o.row,n:1});
      }
    }
    for(const {row,n} of selections){
      const at=row.at,name=html(row.name||tr(kind)),url='https://open-data.dortmund.de/explore/dataset/'+datasets[kind]+'/';
      const popup=`<strong>${name}</strong><p>${html(tr(kind))}${n>1?' · '+n+' mapped records':''}</p><a target="_blank" rel="noopener noreferrer" href="${url}">Dortmund Open Data ↗</a>`;
      L.marker(at,{icon:pinIcon(kind,n),title:row.name||tr(kind),keyboard:true}).bindPopup(popup).addTo(group);
    }
    ctx.building.delete(kind);ctx.built.add(kind);ctx.layers[kind]=group;
    if(active===ctx && chosen[kind])group.addTo(ctx.map);
  }
  function toggle(kind){
    if(!kinds.includes(kind))return;chosen[kind]=!chosen[kind];
    if(!active)return;
    if(chosen[kind]){ensureLayer(kind);if(active.layers[kind]&&!active.map.hasLayer(active.layers[kind]))active.layers[kind].addTo(active.map);}
    else if(active.layers[kind])active.map.removeLayer(active.layers[kind]);
  }
  let lastNearbyCheck=0;
  function updateNearby(){
    const el=app.querySelector('.crnav-nearby');if(!el||!engine.gps)return;
    if(performance.now()-lastNearbyCheck<2000)return;
    lastNearbyCheck=performance.now();
    // GPS-based proximity only. No claim of verified route coverage or current opening hours.
    let text='';
    for(const [kind,key,limit] of [['water','nearWater',75],['shade','nearShade',48],['indoor','nearIndoor',75]]){
      if(!engine.sources?.[kind]?.ok)continue;
      if((engine.features?.[kind]||[]).slice(0,300).some(v=>Array.isArray(v.at)&&distance(engine.gps,v.at)<limit)){
        text=tr(key);break;
      }
    }
    el.hidden=!text;if(text)el.textContent=text;
  }
  function updateText(){
    if(state.screen!=='navigation')return;
    const r=route();if(!r)return;
    const p=progress(r,engine.gps),inst=currentTurn(r,p);
    const set=(sel,value)=>{const el=app.querySelector(sel);if(el&&el.textContent!==value)el.textContent=value;};
    set('.crnav-next-distance',inst.meters==null?tr('preview'):fmt(inst.meters));
    set('.crnav-turn-content p',inst.text||tr('nav'));
    set('.crnav-gps-status',engine.gps?tr('gps'):tr('locating'));
    if(p){
      const rem=Math.min(r.km*1000,r.km*1000*p.remaining/Math.max(1,p.full));
      set('.crnav-distance',fmt(rem)+' '+tr('left'));
      set('.crnav-remaining strong',Math.max(1,Math.ceil(r.minutes*rem/Math.max(1,r.km*1000)))+' min');
      if(p.meters>85)rerouteOffers++;else rerouteOffers=0;
      const o=app.querySelector('.crnav-offroute');if(o)o.hidden=rerouteOffers<2;
    }
  }
  function onPosition(){
    if(state.screen!=='navigation')return;
    updateText();updateNearby();
    const ctx=active,p=engine.gps;if(!ctx?.map || !p || !ctx.map.getContainer()?.isConnected)return;
    // Do not fight the user's gestures. Follow only while enabled, no more than once per ~1.4s.
    if(!follow || performance.now()-lastCamera<1400 || performance.now()-manuallyMovedAt<2500)return;
    if(distance(p,[ctx.map.getCenter().lat,ctx.map.getCenter().lng])<24)return;
    lastCamera=performance.now();ctx.cameraUpdating=true;
    ctx.map.panTo(p,{animate:true,duration:.55,easeLinearity:.35});
    setTimeout(()=>{if(active===ctx)ctx.cameraUpdating=false;},750);
  }
  app.addEventListener('click',e=>{
    const button=e.target.closest('button[data-crnav]');if(!button||state.screen!=='navigation')return;
    e.preventDefault();e.stopImmediatePropagation();
    const action=button.dataset.crnav;
    if(action==='places'){
      const panel=app.querySelector('.crnav-places-panel');if(!panel)return;
      panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));
    }
    if(action==='toggle'){
      const kind=button.dataset.kind;toggle(kind);
      button.classList.toggle('on',chosen[kind]);button.setAttribute('aria-pressed',String(chosen[kind]));
    }
    if(action==='recenter'){
      const m=active?.map;if(!m)return;
      follow=true;button.classList.remove('paused');
      if(engine.gps){active.cameraUpdating=true;m.setView(engine.gps,17,{animate:true,duration:.45});setTimeout(()=>{if(active)active.cameraUpdating=false;},650);}
      else if(route())m.fitBounds(L.latLngBounds(route().coords),{padding:[45,35],maxZoom:16,animate:true});
    }
    if(action==='recalculate'){
      if(!engine.gps)return;
      // Offer *real* rerouting from the current GPS coordinate; never silently jump to a sample route.
      const where=engine.gps.slice();
      if(engine.watch!==null){navigator.geolocation?.clearWatch(engine.watch);engine.watch=null;}
      engine.gpsOn=false;engine.origin=where;
      // Existing app's delegated handler performs the network request.
      const start=document.createElement('button');start.type='button';start.dataset.crr='calculate';start.hidden=true;app.appendChild(start);start.click();start.remove();
    }
  },true);
  window.CoolRouteNavigation={version:'2.0-smooth',recenter:()=>app.querySelector('[data-crnav="recenter"]')?.click(),refresh:()=>{for(const k of kinds)if(chosen[k])ensureLayer(k);},progress};
})();
