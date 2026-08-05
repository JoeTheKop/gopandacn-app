// @ts-check
// เชลล์แอป: view switching, dock, มือถือ drawers, Planning hero drawer reparenting
// แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
import {$,$$} from "./utils.js";
import {activeTrip} from "./state.js";
import {renderTileReadyCard} from "./map.js";

/* ---- view switching ---- */
// export const เพราะ titles ไม่เคย reassign ทั้งก้อน มีแต่ mutate property (titles.itin[1]=...) จาก
// renderTripCardMeta() ใน app.js — ปลอดภัย ไม่ต้องมี setter
export var titles={
  map:["แผนที่ท่องเที่ยว","10 วัน 9 คืน"],
  itin:["แผนเที่ยวรายวัน","ทริปหูหนานครบสูตร · 12–21 ก.ย. · 10 วัน 9 คืน"],
  journal:["สมุดบันทึก & ค่าใช้จ่าย","งบทริป ¥6,000 · ใช้ไป 21%"],
  packs:["แพ็กข้อมูลเมือง","จัดการแผนที่ & ข้อมูลออฟไลน์รายเมือง"],
  phrases:["วลีจีนฉุกเฉิน","แตะการ์ดเพื่อขยายตัวอักษรใหญ่ให้คนจีนอ่าน"],
  ready:["ความพร้อมก่อนบิน","บิน 12 ก.ย. 03:00 (CZ3036) · แตะรายการเพื่อติ๊กว่าเสร็จแล้ว"],
  sos:["SOS & บัตรสุขภาพ","ทุกอย่างในหน้านี้ใช้ได้แบบออฟไลน์ · แตะการ์ดเพื่อขยายโชว์"],
  plan:["โต๊ะวางแผน-แก้ไขทริป","โหมดวางแผนสำหรับจอใหญ่ · ย้ายการ์ดข้ามวัน + นำเข้าไฟล์ Excel/CSV"]
};
export function showView(v){
  $$(".nav-btn").forEach(function(b){b.classList.toggle("active",b.dataset.view===v)});
  $$(".view").forEach(function(s){s.classList.remove("active")});
  $("#view-"+v).classList.add("active");
  if(v==="map")$("#viewTitle").textContent=activeTrip.name;
  else $("#viewTitle").textContent=titles[v][0];
  $("#viewSub").textContent=titles[v][1];
  $("#modePlan").classList.toggle("active",v==="plan");
  $("#modeTrip").classList.toggle("active",v!=="plan");
  $("#app").classList.toggle("plan-active",v==="plan");
  if(v==="ready")renderTileReadyCard();
  closeDrawers();
}
$("#modePlan").addEventListener("click",function(){showView("plan")});
$("#modeTrip").addEventListener("click",function(){showView("map")});
$$(".nav-btn").forEach(function(btn){
  btn.addEventListener("click",function(){showView(btn.dataset.view)});
});
var openReady=$("#openReady");
openReady.addEventListener("click",function(){showView("ready")});
openReady.addEventListener("keydown",function(e){
  if(e.key==="Enter"||e.key===" "){e.preventDefault();showView("ready")}
});

/* ---- dock collapse (desktop) ---- */
var app=$("#app");
$("#dockToggle").addEventListener("click",function(){app.classList.add("dock-collapsed")});
$("#railExpand").addEventListener("click",function(){app.classList.remove("dock-collapsed")});
$$(".dock-rail .rail-btn").forEach(function(b){
  b.addEventListener("click",function(){app.classList.remove("dock-collapsed")});
});

/* ---- แท็บกล่องเครื่องมือ ---- */
$("#dockTabs").addEventListener("click",function(e){
  var b=e.target.closest(".dock-tab-btn");if(!b)return;
  $$("#dockTabs .dock-tab-btn").forEach(function(x){x.classList.remove("active")});
  b.classList.add("active");
  $$(".dock-pane").forEach(function(p){p.classList.toggle("active",p.dataset.pane===b.dataset.pane)});
});

/* ---- mobile drawers ---- */
export var sidebar=$("#sidebar"),dock=$("#dock"),overlay=$("#overlay");
export function closeDrawers(){
  sidebar.classList.remove("open");dock.classList.remove("open");
  overlay.classList.remove("show");
  closePhDrawer();
}
$("#openSidebar").addEventListener("click",function(){
  sidebar.classList.add("open");overlay.classList.add("show");
});
$("#openDock").addEventListener("click",function(){
  dock.classList.add("open");overlay.classList.add("show");
});
$("#closeDock").addEventListener("click",closeDrawers);
overlay.addEventListener("click",closeDrawers);
document.addEventListener("keydown",function(e){
  if(e.key==="Escape"){
    closeDrawers();
    $$(".big-show,.picker").forEach(function(x){x.classList.remove("show")});
  }
});

/* ---- Planning hero: ลิ้นชักเครื่องมือรอง (ผัง 2026-08-04, docs/design/TRIP-PLANNING-WORKFLOW.md)
   reparent .view หรือ block ที่ render ไว้แล้วเข้ามาโชว์ชั่วคราว แล้วย้ายกลับที่เดิมตอนปิด — ไม่ clone
   ซ้ำ เพื่อไม่ให้ id ชนกัน และ render function เดิม (renderChecklist ฯลฯ) ยังทำงานได้ปกติไม่ต้องแก้ ---- */
var phDrawer=$("#phDrawer"),phDrawerSlot=$("#phDrawerSlot"),phDrawerTitle=$("#phDrawerTitle");
var phDrawerHome=null;
var phDrawerTitles={
  "view-ready":"✓ เช็กลิสต์ก่อนบิน","view-journal":"📓 สมุดบันทึก & ค่าใช้จ่าย","view-sos":"🆘 SOS & บัตรสุขภาพ",
  "phDocsBlock":"📎 เอกสารประจำทริป","phBookingBlock":"🎟️ จองตั๋วล่วงหน้า"
};
/** @param {string} id @returns {void} */
function openPhDrawer(id){
  var node=$("#"+id);
  if(!node)return;
  closePhDrawer();
  phDrawerHome={node:node,parent:node.parentNode,next:node.nextSibling};
  if(node.classList.contains("view"))node.classList.add("as-drawer");
  phDrawerTitle.textContent=phDrawerTitles[id]||"";
  phDrawerSlot.appendChild(node);
  phDrawer.classList.add("open");phDrawer.setAttribute("aria-hidden","false");
  overlay.classList.add("show");
}
function closePhDrawer(){
  if(!phDrawerHome)return;
  var h=phDrawerHome;phDrawerHome=null;
  h.node.classList.remove("as-drawer");
  if(h.next)h.parent.insertBefore(h.node,h.next);else h.parent.appendChild(h.node);
  phDrawer.classList.remove("open");phDrawer.setAttribute("aria-hidden","true");
}
$$("[data-drawer-view]").forEach(function(btn){
  btn.addEventListener("click",function(){openPhDrawer(/** @type {HTMLElement} */(btn).dataset.drawerView)});
});
$$("[data-drawer-node]").forEach(function(btn){
  btn.addEventListener("click",function(){openPhDrawer(/** @type {HTMLElement} */(btn).dataset.drawerNode)});
});
$("#phDrawerClose").addEventListener("click",closeDrawers);
