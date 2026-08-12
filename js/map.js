// @ts-check
// แผนที่จริง (MapLibre GL + PMTiles ออฟไลน์) — แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
// gpMap (instance เดียว) + ทุกอย่างที่ผูกกับมันโดยตรง อยู่ในไฟล์นี้ทั้งหมด ต่างจาก js/map-data.js
// (ข้อมูลพิกัด/ธีมล้วนๆ ไม่แตะ gpMap เลย) ที่แยกไว้ก่อนหน้านี้
import {$,$$,esc,fmtBytes} from "./utils.js";
import {activeTrip} from "./state.js";
import {places,openDriverCard} from "./driver.js";
import {pinData,cityCenters,amapNavUrl,discoveryCityAgg,discoveryPlaceProto,
  ROAD_THEME_KEY,roadThemes,CITY_TILE_KEY,CITY_TILE_LAYER_IDS,MAP_COLORS,
  REGION_FOR_CITY_KEY,REGIONAL_TILE_LABELS} from "./map-data.js";
import {DISCOVERY} from "./discovery-data.js";
import {DISCOVERY_GPS} from "./discovery-gps.js";

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
  center:[pinData.ifs.lng,pinData.ifs.lat],zoom:11.5,maxZoom:15,
  attributionControl:{compact:true,customAttribution:"© OpenStreetMap contributors"}
});
/** @type {any} */ (window).gpMap=gpMap; // เปิดให้ debug ผ่าน console ได้ (ไม่กระทบ UX)
gpMap.on("error",function(e){console.warn("MapLibre error:",e && e.error && e.error.message,e)});
/* ---- บั๊กที่เจอ 2026-08-06 (ป๋าโจรายงานว่าสลับเมืองในดรอปดาวน์ "ดูแผนที่เมืองอื่น" แล้วไม่ขึ้นจริง
   ค้างที่เมืองเดิมตลอด) — สาเหตุ: loadCityTiles() เดิมเช็ค gpMap.isStyleLoaded() ทุกครั้งที่เรียก
   ถ้า false จะรอ gpMap.once("load",apply) แต่ "load" เป็น event ที่ยิงแค่ครั้งเดียวตลอดอายุ instance
   ถ้าผู้ใช้สลับเมือง "ก่อน" load ครั้งแรกจะยิง (ช่วง ~2 วินาทีแรกหลังเปิดแอป — นานขึ้นกว่าเดิมเพราะวันนี้
   เพิ่ม source ถนน/น้ำระดับภูมิภาค 2 ไฟล์ ~42MB เข้าไปด้วย ทำให้ isStyleLoaded() เป็น false นานขึ้น)
   listener ที่ลงทะเบียนตอนนั้นจะไม่มีวันถูกเรียกอีกเลย เพราะ "load" ยิงไปแล้วรอบเดียวก่อนหน้านั้น —
   สลับเมืองพังถาวรตลอด session นั้น ทางแก้: ใช้ flag ค้างค่า (ไม่ผันผวนเหมือน isStyleLoaded()) แทน ---- */
var mapReady=false;
gpMap.once("load",function(){mapReady=true});
/* ---- ทับสีพื้นหลัง (bg/country/province) ที่ map-style.json เขียนไว้ตายตัว ด้วยค่าจาก
   MAP_COLORS.background (js/map-data.js) ทันทีหลังโหลด style — map-style.json เก็บค่าตั้งต้นไว้แค่
   กันจอขาวโล่งช่วงสั้นๆ ก่อน JS รัน ไม่ใช่แหล่งจริงอีกต่อไป (ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 5) ---- */
gpMap.on("load",function(){
  var B=MAP_COLORS.background;
  gpMap.setPaintProperty("bg","background-color",B.bg);
  gpMap.setPaintProperty("country-fill","fill-color",B.countryFill);
  gpMap.setPaintProperty("province-line","line-color",B.provinceLine);
  gpMap.setPaintProperty("country-line","line-color",B.countryLine);
  gpMap.setPaintProperty("china-lakes-fill","fill-color",B.lakeFill);
  gpMap.setPaintProperty("china-lakes-outline","line-color",B.lakeOutline);
  gpMap.setPaintProperty("china-rivers-line","line-color",B.riverLine);
  gpMap.setPaintProperty("china-roads-regional-line","line-color",B.regionalRoadLine);
  gpMap.setPaintProperty("china-railroads-line","line-color",B.railroadLine);
  gpMap.setPaintProperty("china-towns-point","circle-color",B.townPoint);
  gpMap.setPaintProperty("china-towns-label","text-color",B.townLabel);
  gpMap.setPaintProperty("province-label","text-color",B.provinceLabel);
});
/* ---- โครงข่ายถนน/น้ำจริงระดับภูมิภาค (2026-08-06, Level 4 ต่อจาก Level 1-3 ที่ยังไม่พอ) —
   ป๋าโจดาวน์โหลด .osm.pbf จริงผ่าน Protomaps "OSM by the slice" ครอบ 2 โซนทริป (หูหนาน,
   ปักกิ่ง-เทียนจิน-ฉงลี่) แทนข้อมูลสรุป Natural Earth ที่ใช้ใน Level 1-3 — ประมวลผลผ่าน
   poc/tools/add_city.py เหมือนเมืองทริปทั่วไป แต่จำกัด --max-zoom 11 (ไม่ต้องละเอียดถึง z16
   ทั่วทั้งภูมิภาค กันไฟล์ใหญ่เกิน + กันสร้างซ้ำพื้นที่ที่มี city tile ละเอียดอยู่แล้ว เช่นตัวเมืองปักกิ่ง)
   เป็น source แบบ "อยู่ถาวร" ต่างจาก citytiles ที่สลับตามเมืองที่เลือก — เพิ่มก่อน city-label
   ในโค้ดเพื่อให้ citytiles (ที่ addCityTileLayers เพิ่มทีหลังผ่าน loadCityTiles) วาดทับข้างบนเสมอ
   ตอนซูมเข้าเมืองที่มี tile ละเอียด — ยังคงเลเยอร์ Natural Earth (rivers/roads-regional/railroads/
   towns) ไว้ด้วยเพราะครอบพื้นที่กว้างกว่ามาก (ทั้งประเทศ) ส่วนนี้ครอบแค่ 2 โซนทริปเท่านั้น ---- */
var REGIONAL_TILE_SETS=Object.keys(REGIONAL_TILE_LABELS);
gpMap.on("load",function(){
  var C=MAP_COLORS.city;
  REGIONAL_TILE_SETS.forEach(function(key){
    var srcId="regional-"+key;
    gpMap.addSource(srcId,{type:"vector",url:"pmtiles://tiles/"+key+".pmtiles",
      minzoom:6,maxzoom:11,attribution:"© OpenStreetMap contributors"});
    /* ---- บั๊กที่เจอ 2026-08-06 (ป๋าโจเห็น "เศษแก้วสีฟ้า" กระจายทั่วปักกิ่ง แม้แก้เรื่องบ่อเล็กไปแล้ว) —
       source-layer "water" มีทั้ง class:"water-area" (Polygon, บึง/สระ/แม่น้ำกว้าง) และ
       class:"waterway" (LineString, ลำธาร/คลอง) ปนกัน เดิม layer นี้เป็น type:"fill" ไม่ได้กรอง class
       เลย — MapLibre เอา LineString ไปเรนเดอร์เป็นรูปเศษสามเหลี่ยม/ลิ่มด้วย (ไม่ได้ถูก ignore เหมือนที่
       ควรจะเป็น) ต้องกรองเอาเฉพาะ Polygon (water-area) เข้า fill แล้วแยก waterway ไปเป็นเส้นบางแทน
       (เหมือน pattern water/water-line ของ city tile ที่ addCityTileLayers ใช้อยู่แล้ว) ---- */
    gpMap.addLayer({id:srcId+"-water",type:"fill",source:srcId,"source-layer":"water",
      filter:["==",["get","class"],"water-area"],
      paint:{"fill-color":C.water,"fill-outline-color":C.waterOutline}});
    gpMap.addLayer({id:srcId+"-water-line",type:"line",source:srcId,"source-layer":"water",
      filter:["==",["get","class"],"waterway"],
      paint:{"line-color":C.waterOutline,
        "line-width":["interpolate",["linear"],["zoom"],6,0.4,11,1]}});
    gpMap.addLayer({id:srcId+"-roads-casing",type:"line",source:srcId,"source-layer":"roads",
      layout:{"line-join":"round"},paint:{
      "line-color":["match",["get","class"],
        ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],C.roadCasingMajor,
        ["secondary","secondary_link","tertiary","tertiary_link"],C.roadCasingMid,C.roadCasingMinor],
      // width ต่ำสุดยกจาก 0.6 เป็น 1.2 (2026-08-06) — เดิมที่ z6-7 บางจนแทบมองไม่เห็นเลย
      // (เจอตอนป๋าโจบอกว่า "ยังไม่เห็นรายละเอียด" ทั้งที่ feature count จริงมีอยู่ ปัญหาคือมองไม่เห็น)
      "line-width":["interpolate",["linear"],["zoom"],
        6,1.2,11,["match",["get","class"],["motorway","trunk","primary"],2.4,1.4]]}});
    gpMap.addLayer({id:srcId+"-roads-line",type:"line",source:srcId,"source-layer":"roads",
      layout:{"line-join":"round"},paint:{
      "line-color":["match",["get","class"],
        ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],C.roadLineMajor,
        ["secondary","secondary_link","tertiary","tertiary_link"],C.roadLineMid,C.roadLineMinor],
      "line-width":["interpolate",["linear"],["zoom"],
        6,0.6,11,["match",["get","class"],["motorway","trunk","primary"],1.3,0.8]]}});
  });
});
/* ---- ป้ายชื่อ 7 เมืองทริป (Level 2, ป๋าโจขอ 2026-08-06) — สร้าง source+layer แบบ dynamic ตรงนี้
   เพราะข้อมูลมาจาก cityCenters (js/map-data.js) ที่มีอยู่แล้ว ไม่ต้องหาไฟล์ geojson ใหม่ ตัด
   "ประเทศจีน" ออกเพราะเป็นจุดกึ่งกลางรวม ไม่ใช่เมืองจริง
   ใช้ชื่ออังกฤษ (capitalize CITY_TILE_KEY) แทนชื่อไทยจาก cityCenters — ฟอนต์ glyph ที่ vendor ไว้
   (fonts/Noto Sans SC/) มีแค่ Latin 0-255 + ช่วง CJK เท่านั้น ไม่มี Thai block (U+0E00-0E7F) เลย
   ถ้าใช้ชื่อไทยตรงๆ จะไม่มี glyph ให้เรนเดอร์ กลายเป็นป้ายว่างเปล่า (เจอระหว่างตรวจก่อน commit) ---- */
gpMap.on("load",function(){
  var cityFeatures=Object.keys(cityCenters).filter(function(name){return name!=="ประเทศจีน"}).map(function(name){
    var c=cityCenters[name];
    var key=CITY_TILE_KEY[name]||name;
    var enName=key.charAt(0).toUpperCase()+key.slice(1);
    return {type:"Feature",properties:{name:enName},geometry:{type:"Point",coordinates:[c.lng,c.lat]}};
  });
  gpMap.addSource("city-labels",{type:"geojson",data:{type:"FeatureCollection",features:cityFeatures}});
  gpMap.addLayer({id:"city-label",type:"symbol",source:"city-labels",minzoom:3,maxzoom:11,
    layout:{"text-field":["get","name"],"text-font":["Noto Sans SC"],
      "text-size":["interpolate",["linear"],["zoom"],3,10,7,13,10,15],
      "text-offset":[0,0.8],"text-anchor":"top"},
    paint:{"text-color":MAP_COLORS.background.cityLabel,"text-halo-color":"#f7f8f7","text-halo-width":1.4}});
});
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
/* ---- หมุดคลังสถานที่จริง (feature 2026-08-07: ผสาน DISCOVERY_GPS เข้าแผนที่เต็มจอ) ----
   join DISCOVERY (ข้อความ) กับ DISCOVERY_GPS (พิกัด) ด้วย candidate_key ตอน render เท่านั้น ไม่เก็บ
   ซ้ำไว้ที่ไหน — คืน null ถ้าเมืองนี้ยังไม่มีไฟล์ GPS เลย (ให้ fallback ไป discoveryPlaceProto ถ้ามี)
   คืน array (อาจว่างเปล่า) ถ้ามีไฟล์ GPS แล้วแต่ยังไม่มี candidate ไหน resolved เลย — เฉพาะ
   confidence high/medium เท่านั้นที่มี lat/lng จริงตาม DISCOVERY_GPS (ดูเกณฑ์ใน js/discovery-gps.js) */
function realDiscoveryPlaces(cityName){
  var cityKey=CITY_TILE_KEY[cityName];
  var cards=cityKey&&DISCOVERY[cityKey];
  var gps=cityKey&&DISCOVERY_GPS[cityKey];
  if(!cards||!gps)return null;
  var out=[];
  cards.forEach(function(c){
    var g=gps[c.id];
    if(g&&g.lat!=null)out.push({id:c.id,name_th:c.name_th,pitch:c.pitch,cat:c.cat,lng:g.lng,lat:g.lat,
      confidence:g.confidence,uncertainty:g.uncertainty});
  });
  return out;
}
function addDiscoveryPlacePins(cityName){
  clearDiscoveryPlacePins();
  var real=realDiscoveryPlaces(cityName);
  if(real){
    real.forEach(function(p,i){
      var icon=p.cat&&p.cat[0]==="food"?"🍜":(p.cat&&p.cat[0]==="move"?"🚉":"📍");
      var el=document.createElement("div");
      el.className="gp-pin gp-pin-discovery";
      el.innerHTML='<svg viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg"><path d="M11 0C5 0 0 5 0 11c0 8 11 19 11 19s11-11 11-19C22 5 17 0 11 0z" fill="#f59e0b" stroke="#78350f" stroke-width="1"/><circle cx="11" cy="11" r="8" fill="#0f172a"/><text x="11" y="11.5" text-anchor="middle" dominant-baseline="central" font-size="10">'+icon+'</text></svg>';
      el.setAttribute("role","button");el.setAttribute("tabindex","0");
      el.setAttribute("aria-label","สถานที่: "+p.name_th);
      function openRealPop(){
        $("#popTitle").innerHTML='<span>'+icon+'</span>'+esc(p.name_th)+
          (p.confidence==="medium"?' <span class="tag" style="margin-left:6px">พิกัดคร่าวๆ</span>':"");
        var desc=p.pitch+" — หมุดตำแหน่งวางแผนคร่าวๆ จาก OpenStreetMap ไม่ใช่พิกัดทางเข้าหรือการรับประกันนำทางอย่างเป็นทางการ © OpenStreetMap contributors";
        // confidence:"medium" ต้องโชว์ uncertainty เพิ่ม ตามคำขอ WIKI (zhangjiajie-gps-supplement-handoff-v1.0.json)
        if(p.confidence==="medium"&&p.uncertainty)desc+=" ⚠️ "+p.uncertainty;
        $("#popDesc").textContent=desc;
        $("#amapNav").href=amapNavUrl({lng:p.lng,lat:p.lat,title:p.name_th});
        $("#pinPop .row").style.display="";
        $("#pinPop").classList.add("show");
      }
      el.addEventListener("click",openRealPop);
      el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();openRealPop()}});
      discoveryPlaceMarkers["r"+i]=new maplibregl.Marker({element:el}).setLngLat([p.lng,p.lat]).addTo(gpMap);
    });
    return;
  }
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
  // minzoom:6 — ทุกเมืองมี tile จริงตั้งแต่ z6 แล้ว (progressive zoom ครบทั้ง 7 เมือง 2026-08-05,
  // ดู ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 4) ก่อนหน้านี้มีแค่ฉางซา/จางเจียเจี้ยที่ rebuild แล้ว
  // (task #8, 2026-08-04) ส่วนที่เหลือ (ปักกิ่ง/เทียนจิน/ฉงลี่/เฟิ่งหวง/ฝูหรง) มีแค่ z11-16 — ตอนนี้ปิดช่องว่างแล้ว
  gpMap.addSource("citytiles",{type:"vector",url:"pmtiles://tiles/"+currentTileCity+".pmtiles",
    minzoom:6,maxzoom:16,attribution:"© OpenStreetMap contributors"});
  // สีชุดนี้อ่านจาก MAP_COLORS.city (js/map-data.js) แหล่งเดียว — ตามที่วางแผนไว้ใน
  // ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 5 (เดิมสีฝังตรงนี้ตายตัว) ไม่ได้แตะ roadThemes toggle
  // (ใน map-data.js) เพราะเป็นฟีเจอร์สลับสีถนนแยกต่างหากที่ยังออกแบบมาสำหรับพื้นเข้ม
  var C=MAP_COLORS.city;
  gpMap.addLayer({id:"water",type:"fill",source:"citytiles","source-layer":"water",
    paint:{"fill-color":C.water,"fill-outline-color":C.waterOutline}});
  gpMap.addLayer({id:"water-line",type:"line",source:"citytiles","source-layer":"water",
    paint:{"line-color":C.waterOutline,"line-width":["interpolate",["linear"],["zoom"],11,0.8,16,3]}});
  gpMap.addLayer({id:"landuse-park",type:"fill",source:"citytiles","source-layer":"landuse",
    paint:{"fill-color":C.landusePark,"fill-opacity":0.85}});
  gpMap.addLayer({id:"buildings",type:"fill",source:"citytiles","source-layer":"buildings",minzoom:14,
    paint:{"fill-color":C.buildingFill,"fill-outline-color":C.buildingOutline,
      "fill-opacity":["interpolate",["linear"],["zoom"],14,0.65,16,0.95]}});
  gpMap.addLayer({id:"roads-casing",type:"line",source:"citytiles","source-layer":"roads",paint:{
    "line-color":["match",["get","class"],
      ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],C.roadCasingMajor,
      ["secondary","secondary_link","tertiary","tertiary_link"],C.roadCasingMid,C.roadCasingMinor],
    "line-width":["interpolate",["linear"],["zoom"],
      11,["match",["get","class"],["motorway","trunk","primary"],2,1],
      16,["match",["get","class"],["motorway","trunk","primary"],10,["secondary","tertiary"],7,4]]}});
  gpMap.addLayer({id:"roads-line",type:"line",source:"citytiles","source-layer":"roads",paint:{
    "line-color":["match",["get","class"],
      ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],C.roadLineMajor,
      ["secondary","secondary_link","tertiary","tertiary_link"],C.roadLineMid,C.roadLineMinor],
    "line-width":["interpolate",["linear"],["zoom"],
      11,["match",["get","class"],["motorway","trunk","primary"],0.8,0.4],
      16,["match",["get","class"],["motorway","trunk","primary"],5,["secondary","tertiary"],3,1.5]]}});
  gpMap.addLayer({id:"roads-label",type:"symbol",source:"citytiles","source-layer":"roads",minzoom:14,
    filter:["has","name"],
    layout:{"symbol-placement":"line","text-field":["get","name"],"text-font":["Noto Sans SC"],
      "text-size":["interpolate",["linear"],["zoom"],14,10,18,13]},
    paint:{"text-color":C.roadLabelText,"text-halo-color":C.roadLabelHalo,"text-halo-width":1.4}});
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
  if(mapReady)apply();else gpMap.once("load",function(){mapReady=true;apply()});
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
/* ---- รวมรายการเมือง + ไฟล์ภูมิภาคที่เกี่ยวข้องเข้าด้วยกัน (2026-08-06, ป๋าโจขอเป็นมาตรฐาน:
   ปุ่ม "ดาวน์โหลดแผนที่ทริปนี้" ต้องโหลดพื้นหลังถนน/น้ำจริงระดับภูมิภาคมาด้วยเสมอ ไม่ใช่แค่ตัวเมือง
   เพื่อไม่ให้ต้องพึ่งเน็ตหน้างานตอนเลื่อนแผนที่ออกนอกตัวเมือง) — ใช้ REGION_FOR_CITY_KEY หาโซนที่
   เกี่ยวข้องจากเมืองในทริป กันไฟล์ภูมิภาคซ้ำถ้าทริปมีหลายเมืองในโซนเดียวกัน (เช่นฉางซา+จางเจียเจี้ย
   ทั้งคู่ต้องการ hunan-trip-region ไฟล์เดียว) ---- */
function tripDownloadItems(){
  var cities=tripTileCities();
  var seenRegion={};
  var regions=cities.map(function(c){return REGION_FOR_CITY_KEY[c.key]})
    .filter(function(r){return r&&!seenRegion[r]&&(seenRegion[r]=1)})
    .map(function(r){return {th:REGIONAL_TILE_LABELS[r],key:r}});
  return cities.concat(regions);
}
function downloadTripTiles(){
  var mapBtn=$("#mapDownloadTiles"),readyBtn=$("#tileReadyDownloadBtn");
  var cities=tripDownloadItems().map(function(x){return x.key});
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
  var cities=tripDownloadItems();
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
    if(discoveryPlaceProto[name]||realDiscoveryPlaces(name)){
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
