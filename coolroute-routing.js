/* CoolRoute · live pedestrian routing + experimental solar/radiation exposure ranking.
   Requires existing CoolRoute app.js, Leaflet, and ideally hackathon-ui.js. No mock routing values.
   Source and uncertainty details: ROUTING_METHOD.md.
*/
(() => {
  'use strict';
  if (typeof state === 'undefined' || typeof render !== 'function' || typeof icon !== 'function') {
    console.error('CoolRoute routing add-on: load after app.js'); return;
  }
  const esc = typeof escapeHtml === 'function' ? escapeHtml : s => String(s).replaceAll('<','&lt;');
  const API = 'https://open-data.dortmund.de/api/explore/v2.1/catalog/datasets/';
  const ROUTE_API = 'https://valhalla1.openstreetmap.de/route';
  const names = {
    'Dortmund Central Station (Hauptbahnhof)': [51.5171,7.4588],
    'Hauptbahnhof': [51.5171,7.4588],
    'TU Dortmund': [51.4925,7.4140],
    'City Centre': [51.5136,7.4653],
    'Dortmund U': [51.5152,7.4530],
    'Westfalenpark': [51.4963,7.4754],
    'Phoenix See': [51.4905,7.5065],
    'Rombergpark': [51.4808,7.4686],
    'Stadtgarten': [51.5101,7.4658],
    'Westfalenhalle': [51.4967,7.4554],
    'Friedensplatz': [51.5116,7.4644],
    'Dortmund Hörde': [51.4898,7.5005]
  };
  const positions = Object.entries(names).filter(([n])=>n!=='Hauptbahnhof');
  const DSETS = [
    ['trees','baumkataster'], ['shade','fb60-schattenplatze'],
    ['water','trinkwasserbrunnen'], ['indoor','kuhle-innenraume'],
    ['readings','klimasensoren-messdaten'], ['stations','klimasensoren-standorte'],
    ['toilet','offentliche-toiletten'], ['accessible','offentliche-toiletten-behindertengerecht'],
    ['transit','haltestellen'], ['playground','spielplatze']
  ];
  const labels = {en:{title:'Real walking routes',start:'From',end:'To',time:'Departure time',calculate:'Find cooler routes',working:'Calculating walkable routes and checking Dortmund Open Data…',fail:'Unable to calculate a real pedestrian route.',retry:'Try again',fastest:'Fastest',balanced:'Balanced',shade:'Coolest candidate',compare:'Compare routes',details:'Route details',navigate:'Start GPS navigation',turns:'Directions',endNav:'End navigation',location:'Use my location',selection:'Choose a destination',distance:'Distance',duration:'Walking time',mrt:'Estimated MRT',noMrt:'No recent air temperature; MRT unavailable',shadePercent:'Estimated exposure to shade',limits:'Experimental modeled exposure, not measured MRT. Route preference is only compared among available candidates.',facilities:'Nearby facilities (dataset matches)',methods:'Data and method',reroute:'Recalculate',arrived:'Destination reached',finish:'Finish',next:'Next instruction (preview)',gps:'GPS navigation',gpsFail:'Location unavailable. Navigation requires browser location permission and HTTPS or localhost.',noData:'Missing municipal data',unknown:'Unavailable',approx:'Model estimate',path:'Pedestrian route by Valhalla/OSM',status:'Checking sources…',depart:'Departure',preview:'Preview directions',home:'Home'},de:{title:'Echte Fußwege',start:'Start',end:'Ziel',time:'Startzeit',calculate:'Kühlere Wege finden',working:'Fußwege werden berechnet. Dortmunder Umweltdaten werden geladen …',fail:'Es konnte keine echte Fußroute berechnet werden.',retry:'Erneut versuchen',fastest:'Schnellster Weg',balanced:'Ausgewogen',shade:'Kühlster Kandidat',compare:'Wege vergleichen',details:'Wegdetails',navigate:'GPS-Navigation starten',turns:'Wegbeschreibung',endNav:'Navigation beenden',location:'Mein Standort',selection:'Bitte ein Ziel wählen',distance:'Entfernung',duration:'Gehzeit',mrt:'Geschätzte MRT',noMrt:'Keine aktuellen Temperaturdaten; MRT nicht verfügbar',shadePercent:'Geschätzter Schattenanteil',limits:'Experimentelle Modellwerte, keine gemessene MRT. Nur verfügbare Routen werden verglichen.',facilities:'Orte in der Nähe (aus Datensätzen)',methods:'Daten und Methode',reroute:'Neu berechnen',arrived:'Ziel erreicht',finish:'Fertig',next:'Nächste Anweisung (Vorschau)',gps:'GPS-Navigation',gpsFail:'Standort nicht verfügbar. Erlaube den Zugriff über HTTPS oder localhost.',noData:'Kommunale Daten fehlen',unknown:'Nicht verfügbar',approx:'Modellschätzung',path:'Fußweg: Valhalla/OSM',status:'Datenquellen werden geprüft…',depart:'Startzeit',preview:'Wegvorschau',home:'Startseite'},simple:{title:'Wege zu Fuß',start:'Hier starten',end:'Hierhin gehen',time:'Wann gehst du?',calculate:'Kühlen Weg suchen',working:'Wir suchen Wege und Orte mit Schatten …',fail:'Wir konnten keinen Weg finden.',retry:'Nochmal suchen',fastest:'Schnell',balanced:'Gut gemischt',shade:'Weniger Sonne',compare:'Wege ansehen',details:'Infos zum Weg',navigate:'Mit GPS starten',turns:'So gehst du',endNav:'Aufhören',location:'Mein Ort',selection:'Such ein Ziel aus',distance:'So weit',duration:'So lange',mrt:'Hitze-Schätzwert',noMrt:'Keine aktuellen Daten zur Lufttemperatur',shadePercent:'Wie viel Schatten?',limits:'Die Hitze ist nur geschätzt. Bitte prüfe deinen Weg vor Ort.',facilities:'Orte am Weg',methods:'Woher kommen die Daten?',reroute:'Neuen Weg suchen',arrived:'Du bist da',finish:'Fertig',next:'Nächster Schritt (Test)',gps:'GPS verwenden',gpsFail:'Wir finden deinen Standort nicht. Bitte Standort erlauben.',noData:'Nicht alle Daten da',unknown:'Keine Daten',approx:'Geschätzt',path:'Echter Fußweg auf der Karte',status:'Daten werden geladen …',depart:'Start',preview:'Weg ansehen',home:'Start'}};
  const l = () => {let v='en'; try {v=localStorage.getItem('cr-hack-lang')||'en';}catch{}return labels[v]?v:'en';};
  const t = key => labels[l()][key]||labels.en[key]||key;
  const service = {status:'idle', error:'', routeList:[], selected:'shade', sources:{}, warnings:[], features:{}, departure:'', origin:null,destination:null, gps:null, watch:null, leaf:null, loadingId:0, resultMap:null, mapMount:0, liveInstruction:0, nearestDistance:null, gpsOn:false, purpose:'', mobility:'Walking',withDog:false,withKids:false};
  window.CoolRouteRouting = service;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const radians=n=>n*Math.PI/180;
  function meters(a,b){const dlat=radians(b[0]-a[0]),dlon=radians(b[1]-a[1]);const q=Math.sin(dlat/2)**2+Math.cos(radians(a[0]))*Math.cos(radians(b[0]))*Math.sin(dlon/2)**2;return 12742000*Math.asin(Math.min(1,Math.sqrt(q)));}
  function midpoint(a,b){return [(a[0]+b[0])/2,(a[1]+b[1])/2];}
  function bbox(a,b){const pad=Math.min(.016, Math.max(.006,meters(a,b)/170000));return [Math.min(a[0],b[0])-pad,Math.min(a[1],b[1])-pad,Math.max(a[0],b[0])+pad,Math.max(a[1],b[1])+pad];}
  function locationField(r){
    const objs=[r.geo_point_2d,r.standort,r.location,r.geolocation,r.geo_point,r.position,r.geometry,r.geometrie];
    for(const obj of objs){if(Array.isArray(obj)&&obj.length>=2){const a=Number(obj[0]),b=Number(obj[1]);if(a>45&&a<55&&b>5&&b<10)return [a,b];if(b>45&&b<55&&a>5&&a<10)return [b,a];}
      if(obj&&typeof obj==='object'){
        if(obj.lat!==undefined&&obj.lon!==undefined)return [Number(obj.lat),Number(obj.lon)];
        if(obj.coordinates&&Array.isArray(obj.coordinates)){let [lon,lat]=obj.coordinates;if(lat>45&&lat<55)return [lat,lon];}
      }
    }
    for(const [key,v] of Object.entries(r))if((/coord|standort|punkt/i).test(key)&&v&&typeof v==='object'&&v.lat!==undefined&&v.lon!==undefined)return [Number(v.lat),Number(v.lon)];
    return null;
  }
  function extract(kind,r){const at=locationField(r);if(!at||!Number.isFinite(at[0])||!Number.isFinite(at[1])||at[0]<51.25||at[0]>51.7||at[1]<7.15||at[1]>7.75)return null;
    return {at,kind,name:String(r.objektname||r.schattenplatz||r.bezeichnung||r.name||r.body_item_name||r.art_deutsc||kind),crown:Number(r.kronendurc||r.kronendurchmesser||0),height:Number(r.baumhohe||r.baumhoehe||0),temp:kind==='readings'?Number(r.data_air_temperature??r.air_temperature??NaN):NaN,measured:r.measured_at||r.messdatum_lang||r.timestamp||null,id:String(r.id||r.device_id||r.objektname||'')};
  }
  function dateAtTime(s){const now=new Date();const [h,m]=String(s||'12:00').split(':').map(Number);now.setHours(h||0,m||0,0,0);return now;}
  // NOAA approximate solar ephemeris. Angles calibrated in degrees, sun azimuth clockwise from N.
  function sunPosition(date,lat,lon){const jd=date.getTime()/86400000+2440587.5;const n=jd-2451545;const L=radians((280.460+.9856474*n)%360),g=radians((357.528+.9856003*n)%360);const lambda=L+radians(1.915)*Math.sin(g)+radians(.020)*Math.sin(2*g);const epsilon=radians(23.439-.0000004*n);const decl=Math.asin(Math.sin(epsilon)*Math.sin(lambda));const ra=Math.atan2(Math.cos(epsilon)*Math.sin(lambda),Math.cos(lambda));const gmst=(18.697374558+24.06570982441908*n)%24;const hour=radians((gmst*15+lon)%(360))-ra;const phi=radians(lat);const alt=Math.asin(Math.sin(phi)*Math.sin(decl)+Math.cos(phi)*Math.cos(decl)*Math.cos(hour));const az=Math.atan2(-Math.sin(hour),Math.tan(decl)*Math.cos(phi)-Math.sin(phi)*Math.cos(hour));return {alt:Math.max(0,alt),az:(az+2*Math.PI)%(2*Math.PI)};}
  function shadeAt(p, features, sun){let best=0;
    for (const sh of features.shade||[]){const dist=meters(p,sh.at);if(dist<35)best=Math.max(best,.60*(1-dist/55));}
    for (const tree of features.trees||[]){const crown=clamp(tree.crown||6,3,18)/2, h=clamp(tree.height||9,4,22);const dx=(p[1]-tree.at[1])*111320*Math.cos(radians(p[0]));const dy=(p[0]-tree.at[0])*111320;let weight=0;
      if(sun.alt>.07){const length=Math.min(h/Math.tan(sun.alt),h*4);const along=dx*(-Math.sin(sun.az))+dy*(-Math.cos(sun.az));const side=Math.abs(dx*(-Math.cos(sun.az))+dy*(Math.sin(sun.az)));
        if(along>0&&along<length+crown&&side<crown+1.3)weight=.82;
      }
      if(Math.hypot(dx,dy)<crown+1.0)weight=Math.max(weight,.75);
      best=Math.max(best,weight);
    }
    return sun.alt<.05?0:clamp(best,0,.9);
  }
  // NOT validated SOLWEIG: rough radiative proxy with shortwave absorption, no measured longwave, sky view or building shadows.
  function modelMrt(temp,shade,sun){if(!Number.isFinite(temp))return null;const sigma=5.670374419e-8,eps=.97,alpha=.70;const direct=850*Math.sin(sun.alt),diffuse=120*Math.sin(sun.alt);const irradiance=(direct+diffuse)*(.30)*(1-.82*shade);return Math.pow((temp+273.15)**4 + alpha*irradiance/(eps*sigma),.25)-273.15;}
  function candidateSamples(line,spacing=35){const out=[];for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],dist=meters(a,b);const n=Math.max(1,Math.ceil(dist/spacing));for(let j=0;j<n;j++){const f=(j+.5)/n;out.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,dist/n]);}}return out;}
  function latestTemperatures(features){const now=Date.now(), data=(features.readings||[]).filter(f=>Number.isFinite(f.temp)&&f.temp>-35&&f.temp<55&&f.measured&&Math.abs(now-new Date(f.measured).getTime())<3*3600000);const result=[];const ids=new Set();for(const f of data.sort((a,b)=>new Date(b.measured)-new Date(a.measured))){const id=f.id||f.at.join(',');if(!ids.has(id)){result.push(f);ids.add(id);}}return result;}
  function localTemp(at, sensors){let w=0,sum=0;for(const p of sensors){const d=Math.max(50,meters(at,p.at));if(d>6000)continue;const v=1/(d*d);w+=v;sum+=p.temp*v;}return w?sum/w:null;}
  function facilitiesAlong(samples, features){const counts={};for(const kind of ['trees','shade','water','indoor','toilet','accessible','transit','playground','stations']){
    const threshold=kind==='trees'?15:kind==='shade'?28:kind==='indoor'?65:50;
    counts[kind]=null;if(!service.sources[kind]?.ok)continue;
    counts[kind]=(features[kind]||[]).filter(f=>samples.some(s=>meters(f.at,s)<threshold)).length;
  }return counts;}
  function scoreRoute(route,features,departure){const samples=candidateSamples(route.coords);const sun=sunPosition(dateAtTime(departure),route.coords[0][0],route.coords[0][1]);const temps=Math.abs(dateAtTime(departure).getTime()-Date.now())<=2*3600000?latestTemperatures(features):[];
    let weightedShade=0, weightedRad=0, tempWeight=0, length=0, costBalanced=0, costCoolest=0;
    for(const p of samples){const shade=shadeAt(p,features,sun),air=localTemp(p,temps),w=p[2];length+=w;weightedShade+=shade*w;const mrt=modelMrt(air,shade,sun);if(mrt!==null){weightedRad+=mrt*w;tempWeight+=w;}
      const heatPenalty = mrt!==null ? clamp((mrt-22)/35,0,1.5) : Math.max(0,Math.sin(sun.alt))*(1-shade);
      costBalanced += w*(1 + .45*heatPenalty - .12*shade);
      costCoolest += w*(1 + 1.10*heatPenalty - .35*shade);
    }
    const shade=length?weightedShade/length:0;const avgMrt=tempWeight>=length*.75?weightedRad/tempWeight:null;
    // ranking with heat proxy even when temperature data unavailable: air is spatially similar across nearby routes.
    const exposure=costCoolest;
    const amenities=facilitiesAlong(samples,features);return {...route,shade,avgMrt,exposure,costBalanced,costCoolest,amenities,solar: sun,stations:temps.length};
  }
  function decodePolyline(encoded){let lat=0,lon=0,index=0;const pts=[];while(index<encoded.length){let shift=0,result=0,b;do{b=encoded.charCodeAt(index++)-63;result|=(b&31)<<shift;shift+=5;}while(b>=32&&index<encoded.length);lat+=(result&1)?~(result>>1):result>>1;
      shift=0;result=0;do{b=encoded.charCodeAt(index++)-63;result|=(b&31)<<shift;shift+=5;}while(b>=32&&index<encoded.length);lon+=(result&1)?~(result>>1):result>>1;pts.push([lat/1e6,lon/1e6]);}return pts;}
  async function fetchJson(url,timeout=15000){const ctrl=new AbortController();const handle=setTimeout(()=>ctrl.abort(),timeout);try{const res=await fetch(url,{signal:ctrl.signal,headers:url.startsWith(ROUTE_API)?{'X-Client-Id':'coolroute-dortmund-hackathon'}:{}});if(!res.ok)throw new Error('HTTP '+res.status);return await res.json();}finally{clearTimeout(handle);}}
  async function cityData(kind, slug, bound){const result=[];const base=API+encodeURIComponent(slug)+'/records';const maxPages=kind==='trees'?7:kind==='readings'?2:2;let queried=0,total=0,usedFallback=false;
    for(let page=0;page<maxPages;page++){
      const params=new URLSearchParams({limit:'100',offset:String(page*100)});
      if(kind==='readings')params.set('order_by','measured_at desc');
      else params.set('where',`in_bbox(geo_point_2d, ${bound.map(n=>n.toFixed(5)).join(', ')})`);
      let json;try{json=await fetchJson(base+'?'+params.toString(),11000);}catch(err){if(!result.length && kind!=='readings'){
          // Some datasets use a different coordinate-field identifier. A small unfiltered query is a fallback, not proof of full coverage.
          params.delete('where');params.set('limit','100');params.set('offset','0');usedFallback=true;json=await fetchJson(base+'?'+params.toString(),11000);
        }else if(!result.length)throw err;else break;
      }
      const records=json.results||[];queried+=records.length;total=Math.max(total,Number(json.total_count)||0);result.push(...records.map(r=>extract(kind,r)).filter(Boolean));if(records.length<100||(!params.has('where')&&kind!=='readings'))break;
    }
    return {rows:result.filter(r=>(kind==='readings')||r.at[0]>=bound[0]&&r.at[0]<=bound[2]&&r.at[1]>=bound[1]&&r.at[1]<=bound[3]),limited:usedFallback||total>queried,fallback:usedFallback};
  }
  async function getEnvironmentalData(origin,dest){const bounds=bbox(origin,dest);const feats={};service.sources={};const queue=DSETS.slice();async function worker(){while(queue.length){const [kind,slug]=queue.shift();try{const data=await cityData(kind,slug,bounds);feats[kind]=data.rows;service.sources[kind]={ok:true,count:data.rows.length,limited:data.limited,fallback:data.fallback};}catch(error){feats[kind]=[];service.sources[kind]={ok:false,error:error.message,count:0};}}}
    await Promise.all([worker(),worker(),worker(),worker()]);return feats;}
  function sideOffset(waypoint,start,end){const m=midpoint(start,end);return meters(waypoint,m);}
  function waypoints(features,start,end){const dist=meters(start,end);const can=[];
    for(const pt of (features.shade||[]).concat((features.indoor||[]))){const d1=meters(start,pt.at),d2=meters(end,pt.at);if(d1<120||d2<120||d1+d2>dist*1.42+230||d1+d2<dist*.85)continue;can.push({coord:pt.at,score:d1+d2+Math.max(0,sideOffset(pt.at,start,end)-350)*.3});}
    // Generate a tree-cluster waypoint if no shade POI offers a reasonable detour.
    if(can.length<3){const grouped=new Map();for(const p of features.trees||[]){if(meters(start,p.at)<130||meters(end,p.at)<130)continue;const key=Math.round(p.at[0]*1000)+','+Math.round(p.at[1]*1000);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(p.at);}
      for(const group of grouped.values())if(group.length>=3){const loc=[group.reduce((a,b)=>a+b[0],0)/group.length,group.reduce((a,b)=>a+b[1],0)/group.length];const d1=meters(start,loc),d2=meters(end,loc);if(d1+d2<dist*1.4+200)can.push({coord:loc,score:d1+d2-25*group.length});}
    }
    can.sort((a,b)=>a.score-b.score);const selected=[];for(const entry of can){if(selected.every(p=>meters(p,entry.coord)>200)){selected.push(entry.coord);if(selected.length>=3)break;}}return selected;
  }
  async function getPedRoute(points){const body={locations:points.map(([lat,lon],i)=>({lat,lon,type:i===0||i===points.length-1?'break':'through'})),costing:'pedestrian',units:'km',language:l()==='en'?'en-US':'de-DE',costing_options:{pedestrian:{walking_speed:5.0}}};
    const json=await fetchJson(ROUTE_API+'?json='+encodeURIComponent(JSON.stringify(body)),20000);if(!json?.trip?.legs?.length||!json.trip.summary)throw new Error(json?.error||'No pedestrian route');
    const all=[],maneuvers=[];for(const leg of json.trip.legs){const line=decodePolyline(leg.shape);if(!line.length)continue;const offset=all.length;all.push(...line);for(const m of leg.maneuvers||[])maneuvers.push({instruction:m.instruction||'',index:offset+(m.begin_shape_index||0),type:m.type||0,km:m.length||0});}
    if(all.length<2)throw new Error('No valid route geometry');return {coords:all,km:Number(json.trip.summary.length),minutes:Math.round(json.trip.summary.time/60),maneuvers};
  }
  async function calculate(){if(service.status==='loading')return;const from=service.origin||names[state.start],to=service.destination||names[state.end];if(!from||!to||meters(from,to)<80){service.status='error';service.error='Choose two distinct Dortmund locations.';goto('results');return;}
    service.departure=document.getElementById('crr-depart')?.value||service.departure||new Date().toTimeString().slice(0,5);
    service.status='loading';service.routeList=[];service.error='';service.warnings=[];goto('results');const job=++service.loadingId;
    try{const distance=meters(from,to);if(distance>10500)throw new Error('For this prototype, select places within approximately 10 km.');
      const directPromise=getPedRoute([from,to]).then(route=>({route}),error=>({error}));const features=await getEnvironmentalData(from,to);const directResult=await directPromise;if(directResult.error)throw directResult.error;const direct=directResult.route;if(job!==service.loadingId)return;
      service.features=features;
      const via=waypoints(features,from,to);const possibilities=[direct];for(const p of via.slice(0,2)){try{await new Promise(resolve=>setTimeout(resolve,1200));const alt=await getPedRoute([from,p,to]);if(alt.km<=direct.km*1.55+0.2 && alt.km>0 && !possibilities.some(s=>Math.abs(s.km-alt.km)<.015&&meters(s.coords[Math.floor(s.coords.length/2)],alt.coords[Math.floor(alt.coords.length/2)])<50))possibilities.push(alt);}catch(e){service.warnings.push('Alternative walking route unavailable: '+e.message);}}
      const scored=possibilities.map(r=>scoreRoute(r,features,service.departure));scored.sort((a,b)=>a.km-b.km);const fastest=scored[0];const cool=[...scored].sort((a,b)=>a.exposure-b.exposure)[0];const balance=[...scored].sort((a,b)=>a.costBalanced-b.costBalanced)[0];
      service.routeList=[{...fastest,id:'fastest'},{...balance,id:'balanced'},{...cool,id:'shade'}];service.selected='shade';state.selectedRoute='shade';service.status='success';if(service.routeList.length&&possibilities.length===1)service.warnings.push('Only one independent walking route was available. All profiles use that route.');
      if(!(service.sources.trees?.ok||service.sources.shade?.ok))service.warnings.push('No tree or shade observations available. Cool-route ranking cannot be verified.');
      if(Math.abs(dateAtTime(service.departure).getTime()-Date.now())>2*3600000)service.warnings.push('Requested departure is more than two hours away. Current measurements cannot forecast future air temperature; absolute MRT is hidden.');else if(!latestTemperatures(features).length)service.warnings.push('No recent sensor temperature observations; numerical MRT estimates are hidden.');
      for(const kind of ['trees','shade','water','indoor','toilet','accessible','transit','playground','stations'])if(service.sources[kind]?.limited)service.warnings.push(kind+' dataset was partially sampled; nearby counts and model scores may omit records.');
      if(service.mobility==='Wheelchair')service.warnings.push('Pedestrian routing is NOT verified wheelchair accessible.');if(service.withDog||service.withKids)service.warnings.push('Dog/child-friendly suitability has not been verified against street attributes.');
    }catch(e){service.status='error';service.error=e.name==='AbortError'?'External service timed out. Try again.':e.message;}
    finally{if(job===service.loadingId)render();}
  }
  function currentRoute(){return service.routeList.find(r=>r.id===state.selectedRoute)||service.routeList[2]||service.routeList[0];}
  function formattedCoords(list){return list.map(p=>p.map(x=>x.toFixed(4)).join(',')).join(';');}
  function options(selected){return positions.map(([name])=>`<option ${name===selected?'selected':''} value="${esc(name)}">${esc(name)}</option>`).join('');}
  function title(s){return `<header class="crr-head"><button type="button" data-crr="back" aria-label="Back">←</button><b>${esc(s)}</b><span></span></header>`;}
  function dataNote(){return `<p class="crr-note">${esc(t('limits'))} <a href="https://open-data.dortmund.de/" target="_blank" rel="noopener">Stadt Dortmund</a> · <a href="https://valhalla.openstreetmap.de/" target="_blank" rel="noopener">Valhalla / OpenStreetMap</a></p>`;}
  const colors={fastest:'#1d72d8',balanced:'#0d9b95',shade:'#087957'};
  function routeName(id){return id==='shade'?t('shade'):t(id);}
  function weather(r){return r.avgMrt!==null?`<b>${r.avgMrt.toFixed(1)} °C</b> <small>${esc(t('approx'))} MRT</small>`:`<small>${esc(t('noMrt'))}</small>`;}
  function compareCard(r){return `<button type="button" data-crr="select" data-id="${r.id}" class="crr-choice ${state.selectedRoute===r.id?'active':''}"><span class="crr-color" style="background:${colors[r.id]}"></span><span><b>${esc(routeName(r.id))}</b><small>${r.km.toFixed(2)} km · ${r.minutes} min</small><small>${esc(t('shadePercent'))}: ${(r.shade*100).toFixed(0)}% <i>(${esc(t('approx'))})</i></small></span><span>›</span></button>`;}
  function routeSummary(r){return `<div class="crr-summary"><strong>${r.km.toFixed(2)} km</strong><strong>${r.minutes} min</strong><div>${weather(r)}</div></div>`;}
  function statusBlock(){return service.status==='loading'?`<div class="crr-message crr-loading"><span class="crr-spinner"></span>${esc(t('working'))}</div>`:service.status==='error'?`<div class="crr-message" role="alert">${esc(t('fail'))}<p>${esc(service.error)}</p><button class="crr-main" data-crr="calculate">${esc(t('retry'))}</button></div>`:service.status!=='success'?`<div class="crr-message">${esc(t('selection'))}</div>`:'';}
  function statusWarnings(){return service.warnings.length?`<details class="crr-warnings"><summary>Data limitations (${service.warnings.length})</summary>${service.warnings.map(s=>`<p>${esc(s)}</p>`).join('')}</details>`:'';}
  function liveMapBox(){return `<div class="crr-map-wrap"><div id="crr-live-route-map" class="crr-real-map" aria-label="Mapped walking routes"></div><small class="crr-map-credit">© OpenStreetMap contributors · Routes by Valhalla</small></div>`;}
  function routeScreen(){return `<div class="page crr-page">${title(t('title'))}<div class="crr-scroll"><label class="crr-label">${esc(t('start'))}<select id="crr-start">${options(state.start)}</select></label><label class="crr-label">${esc(t('end'))}<select id="crr-end">${options(state.end)}</select></label><button class="crr-secondary" type="button" data-crr="geostart">⌖ ${esc(t('location'))}</button><label class="crr-label">${esc(t('time'))}<input id="crr-depart" type="time" value="${esc(service.departure||new Date().toTimeString().slice(0,5))}" /></label><div class="crr-setting">${icon('walk',18)} <select id="crr-mode"><option value="Walking" ${service.mobility==='Walking'?'selected':''}>${esc(l()==='en'?'Walking':'Zu Fuß')}</option><option value="Wheelchair" ${service.mobility==='Wheelchair'?'selected':''}>${esc(l()==='en'?'Wheelchair (unverified)':'Rollstuhl (ungeprüft)')}</option></select></div><div class="crr-toggles"><label><input type="checkbox" id="crr-dog" ${service.withDog?'checked':''} /> ${esc(l()==='en'?'With dog':'Mit Hund')}</label><label><input type="checkbox" id="crr-kids" ${service.withKids?'checked':''} /> ${esc(l()==='en'?'With children':'Mit Kindern')}</label></div><p class="crr-mini">${esc(l()==='de'?'Mit Hund oder Kindern: keine verifizierte Wegeignung.':'Dog/kid suitability cannot be certified from these datasets.')}</p><button class="crr-main" type="button" data-crr="calculate">${esc(t('calculate'))} →</button><p class="crr-mini">${esc(t('path'))}. ${esc(l()==='de'?'Die Route wird nicht auf Barrierefreiheit geprüft.':'Accessibility and dog/kid suitability are not verified.')}</p>${dataNote()}</div></div>`;}
  function resultsScreen(){return `<div class="page crr-page crr-map-page">${title(t('title'))}${service.status==='success'?liveMapBox():''}<div class="crr-sheet"><h2>${esc(t('title'))}</h2>${statusBlock()}${service.status==='success'?`<div class="crr-choices">${service.routeList.map(compareCard).join('')}</div><p class="crr-note">${esc(t('depart'))}: ${esc(service.departure)} · ${service.routeList[0].stations?service.routeList[0].stations+' recent climate sensors':t('noMrt')}</p><p class="crr-note">${esc(l()==='en'?'Departing later may reduce sun exposure. Try changing the departure time to 17:00 and recalculate; this is a model prediction, not a forecast.':'Später starten kann Sonne vermeiden. Teste 17:00 Uhr; das ist nur eine Modellschätzung.')}</p><div class="crr-actions"><button type="button" data-crr="compare" class="crr-secondary">${esc(t('compare'))}</button><button type="button" data-crr="details" class="crr-main">${esc(t('details'))} →</button></div>${statusWarnings()}${dataNote()}`:''}</div></div>`;}
  function compareScreen(){return `<div class="page crr-page">${title(t('compare'))}<div class="crr-scroll">${service.status==='success'?service.routeList.map(r=>`<section class="crr-panel"><h3>${esc(routeName(r.id))}</h3>${routeSummary(r)}<p>${esc(t('shadePercent'))} <b>${(r.shade*100).toFixed(0)}%</b> <small>(${esc(t('approx'))})</small></p><button data-crr="select-details" data-id="${r.id}" class="crr-main">${esc(t('details'))} →</button></section>`).join(''):statusBlock()}${statusWarnings()}${dataNote()}</div></div>`;}
  const amenities={trees:'Trees in dataset',shade:'Shaded places',water:'Drinking fountains',indoor:'Cool indoor places',toilet:'Public toilets',accessible:'Accessible toilets',transit:'Transit stops',playground:'Playgrounds',stations:'Climate sensor stations'};
  function sources(){return DSETS.map(([kind,slug])=>{const info=service.sources[kind]||{ok:false};return `<a href="https://open-data.dortmund.de/explore/dataset/${slug}/" target="_blank" rel="noopener"><span>${esc(slug)}</span><small>${info.ok?info.count+' loaded'+(info.limited?' (capped)':''):'not loaded'}</small></a>`;}).join('');}
  function detailsScreen(){const r=currentRoute();return `<div class="page crr-page crr-map-page">${title(t('details'))}${r?liveMapBox():''}<div class="crr-sheet crr-scroll"><h2>${r?esc(routeName(r.id)):esc(t('selection'))}</h2>${r?`${routeSummary(r)}<p>${esc(t('shadePercent'))}: <strong>${(100*r.shade).toFixed(0)}%</strong> <small>${esc(t('approx'))}</small></p><h3>${esc(t('facilities'))}</h3><p class="crr-mini">Counts are visible dataset matches within a corridor along the route, not exhaustive inventories.</p><div class="crr-amenities">${Object.entries(amenities).map(([key,label])=>`<div><span>${esc(label)}</span><b>${r.amenities[key]??'—'}${r.amenities[key]===null?' (not loaded)':''}</b></div>`).join('')}</div><div class="crr-actions"><button class="crr-main" data-crr="navigate">${esc(t('navigate'))} →</button></div>`:statusBlock()}<details class="crr-sources"><summary>${esc(t('methods'))}</summary><div class="crr-dataset-list">${sources()}</div></details>${statusWarnings()}${dataNote()}</div></div>`;}
  function navigateScreen(){const r=currentRoute(),steps=r?.maneuvers||[],idx=clamp(service.liveInstruction,0,Math.max(0,steps.length-1));return `<div class="page crr-page crr-map-page">${r?liveMapBox():''}<div class="crr-nav-banner"><b>${esc(t('gps'))} ${service.gpsOn?'●':'○'}</b><p>${esc(steps[idx]?.instruction||t('turns'))}</p><small>${service.gps?`${service.nearestDistance===null?'':Math.round(service.nearestDistance)+' m from route · '}GPS active`:t('preview')}</small></div><div class="crr-sheet crr-nav-sheet"><strong>${r?r.km.toFixed(2)+' km · '+r.minutes+' min':t('unknown')}</strong><div class="crr-actions"><button class="crr-secondary" data-crr="next">${esc(t('next'))} →</button><button class="crr-main" data-crr="end">${esc(t('endNav'))}</button></div><small>${esc(t('limits'))}</small></div></div>`;}
  function arrivedScreen(){return `<div class="page crr-page"><div class="crr-arrived"><div>✓</div><h1>${esc(t('arrived'))}</h1><button class="crr-main" data-crr="end">${esc(t('finish'))}</button></div></div>`;}
  function stopGPS(){if(service.watch!==null){navigator.geolocation?.clearWatch(service.watch);service.watch=null;}service.gpsOn=false;service.gps=null;}
  function GPSUpdate(location){const p=[location.coords.latitude,location.coords.longitude],r=currentRoute();if(!r)return;service.gps=p;
    const nearest=r.coords.reduce((best,v,i)=>{const d=meters(p,v);return d<best.dist?{dist:d,index:i}:best;},{dist:Infinity,index:0});service.nearestDistance=nearest.dist;
    for(let i=r.maneuvers.length-1;i>=0;i--){if(nearest.index>=r.maneuvers[i].index){service.liveInstruction=i;break;}}
    if(meters(p,r.coords[r.coords.length-1])<=25){stopGPS();goto('arrived');return;}
    const line=document.querySelector('.crr-nav-banner p');if(line)line.textContent=r.maneuvers[service.liveInstruction]?.instruction||t('turns');
    if(service.leaf&&service.leaf.gps){service.leaf.gps.setLatLng(p);}else if(service.leaf&&service.leaf.map){service.leaf.gps=L.circleMarker(p,{radius:7,color:'#fff',weight:3,fillColor:'#167ff2',fillOpacity:1}).addTo(service.leaf.map);}
  }
  function startGPS(){if(!navigator.geolocation){alert(t('gpsFail'));return;}service.gpsOn=true;service.liveInstruction=0;state.screen='navigation';render();
    service.watch=navigator.geolocation.watchPosition(GPSUpdate,()=>{stopGPS();alert(t('gpsFail'));render();},{enableHighAccuracy:true,maximumAge:4000,timeout:16000});}
  function mountRouteMap(){if(!['results','detail','navigation'].includes(state.screen)||service.status!=='success'||!window.L)return;const target=document.getElementById('crr-live-route-map');if(!target)return;
    if(service.leaf){try{service.leaf.map.remove();}catch{}service.leaf=null;}
    const map=L.map(target,{zoomControl:false,attributionControl:true,scrollWheelZoom:false});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
    const visible=state.screen==='results'?service.routeList:[currentRoute()];const bounds=[];
    for(const r of visible){if(!r)continue;const opts={color:colors[r.id],weight:r.id===state.selectedRoute?7:4,opacity:r.id===state.selectedRoute?1:.65};L.polyline(r.coords,opts).addTo(map);bounds.push(...r.coords);}
    const r=currentRoute();if(r){L.circleMarker(r.coords[0],{radius:7,color:'#fff',weight:2,fillColor:'#167ff2',fillOpacity:1}).addTo(map);L.circleMarker(r.coords[r.coords.length-1],{radius:7,color:'#fff',weight:2,fillColor:'#e14b4c',fillOpacity:1}).addTo(map);}
    if(bounds.length)map.fitBounds(L.latLngBounds(bounds),{padding:[25,25],maxZoom:16});service.leaf={map,gps:null};setTimeout(()=>{if(service.leaf?.map===map)map.invalidateSize();},120);
  }
  const previous={route:screenRoute,results:screenResults,compare:screenCompare,detail:screenDetail,navigation:screenNavigation};
  screenRoute=routeScreen;screenResults=resultsScreen;screenCompare=compareScreen;screenDetail=detailsScreen;screenNavigation=()=>state.screen==='arrived'?arrivedScreen():navigateScreen();
  const previousRender=render;render=function(){if(service.leaf){try{service.leaf.map.remove();}catch{}service.leaf=null;}const isArrived=state.screen==='arrived';if(isArrived){const el=document.getElementById('app');el.innerHTML=arrivedScreen();return;}previousRender();setTimeout(mountRouteMap,0);};
  // The original click handler is delegated on #app. Capture ours first to prevent its demo actions.
  document.getElementById('app').addEventListener('click',ev=>{const btn=ev.target.closest('[data-crr]');if(!btn)return;ev.preventDefault();ev.stopImmediatePropagation();const action=btn.dataset.crr,id=btn.dataset.id;
    if(action==='back'){if(state.screen==='route')goto('home');else if(state.screen==='results')goto('route');else if(state.screen==='compare')goto('results');else if(state.screen==='detail')goto('results');else goto('detail');}
    if(action==='geostart'){navigator.geolocation?.getCurrentPosition(p=>{service.origin=[p.coords.latitude,p.coords.longitude];const btn=document.querySelector('[data-crr=geostart]');if(btn)btn.textContent='✓ GPS '+p.coords.latitude.toFixed(4)+', '+p.coords.longitude.toFixed(4);},()=>alert(t('gpsFail')),{enableHighAccuracy:true,timeout:13000});}
    if(action==='calculate')calculate();
    if(action==='select'){state.selectedRoute=id;render();}
    if(action==='compare')goto('compare');
    if(action==='details')goto('detail');
    if(action==='select-details'){state.selectedRoute=id;goto('detail');}
    if(action==='navigate')startGPS();
    if(action==='next'){const r=currentRoute();if(!r)return;service.liveInstruction++;if(service.liveInstruction>=r.maneuvers.length){stopGPS();goto('arrived');}else render();}
    if(action==='end'){stopGPS();goto('home');}
  },true);
  document.getElementById('app').addEventListener('change',ev=>{if(ev.target.id==='crr-start'){state.start=ev.target.value;service.origin=null;}if(ev.target.id==='crr-end'){state.end=ev.target.value;service.destination=null;}if(ev.target.id==='crr-depart')service.departure=ev.target.value;if(ev.target.id==='crr-mode')service.mobility=ev.target.value;if(ev.target.id==='crr-dog')service.withDog=ev.target.checked;if(ev.target.id==='crr-kids')service.withKids=ev.target.checked;},true);
  window.addEventListener('beforeunload',stopGPS);
  document.querySelectorAll('[data-quick-route]').forEach(el=>el.addEventListener('click',()=>{if(service.status!=='success')setTimeout(()=>goto('route'),0);},true));
  render();
})();
