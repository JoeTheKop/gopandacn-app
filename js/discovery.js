// @ts-check
// Discovery: คลังสถานที่ (Planning Phase § 3 — docs/design/TRIP-PLANNING-WORKFLOW.md)
// แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
// ข้อมูลจาก js/discovery-data.js (Changsha v1.1 ผ่าน QA จากกุ๊กไก่แล้ว 2026-08-03)
// กดเพิ่มแล้วตกเข้า backlog ("ไอเดียที่ยังไม่จัดวัน") เสมอ — ใช้ flow ลากเข้าวันที่มีอยู่แล้ว
// ไม่ต้องมี "เลือกวัน" ซ้ำในโมดัลนี้
import {$,$$,uid,html} from "./utils.js";
import {DISCOVERY} from "./discovery-data.js";
import {DISCOVERY_GPS} from "./discovery-gps.js";
import {backlog} from "./state.js";
import {persistCurrentTrip} from "./trip-store.js";
import {renderBoard,renderBacklogTimeline} from "./board.js";
import {showView} from "./shell.js";
import {cityCenters,CITY_KEY_TO_TH,MAP_COLORS} from "./map-data.js";
import {flyToCity} from "./map.js";

var discoveryCat="all",discoverySearchTerm="";
// การ์ดที่เพิ่มเข้าไอเดียแล้วในเซสชันนี้ (id เท่านั้น) — ใช้ติ๊กถูกบนหมุดมินิแมป ไม่ผูกกับ backlog
// จริงเพราะ backlog เก็บสำเนา (title/desc/cost) ไม่เก็บ candidate_key กลับมาให้เช็คซ้ำได้
var addedIds={};
/** @param {import("./discovery-data.js").DiscoveryCard} card @returns {string} */
function discoveryCardHTML(card){
  var seniorBadge=(card.seniorScore!=null&&card.seniorScore>=4)
    ?html`<span class="tag" title="${card.seniorNote||''}">♿ ${card.seniorScore}/5</span>`:'';
  return html`<div class="stop-card" data-discovery-id="${card.id}"><div class="stop-body"><h4>${card.name_th}</h4><p>${card.pitch}</p>`+
    html`<span class="tag ${card.cat[0]}">${card.cat[1]}</span>`+seniorBadge+
    (card.note?html`<p style="font-size:.72rem;color:var(--faint);margin-top:4px">💡 ${card.note}</p>`:'')+
    `<button class="btn-gold" data-discovery-add="${card.id}" style="margin-top:8px;width:100%;justify-content:center">＋ เพิ่มเข้าไอเดีย</button>`+
    '</div></div>';
}
function filteredCards(){
  var city=/** @type {HTMLSelectElement} */($("#discoveryCity")).value;
  return (DISCOVERY[city]||[]).filter(function(c){
    var catOk=discoveryCat==="all"||(c.cat[0]+(c.cat[0]==="move"?"-"+c.cat[1]:""))===discoveryCat;
    var searchOk=!discoverySearchTerm||c.name_th.toLowerCase().indexOf(discoverySearchTerm)>-1;
    return catOk&&searchOk;
  });
}
function renderDiscoveryList(cards){
  $("#discoveryList").innerHTML=cards.length
    ?cards.map(discoveryCardHTML).join("")
    :'<div class="sub2">ไม่พบสถานที่ที่ตรงกับตัวกรอง</div>';
}

/* ---- มินิแมปคลังสถานที่ (feature 2026-08-07, Round 2 ของ wireframe "แผนที่จริง+ค้นหาแบบฝัง
   เข้า Planning Hero") — instance MapLibre แยกจาก gpMap ของแผนที่เต็มจอ (ดูเหตุผลใน CSS comment,
   index.html) สร้างครั้งเดียวตอนมีเมืองที่มี GPS ครั้งแรก แล้วอัปเดตหมุด/มุมมองทุกครั้งที่ filter เปลี่ยน
   เกณฑ์ปักหมุดเดียวกับแผนที่เต็มจอ (js/map.js realDiscoveryPlaces): เฉพาะ candidate ที่มี lat จริงใน
   DISCOVERY_GPS (confidence high/medium เท่านั้นถึงจะมี lat) ---- */
var miniMap=null,miniMarkers={};
function ensureMiniMap(){
  if(miniMap)return miniMap;
  miniMap=new maplibregl.Map({
    container:"discMinimapCanvas",
    style:{version:8,sources:{},layers:[{id:"bg",type:"background",paint:{"background-color":MAP_COLORS.background.bg}}]},
    center:[112.97,28.19],zoom:10,interactive:false,
    attributionControl:{compact:true,customAttribution:"© OpenStreetMap contributors"}
  });
  return miniMap;
}
function clearMiniMarkers(){
  Object.keys(miniMarkers).forEach(function(k){miniMarkers[k].marker.remove()});
  miniMarkers={};
}
function renderDiscoveryMiniMap(cards){
  var city=/** @type {HTMLSelectElement} */($("#discoveryCity")).value;
  var gps=DISCOVERY_GPS[city];
  if(!gps){
    // ยังไม่มีไฟล์ GPS เลยสำหรับเมืองนี้ (เช่นปักกิ่ง) — ซ่อนมินิแมป เหลือแค่ลิสต์แบบเดิม
    $("#discMinimap").hidden=true;
    $("#discMinimapEmpty").hidden=false;
    return;
  }
  $("#discMinimapEmpty").hidden=true;
  $("#discMinimap").hidden=false;
  var map=ensureMiniMap();
  clearMiniMarkers();
  var pins=[];
  cards.forEach(function(c){
    var g=gps[c.id];
    if(g&&g.lat!=null)pins.push({id:c.id,lng:g.lng,lat:g.lat});
  });
  pins.forEach(function(p,i){
    var el=document.createElement("div");
    el.className="disc-pin-mini"+(addedIds[p.id]?" disc-pin-done":"");
    el.innerHTML='<svg viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg"><path d="M11 0C5 0 0 5 0 11c0 8 11 19 11 19s11-11 11-19C22 5 17 0 11 0z" fill="'+(addedIds[p.id]?"#0f8a6c":"#f59e0b")+'" stroke="#78350f" stroke-width="1"/><circle cx="11" cy="11" r="7.5" fill="#0f172a"/>'+(addedIds[p.id]?'<path d="M7 11.2l2.4 2.4L15.5 8" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>':'')+'</svg>';
    el.setAttribute("role","button");el.setAttribute("tabindex","0");
    function highlight(on){
      el.classList.toggle("disc-pin-hover",on);
      var card=$(".stop-card[data-discovery-id=\""+p.id+"\"]");
      if(card)card.classList.toggle("disc-pin-hover",on);
    }
    el.addEventListener("mouseenter",function(){highlight(true)});
    el.addEventListener("mouseleave",function(){highlight(false)});
    el.addEventListener("click",function(){
      var card=$(".stop-card[data-discovery-id=\""+p.id+"\"]");
      if(card){card.scrollIntoView({behavior:"smooth",block:"center"});highlight(true);setTimeout(function(){highlight(false)},1200)}
    });
    miniMarkers[p.id]={marker:new maplibregl.Marker({element:el}).setLngLat([p.lng,p.lat]).addTo(map),el:el};
  });
  setTimeout(function(){
    map.resize();
    if(pins.length>=2){
      var b=new maplibregl.LngLatBounds();
      pins.forEach(function(p){b.extend([p.lng,p.lat])});
      map.fitBounds(b,{padding:28,maxZoom:14,duration:0});
    }else if(pins.length===1){
      map.jumpTo({center:[pins[0].lng,pins[0].lat],zoom:12.5});
    }else{
      var thName=CITY_KEY_TO_TH[city],c=thName&&cityCenters[thName];
      map.jumpTo({center:c?[c.lng,c.lat]:[112.97,28.19],zoom:10});
    }
  },0);
}
function refreshDiscovery(){
  var cards=filteredCards();
  renderDiscoveryList(cards);
  renderDiscoveryMiniMap(cards);
}
function addDiscoveryCard(id){
  var city=/** @type {HTMLSelectElement} */($("#discoveryCity")).value;
  var card=(DISCOVERY[city]||[]).find(function(c){return c.id===id});
  if(!card)return;
  backlog.push({time:"--",title:card.name_th,desc:card.pitch,cat:card.cat,cost:null,id:uid("s_")});
  renderBacklogTimeline();renderBoard();persistCurrentTrip();
  addedIds[id]=true;
  var m=miniMarkers[id];
  if(m){
    m.el.classList.add("disc-pin-done");
    m.el.querySelector("path[fill]").setAttribute("fill","#0f8a6c");
    if(!m.el.querySelector("path[stroke='#fff']")){
      m.el.querySelector("circle").insertAdjacentHTML("afterend",'<path d="M7 11.2l2.4 2.4L15.5 8" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>');
    }
  }
  var toast=$("#planToast");
  toast.textContent="✓ เพิ่ม \""+card.name_th+"\" เข้าไอเดียแล้ว";toast.hidden=false;
  setTimeout(function(){toast.hidden=true},3000);
}
// Discovery ย้ายจาก modal เต็มหน้าจอมาเป็น inline ฝั่งขวาของ Planning hero ตลอดแล้ว (task #6,
// 2026-08-04) — ไม่มี "เปิด/ปิด" อีกต่อไป เรนเดอร์ครั้งเดียวตอนโหลด #openDiscovery (ไอคอน 🔍 ใน rail)
// เหลือไว้เป็นทางลัด "โฟกัสช่องค้นหา" แทน
refreshDiscovery();
$("#openDiscovery").addEventListener("click",function(){
  $("#discoverySearch").focus();
});
$("#discoveryList").addEventListener("click",function(e){
  var addBtn=e.target.closest("[data-discovery-add]");
  if(addBtn)addDiscoveryCard(/** @type {HTMLElement} */(addBtn).dataset.discoveryAdd);
});
// ชี้เมาส์การ์ด ↔ ไฮไลต์หมุดคู่กัน (ทิศทางตรงข้ามของ highlight() ในมินิแมป) — ใช้ delegation
// เพราะการ์ดถูก re-render ทั้งลิสต์ทุกครั้งที่ filter เปลี่ยน ผูก listener ตรงๆ ทีละใบไม่ทน
$("#discoveryList").addEventListener("mouseover",function(e){
  var card=e.target.closest(".stop-card");if(!card)return;
  var m=miniMarkers[card.dataset.discoveryId];if(m)m.el.classList.add("disc-pin-hover");
});
$("#discoveryList").addEventListener("mouseout",function(e){
  var card=e.target.closest(".stop-card");if(!card)return;
  var m=miniMarkers[card.dataset.discoveryId];if(m)m.el.classList.remove("disc-pin-hover");
});
$("#discoveryCity").addEventListener("change",refreshDiscovery);
$("#discoverySearch").addEventListener("input",function(){
  discoverySearchTerm=/** @type {HTMLInputElement} */($("#discoverySearch")).value.trim().toLowerCase();
  refreshDiscovery();
});
$("#discoveryCats").addEventListener("click",function(e){
  var c=e.target.closest(".cat-chip");if(!c)return;
  discoveryCat=/** @type {HTMLElement} */(c).dataset.cat||"all";
  $$("#discoveryCats .cat-chip").forEach(function(x){x.classList.toggle("active",x===c)});
  refreshDiscovery();
});
$("#discMinimapExpand").addEventListener("click",function(){
  var city=/** @type {HTMLSelectElement} */($("#discoveryCity")).value;
  var thName=CITY_KEY_TO_TH[city];
  showView("map");
  if(thName)flyToCity(thName);
});
