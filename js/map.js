// @ts-check
// แผนที่จริง (MapLibre GL + PMTiles ออฟไลน์) — แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
// gpMap (instance เดียว) + ทุกอย่างที่ผูกกับมันโดยตรง อยู่ในไฟล์นี้ทั้งหมด ต่างจาก js/map-data.js
// (ข้อมูลพิกัด/ธีมล้วนๆ ไม่แตะ gpMap เลย) ที่แยกไว้ก่อนหน้านี้
import {$,$$,esc,fmtBytes} from "./utils.js";
import {activeTrip} from "./state.js";
import {places,openDriverCard} from "./driver.js";
import {pinData,cityCenters,amapNavUrl,discoveryCityAgg,discoveryPlaceProto,
  ROAD_THEME_KEY,roadThemes,CITY_TILE_KEY,CITY_TILE_LAYER_IDS} from "./map-data.js";

/* ---- map pins ---- */
var curPinId="ifs";
var pinMarkers={};
function selectPin(id){
  curPinId=id;
  Object.keys(pinMarkers).forEach(function(k){pinMarkers[k].getElement().classList.toggle("selected",k===id)});
  var d=pinData[id];
  $("#popTitle").innerHTML="<span>"+d.ic+"</span>"+d.title;
  $("#popDesc").textContent=d.desc;
  $("#amapNav").href=amapNavUrl(d);
  $("#pinPop .row").style.display="";
  $("#pinPop").classList.add("show");
}
$("#pinPopClose").addEventListener("click",function(){
  $("#pinPop").classList.remove("show");
  Object.keys(pinMarkers).forEach(function(k){pinMarkers[k].getElement().classList.remove("selected")});
});
/* ---- fallback ต่อเมือง (feature: บอกตรงๆ ถ้าเมืองนั้นยังไม่มีหมุด POI คัดสรร
   แทนที่จะปล่อยแผนที่ว่างเปล่าดูเหมือนพัง — เมืองที่มีหมุดจริงแค่ซ่อนกล่องไว้เฉยๆ
   รอให้กดหมุดเองแทน ไม่มีข้อความ default ค้างจออีกต่อไป) ---- */
function showCityPinState(name){
  var hasPins=Object.keys(pinData).some(function(id){return pinData[id].city===name});
  var pop=$("#pinPop");
  if(hasPins){
    pop.classList.remove("show");
    return;
  }
  $("#popTitle").innerHTML="<span>🐼</span>ยังไม่มีจุดแนะนำสำหรับ"+esc(name);
  $("#popDesc").textContent="ทีมงานยังไม่ได้คัดหมุดสถานที่สำหรับเมืองนี้ — ลองเลื่อนแผนที่สำรวจเองได้เลย หรือถามน้องหลิงหลิงในกล่องเครื่องมือ";
  pop.querySelector(".row").style.display="none";
  pop.classList.add("show");
}
var pmProtocol=new pmtiles.Protocol();
maplibregl.addProtocol("pmtiles",pmProtocol.tile);
var gpMap=new maplibregl.Map({
  container:"mapCanvas",style:"map-style.json",
  center:[pinData.ifs.lng,pinData.ifs.lat],zoom:11.5,maxZoom:17,
  attributionControl:{compact:true,customAttribution:"© OpenStreetMap contributors"}
});
/** @type {any} */ (window).gpMap=gpMap; // เปิดให้ debug ผ่าน console ได้ (ไม่กระทบ UX)
gpMap.on("error",function(e){console.warn("MapLibre error:",e && e.error && e.error.message,e)});
gpMap.on("load",function(){
  Object.keys(pinData).forEach(function(id){
    var d=pinData[id];
    var el=document.createElement("div");
    // 3 กลุ่มหมุด แยกสีให้ดูออกทันทีว่าอันไหนคืออะไร: สถานีรถไฟ (ฟ้า) / ที่พัก (ม่วง) / ที่เที่ยว-ร้าน (ทอง, ค่าเริ่มต้น)
    var pinColors={station:["#22d3ee","#083344"],hotel:["#a78bfa","#4c1d95"],attraction:["#f59e0b","#78350f"]};
    var pc=pinColors[d.type]||pinColors.attraction;
    el.className="gp-pin"+(d.type?" gp-pin-"+d.type:"")+(id==="ifs"?" selected":"");
    el.innerHTML='<svg viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg"><path d="M11 0C5 0 0 5 0 11c0 8 11 19 11 19s11-11 11-19C22 5 17 0 11 0z" fill="'+pc[0]+'" stroke="'+pc[1]+'" stroke-width="1"/><circle cx="11" cy="11" r="8" fill="#0f172a"/><text x="11" y="11.5" text-anchor="middle" dominant-baseline="central" font-size="10">'+d.ic+'</text></svg>';
    el.setAttribute("role","button");el.setAttribute("tabindex","0");
    el.setAttribute("aria-label","หมุด: "+d.title);
    el.addEventListener("click",function(){selectPin(id)});
    el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();selectPin(id)}});
    pinMarkers[id]=new maplibregl.Marker({element:el}).setLngLat([d.lng,d.lat]).addTo(gpMap);
  });
  addDiscoveryAggPins();
});
var discoveryAggMarkers={},discoveryPlaceMarkers={};
function addDiscoveryAggPins(){
  Object.keys(discoveryCityAgg).forEach(function(name){
    var d=discoveryCityAgg[name];
    var el=document.createElement("div");
    el.className="gp-pin-agg";
    el.textContent=String(d.count);
    el.setAttribute("role","button");el.setAttribute("tabindex","0");
    el.setAttribute("aria-label","เมือง"+name+" มี "+d.count+" ที่แนะนำในคลังสถานที่ กดเพื่อดูรายละเอียด");
    el.addEventListener("click",function(){flyToCity(name)});
    el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();flyToCity(name)}});
    discoveryAggMarkers[name]=new maplibregl.Marker({element:el}).setLngLat([d.lng,d.lat]).addTo(gpMap);
  });
}
function clearDiscoveryPlacePins(){
  Object.keys(discoveryPlaceMarkers).forEach(function(k){discoveryPlaceMarkers[k].remove()});
  discoveryPlaceMarkers={};
}
function addDiscoveryPlacePins(cityName){
  clearDiscoveryPlacePins();
  var places=discoveryPlaceProto[cityName];
  if(!places)return;
  places.forEach(function(p,i){
    var el=document.createElement("div");
    el.className="gp-pin";
    el.innerHTML='<svg viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg"><path d="M11 0C5 0 0 5 0 11c0 8 11 19 11 19s11-11 11-19C22 5 17 0 11 0z" fill="#94a3b8" stroke="#334155" stroke-width="1" stroke-dasharray="2,1.5"/><circle cx="11" cy="11" r="8" fill="#0f172a"/><text x="11" y="11.5" text-anchor="middle" dominant-baseline="central" font-size="10">'+p.ic+'</text></svg>';
    el.setAttribute("role","button");el.setAttribute("tabindex","0");
    el.setAttribute("aria-label","หมุดโดยประมาณ (ทดลอง): "+p.title);
    function openApproxPop(){
      $("#popTitle").innerHTML='<span>'+p.ic+'</span>'+esc(p.title)+' <span class="tag" style="margin-left:6px">≈ พิกัดโดยประมาณ</span>';
      $("#popDesc").textContent="หมุดทดลอง — พิกัดยังไม่ผ่านการยืนยัน ใช้ทดสอบการแสดงผลเท่านั้น (รอชุดข้อมูลจริงจาก WIKI)";
      $("#amapNav").href=amapNavUrl(p);
      $("#pinPop .row").style.display="";
      $("#pinPop").classList.add("show");
    }
    el.addEventListener("click",openApproxPop);
    el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();openApproxPop()}});
    discoveryPlaceMarkers["p"+i]=new maplibregl.Marker({element:el}).setLngLat([p.lng,p.lat]).addTo(gpMap);
  });
}
/* ---- คลิกแล้วบินซูมเข้าแบบ Google Earth (feature: ตอนซูมออกกว้างเห็นแค่เงาประเทศ
   คลิกจุดไหนก็บินเข้าไปที่จุดนั้นให้เห็นระดับถนน) — ทำงานเฉพาะตอนซูมออกกว้างพอ (ยังไม่ถึงระดับเห็นถนนจริง)
   เพื่อไม่ให้ไปรบกวนการดูแผนที่ปกติตอนซูมเข้าเมืองแล้ว (คลิกหมุดเองมี marker DOM ของตัวเองแยกอยู่แล้ว ไม่ชนกัน) */
gpMap.on("click",function(e){
  var z=gpMap.getZoom();
  if(z>=12)return;
  gpMap.flyTo({center:e.lngLat,zoom:Math.min(14,z+4),speed:1.2,curve:1.4});
});
/* TEMP DEBUG: อัปเดตตัวเลขซูมสด ๆ ไว้ช่วยรายงานผลตอนเทส เอาออกทีหลังได้ */
function updateZoomIndicator(){$("#zoomIndicator").textContent="zoom: "+gpMap.getZoom().toFixed(2)}
gpMap.on("zoom",updateZoomIndicator);
gpMap.on("move",updateZoomIndicator);
gpMap.on("load",updateZoomIndicator);
updateZoomIndicator();
$("#mapZoomIn").addEventListener("click",function(){gpMap.zoomIn()});
$("#mapZoomOut").addEventListener("click",function(){gpMap.zoomOut()});
$("#mapFullscreen").addEventListener("click",/** @this {HTMLElement} */ function(){
  var frame=$("#mapFrame"),on=frame.classList.toggle("fullscreen");
  this.setAttribute("aria-label",on?"ย่อแผนที่กลับ":"ขยายแผนที่เต็มจอ");
  this.textContent=on?"⤢":"⛶";
  setTimeout(function(){gpMap.resize()},260);
});

/* ---- toggle สีถนนบนแผนที่ (feature: ป๋าโจไม่มีไอเดียสีตายตัว ขอเป็นปุ่มลองสลับดูง่ายๆ แทน) ----
   สลับผ่าน setPaintProperty ไม่ต้องโหลด style ใหม่ทั้งชุด จำค่าที่เลือกไว้ใน localStorage */
function applyRoadTheme(i){
  var t=roadThemes[i];
  gpMap.setPaintProperty("roads-casing","line-color",t.casing);
  gpMap.setPaintProperty("roads-line","line-color",t.line);
  localStorage.setItem(ROAD_THEME_KEY,i);
}
$("#mapTheme").addEventListener("click",function(){
  var cur=+(localStorage.getItem(ROAD_THEME_KEY)||0);
  var next=(cur+1)%roadThemes.length;
  applyRoadTheme(next);
  var toast=$("#planToast");
  if(toast){toast.textContent="🎨 สีถนน: "+roadThemes[next].name;toast.hidden=false;setTimeout(function(){toast.hidden=true},2000)}
});
gpMap.on("load",function(){
  var saved=+(localStorage.getItem(ROAD_THEME_KEY)||0);
  if(saved)applyRoadTheme(saved);
});

/* ---- โหลด/สลับ tile ของเมืองที่กำลังดูอยู่แบบไดนามิก (feature: แยก pmtiles รายเมือง)
   เดิม map-style.json มี source+layer ของฉางซาฝังตายตัวไว้เลย ทำให้ต้อง precache รวมทุกเมือง
   เข้า SW shell แบบ atomic (พังง่าย + โหลดของที่ทริปนี้ไม่ได้ใช้) ตอนนี้ style มีแค่พื้นหลัง
   ประเทศ/มณฑลคงที่ ส่วน source+layer ของถนน/น้ำ/อาคาร/ป้ายชื่อ ใส่/ถอดตรงนี้เองตอนสลับเมือง
   ดู ARCHITECTURE-ROADMAP.md § 3.2 ---- */
var currentTileCity=null;
function addCityTileLayers(){
  // minzoom:6 — เผื่อไว้สำหรับเมืองที่ rebuild ด้วย progressive zoom แล้ว (ฉางซา/จางเจียเจี้ย, task #8
  // ต่อ 2026-08-04) เมืองที่ยังไม่ได้ rebuild (ปักกิ่ง/เทียนจิน/ฉงลี่/เฟิ่งหวง/ฝูหรง) ไฟล์ยังมีแค่ z11-16
  // เหมือนเดิม — ขอ tile ต่ำกว่า 11 ของเมืองพวกนั้นจะได้แค่ tile ว่างเปล่า ไม่ error
  gpMap.addSource("citytiles",{type:"vector",url:"pmtiles://tiles/"+currentTileCity+".pmtiles",
    minzoom:6,maxzoom:16,attribution:"© OpenStreetMap contributors"});
  // สีชุดนี้เป็น Direction C light theme experiment (2026-08-04, ป๋าโจขอ "ลองบนพื้นขาว") — ของเดิม
  // (น้ำ/อาคาร/ถนนเข้มบนพื้นเข้ม) ดู git history ถ้าต้องย้อนกลับ ไม่ได้แตะ roadThemes toggle
  // (ใน map-data.js) เพราะเป็นฟีเจอร์สลับสีถนนแยกต่างหากที่ยังออกแบบมาสำหรับพื้นเข้ม
  gpMap.addLayer({id:"water",type:"fill",source:"citytiles","source-layer":"water",
    paint:{"fill-color":"#c3dce8","fill-outline-color":"#7fa8c2"}});
  gpMap.addLayer({id:"water-line",type:"line",source:"citytiles","source-layer":"water",
    paint:{"line-color":"#7fa8c2","line-width":["interpolate",["linear"],["zoom"],11,0.8,16,3]}});
  gpMap.addLayer({id:"landuse-park",type:"fill",source:"citytiles","source-layer":"landuse",
    paint:{"fill-color":"#cfe3d4","fill-opacity":0.85}});
  gpMap.addLayer({id:"buildings",type:"fill",source:"citytiles","source-layer":"buildings",minzoom:14,
    paint:{"fill-color":"#d8dde5","fill-outline-color":"#aab3c2",
      "fill-opacity":["interpolate",["linear"],["zoom"],14,0.65,16,0.95]}});
  gpMap.addLayer({id:"roads-casing",type:"line",source:"citytiles","source-layer":"roads",paint:{
    "line-color":["match",["get","class"],
      ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],"#5b6b7a",
      ["secondary","secondary_link","tertiary","tertiary_link"],"#8290a0","#a3aebb"],
    "line-width":["interpolate",["linear"],["zoom"],
      11,["match",["get","class"],["motorway","trunk","primary"],2,1],
      16,["match",["get","class"],["motorway","trunk","primary"],10,["secondary","tertiary"],7,4]]}});
  gpMap.addLayer({id:"roads-line",type:"line",source:"citytiles","source-layer":"roads",paint:{
    "line-color":["match",["get","class"],
      ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],"#ffffff",
      ["secondary","secondary_link","tertiary","tertiary_link"],"#f2f4f7","#e8ecf0"],
    "line-width":["interpolate",["linear"],["zoom"],
      11,["match",["get","class"],["motorway","trunk","primary"],0.8,0.4],
      16,["match",["get","class"],["motorway","trunk","primary"],5,["secondary","tertiary"],3,1.5]]}});
  gpMap.addLayer({id:"roads-label",type:"symbol",source:"citytiles","source-layer":"roads",minzoom:14,
    filter:["has","name"],
    layout:{"symbol-placement":"line","text-field":["get","name"],"text-font":["Noto Sans SC"],
      "text-size":["interpolate",["linear"],["zoom"],14,10,18,13]},
    paint:{"text-color":"#33414d","text-halo-color":"#f7f8f7","text-halo-width":1.4}});
}
function loadCityTiles(cityTh){
  var key=CITY_TILE_KEY[cityTh]||null;
  if(key===currentTileCity)return;
  function apply(){
    CITY_TILE_LAYER_IDS.forEach(function(id){if(gpMap.getLayer(id))gpMap.removeLayer(id)});
    if(gpMap.getSource("citytiles"))gpMap.removeSource("citytiles");
    currentTileCity=key;
    if(key)addCityTileLayers();
  }
  if(gpMap.isStyleLoaded())apply();else gpMap.once("load",apply);
}

/* ---- ดาวน์โหลดแผนที่ออฟไลน์ของทริปนี้ล่วงหน้า (feature: แทนที่การ precache รวมทุกเมืองแบบเดิม
   ที่ทำให้ทุกคนโหลดของทุกเมืองแม้ทริปนั้นไม่ได้ไป) — เก็บใน cache แยกจาก SHELL_CACHE
   (gopanda-tiles-v1 เดียวกับที่ sw.js ใช้ serve) เพื่อไม่ให้การ bump SHELL_CACHE รอบต่อๆ ไป
   ทำให้ต้องโหลด tile ซ้ำทุกครั้ง ---- */
var TILE_CACHE_NAME="gopanda-tiles-v1";
function tripTileCities(){
  var seen={};
  return (activeTrip.cities||[]).map(function(c){return {th:c,key:CITY_TILE_KEY[c]}})
    .filter(function(x){return x.key&&!seen[x.key]&&(seen[x.key]=1)});
}
function downloadTripTiles(){
  var mapBtn=$("#mapDownloadTiles"),readyBtn=$("#tileReadyDownloadBtn");
  var cities=tripTileCities().map(function(x){return x.key});
  if(!cities.length){
    mapBtn.textContent="∅";setTimeout(refreshMapDownloadBtn,1500);
    return;
  }
  mapBtn.disabled=true;if(readyBtn)readyBtn.disabled=true;
  caches.open(TILE_CACHE_NAME).then(function(cache){
    var done=0,failed=0;
    function next(){
      if(done+failed>=cities.length){
        mapBtn.textContent=failed?"⚠️":"✓";mapBtn.disabled=false;
        setTimeout(refreshMapDownloadBtn,2500);
        renderTileReadyCard();
        return;
      }
      var url="tiles/"+cities[done+failed]+".pmtiles";
      cache.match(url).then(function(hit){
        return hit?Promise.resolve():cache.add(url);
      }).then(function(){
        done++;mapBtn.textContent="⬇️ "+(done+failed)+"/"+cities.length;next();
      }).catch(function(){
        failed++;mapBtn.textContent="⬇️ "+(done+failed)+"/"+cities.length;next(); // ข้ามไฟล์ที่โหลดพลาด (เช่นไม่มีเน็ต) ไม่ให้ค้าง
      });
    }
    next();
  });
}
$("#mapDownloadTiles").addEventListener("click",downloadTripTiles);
$("#tileReadyDownloadBtn").addEventListener("click",downloadTripTiles);

/* ---- ตัวบอกสถานะพร้อมออฟไลน์จริง (feature: เดิมไม่มีทางรู้เลยว่าดาวน์โหลดครบหรือยังก่อนขึ้นเครื่อง
   ตอนนี้เช็คสถานะจริงจาก TILE_CACHE ทุกครั้งที่โหลดทริป/สลับทริป/เปิดหน้าเช็กลิสต์ก่อนบิน
   ดู ARCHITECTURE-ROADMAP.md § 3.4 ---- */
function tileReadinessStatus(){
  var cities=tripTileCities();
  if(!cities.length)return Promise.resolve([]);
  return caches.open(TILE_CACHE_NAME).then(function(cache){
    return Promise.all(cities.map(function(c){
      return cache.match("tiles/"+c.key+".pmtiles").then(function(hit){
        if(!hit)return {th:c.th,ready:false};
        return hit.clone().blob().then(function(b){return {th:c.th,ready:true,size:b.size}});
      });
    }));
  });
}
export function refreshMapDownloadBtn(){
  var btn=$("#mapDownloadTiles");
  if(!btn||btn.disabled)return;
  tileReadinessStatus().then(function(results){
    if(!results.length){btn.textContent="⬇️";return}
    var readyCount=results.filter(function(r){return r.ready}).length;
    btn.textContent=readyCount===results.length?"🗺️✓":"🗺️"+readyCount+"/"+results.length;
    btn.title=readyCount===results.length?"แผนที่ออฟไลน์พร้อมครบแล้ว":"ดาวน์โหลดแผนที่ออฟไลน์สำหรับทริปนี้ ("+readyCount+"/"+results.length+" พร้อมแล้ว)";
  });
}
export function renderTileReadyCard(){
  var box=$("#tileReadyList");
  if(!box)return;
  tileReadinessStatus().then(function(results){
    if(!results.length){
      box.innerHTML='<div class="sub2">ทริปนี้ยังไม่มีเมืองที่มีแผนที่ออฟไลน์ให้ดาวน์โหลด</div>';
      $("#tileReadyDownloadBtn").style.display="none";
      return;
    }
    box.innerHTML=results.map(function(r){
      return '<div class="doc-item"><span class="doc-ic">'+(r.ready?"✅":"⬇️")+'</span>'+
        '<span class="doc-name" style="cursor:default;text-decoration:none">'+esc(r.th)+'</span>'+
        '<span class="doc-size num">'+(r.ready?fmtBytes(r.size):"ยังไม่ได้โหลด")+'</span></div>';
    }).join("");
    var readyCount=results.filter(function(r){return r.ready}).length;
    $("#tileReadyDownloadBtn").style.display=readyCount<results.length?"":"none";
    refreshMapDownloadBtn();
  });
}

/* ---- ชิปเมือง (feature: กรองเมืองตามทริปที่เปิดอยู่ ไม่ปนข้ามทริป) ---- */
export function flyToCity(name){
  var msg=$("#cityMsg");
  var city=cityCenters[name];
  loadCityTiles(name);
  if(city){
    msg.hidden=true;
    gpMap.flyTo({center:[city.lng,city.lat],zoom:city.zoom});
    if(name==="ประเทศจีน")$("#pinPop").classList.remove("show"); // มุมมองทั้งประเทศ ไม่มี POI ระดับเมืองให้โชว์
    else showCityPinState(name);
    // สลับหมุดรวมเมือง (คลังสถานที่ ทดลอง) ↔ หมุดสถานที่รายจุด — ดู addDiscoveryAggPins/addDiscoveryPlacePins
    // ป้องกันกรณี flyToCity ถูกเรียกตอน init ก่อน gpMap "load" event ยิง (หมุดรวมยังไม่ถูกสร้าง)
    Object.keys(discoveryAggMarkers).forEach(function(k){discoveryAggMarkers[k].getElement().style.display=""});
    if(discoveryPlaceProto[name]){
      if(discoveryAggMarkers[name])discoveryAggMarkers[name].getElement().style.display="none";
      addDiscoveryPlacePins(name);
    }else clearDiscoveryPlacePins();
  }else{
    msg.hidden=false;
    msg.textContent="⚠️ แผนที่จริงของ"+name+"ยังไม่พร้อม — ตอนนี้มีแค่ฉางซา/ฉงลี่/ปักกิ่ง/เทียนจินที่ใช้แผนที่ออฟไลน์จริงได้";
    $("#pinPop").classList.remove("show");
  }
}
export function renderCityChips(){
  var wrap=$("#cityChips");
  var cities=activeTrip.cities||[];
  wrap.innerHTML=cities.map(function(name,i){
    return '<button class="city-chip'+(i===0?" active":"")+'" data-city="'+esc(name)+'">'+esc(name)+"</button>";
  }).join("");
  if(cities.length)flyToCity(cities[0]);
}
$("#cityChips").addEventListener("click",function(e){
  var c=e.target.closest(".city-chip");if(!c)return;
  $$("#cityChips .city-chip").forEach(function(x){x.classList.remove("active")});
  c.classList.add("active");
  flyToCity(c.dataset.city);
});
/* ---- ดรอปดาวน์ "ดูแผนที่เมืองอื่น" — ทางลัดดูเฉยๆ ไม่เกี่ยวกับทริป/ชิปเมืองที่เลือกอยู่เลย ----
   ใช้ flyToCity() เดียวกับตอนกดชิป (ปรับ welcome/fallback ของหมุดให้ตรงเมืองที่ดู) แต่ไม่แตะ
   .city-chip.active หรือ activeTrip ใดๆ ทั้งสิ้น — ปิดจบแล้ว reset กลับ placeholder ทันที */
(function renderCityJumpSelect(){
  var sel=$("#cityJumpSelect");
  sel.innerHTML='<option value="">🌍 ดูแผนที่เมืองอื่น…</option>'+Object.keys(cityCenters).map(function(name){
    return '<option value="'+esc(name)+'">'+esc(name)+"</option>";
  }).join("");
})();
$("#cityJumpSelect").addEventListener("change",function(){
  if(!this.value)return;
  flyToCity(this.value);
  this.value="";
});

/* ---- GPS จริง (feature 1.3): ปักหมุด "ฉันอยู่ตรงนี้" บนแผนที่จริงถ้าขอสิทธิ์สำเร็จ ---- */
var userMarker=null,userPos=null;
function placeUserMarker(){
  if(!gpMap||!userPos)return;
  if(userMarker)userMarker.remove();
  var el=document.createElement("div");
  el.className="gp-user-dot";
  el.setAttribute("aria-label","ตำแหน่งปัจจุบันของฉัน");
  userMarker=new maplibregl.Marker({element:el}).setLngLat([userPos.lng,userPos.lat]).addTo(gpMap);
}
if("geolocation" in navigator){
  navigator.geolocation.getCurrentPosition(function(pos){
    userPos={lat:pos.coords.latitude,lng:pos.coords.longitude};
    placeUserMarker();
  },function(){},{timeout:8000,maximumAge:60000});
}
/* ---- ปุ่ม "ไปตำแหน่งปัจจุบันของฉัน" — ถ้ามีพิกัดอยู่แล้ว (ปักหมุดตอนโหลดหน้าไปแล้ว) เลื่อนแผนที่ไปเลย
   ถ้ายังไม่มี (ตอนโหลดขอสิทธิ์ไม่สำเร็จ) ลองขอใหม่ตรงนี้ พร้อมแจ้งเหตุผลชัดๆ ถ้ายังไม่ได้อีก ---- */
$("#mapLocate").addEventListener("click",function(){
  if(userPos){gpMap.flyTo({center:[userPos.lng,userPos.lat],zoom:15});return}
  if(!("geolocation" in navigator)){alert("อุปกรณ์นี้ไม่รองรับ GPS");return}
  navigator.geolocation.getCurrentPosition(function(pos){
    userPos={lat:pos.coords.latitude,lng:pos.coords.longitude};
    placeUserMarker();
    gpMap.flyTo({center:[userPos.lng,userPos.lat],zoom:15});
  },function(err){
    alert(err.code===1?"ยังไม่ได้เปิดสิทธิ์เข้าถึงตำแหน่ง — เปิดสิทธิ์ในตั้งค่าเบราว์เซอร์/แอปแล้วลองใหม่":"หาสัญญาณ GPS ไม่เจอตอนนี้ ลองใหม่อีกครั้ง");
  },{timeout:8000,maximumAge:0});
});
$("#goHome").addEventListener("click",function(){openDriverCard(places[0])});
