// @ts-check
// Discovery: คลังสถานที่ (Planning Phase § 3 — docs/design/TRIP-PLANNING-WORKFLOW.md)
// แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
// ข้อมูลจาก js/discovery-data.js (Changsha v1.1 ผ่าน QA จากกุ๊กไก่แล้ว 2026-08-03)
// กดเพิ่มแล้วตกเข้า backlog ("ไอเดียที่ยังไม่จัดวัน") เสมอ — ใช้ flow ลากเข้าวันที่มีอยู่แล้ว
// ไม่ต้องมี "เลือกวัน" ซ้ำในโมดัลนี้
import {$,$$,uid,html} from "./utils.js";
import {DISCOVERY} from "./discovery-data.js";
import {backlog} from "./state.js";
import {persistCurrentTrip} from "./trip-store.js";
import {renderBoard,renderBacklogTimeline} from "./board.js";
import {showView} from "./shell.js";

var discoveryCat="all",discoverySearchTerm="";
/** @param {import("./discovery-data.js").DiscoveryCard} card @returns {string} */
function discoveryCardHTML(card){
  var seniorBadge=(card.seniorScore!=null&&card.seniorScore>=4)
    ?html`<span class="tag" title="${card.seniorNote||''}">♿ ${card.seniorScore}/5</span>`:'';
  return html`<div class="stop-card"><div class="stop-body"><h4>${card.name_th}</h4><p>${card.pitch}</p>`+
    html`<span class="tag ${card.cat[0]}">${card.cat[1]}</span>`+seniorBadge+
    (card.note?html`<p style="font-size:.72rem;color:var(--faint);margin-top:4px">💡 ${card.note}</p>`:'')+
    `<button class="btn-gold" data-discovery-add="${card.id}" style="margin-top:8px;width:100%;justify-content:center">＋ เพิ่มเข้าไอเดีย</button>`+
    '</div></div>';
}
function renderDiscoveryList(){
  var city=/** @type {HTMLSelectElement} */($("#discoveryCity")).value;
  var cards=(DISCOVERY[city]||[]).filter(function(c){
    var catOk=discoveryCat==="all"||(c.cat[0]+(c.cat[0]==="move"?"-"+c.cat[1]:""))===discoveryCat;
    var searchOk=!discoverySearchTerm||c.name_th.toLowerCase().indexOf(discoverySearchTerm)>-1;
    return catOk&&searchOk;
  });
  $("#discoveryList").innerHTML=cards.length
    ?cards.map(discoveryCardHTML).join("")
    :'<div class="sub2">ไม่พบสถานที่ที่ตรงกับตัวกรอง</div>';
}
function addDiscoveryCard(id){
  var city=/** @type {HTMLSelectElement} */($("#discoveryCity")).value;
  var card=(DISCOVERY[city]||[]).find(function(c){return c.id===id});
  if(!card)return;
  backlog.push({time:"--",title:card.name_th,desc:card.pitch,cat:card.cat,cost:null,id:uid("s_")});
  renderBacklogTimeline();renderBoard();persistCurrentTrip();
  var toast=$("#planToast");
  toast.textContent="✓ เพิ่ม \""+card.name_th+"\" เข้าไอเดียแล้ว";toast.hidden=false;
  setTimeout(function(){toast.hidden=true},3000);
}
// Discovery ย้ายจาก modal เต็มหน้าจอมาเป็น inline ฝั่งขวาของ Planning hero ตลอดแล้ว (task #6,
// 2026-08-04) — ไม่มี "เปิด/ปิด" อีกต่อไป เรนเดอร์ครั้งเดียวตอนโหลด #openDiscovery (ไอคอน 🔍 ใน rail)
// เหลือไว้เป็นทางลัด "โฟกัสช่องค้นหา" แทน
renderDiscoveryList();
$("#openDiscovery").addEventListener("click",function(){
  $("#discoverySearch").focus();
});
$("#discoveryList").addEventListener("click",function(e){
  var addBtn=e.target.closest("[data-discovery-add]");
  if(addBtn)addDiscoveryCard(/** @type {HTMLElement} */(addBtn).dataset.discoveryAdd);
});
$("#discoveryCity").addEventListener("change",renderDiscoveryList);
$("#discoverySearch").addEventListener("input",function(){
  discoverySearchTerm=/** @type {HTMLInputElement} */($("#discoverySearch")).value.trim().toLowerCase();
  renderDiscoveryList();
});
$("#discoveryCats").addEventListener("click",function(e){
  var c=e.target.closest(".cat-chip");if(!c)return;
  discoveryCat=/** @type {HTMLElement} */(c).dataset.cat||"all";
  $$("#discoveryCats .cat-chip").forEach(function(x){x.classList.toggle("active",x===c)});
  renderDiscoveryList();
});
$("#phMapLink").addEventListener("click",function(){showView("map")});
