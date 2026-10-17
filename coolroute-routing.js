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
    ['readings','klimasensoren-aktuelle-messungen'], ['stations','klimasensoren-standorte'],
    ['toilet','offentliche-toiletten'], ['accessible','offentliche-toiletten-behindertengerecht'],
    ['transit','haltestellen'], ['playground','spielplatze']
  ];
  const labels = {en:{title:'Real walking routes',start:'From',end:'To',time:'Departure time',calculate:'Find cooler routes',working:'Calculating walkable routes and checking Dortmund Open Data…',fail:'Unable to calculate a real pedestrian route.',retry:'Try again',fastest:'Fastest',balanced:'Balanced',shade:'Coolest candidate',compare:'Compare routes',details:'Route details',navigate:'Start GPS navigation',turns:'Directions',endNav:'End navigation',location:'Use my location',selection:'Choose a destination',distance:'Distance',duration:'Walking time',mrt:'Estimated MRT',noMrt:'No recent air temperature; MRT unavailable',shadePercent:'Estimated exposure to shade',limits:'Experimental modeled exposure, not measured MRT. Route preference is only compared among available candidates.',facilities:'Nearby facilities (dataset matches)',methods:'Data and method',reroute:'Recalculate',arrived:'Destination reached',finish:'Finish',next:'Next instruction (preview)',gps:'GPS navigation',gpsFail:'Location unavailable. Navigation requires browser location permission and HTTPS or localhost.',noData:'Missing municipal data',unknown:'Unavailable',approx:'Model estimate',path:'Pedestrian route by Valhalla/OSM',status:'Checking sources…',depart:'Departure',preview:'Preview directions',home:'Home'},de:{title:'Echte Fußwege',start:'Start',end:'Ziel',time:'Startzeit',calculate:'Kühlere Wege finden',working:'Fußwege werden berechnet. Dortmunder Umweltdaten werden geladen …',fail:'Es konnte keine echte Fußroute berechnet werden.',retry:'Erneut versuchen',fastest:'Schnellster Weg',balanced:'Ausgewogen',shade:'Kühlster Kandidat',compare:'Wege vergleichen',details:'Wegdetails',navigate:'GPS-Navigation starten',turns:'Wegbeschreibung',endNav:'Navigation beenden',location:'Mein Standort',selection:'Bitte ein Ziel wählen',distance:'Entfernung',duration:'Gehzeit',mrt:'Geschätzte MRT',noMrt:'Keine aktuellen Temperaturdaten; MRT nicht verfügbar',shadePercent:'Geschätzter Schattenanteil',limits:'Experimentelle Modellwerte, keine gemessene MRT. Nur verfügbare Routen werden verglichen.',facilities:'Orte in der Nähe (aus Datensätzen)',methods:'Daten und Methode',reroute:'Neu berechnen',arrived:'Ziel erreicht',finish:'Fertig',next:'Nächste Anweisung (Vorschau)',gps:'GPS-Navigation',gpsFail:'Standort nicht verfügbar. Erlaube den Zugriff über HTTPS oder localhost.',noData:'Kommunale Daten fehlen',unknown:'Nicht verfügbar',approx:'Modellschätzung',path:'Fußweg: Valhalla/OSM',status:'Datenquellen werden geprüft…',depart:'Startzeit',preview:'Wegvorschau',home:'Startseite'},simple:{title:'Wege zu Fuß',start:'Hier starten',end:'Hierhin gehen',time:'Wann gehst du?',calculate:'Kühlen Weg suchen',working:'Wir suchen Wege und Orte mit Schatten …',fail:'Wir konnten keinen Weg finden.',retry:'Nochmal suchen',fastest:'Schnell',balanced:'Gut gemischt',shade:'Weniger Sonne',compare:'Wege ansehen',details:'Infos zum Weg',navigate:'Mit GPS starten',turns:'So gehst du',endNav:'Aufhören',location:'Mein Ort',selection:'Such ein Ziel aus',distance:'So weit',duration:'So lange',mrt:'Hitze-Schätzwert',noMrt:'Keine aktuellen Daten zur Lufttemperatur',shadePercent:'Wie viel Schatten?',limits:'Die Hitze ist nur geschätzt. Bitte prüfe deinen Weg vor Ort.',facilities:'Orte am Weg',methods:'Woher kommen die Daten?',reroute:'Neuen Weg suchen',arrived:'Du bist da',finish:'Fertig',next:'Nächster Schritt (Test)',gps:'GPS verwenden',gpsFail:'Wir finden deinen Standort nicht. Bitte Standort erlauben.',noData:'Nicht alle Daten da',unknown:'Keine Daten',approx:'Geschätzt',path:'Echter Fußweg auf der Karte',status:'Daten werden geladen …',depart:'Start',preview:'Weg ansehen',home:'Start'}};
  const l = () => {let v='en'; try {v=localStorage.getItem('cr-hack-lang')||'en';}catch{}return labels[v]?v:'en';};
  const t = key => labels[l()][key]||labels.en[key]||key;
  const service = {status:'idle', error:'', routeList:[], selected:'shade', sources:{}, warnings:[], features:{}, departure:'', origin:null,destination:null, gps:null, watch:null, leaf:null, loadingId:0, resultMap:null, mapMount:0, liveInstruction:0, nearestDistance:null, gpsOn:false, dataCache:null, purpose:'', mobility:'Walking',withDog:false,withKids:false};
  window.CoolRouteRouting = service;
  service.version='route-corridor-data-v3';
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
    return {at,kind,name:String(r.objektname||r.schattenplatz||r.bezeichnung||r.name||r.body_item_name||r.art_deutsc||kind),crown:Number(r.kronendurc||r.kronendurchmesser||0),height:Number(r.baumhoehe||r.baumhohe||0),temp:kind==='readings'?Number(r.data_air_temperature??r.air_temperature??NaN):NaN,measured:r.measured_at||r.messdatum_lang||r.timestamp||null,id:String(r.device_id||r.data_station_id||r.id||r.objektname||''),sensorType:String(r.sensormodell||r.body_item_fields_gerateinformation_geratetyp||'')};
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
  function latestTemperatures(features){const now=Date.now(), data=(features.readings||[]).filter(f=>!/BLACK.?GLOBE|\bBLG\b/i.test(f.sensorType||'')).filter(f=>Number.isFinite(f.temp)&&f.temp>-35&&f.temp<55&&f.measured&&Math.abs(now-new Date(f.measured).getTime())<3*3600000);const result=[];const ids=new Set();for(const f of data.sort((a,b)=>new Date(b.measured)-new Date(a.measured))){const id=f.id||f.at.join(',');if(!ids.has(id)){result.push(f);ids.add(id);}}return result;}
  function localTemp(at, sensors){let w=0,sum=0;for(const p of sensors){const d=Math.max(50,meters(at,p.at));if(d>6000)continue;const v=1/(d*d);w+=v;sum+=p.temp*v;}return w?sum/w:null;}
  const GRID_LAT=.0009,GRID_LON=.0014;
  function spatialGrid(points){const map=new Map();for(const p of points||[]){
    const key=Math.floor(p.at[0]/GRID_LAT)+':'+Math.floor(p.at[1]/GRID_LON);
    if(!map.has(key))map.set(key,[]);map.get(key).push(p);
  }return map;}
  function gridNear(grid,p,rings=2){const y=Math.floor(p[0]/GRID_LAT),x=Math.floor(p[1]/GRID_LON),out=[];
    for(let dy=-rings;dy<=rings;dy++)for(let dx=-rings;dx<=rings;dx++){
      const items=grid.get((y+dy)+':'+(x+dx));if(items)out.push(...items);
    }return out;}
  function facilitiesAlong(samples, features){const counts={}, sampleGrid=spatialGrid(samples.map(s=>({at:[s[0],s[1]]})));
    for(const kind of ['trees','shade','water','indoor','toilet','accessible','transit','playground','stations']){
      const threshold=kind==='trees'?15:kind==='shade'?28:kind==='indoor'?65:50;
      counts[kind]=null;if(!service.sources[kind]?.ok)continue;
      counts[kind]=(features[kind]||[]).filter(f=>gridNear(sampleGrid,f.at,1).some(s=>meters(f.at,s.at)<threshold)).length;
    }return counts;
  }
  function scoreRoute(route, features, departure) {
    const samples=candidateSamples(route.coords), sun=sunPosition(dateAtTime(departure),route.coords[0][0],route.coords[0][1]);
    const daylight=sun.alt>.075, hasShadeData=!!(service.sources.trees?.ok||service.sources.shade?.ok);
    const sensors=Math.abs(dateAtTime(departure).getTime()-Date.now())<=2*3600000?latestTemperatures(features):[];
    const treesGrid=spatialGrid(features.trees),shadeGrid=spatialGrid(features.shade);
    let shadeTotal=0, greenTotal=0, radTotal=0, radMeters=0, total=0, balancedCost=0, coolCost=0;
    for(const sample of samples){
      const p=[sample[0],sample[1]],w=sample[2];total+=w;
      const nearby={trees:gridNear(treesGrid,p,2),shade:gridNear(shadeGrid,p,2)};
      const sh=daylight&&hasShadeData?shadeAt(p,nearby,sun):0;
      // Green-proximity is NOT shade: it is an independent feature useful after sunset.
      let nearGreen=0;
      if(hasShadeData){
        const treeNearby=nearby.trees.some(tree=>meters(p,tree.at)<22);
        const shadeNearby=nearby.shade.some(place=>meters(p,place.at)<50);
        nearGreen=treeNearby?1:shadeNearby?.55:0;
      }
      shadeTotal+=sh*w;greenTotal+=nearGreen*w;
      const air=localTemp(p,sensors),mrt=daylight?modelMrt(air,sh,sun):air;
      if(mrt!==null){radTotal+=mrt*w;radMeters+=w;}
      const heatPenalty=daylight?(mrt!==null?clamp((mrt-22)/35,0,1.5):Math.sin(sun.alt)*(1-sh)):0;
      // Non-negative edge costs. Lower = preferred; distance remains a strong influence.
      balancedCost+=w*(1+.65*heatPenalty-.09*sh-.08*nearGreen);
      coolCost+=w*(1+1.65*heatPenalty-.28*sh-.17*nearGreen);
    }
    const amen=facilitiesAlong(samples,features);
    return {...route,shade:daylight&&hasShadeData&&total?shadeTotal/total:null,
      greenProximity:hasShadeData&&total?greenTotal/total:null,
      avgMrt:daylight&&radMeters>=total*.75?radTotal/radMeters:null,
      daylight,hasShadeData,exposure:coolCost,costBalanced:balancedCost,costCoolest:coolCost,
      amenities:amen,stations:sensors.length,solar:sun};
  }
  function decodePolyline(encoded){let lat=0,lon=0,index=0;const pts=[];while(index<encoded.length){let shift=0,result=0,b;do{b=encoded.charCodeAt(index++)-63;result|=(b&31)<<shift;shift+=5;}while(b>=32&&index<encoded.length);lat+=(result&1)?~(result>>1):result>>1;
      shift=0;result=0;do{b=encoded.charCodeAt(index++)-63;result|=(b&31)<<shift;shift+=5;}while(b>=32&&index<encoded.length);lon+=(result&1)?~(result>>1):result>>1;pts.push([lat/1e6,lon/1e6]);}return pts;}
  async function fetchJson(url,timeout=15000){const ctrl=new AbortController();const handle=setTimeout(()=>ctrl.abort(),timeout);try{const res=await fetch(url,{signal:ctrl.signal,headers:url.startsWith(ROUTE_API)?{'X-Client-Id':'coolroute-dortmund-hackathon'}:{}});if(!res.ok)throw new Error('HTTP '+res.status);return await res.json();}finally{clearTimeout(handle);}}
  // Fetch only relevant map tiles around actual candidate routes, not an arbitrary
  // prefix of Dortmund's citywide tree records. Spatial queries are paginated.
  const TREE_LAT=.0027, TREE_LON=.0038, TREE_RADIUS_M=75, TREE_MAX_TILES=90;
  const treeTileCache=new Map();
  const inTile=(at,b)=>at[0]>=b[0]&&at[0]<=b[2]&&at[1]>=b[1]&&at[1]<=b[3];
  function routeTreeTiles(routes){
    const cells=new Map();
    for(const r of routes){
      for(let n=1;n<r.coords.length;n++){
        const a=r.coords[n-1],b=r.coords[n],dist=meters(a,b),steps=Math.max(1,Math.ceil(dist/70));
        for(let step=0;step<=steps;step++){
          const f=step/steps,lat=a[0]+(b[0]-a[0])*f,lon=a[1]+(b[1]-a[1])*f;
          const latPad=TREE_RADIUS_M/111320,lonPad=TREE_RADIUS_M/(111320*Math.cos(radians(lat)));
          const ymin=Math.floor((lat-latPad)/TREE_LAT),ymax=Math.floor((lat+latPad)/TREE_LAT);
          const xmin=Math.floor((lon-lonPad)/TREE_LON),xmax=Math.floor((lon+lonPad)/TREE_LON);
          for(let y=ymin;y<=ymax;y++)for(let x=xmin;x<=xmax;x++){
            const key=y+':'+x;
            if(!cells.has(key))cells.set(key,[y*TREE_LAT,x*TREE_LON,(y+1)*TREE_LAT,(x+1)*TREE_LON]);
          }
        }
      }
    }
    return [...cells.entries()];
  }
  async function pageData(slug,bound,{field='geo_point_2d',ordered=false,maxRecords=10000}={}){
    const output=[];const base=API+encodeURIComponent(slug)+'/records';let count=Infinity;
    for(let offset=0;offset<Math.min(count,maxRecords);offset+=100){
      const params=new URLSearchParams({limit:'100',offset:String(offset)});
      if(bound)params.set('where',`in_bbox(${field}, ${bound.map(x=>x.toFixed(7)).join(', ')})`);
      if(ordered)params.set('order_by','measured_at desc');
      const body=await fetchJson(base+'?'+params,13500);
      count=Number(body.total_count)||0;
      const rows=body.results||[];output.push(...rows);
      if(rows.length<100)break;
    }
    return {records:output,limited:output.length<count};
  }
  function routeNear(point, routes, maxDist){
    for(const r of routes){for(let i=1;i<r.coords.length;i++){
      const a=r.coords[i-1],b=r.coords[i],lat=point[0],c=Math.cos(radians(lat));
      const ax=a[1]*111320*c,ay=a[0]*111320,bx=b[1]*111320*c,by=b[0]*111320;
      const px=point[1]*111320*c,py=point[0]*111320;
      const vx=bx-ax,vy=by-ay,f=clamp(((px-ax)*vx+(py-ay)*vy)/(vx*vx+vy*vy||1),0,1);
      if(Math.hypot(px-(ax+vx*f),py-(ay+vy*f))<=maxDist)return true;
    }}return false;
  }
  async function loadRouteTrees(routes){
    const tiles=routeTreeTiles(routes),selection=tiles.slice(0,TREE_MAX_TILES),all=[];let partial=tiles.length>TREE_MAX_TILES,errors=0;
    let cursor=0;
    async function worker(){while(cursor<selection.length){const [key,bound]=selection[cursor++];
      try{
        let value=treeTileCache.get(key);
        if(!value || value.expiry<Date.now()){
          const page=await pageData('baumkataster',bound);
          value={rows:page.records.map(r=>extract('trees',r)).filter(Boolean),limited:page.limited,expiry:Date.now()+12*60000};
          treeTileCache.set(key,value);
        }
        partial ||=value.limited;all.push(...value.rows);
      }catch(error){errors++;partial=true;}
    }}
    await Promise.all([worker(),worker(),worker(),worker()]);
    const unique=new Map();for(const tree of all){
      if(!routeNear(tree.at,routes,TREE_RADIUS_M))continue;
      const key=tree.id&&tree.id!=='undefined'?tree.id+':'+tree.at.join(','):tree.at.join(',');unique.set(key,tree);
    }
    const rows=[...unique.values()];
    return {rows,limited:partial,ok:errors<selection.length || !selection.length,
      fetchedTiles:selection.length,availableTiles:tiles.length,errors};
  }
  async function cityData(kind, slug, bound){
    if(kind==='readings'){
      // Dortmund's last measurement per sensor; use air_temperature, never internal or Black Globe temperature.
      const data=await pageData(slug,null,{ordered:true,maxRecords:1000});
      const rows=data.records.map(r=>extract(kind,r)).filter(Boolean);
      return {rows,limited:data.limited,fallback:false};
    }
    try{
      const data=await pageData(slug,bound);
      return {rows:data.records.map(r=>extract(kind,r)).filter(Boolean).filter(r=>inTile(r.at,bound)),limited:data.limited,fallback:false};
    }catch(error){
      // Other datasets occasionally publish a different geometry field. No silent success label.
      const data=await pageData(slug,null,{maxRecords:100});
      return {rows:data.records.map(r=>extract(kind,r)).filter(Boolean).filter(r=>inTile(r.at,bound)),limited:true,fallback:true};
    }
  }
  async function getEnvironmentalData(origin,dest){
    const bounds=bbox(origin,dest),feats={trees:[]};service.sources={trees:{ok:false,count:0,pending:true}};
    const queue=DSETS.filter(([kind])=>kind!=='trees').slice();
    async function worker(){while(queue.length){const [kind,slug]=queue.shift();
      try{const data=await cityData(kind,slug,bounds);feats[kind]=data.rows;service.sources[kind]={ok:true,count:data.rows.length,limited:data.limited,fallback:data.fallback};}
      catch(error){feats[kind]=[];service.sources[kind]={ok:false,error:error.message,count:0};}
    }}await Promise.all([worker(),worker(),worker()]);return feats;
  }
  function sideOffset(waypoint,start,end){const m=midpoint(start,end);return meters(waypoint,m);}
  function waypoints(features,start,end){const dist=meters(start,end);const can=[];
    for(const pt of (features.shade||[]).concat((features.indoor||[]))){const d1=meters(start,pt.at),d2=meters(end,pt.at);if(d1<120||d2<120||d1+d2>dist*1.42+230||d1+d2<dist*.85)continue;can.push({coord:pt.at,score:d1+d2+Math.max(0,sideOffset(pt.at,start,end)-350)*.3});}
    // Generate a tree-cluster waypoint if no shade POI offers a reasonable detour.
    if(can.length<3){const grouped=new Map();for(const p of features.trees||[]){if(meters(start,p.at)<130||meters(end,p.at)<130)continue;const key=Math.round(p.at[0]*1000)+','+Math.round(p.at[1]*1000);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(p.at);}
      for(const group of grouped.values())if(group.length>=3){const loc=[group.reduce((a,b)=>a+b[0],0)/group.length,group.reduce((a,b)=>a+b[1],0)/group.length];const d1=meters(start,loc),d2=meters(end,loc);if(d1+d2<dist*1.4+200)can.push({coord:loc,score:d1+d2-25*group.length});}
    }
    can.sort((a,b)=>a.score-b.score);const selected=[];for(const entry of can){if(selected.every(p=>meters(p,entry.coord)>200)){selected.push(entry.coord);if(selected.length>=3)break;}}return selected;
  }
  function routeFromTrip(trip){
    if(!trip?.legs?.length||!trip.summary)return null;
    const coords=[],maneuvers=[];
    for(const leg of trip.legs){
      const line=decodePolyline(leg.shape||'');if(!line.length)continue;
      const offset=coords.length;coords.push(...line);
      for(const m of leg.maneuvers||[])maneuvers.push({instruction:m.instruction||'',index:offset+(m.begin_shape_index||0),type:m.type||0,km:m.length||0});
    }
    if(coords.length<2)return null;
    const km=Number(trip.summary.length),minutes=Math.max(1,Math.round(Number(trip.summary.time)/60));
    return Number.isFinite(km)&&km>0&&Number.isFinite(minutes)?{coords,km,minutes,maneuvers}:null;
  }
  async function getPedRoutes(points, alternatives=0, isWaterStop=false){
    const body={locations:points.map(([lat,lon],i)=>({lat,lon,type:i===0||i===points.length-1||isWaterStop?'break':'through'})),
      costing:'pedestrian',units:'km',language:l()==='en'?'en-US':'de-DE',
      costing_options:{pedestrian:{walking_speed:5.0}}};
    if(points.length===2&&alternatives)body.alternates=alternatives;
    const json=await fetchJson(ROUTE_API+'?json='+encodeURIComponent(JSON.stringify(body)),20000);
    const primary=routeFromTrip(json.trip);if(!primary)throw new Error(json?.error||'No valid pedestrian route');
    // Some Valhalla installations return alternatives in alternates[]; gracefully handle other shapes.
    const extras=(json.alternates||json.alternatives||[]).map(entry=>routeFromTrip(entry.trip||entry)).filter(Boolean);
    return [primary,...extras];
  }
  // Two pedestrian paths are different only when they use substantially different streets.
  // Distance and duration alone are not a reliable way to detect duplicates.
  function segmentDistance(p,a,b){
    const lat=radians(p[0]),sx=111320*Math.cos(lat),sy=111320;
    const ax=(a[1]-p[1])*sx,ay=(a[0]-p[0])*sy,bx=(b[1]-p[1])*sx,by=(b[0]-p[0])*sy;
    const dx=bx-ax,dy=by-ay,u=clamp(-(ax*dx+ay*dy)/Math.max(.0001,dx*dx+dy*dy),0,1);
    return Math.hypot(ax+u*dx,ay+u*dy);
  }
  function overlap(routeA,routeB){
    const pts=candidateSamples(routeA.coords,65);let near=0,all=0;
    for(const p of pts){const w=p[2];all+=w;
      if(routeB.coords.slice(1).some((b,i)=>segmentDistance(p,routeB.coords[i],b)<32))near+=w;
    }
    return all?near/all:1;
  }
  function materiallyDifferent(a,b){return Math.min(overlap(a,b),overlap(b,a))<.82;}
  function lateralWaypoints(route,origin,dest){
    // Offset from the actual pedestrian route, not a direct aerial line.
    // The routing engine snaps the waypoints to walkable OSM streets.
    const pts=candidateSamples(route.coords,90);if(!pts.length)return [];
    const cumulative=[];let total=0;for(const v of pts){total+=v[2];cumulative.push(total);}
    const result=[];
    for(const fraction of [.35,.62]){
      const idx=cumulative.findIndex(x=>x>=total*fraction),k=Math.max(1,Math.min(pts.length-2,idx));
      const p=pts[k],before=pts[k-1],after=pts[k+1];
      const vx=(after[1]-before[1])*111320*Math.cos(radians(p[0]));
      const vy=(after[0]-before[0])*111320;
      const norm=Math.hypot(vx,vy)||1;
      for(const side of [1,-1]){
        const offset=clamp(meters(origin,dest)*.105,170,340)*side;
        const lat=p[0]+offset*(-vx/norm)/111320;
        const lon=p[1]+offset*(vy/norm)/(111320*Math.cos(radians(p[0])));
        result.push([lat,lon]);
      }
    }
    return result;
  }
  function selectDistinctProfiles(scored){
    const shortest=[...scored].sort((a,b)=>a.minutes-b.minutes||a.km-b.km)[0];
    const others=scored.filter(r=>r!==shortest&&materiallyDifferent(r,shortest));
    const selections=[{...shortest,id:'fastest'}];if(!others.length)return selections;
    const sunAvailable=shortest.daylight&&shortest.hasShadeData;
    const balance=[...others].sort((a,b)=>a.costBalanced-b.costBalanced)[0];
    const coolest=[...others].sort((a,b)=>a.costCoolest-b.costCoolest)[0];
    if(others.length===1){selections.push({...others[0],id:sunAvailable?'shade':'balanced'});return selections;}
    // Give each label a distinct physical path; do not duplicate a line in three colors.
    let altCool=coolest;
    if(altCool===balance){altCool=[...others].filter(r=>materiallyDifferent(r,balance)).sort((a,b)=>a.costCoolest-b.costCoolest)[0]||null;}
    selections.push({...balance,id:'balanced'});
    if(altCool)selections.push({...altCool,id:'shade'});
    return selections;
  }
  /* CRW_HARD_WATER_ROUTING_V1 */
  // Water is a HARD routing requirement. A mere nearby point count does not satisfy it.
  // Municipal drinking-fountain dataset is queried in full (normally only dozens of points).
  const CRW_SOURCE_URL='https://open-data.dortmund.de/explore/dataset/trinkwasserbrunnen/';
  const CRW_MAX_FOUNTAIN_PAGES=5;
  const CRW_MAX_ROUTING_REQUESTS=8;
  const CRW_MAX_OFF_ROUTE_METERS=40;
  let crwCache=null;
  function crwEnabled(){
    try{return window.CoolRoutePreferences?.get?.().needsWater===true;}
    catch{return false;}
  }
  function crwText(){return l()==='de'?'Trinkbrunnen-Stopp':l()==='simple'?'Hier gibt es Trinkwasser':'Drinking-water stop';}
  function crwEscape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  async function crwLoadFountains(){
    if(crwCache && Date.now()-crwCache.saved<10*60000)return crwCache.rows;
    const rows=[],seen=new Set();let expected=null,readCount=0;
    for(let page=0;page<CRW_MAX_FOUNTAIN_PAGES;page++){
      const url=API+'trinkwasserbrunnen/records?limit=100&offset='+page*100;
      const json=await fetchJson(url,13000),records=json.results;
      if(!Array.isArray(records))throw new Error('Dortmund fountain data returned an unexpected response.');
      readCount+=records.length;
      if(expected===null && Number.isFinite(Number(json.total_count)))expected=Number(json.total_count);
      for(const record of records){
        const pt=locationField(record);
        if(!pt || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1]) || pt[0]<51.25 || pt[0]>51.7 || pt[1]<7.15 || pt[1]>7.75)continue;
        if(record.objektart && !/trinkwasserbrunnen|trinkbrunnen/i.test(String(record.objektart)))continue;
        const key=pt.map(n=>n.toFixed(6)).join(',');if(seen.has(key))continue;seen.add(key);
        const street=String(record.strasse||'').trim(),detail=String(record.i_zusinfo||'').trim();
        const label=street ? `Trinkbrunnen – ${street}` : detail ? `Trinkbrunnen – ${detail.slice(0,70)}` : 'Trinkbrunnen';
        rows.push({at:pt,kind:'water',name:label,id:key,street,detail});
      }
      if(records.length<100)break;
      if(page===CRW_MAX_FOUNTAIN_PAGES-1)
        throw new Error('The fountain catalogue exceeded the safety limit. Water routing was not calculated using incomplete data.');
    }
    if(expected!==null && readCount<expected)throw new Error('The fountain catalogue returned incomplete data. No route will be calculated without the complete listing.');
    if(!rows.length)throw new Error('No mapped drinking fountains were returned by Dortmund Open Data.');
    crwCache={saved:Date.now(),rows};return rows;
  }
  function crwRouteDistance(route,point){
    let best=Infinity;for(let k=1;k<route.coords.length;k++){
      const d=segmentDistance(point,route.coords[k-1],route.coords[k]);if(d<best)best=d;
    }return best;
  }
  function crwCandidates(fountains,from,to,direct){
    const straight=meters(from,to),maxAirExtra=Math.max(1100,straight*.45);
    return fountains.map(stop=>{
      const via=meters(from,stop.at)+meters(stop.at,to);
      return {...stop,extra:via-straight};
    }).filter(stop=>stop.extra<=maxAirExtra)
      .sort((a,b)=>a.extra-b.extra || meters(from,a.at)-meters(from,b.at))
      .slice(0,CRW_MAX_ROUTING_REQUESTS);
  }
  function crwStopMarkup(r){return r?.waterStop?`<p class="crw-confirmation"><span aria-hidden="true">💧</span><span><strong>${crwEscape(crwText())}</strong><small>${crwEscape(r.waterStop.name)} · Stadt Dortmund</small></span></p>`:'';}

  async function calculate(){if(service.status==='loading')return;const from=service.origin||names[state.start],to=service.destination||names[state.end];if(!from||!to||meters(from,to)<80){service.status='error';service.error='Choose two distinct Dortmund locations.';goto('results');return;}
    service.departure=document.getElementById('crr-depart')?.value||service.departure||new Date().toTimeString().slice(0,5);
    service.requiresWater=crwEnabled();service.status='loading';service.routeList=[];service.error='';service.warnings=[];goto('results');const job=++service.loadingId;
    try{const distance=meters(from,to);if(distance>10500)throw new Error('For this prototype, select places within approximately 10 km.');
      const directPromise=getPedRoutes([from,to],2).then(routes=>({routes}),error=>({error}));
      const key=from.join(',')+'|'+to.join(',');
      let features;if(service.dataCache?.key===key && Date.now()-service.dataCache.saved<300000){features=service.dataCache.features;service.sources=service.dataCache.sources;}
      else{features=await getEnvironmentalData(from,to);service.dataCache={key,saved:Date.now(),features,sources:service.sources};}
      if(service.requiresWater){
        // No partial or silently missing water inventory can satisfy a hard requirement.
        features.water=await crwLoadFountains();
        service.sources.water={ok:true,count:features.water.length,limited:false,requirement:true};
      }
      const directResult=await directPromise;
      if(directResult.error)throw directResult.error;
      const direct=directResult.routes[0];if(job!==service.loadingId)return;service.features=features;
      const possibilities=[];
      function addRoute(route){
        if(service.requiresWater && !route?.waterStop)return false;
        if(!route||route.km>direct.km*1.65+.15||route.minutes>direct.minutes*1.85+5)return false;
        if(!possibilities.every(prev=>materiallyDifferent(prev,route)))return false;
        possibilities.push(route);return true;
      }
      if(service.requiresWater){
        const stops=crwCandidates(features.water,from,to,direct);
        if(!stops.length)throw new Error('No public drinking fountain is close enough to this journey for a reasonable walking detour. Uncheck Drinking water to search without a stop.');
        for(const stop of stops){
          if(job!==service.loadingId)return;
          try{
            // Intermediate 'break' yields a real navigable stop and approach directions.
            const routes=await getPedRoutes([from,stop.at,to],0,true);
            for(const r of routes){
              const separation=crwRouteDistance(r,stop.at);
              if(separation>CRW_MAX_OFF_ROUTE_METERS)continue;
              r.waterStop={at:stop.at,name:stop.name,id:stop.id,street:stop.street,offsetMeters:Math.round(separation)};
              addRoute(r);
            }
            if(possibilities.length>=3)break;
            // Respect a shared public routing server.
            await new Promise(resolve=>setTimeout(resolve,250));
          }catch(e){service.warnings.push('Fountain route failed: '+e.message);}
        }
        if(!possibilities.length)throw new Error('No walking route via a mapped drinking fountain could be calculated within the detour limit. No non-compliant route has been substituted. Try different endpoints or disable Drinking water.');
      }else{
      addRoute(direct);
      for(const candidate of directResult.routes.slice(1))addRoute(candidate);
      // First prefer actual municipal shaded sites and tree clusters, then try
      // lateral on-street waypoints if the service returns too few alternatives.
      const municipal=waypoints(features,from,to);
      const offsets=lateralWaypoints(direct,from,to);
      const tries=[...municipal,...offsets].filter((pt,i,arr)=>arr.findIndex(other=>meters(other,pt)<95)===i);
      let requests=0;
      for(const waypoint of tries){
        if(possibilities.length>=4||requests>=7)break;
        requests++;
        try{
          await new Promise(resolve=>setTimeout(resolve,450));
          const routes=await getPedRoutes([from,waypoint,to]);
          for(const route of routes)addRoute(route);
        }catch(e){service.warnings.push('A detour was unavailable: '+e.message);}
      }      }

      // Load uncapped tree coverage for a narrow corridor around ALL candidate paths.
      // This happens after routing so we do not fetch the whole city (or huge endpoint bounding boxes).
      const trees=await loadRouteTrees(possibilities);
      features.trees=trees.rows;
      service.sources.trees={ok:trees.ok,count:trees.rows.length,limited:trees.limited,
        fetchedTiles:trees.fetchedTiles,availableTiles:trees.availableTiles,errors:trees.errors};
      service.features=features;
      const scored=possibilities.map(r=>scoreRoute(r,features,service.departure));
      service.routeList=selectDistinctProfiles(scored);
      service.selected=service.routeList[service.routeList.length-1].id;
      state.selectedRoute=service.selected;service.status='success';
      if(service.routeList.length<3)service.warnings.push(`Only ${service.routeList.length} genuinely different walkable route(s) could be found. Duplicate paths are hidden rather than displayed as separate choices.`);
      if(!service.routeList[0].daylight)service.warnings.push('The selected departure is after sunset: solar shade is not applicable. Nearby trees/parks are shown as greenery, not measured cooling.');
      if(!(service.sources.trees?.ok||service.sources.shade?.ok))service.warnings.push('No tree or shade observations available. Cool-route ranking cannot be verified.');
      if(Math.abs(dateAtTime(service.departure).getTime()-Date.now())>2*3600000)service.warnings.push('Requested departure is more than two hours away. Current measurements cannot forecast future air temperature; absolute MRT is hidden.');else if(!latestTemperatures(features).length)service.warnings.push('No recent sensor temperature observations; numerical MRT estimates are hidden.');
      for(const kind of ['trees','shade','water','indoor','toilet','accessible','transit','playground','stations'])if(service.sources[kind]?.limited)service.warnings.push(kind+' dataset was partially sampled; nearby counts and model scores may omit records.');
      if(service.mobility==='Wheelchair')service.warnings.push('Pedestrian routing is NOT verified wheelchair accessible.');if(service.withDog||service.withKids)service.warnings.push('Dog/child-friendly suitability has not been verified against street attributes.');
    }catch(e){service.status='error';service.error=e.name==='AbortError'?'External service timed out. Try again.':e.message;}
    finally{if(job===service.loadingId)render();}
  }
  function currentRoute(){return service.routeList.find(r=>r.id===state.selectedRoute)||service.routeList[service.routeList.length-1]||service.routeList[0];}
  function formattedCoords(list){return list.map(p=>p.map(x=>x.toFixed(4)).join(',')).join(';');}
  function options(selected){return positions.map(([name])=>`<option ${name===selected?'selected':''} value="${esc(name)}">${esc(name)}</option>`).join('');}
  function title(s){return `<header class="crr-head"><button type="button" data-crr="back" aria-label="Back">←</button><b>${esc(s)}</b><span></span></header>`;}
  function dataNote(){return ''; /* Detailed methodology is available in Profile → Data sources. */}
  const colors={fastest:'#1d72d8',balanced:'#0d9b95',shade:'#087957'};
  function routeName(id){if(id==='shade'){const r=service.routeList.find(x=>x.id==='shade');if(r&&!r.daylight)return l()==='de'?'Grünere Alternative':'Greener alternative';if(r&&!r.hasShadeData)return l()==='de'?'Anderer Fußweg':'Alternative walking route';return l()==='de'?'Schatten-Alternative':'Shade-focused route';}return t(id);}
  function weather(r){return r.avgMrt!==null?`<b>${r.avgMrt.toFixed(1)} °C</b> <small>${esc(t('approx'))} MRT proxy</small>`:`<small>${esc(t('noMrt'))}</small>`;}
  function shadeText(r){
    if(!r.daylight)return esc(l()==='de'?'Nach Sonnenuntergang · Schatten nicht anwendbar':'After sunset · solar shade N/A');
    if(r.shade===null)return esc(l()==='de'?'Keine ausreichenden Schattendaten':'Shade data unavailable');
    return `${esc(t('shadePercent'))}: ${(r.shade*100).toFixed(0)}% <i>(${esc(t('approx'))})</i>`;
  }
  function greenText(r){return r.greenProximity!==null?`${Math.round(r.greenProximity*100)}% ${esc(l()==='de'?'in Nähe erfasster Grünflächen/Bäume':'near mapped trees / shady places')} (${esc(t('approx'))})`:esc(t('noData'));}
  function compareCard(r){return `<button type="button" data-crr="select" data-id="${r.id}" class="crr-choice ${state.selectedRoute===r.id?'active':''}"><span class="crr-color" style="background:${colors[r.id]}"></span><span><b>${esc(routeName(r.id))}</b><small>${r.km.toFixed(2)} km · ${r.minutes} min</small><small>${shadeText(r)}</small><small>${greenText(r)}</small>${r.waterStop?`<small class="crw-choice">💧 ${crwEscape(r.waterStop.name)}</small>`:''}</span><span>›</span></button>`;}
  function routeSummary(r){return `<div class="crr-summary"><strong>${r.km.toFixed(2)} km</strong><strong>${r.minutes} min</strong><div>${weather(r)}</div></div>`;}
  function statusBlock(){return service.status==='loading'?`<div class="crr-message crr-loading"><span class="crr-spinner"></span>${esc(t('working'))}</div>`:service.status==='error'?`<div class="crr-message" role="alert">${esc(t('fail'))}<p>${esc(service.error)}</p><button class="crr-main" data-crr="calculate">${esc(t('retry'))}</button></div>`:service.status!=='success'?`<div class="crr-message">${esc(t('selection'))}</div>`:'';}
  function statusWarnings(){return ''; /* Not a scrolling list in route UI. */}
  function liveMapBox(){return `<div class="crr-map-wrap"><div id="crr-live-route-map" class="crr-real-map" aria-label="Mapped walking routes"></div><small class="crr-map-credit">© OpenStreetMap contributors · Routes by Valhalla</small></div>`;}
  function routeScreen(){return `<div class="page crr-page">${title(t('title'))}<div class="crr-scroll"><label class="crr-label">${esc(t('start'))}<select id="crr-start">${options(state.start)}</select></label><label class="crr-label">${esc(t('end'))}<select id="crr-end">${options(state.end)}</select></label><button class="crr-secondary" type="button" data-crr="geostart">⌖ ${esc(t('location'))}</button><label class="crr-label">${esc(t('time'))}<input id="crr-depart" type="time" value="${esc(service.departure||new Date().toTimeString().slice(0,5))}" /></label><div class="crr-setting">${icon('walk',18)} <select id="crr-mode"><option value="Walking" ${service.mobility==='Walking'?'selected':''}>${esc(l()==='en'?'Walking':'Zu Fuß')}</option><option value="Wheelchair" ${service.mobility==='Wheelchair'?'selected':''}>${esc(l()==='en'?'Wheelchair (unverified)':'Rollstuhl (ungeprüft)')}</option></select></div><div class="crr-toggles"><label><input type="checkbox" id="crr-dog" ${service.withDog?'checked':''} /> ${esc(l()==='en'?'With dog':'Mit Hund')}</label><label><input type="checkbox" id="crr-kids" ${service.withKids?'checked':''} /> ${esc(l()==='en'?'With children':'Mit Kindern')}</label></div><button class="crr-main" type="button" data-crr="calculate">${esc(t('calculate'))} →</button></div></div>`;}
  function resultsScreen(){return `<div class="page crr-page crr-map-page">${title(t('title'))}${service.status==='success'?liveMapBox():''}<div class="crr-sheet"><h2>${esc(t('title'))}</h2>${statusBlock()}${service.status==='success'?`<div class="crr-choices">${service.routeList.map(compareCard).join('')}</div><p class="crr-mini">${esc(l()==='de'?'Jede Karte zeigt einen eigenen, berechneten Fußweg. Gibt es keine weiteren sinnvollen Wege, werden weniger Karten angezeigt.':'Each card represents a different computed walking path. If alternatives cannot be found, fewer cards are shown.')}</p><p class="crr-note">${esc(t('depart'))}: ${esc(service.departure)} · ${service.routeList[0].stations?service.routeList[0].stations+' recent climate sensors':t('noMrt')}</p><div class="crr-time-tester"><span>${esc(l()==='de'?'Andere Startzeit testen':'Try another departure time')}:</span><button type="button" data-crr="time" data-at="13:00">13:00</button><button type="button" data-crr="time" data-at="17:00">17:00</button></div><p class="crr-note">${service.routeList[0].daylight?esc(l()==='de'?'Schatten kann sich im Tagesverlauf ändern. Werte sind Modellschätzungen, keine Vorhersagen.':'Shade can change over the day. Values are model estimates, not forecasts.'):esc(l()==='de'?'Nach Sonnenuntergang keine direkte Sonne. Schattenwerte werden nicht berechnet.':'After sunset there is no direct sunlight, so solar shade is not calculated.')}</p><div class="crr-actions"><button type="button" data-crr="compare" class="crr-secondary">${esc(t('compare'))}</button><button type="button" data-crr="details" class="crr-main">${esc(t('details'))} →</button></div>${statusWarnings()}${dataNote()}`:''}</div></div>`;}
  function compareScreen(){return `<div class="page crr-page">${title(t('compare'))}<div class="crr-scroll">${service.status==='success'?service.routeList.map(r=>`<section class="crr-panel"><h3>${esc(routeName(r.id))}</h3>${routeSummary(r)}<p>${shadeText(r)}</p><p>${greenText(r)}</p><button data-crr="select-details" data-id="${r.id}" class="crr-main">${esc(t('details'))} →</button></section>`).join(''):statusBlock()}${statusWarnings()}${dataNote()}</div></div>`;}
  const amenities={trees:'Trees in dataset',shade:'Shaded places',water:'Drinking fountains',indoor:'Cool indoor places',toilet:'Public toilets',accessible:'Accessible toilets',transit:'Transit stops',playground:'Playgrounds',stations:'Climate sensor stations'};
  function sources(){return DSETS.map(([kind,slug])=>{const info=service.sources[kind]||{ok:false};return `<a href="https://open-data.dortmund.de/explore/dataset/${slug}/" target="_blank" rel="noopener"><span>${esc(slug)}</span><small>${info.ok?info.count+' loaded'+(info.limited?' (capped)':''):'not loaded'}</small></a>`;}).join('');}
  function detailsScreen(){const r=currentRoute();return `<div class="page crr-page crr-map-page">${title(t('details'))}${r?liveMapBox():''}<div class="crr-sheet crr-scroll"><h2>${r?esc(routeName(r.id)):esc(t('selection'))}</h2>${r?`${routeSummary(r)}${crwStopMarkup(r)}<p>${shadeText(r)}</p><p>${greenText(r)}</p><h3>${esc(t('facilities'))}</h3><div class="crr-amenities">${Object.entries(amenities).map(([key,label])=>`<div><span>${esc(label)}</span><b>${r.amenities[key]??'—'}${r.amenities[key]===null?' (not loaded)':''}</b></div>`).join('')}</div><div class="crr-actions"><button class="crr-main" data-crr="navigate">${esc(t('navigate'))} →</button></div>`:statusBlock()}${statusWarnings()}${dataNote()}</div></div>`;}
  function navigateScreen(){const r=currentRoute(),steps=r?.maneuvers||[],idx=clamp(service.liveInstruction,0,Math.max(0,steps.length-1));return `<div class="page crr-page crr-map-page">${r?liveMapBox():''}<div class="crr-nav-banner"><b>${esc(t('gps'))} ${service.gpsOn?'●':'○'}</b><p>${esc(steps[idx]?.instruction||t('turns'))}</p><small>${service.gps?`${service.nearestDistance===null?'':Math.round(service.nearestDistance)+' m from route · '}GPS active`:t('preview')}</small></div><div class="crr-sheet crr-nav-sheet"><strong>${r?r.km.toFixed(2)+' km · '+r.minutes+' min':t('unknown')}</strong><div class="crr-actions"><button class="crr-secondary" data-crr="next">${esc(t('next'))} →</button><button class="crr-main" data-crr="end">${esc(t('endNav'))}</button></div></div></div>`;}
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
    const visible=state.screen==='results'?[...service.routeList].sort((a,b)=>(a.id===state.selectedRoute?1:0)-(b.id===state.selectedRoute?1:0)):[currentRoute()];const bounds=[];
    for(const r of visible){if(!r)continue;const opts={color:colors[r.id],weight:r.id===state.selectedRoute?7:4,opacity:r.id===state.selectedRoute?1:.65};L.polyline(r.coords,opts).on('click',()=>{state.selectedRoute=r.id;render();}).addTo(map);bounds.push(...r.coords);}
    const r=currentRoute();if(r){L.circleMarker(r.coords[0],{radius:7,color:'#fff',weight:2,fillColor:'#167ff2',fillOpacity:1}).addTo(map);L.circleMarker(r.coords[r.coords.length-1],{radius:7,color:'#fff',weight:2,fillColor:'#e14b4c',fillOpacity:1}).addTo(map);}
    if(r?.waterStop){
      L.circleMarker(r.waterStop.at,{radius:9,color:'#fff',weight:3,fillColor:'#1785c6',fillOpacity:1})
        .bindPopup('<b>💧 '+crwEscape(crwText())+'</b><p>'+crwEscape(r.waterStop.name)+'</p><a href="'+CRW_SOURCE_URL+'" target="_blank" rel="noopener noreferrer">Stadt Dortmund · Trinkwasserbrunnen</a>')
        .addTo(map);
    }
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
    if(action==='time'){service.departure=btn.dataset.at;calculate();}
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
  service.diagnostics={meters,overlap,materiallyDifferent,selectDistinctProfiles,scoreRoute,sunPosition};
  render();
})();
