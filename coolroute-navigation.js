/* CoolRoute navigation: compatible 3D adaptation of the supplied navigation3d.js.
   Uses the CURRENT CoolRouteRouting object and its Valhalla route geometry.
   It intentionally does NOT require CoolRouteNavigationCore/NavData/NavText/NavPreferences.
   Uses one GPS watcher. Leaflet remains the fallback when MapLibre/WebGL is unavailable.
*/
(() => {
  'use strict';
  const engine = window.CoolRouteRouting;
  const app = document.getElementById('app');
  if (!engine || !app || typeof screenNavigation !== 'function') {
    console.warn('CoolRoute 3D: routing engine or app is unavailable.');
    return;
  }
  const DICT = {
    en: { title:'Walking navigation', start:'Start navigation', preview:'Preview route', previewMode:'Route preview', gps:'GPS navigation', locating:'Finding your location…', denied:'Location unavailable. You can still preview the route.', end:'End', back:'Back', recenter:'Follow my location', three:'3D', two:'2D', remaining:'remaining', map:'Map', layers:'Places', water:'Water', cool:'Cool places', trees:'Trees', shade:'Shaded places', next:'Next step', previous:'Previous step', off:'You are away from this route.', reroute:'Plan from my position', arrived:'You have arrived.', notfound:'Please calculate a route first.', source:'Dortmund Open Data', noWebgl:'2D map mode', noMap:'Map unavailable', accuracy:'GPS accuracy', waiting:'Waiting for location permission…', estimated:'Estimated walking time', zoomIn:'Zoom in', zoomOut:'Zoom out',weakGPS:'GPS accuracy is too low. Move outdoors and wait.',staleGPS:'Waiting for a fresh GPS position…',gpsJump:'GPS jumped. Waiting for a stable position…',continue:'Continue toward your destination.',nearUnconfirmed:'Near destination · not yet confirmed'},
    de: { title:'Navigation zu Fuß', start:'Navigation starten', preview:'Wegvorschau', previewMode:'Wegvorschau', gps:'GPS-Navigation', locating:'Standort wird gesucht…', denied:'Standort nicht verfügbar. Du kannst die Route ansehen.', end:'Beenden', back:'Zurück', recenter:'Standort folgen', three:'3D', two:'2D', remaining:'verbleibend', map:'Karte', layers:'Orte', water:'Wasser', cool:'Kühle Orte', trees:'Bäume', shade:'Schatten', next:'Nächste Anweisung', previous:'Vorherige', off:'Du bist von der Route entfernt.', reroute:'Ab hier planen', arrived:'Ziel erreicht.', notfound:'Bitte zuerst eine Route berechnen.', source:'Dortmund Open Data', noWebgl:'2D-Kartenansicht', noMap:'Karte nicht verfügbar', accuracy:'GPS-Genauigkeit', waiting:'Warten auf Standortfreigabe…', estimated:'Geschätzte Gehzeit', zoomIn:'Vergrößern', zoomOut:'Verkleinern',weakGPS:'GPS ist zu ungenau. Bitte im Freien warten.',staleGPS:'Warte auf einen aktuellen GPS-Standort…',gpsJump:'GPS-Sprung erkannt. Warte auf ein stabiles Signal…',continue:'Weiter in Richtung Ziel gehen.',nearUnconfirmed:'In Zielnähe · noch nicht bestätigt'},
    simple: { title:'So gehst du', start:'Mit GPS starten', preview:'Weg ansehen', previewMode:'Weg ansehen', gps:'GPS an', locating:'Wir suchen deinen Ort…', denied:'Dein Standort geht nicht. Du kannst den Weg ansehen.', end:'Stopp', back:'Zurück', recenter:'Mein Ort', three:'3D', two:'2D', remaining:'noch', map:'Karte', layers:'Orte', water:'Trinken', cool:'Kühle Orte', trees:'Bäume', shade:'Schatten', next:'Weiter', previous:'Zurück', off:'Du bist nicht auf dem Weg.', reroute:'Neuen Weg suchen', arrived:'Du bist da.', notfound:'Suche zuerst einen Weg.', source:'Dortmund Open Data', noWebgl:'Karte in 2D', noMap:'Karte geht nicht', accuracy:'GPS', waiting:'Wir warten auf GPS…', estimated:'Ungefähre Gehzeit', zoomIn:'Größer', zoomOut:'Kleiner',weakGPS:'GPS ist nicht genau genug. Bitte draußen warten.',staleGPS:'Wir warten auf GPS…',gpsJump:'GPS hat sich stark verschoben. Bitte warten.',continue:'Geh weiter zu deinem Ziel.',nearUnconfirmed:'Du bist nah am Ziel. Wir prüfen noch.'}
  };
  const colors = {water:'#187ed0',cool:'#754fa3',trees:'#1b8064',shade:'#2f9476'};
  const icons = {water:'●',cool:'⌂',trees:'♣',shade:'☘'};
  const dataset = {water:'trinkwasserbrunnen',cool:'kuhle-innenraume',trees:'baumkataster',shade:'fb60-schattenplatze'};
  const state3d={live:false,watchId:null,epoch:0,position:null,accuracy:null,heading:null,step:0,follow:true,tilted:true,mode:'loading',error:'',arrived:false,offRoute:0,lastCamera:0,loadedRoute:null,previewIndex:0,layers:{water:true,cool:true,trees:false,shade:false}};
  let map=null, mapMarker=null, mapContainer=null, leafletLayers=[], glReady=false, fallbackTimer=null, progressCache=new WeakMap();
  const rad = Math.PI/180;
  const tr = k => {let key='en';try{key=localStorage.getItem('cr-hack-lang')||'en';}catch{}return (DICT[key]||DICT.en)[k]||DICT.en[k]||k;};
  const esc = v=>String(v??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const route=()=>engine.routeList?.find(r=>r.id===state.selectedRoute)||engine.routeList?.[0]||null;
  const goodRoute = r=>r && Array.isArray(r.coords) && r.coords.length>=2 && r.coords.every(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
  function meters(a,b){const dlat=(b[0]-a[0])*rad,dlon=(b[1]-a[1])*rad,q=Math.sin(dlat/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dlon/2)**2;return 12742000*Math.asin(Math.min(1,Math.sqrt(q)));}
  function geometry(r){if(progressCache.has(r))return progressCache.get(r);const lengths=[],start=[0];for(let i=0;i<r.coords.length-1;i++){lengths.push(meters(r.coords[i],r.coords[i+1]));start.push(start[i]+lengths[i]);}const obj={lengths,start,total:start[start.length-1]};progressCache.set(r,obj);return obj;}
  function projected(r,p){if(!goodRoute(r)||!p)return null;let best={gap:Infinity,along:0};const g=geometry(r),mx=111320*Math.cos(p[0]*rad),my=111320;
    for(let i=0;i<r.coords.length-1;i++){const a=r.coords[i],b=r.coords[i+1],ax=(a[1]-p[1])*mx,ay=(a[0]-p[0])*my,vx=(b[1]-a[1])*mx,vy=(b[0]-a[0])*my,tt=vx*vx+vy*vy,part=tt?Math.max(0,Math.min(1,-(ax*vx+ay*vy)/tt)):0;const gap=Math.hypot(ax+vx*part,ay+vy*part);if(gap<best.gap)best={gap,along:g.start[i]+part*g.lengths[i]};}
    return {...best,remaining:Math.max(0,g.total-best.along),total:g.total};
  }
// GPS arrival guard: a single inaccurate fix must never complete navigation.
// The public geolocation API reports uncertainty as an accuracy radius in metres.
const GPS_TRACK_ACCURACY_M=45;
const GPS_ARRIVAL_ACCURACY_M=20;
const GPS_ARRIVAL_RADIUS_M=20;
const GPS_CONFIRM_FIXES=3;
const GPS_CONFIRM_SPAN_MS=2500;
function resetJourney(){
  state3d.position=null;state3d.accuracy=null;state3d.heading=null;
  state3d.arrived=false;state3d.offRoute=0;state3d.step=0;
  state3d.initialAlong=null;state3d.maxAlong=0;state3d.arrivalFixes=0;
  state3d.arrivalFirstAt=0;state3d.arrivalLastAt=0;
  state3d.lastTrustedPosition=null;state3d.lastTrustedAt=null;
}
function processArrivalFix(r,pos){
  const at=[pos.coords.latitude,pos.coords.longitude];
  const accuracy=Number(pos.coords.accuracy);
  if(!at.every(Number.isFinite)||!Number.isFinite(accuracy)||accuracy<0)return false;
  state3d.accuracy=accuracy;
  const recorded=Number(pos.timestamp);
  const now=Date.now();
  if(Number.isFinite(recorded)&&recorded>0&&now-recorded>30000){
    state3d.error=tr('staleGPS');return false;
  }
  if(accuracy>GPS_TRACK_ACCURACY_M){
    state3d.arrivalFixes=0;state3d.arrivalFirstAt=0;
    state3d.error=tr('weakGPS');return false;
  }
  const proj=projected(r,at);
  if(!proj)return false;
  // Ignore physically implausible GPS teleports. Allow GPS to settle on first fix.
  if(state3d.lastTrustedPosition&&state3d.lastTrustedAt){
    const elapsed=Math.max(1,(now-state3d.lastTrustedAt)/1000);
    if(meters(state3d.lastTrustedPosition,at)>Math.max(65,elapsed*12+accuracy*1.5)){
      state3d.arrivalFixes=0;state3d.arrivalFirstAt=0;
      state3d.error=tr('gpsJump');return false;
    }
  }
  state3d.position=at;
  state3d.heading=Number.isFinite(pos.coords.heading)?pos.coords.heading:null;
  state3d.lastTrustedPosition=at;
  state3d.lastTrustedAt=now;
  state3d.error='';
  if(proj.gap>Math.max(40,accuracy*1.5)){
    state3d.offRoute++;
    state3d.arrivalFixes=0;state3d.arrivalFirstAt=0;
    return true;
  }
  state3d.offRoute=0;
  if(state3d.initialAlong===null){
    state3d.initialAlong=proj.along;
    state3d.maxAlong=proj.along;
  }
  // GPS jitter cannot be mistaken for walking a meaningful part of the route.
  if(proj.along>state3d.maxAlong)state3d.maxAlong=proj.along;
  const walkedAlong=Math.max(0,state3d.maxAlong-state3d.initialAlong);
  const requiredProgress=Math.min(40,Math.max(12,proj.total*.25));
  const closeToDestination=meters(at,r.coords[r.coords.length-1])<=GPS_ARRIVAL_RADIUS_M;
  const eligible=accuracy<=GPS_ARRIVAL_ACCURACY_M&&proj.gap<=GPS_ARRIVAL_RADIUS_M&&
    proj.remaining<=GPS_ARRIVAL_RADIUS_M&&closeToDestination&&walkedAlong>=requiredProgress;
  if(!eligible){
    state3d.arrivalFixes=0;state3d.arrivalFirstAt=0;state3d.arrivalLastAt=0;
  }else if(!state3d.arrivalLastAt||now-state3d.arrivalLastAt>=900){
    state3d.arrivalFixes++;
    if(!state3d.arrivalFirstAt)state3d.arrivalFirstAt=now;
    state3d.arrivalLastAt=now;
    if(state3d.arrivalFixes>=GPS_CONFIRM_FIXES&&now-state3d.arrivalFirstAt>=GPS_CONFIRM_SPAN_MS){
      state3d.arrived=true;
    }
  }
  const turn=nextInstruction(r,proj);
  state3d.step=turn.step;
  return true;
}
  function maneuvers(r){return Array.isArray(r.maneuvers)?r.maneuvers:[];}
  function nextInstruction(r,proj){const steps=maneuvers(r);if(!steps.length)return {instruction:tr('title'),distance:null,step:0,type:1};if(!proj){const idx=Math.min(state3d.previewIndex,steps.length-1);return {...steps[idx],distance:null,step:idx};}
    const g=geometry(r);let idx=steps.length-1;for(let i=0;i<steps.length;i++){const d=g.start[Math.min(g.start.length-1,Math.max(0,Number(steps[i].index)||0))];if(d>proj.along+4){idx=i;break;}}const d=g.start[Math.min(g.start.length-1,Math.max(0,Number(steps[idx].index)||0))];return {...steps[idx],distance:Math.max(0,d-proj.along),step:idx};
  }
  function fmt(m){return m>=1000?(m/1000).toFixed(1)+' km':Math.max(0,Math.round(m/10)*10)+' m';}
  function turnSymbol(type){if([9,10,11,18,20,23,37].includes(type))return '↱';if([14,15,16,19,21,24,38].includes(type))return '↰';if([12,13].includes(type))return '↶';if([4,5,6].includes(type))return '⚑';return '↑';}
  function listPlaces(r){if(!goodRoute(r))return [];
    const found=[];
    const kindKeys={water:'water',cool:'indoor',trees:'trees',shade:'shade'};
    for(const kind of Object.keys(kindKeys)){
      if(!state3d.layers[kind])continue;
      const rows=engine.features?.[kindKeys[kind]]||[];
      for(const f of rows.slice(0,kind==='trees'?850:300)){
        if(!Array.isArray(f.at)||f.at.length<2)continue;
        let nearest=Infinity;
        // Coarse and bounded distance check; do not render every city-wide tree.
        const g=geometry(r);for(let i=0;i<r.coords.length-1;i+=Math.max(1,Math.floor(r.coords.length/160))){const a=r.coords[i],b=r.coords[Math.min(i+1,r.coords.length-1)];if(Math.abs(a[0]-f.at[0])>.004&&Math.abs(b[0]-f.at[0])>.004)continue;const proj=projectedSegment(a,b,f.at);nearest=Math.min(nearest,proj);if(nearest<12)break;}
        if(nearest<(kind==='trees'?45:kind==='shade'?90:115))found.push({kind,p:f.at,name:String(f.name||tr(kind)),dist:nearest});
        if(found.filter(v=>v.kind===kind).length>({water:10,cool:8,trees:10,shade:6}[kind]))break;
      }
    }
    return found;
  }
  function projectedSegment(a,b,p){const sx=111320*Math.cos(p[0]*rad),sy=111320,x=(a[1]-p[1])*sx,y=(a[0]-p[0])*sy,dx=(b[1]-a[1])*sx,dy=(b[0]-a[0])*sy,part=(dx*dx+dy*dy)?Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy))):0;return Math.hypot(x+part*dx,y+part*dy);}
  const gj = r=>({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:r.coords.map(p=>[p[1],p[0]])}});
  function placesGeoJSON(r){return {type:'FeatureCollection',features:listPlaces(r).map((f,i)=>({type:'Feature',id:i,properties:{kind:f.kind,name:f.name,dataset:dataset[f.kind]},geometry:{type:'Point',coordinates:[f.p[1],f.p[0]]}}))};}
  const originalNavigation=screenNavigation;
  screenNavigation=function(){const r=route();if(!goodRoute(r))return `<div class="page cr3d-page"><div class="cr3d-empty"><button type="button" data-cr3d="back">← ${esc(tr('back'))}</button><p>${esc(tr('notfound'))}</p></div></div>`;
    const fix=state3d.position,prog=fix?projected(r,fix):null,turn=nextInstruction(r,prog),remaining=prog?.remaining??r.km*1000;
    const minutes=prog?Math.max(1,Math.ceil(r.minutes*remaining/Math.max(1,geometry(r).total))):r.minutes;
    return `<div class="page cr3d-page" aria-label="${esc(tr('title'))}">
      <div id="cr3d-map" class="cr3d-map" role="region" aria-label="${esc(tr('map'))}"></div>
      <div class="cr3d-header"><button type="button" class="cr3d-round" data-cr3d="back" aria-label="${esc(tr('back'))}">←</button><span id="cr3d-mode" class="cr3d-mode">${esc(state3d.live?tr('gps'):tr('previewMode'))}</span></div>
      <div class="cr3d-direction" aria-live="polite"><span id="cr3d-arrow" class="cr3d-arrow">${turnSymbol(turn.type)}</span><div><strong id="cr3d-next">${turn.distance==null?'':fmt(turn.distance)}</strong><p id="cr3d-instruction" class="crnav-turn-content">${esc(turn.instruction||tr('title'))}</p></div></div>
      <div class="cr3d-controls"><button type="button" class="cr3d-round" data-cr3d="tilt" aria-label="${esc(tr(state3d.tilted?'two':'three'))}">${state3d.tilted?'2D':'3D'}</button><button type="button" class="cr3d-round" data-cr3d="follow" aria-label="${esc(tr('recenter'))}">⌖</button><button type="button" class="cr3d-round" data-cr3d="zoom-in" aria-label="${esc(tr('zoomIn'))}">+</button><button type="button" class="cr3d-round" data-cr3d="zoom-out" aria-label="${esc(tr('zoomOut'))}">−</button></div>
      <div class="cr3d-place-controls"><button type="button" class="cr3d-place-toggle" data-cr3d="places" aria-expanded="false">♣ ${esc(tr('layers'))}</button><div id="cr3d-place-list" class="cr3d-place-list" hidden>${Object.keys(state3d.layers).map(k=>`<button type="button" data-cr3d="layer" data-kind="${k}" aria-pressed="${state3d.layers[k]}">${icons[k]} ${esc(tr(k))}</button>`).join('')}</div></div>
      <div id="cr3d-offroute" class="cr3d-offroute" hidden><span>${esc(tr('off'))}</span><button type="button" data-cr3d="reroute">${esc(tr('reroute'))}</button></div>
      <div class="cr3d-bottom"><div class="cr3d-summary"><div><strong id="cr3d-eta">${minutes} min</strong><p id="cr3d-distance">${fmt(remaining)} ${esc(tr('remaining'))}</p><small id="cr3d-status">${esc(state3d.error|| (state3d.live?tr('locating'):tr('previewMode')))}</small></div><button type="button" data-cr3d="end" class="cr3d-end">${esc(tr('end'))}</button></div><div class="cr3d-preview-actions" ${state3d.live?'hidden':''}><button data-cr3d="previous" type="button">← ${esc(tr('previous'))}</button><button data-cr3d="next" type="button">${esc(tr('next'))} →</button><button data-cr3d="gps" type="button" class="cr3d-start">${esc(tr('start'))}</button></div></div>
    </div>`;
  };
  function releaseMap(){if(fallbackTimer){clearTimeout(fallbackTimer);fallbackTimer=null;}if(map){try{map.remove();}catch(e){console.warn('Map cleanup:',e.message);}}map=null;mapMarker=null;mapContainer=null;leafletLayers=[];glReady=false;state3d.mode='loading';}
  function stopGPS(){state3d.epoch++;if(state3d.watchId!==null){try{navigator.geolocation?.clearWatch(state3d.watchId);}catch{}state3d.watchId=null;}state3d.live=false;engine.gpsOn=false;}
  function leave(){stopGPS();releaseMap();resetJourney();state3d.error='';}
  function startGPS(){const r=route();if(!goodRoute(r))return;leave();state3d.loadedRoute=r;state3d.live=true;state3d.follow=true;state3d.previewIndex=0;state.screen='navigation';render();
    if(!navigator.geolocation || !window.isSecureContext){state3d.live=false;state3d.error=tr('denied');updateGuidance();displayStart();return;}
    engine.gpsOn=true;const epoch=++state3d.epoch;
    try{state3d.watchId=navigator.geolocation.watchPosition(pos=>{
      if(epoch!==state3d.epoch||state.screen!=='navigation')return;
      const at=[pos.coords.latitude,pos.coords.longitude];if(!at.every(Number.isFinite))return;
      // Only trusted fixes may advance instructions or establish arrival.
      const accepted=processArrivalFix(r,pos);
      if(accepted){engine.gps=state3d.position;engine.liveInstruction=state3d.step;}
      updateGuidance();if(accepted)updatePosition();
    },err=>{if(epoch!==state3d.epoch)return;stopGPS();state3d.error=err?.code===1?tr('denied'):tr('locating');updateGuidance();displayStart();},{enableHighAccuracy:true,maximumAge:3000,timeout:18000});
    }catch(e){stopGPS();state3d.error=tr('denied');updateGuidance();displayStart();}
  }
  function previewLocation(){const r=route();if(!goodRoute(r))return null;const step=maneuvers(r)[state3d.previewIndex];return r.coords[Math.min(r.coords.length-1,Math.max(0,Number(step?.index)||0))];}
  function displayStart(){const el=document.querySelector('.cr3d-preview-actions');if(el)el.hidden=false;document.getElementById('cr3d-mode')?.replaceChildren(document.createTextNode(tr('previewMode')));}
  function preview(){const r=route();if(!goodRoute(r))return;leave();state3d.loadedRoute=r;state3d.previewIndex=0;state3d.follow=true;state.screen='navigation';render();}
  function updateGuidance(){if(state.screen!=='navigation')return;const r=route();if(!goodRoute(r))return;const proj=state3d.position?projected(r,state3d.position):null;const next=nextInstruction(r,proj);const rem=proj?.remaining??geometry(r).total;const mins=proj?Math.max(1,Math.ceil(r.minutes*rem/Math.max(1,geometry(r).total))):r.minutes;
    const write=(id,v)=>{const el=document.getElementById(id);if(el&&el.textContent!==v)el.textContent=v;};
    const isFinalManeuver=next.step>=maneuvers(r).length-1&&[4,5,6].includes(Number(next.type));
    const finalWithoutArrival=!state3d.arrived&&isFinalManeuver&&state3d.live;
    const nearUnconfirmed=!state3d.arrived&&state3d.live&&proj&&proj.remaining<=GPS_ARRIVAL_RADIUS_M;
    write('cr3d-mode',state3d.live?tr('gps'):tr('previewMode'));
    write('cr3d-arrow',state3d.arrived?'⚑':finalWithoutArrival?'↑':turnSymbol(next.type));
    write('cr3d-next',state3d.arrived?'':next.distance==null?'':fmt(next.distance));
    write('cr3d-instruction',state3d.arrived?tr('arrived'):finalWithoutArrival?tr('continue'):next.instruction||tr('title'));
    write('cr3d-eta',state3d.arrived?'0 min':`${mins} min`);
    write('cr3d-distance',nearUnconfirmed?tr('nearUnconfirmed'):fmt(state3d.arrived?0:rem)+' '+tr('remaining'));
    write('cr3d-status',state3d.error||(state3d.live?(state3d.accuracy?`${tr('accuracy')}: ${Math.round(state3d.accuracy)} m`:tr('locating')):tr('previewMode')));
    const off=document.getElementById('cr3d-offroute');if(off)off.hidden=!state3d.live||state3d.offRoute<3;
  }
  function geojson(){const r=route();return r?{type:'FeatureCollection',features:[gj(r)]}:{type:'FeatureCollection',features:[]};}
  function drawBuildings(){if(!map || state3d.mode!=='gl')return;try{if(!map.getSource('cr3d-buildings'))map.addSource('cr3d-buildings',{type:'vector',url:'https://tiles.openfreemap.org/planet'});const style=map.getStyle();const firstLabel=style.layers?.find(l=>l.type==='symbol'&&l.layout?.['text-field'])?.id;
    map.addLayer({id:'cr3d-building-extrusions',source:'cr3d-buildings','source-layer':'building',type:'fill-extrusion',minzoom:15,filter:['!=',['get','hide_3d'],true],paint:{'fill-extrusion-color':'#a4b7b4','fill-extrusion-height':['interpolate',['linear'],['zoom'],15,0,16,['coalesce',['get','render_height'],['get','height'],12]],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':.67}},firstLabel);
    }catch(e){console.warn('3D buildings could not be drawn:',e.message);}
  }
  function drawGL(){if(!map||state3d.mode!=='gl')return;const r=route();if(!goodRoute(r))return;
    try{map.addSource('cr3d-route',{type:'geojson',data:geojson()});map.addLayer({id:'cr3d-route-halo',type:'line',source:'cr3d-route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ffffff','line-width':12}});map.addLayer({id:'cr3d-route-line',type:'line',source:'cr3d-route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#167bdb','line-width':6}});map.addSource('cr3d-points',{type:'geojson',data:placesGeoJSON(r)});map.addLayer({id:'cr3d-place-circles',type:'circle',source:'cr3d-points',paint:{'circle-radius':7,'circle-color':['match',['get','kind'],'water',colors.water,'cool',colors.cool,'trees',colors.trees,'shade',colors.shade,'#587d74'],'circle-stroke-color':'#fff','circle-stroke-width':2}});map.on('click','cr3d-place-circles',e=>{const p=e.features?.[0];if(!p)return;new maplibregl.Popup({closeButton:true}).setLngLat(p.geometry.coordinates).setHTML(`<strong>${esc(p.properties.name)}</strong><p>${esc(tr('source'))}</p><a rel="noopener noreferrer" target="_blank" href="https://open-data.dortmund.de/explore/dataset/${encodeURIComponent(p.properties.dataset)}/">Dataset ↗</a>`).addTo(map);});
      const bs=new maplibregl.LngLatBounds();for(const p of r.coords)bs.extend([p[1],p[0]]);map.fitBounds(bs,{padding:{top:150,bottom:175,left:25,right:25},maxZoom:16.5,pitch:state3d.tilted?55:0,duration:0});glReady=true;updatePosition(true);
    }catch(e){console.warn('3D scene creation failed:',e.message);fallback('scene error');}
  }
  function initMap(){if(state.screen!=='navigation'||map)return;mapContainer=document.getElementById('cr3d-map');const r=route();if(!mapContainer||!goodRoute(r))return;
    const center=[r.coords[0][1],r.coords[0][0]];
    if(!window.maplibregl){fallback('MapLibre unavailable');return;}
    try{
      map=new maplibregl.Map({container:mapContainer,style:'https://tiles.openfreemap.org/styles/bright',center,zoom:15.8,pitch:state3d.tilted?55:0,bearing:0,maxPitch:70,antialias:false,attributionControl:false});state3d.mode='gl';
      map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');
      map.on('load',()=>{if(state.screen!=='navigation')return;clearTimeout(fallbackTimer);fallbackTimer=null;drawBuildings();drawGL();});
      map.on('dragstart',()=>{state3d.follow=false;});
      map.on('webglcontextlost',()=>{fallback('WebGL unavailable');});
      // When the public style server is unavailable, fall back rather than leave a blank view.
      fallbackTimer=setTimeout(()=>{if(state3d.mode==='gl'&&!glReady)fallback('Map tiles unavailable');},8000);
      map.on('error',e=>{if(!glReady&&/style|source/i.test(String(e?.error?.message||'')))console.warn('MapLibre loading:',e.error.message);});
    }catch(e){console.warn('MapLibre did not initialize:',e.message);fallback('WebGL initialization failed');}
  }
  function fallback(reason){if(state.screen!=='navigation')return;try{map?.remove();}catch{}map=null;mapMarker=null;glReady=false;if(fallbackTimer){clearTimeout(fallbackTimer);fallbackTimer=null;}if(!window.L){state3d.mode='unavailable';updateGuidance();return;}try{
      mapContainer=document.getElementById('cr3d-map');if(!mapContainer)return;mapContainer.replaceChildren();
      const r=route();const center=r.coords[0];map=L.map(mapContainer,{zoomControl:false,preferCanvas:true}).setView(center,15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,updateWhenIdle:true,attribution:'© OpenStreetMap contributors'}).addTo(map);
      L.polyline(r.coords,{color:'#fff',weight:11}).addTo(map);L.polyline(r.coords,{color:'#167bdb',weight:6}).addTo(map);
      map.fitBounds(r.coords,{paddingTopLeft:[25,165],paddingBottomRight:[25,180],maxZoom:16});
      state3d.mode='leaflet';state3d.tilted=false;
      renderLeafletPlaces();map.on('dragstart',()=>state3d.follow=false);
      const note=document.createElement('span');note.className='cr3d-fallback-label';note.textContent=tr('noWebgl');mapContainer.appendChild(note);updatePosition(true);
    }catch(e){console.warn('2D fallback map failed:',e.message);state3d.mode='unavailable';}
  }
  function renderLeafletPlaces(){if(state3d.mode!=='leaflet'||!map)return;for(const layer of leafletLayers){try{map.removeLayer(layer);}catch{}}leafletLayers=[];for(const f of listPlaces(route()).slice(0,22)){
      const marker=L.circleMarker(f.p,{radius:6,fillColor:colors[f.kind],color:'#fff',weight:2,fillOpacity:1}).bindPopup(`<strong>${esc(f.name)}</strong><p>${esc(tr('source'))}</p><a href="https://open-data.dortmund.de/explore/dataset/${dataset[f.kind]}/" target="_blank" rel="noopener">Dataset ↗</a>`).addTo(map);leafletLayers.push(marker);
    }}
  function updatePosition(force=false){const at=state3d.position||(state3d.live?null:previewLocation());if(!map||!at)return;
    if(state3d.mode==='gl'){
      if(!glReady)return;
      if(!mapMarker){const dot=document.createElement('div');dot.className='cr3d-location';dot.setAttribute('aria-label','GPS');mapMarker=new maplibregl.Marker({element:dot,rotationAlignment:'map'}).setLngLat([at[1],at[0]]).addTo(map);}
      mapMarker.setLngLat([at[1],at[0]]);if(state3d.follow && (force||performance.now()-state3d.lastCamera>1600)){state3d.lastCamera=performance.now();map.easeTo({center:[at[1],at[0]],zoom:17,pitch:state3d.tilted?55:0,bearing:state3d.heading??map.getBearing(),duration:force?0:700,padding:{top:120,bottom:165,left:0,right:0}});}
    }else if(state3d.mode==='leaflet'){
      if(!mapMarker)mapMarker=L.circleMarker(at,{radius:9,color:'#fff',weight:3,fillColor:'#167bdb',fillOpacity:1}).addTo(map);else mapMarker.setLatLng(at);
      if(state3d.follow && (force||performance.now()-state3d.lastCamera>1600)){state3d.lastCamera=performance.now();map.panTo(at,{animate:!force,duration:.5});}
    }
  }
  function reroute(){if(!state3d.position)return;const point=state3d.position.slice();leave();engine.origin=point;goto('route');const start=document.getElementById('crr-start');if(start)start.value='';
    // Do not fabricate a new path: the user requests recalculation explicitly using the planner.
    const notice=document.querySelector('.crr-scroll');if(notice){const p=document.createElement('p');p.className='cr3d-reroute-note';p.textContent=tr('reroute');notice.prepend(p);}
  }
  const oldRender=render;
  render=function(...args){if(state.screen!=='navigation'&&(state3d.live||map))leave();else if(state.screen==='navigation'&&map)releaseMap();const result=oldRender(...args);if(state.screen==='navigation')requestAnimationFrame(initMap);return result;};
  // Capture on document, ahead of the routing add-on's delegated click handler on #app.
  document.addEventListener('click',event=>{
    const btn=event.target.closest('button[data-crr="navigate"],button[data-cr3d]');if(!btn)return;
    if(btn.dataset.crr==='navigate'){event.preventDefault();event.stopImmediatePropagation();startGPS();return;}
    if(!btn.dataset.cr3d)return;event.preventDefault();event.stopImmediatePropagation();const act=btn.dataset.cr3d;
    if(act==='end'||act==='back'){leave();goto(act==='back'?'detail':'home');return;}
    if(act==='gps'){startGPS();return;}
    if(act==='next'||act==='previous'){state3d.previewIndex=Math.min(Math.max(0,state3d.previewIndex+(act==='next'?1:-1)),Math.max(0,maneuvers(route()).length-1));updateGuidance();updatePosition(true);}
    if(act==='follow'){state3d.follow=true;updatePosition(true);}
    if(act==='tilt'){if(state3d.mode==='gl'){state3d.tilted=!state3d.tilted;map.easeTo({pitch:state3d.tilted?55:0,duration:400});btn.textContent=state3d.tilted?'2D':'3D';} }
    if(act==='zoom-in')map?.zoomIn();if(act==='zoom-out')map?.zoomOut();
    if(act==='reroute'){reroute();return;}
    if(act==='places'){const list=document.getElementById('cr3d-place-list');if(list){list.hidden=!list.hidden;btn.setAttribute('aria-expanded',String(!list.hidden));}}
    if(act==='layer'){const k=btn.dataset.kind;state3d.layers[k]=!state3d.layers[k];btn.setAttribute('aria-pressed',String(state3d.layers[k]));if(state3d.mode==='gl'&&glReady)map.getSource('cr3d-points')?.setData(placesGeoJSON(route()));else renderLeafletPlaces();}
  },true);
  window.addEventListener('pagehide',leave);
  window.CoolRouteNavigation={version:'3d-integrated-1.0',preview,startGPS,stopGPS:leave,recenter:()=>{state3d.follow=true;updatePosition(true);},progress:projected,getState:()=>({active:state3d.live,mode:state3d.mode,tilted:state3d.tilted,error:state3d.error,watching:state3d.watchId!==null,arrived:state3d.arrived,accuracy:state3d.accuracy,arrivalFixes:state3d.arrivalFixes||0,remaining:state3d.position&&route()?projected(route(),state3d.position)?.remaining:null})};
})();
