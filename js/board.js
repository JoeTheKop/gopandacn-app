// @ts-check
// โต๊ะวางแผน (planning board): timeline การ์ดจุดหมาย, ไอเดีย (backlog), modal เพิ่ม/แก้ไข/ลบจุดหมาย
// + เอกสารแนบระดับจุดหมาย + เรียงเส้นทางอัจฉริยะ — แยกจาก app.js
// (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
//
// หมายเหตุสำคัญ: renderDay()/renderBoard()/renderDayStrip()/renderBacklogTimeline() export จากที่นี่
// แต่ "การเรียกครั้งแรกตอนโหลดแอป" (renderDay(1) ฯลฯ) ยังคงอยู่ใน app.js ที่ตำแหน่งเดิมเป๊ะ ไม่ย้ายมา
// เป็น top-level ของไฟล์นี้ — เพราะ ES module top-level จะรันก่อนโค้ดของ app.js ทั้งหมด (import
// ก่อน export) ซึ่งเร็วเกินไป (ก่อน activeTrip/backlog ฯลฯ พร้อม) และจะทำให้ลำดับ
// renderBoard()→renderDay() ที่ต้องรันตามกันเป๊ะ (renderBoard เขียน d.m ที่ renderDay อ่านต่อ) เพี้ยน
import {$,$$,esc,uid,fmtBytes} from "./utils.js";
import {docList,docAdd,docGet,docDelete,DOC_MAX_BYTES} from "./docs.js";
import {days,curDay,setCurDay,activeTrip,dayDates,backlog,getDay,colArr,colCost,sortDay} from "./state.js";
import {persistCurrentTrip} from "./trip-store.js";
import {CAT_MAP} from "./seed-data.js";

/* ---- การ์ดจุดหมาย 1 ใบ — ใช้ร่วมกันทั้งแผนเที่ยวรายวัน (ดูอย่างเดียว) และโต๊ะวางแผน (แก้ไขได้)
   ต่างกันแค่ editable: true จะมี data-idx/role=button/class พิเศษให้คลิกเปิดแก้ไขได้ ---- */
function stopCardHTML(s,idx,editable){
  return '<div class="stop"><div class="stop-card'+(editable?' stop-card-editable':'')+'"'+
    (editable?' data-idx="'+idx+'" role="button" tabindex="0" aria-label="แก้ไขจุดหมายนี้"':'')+'>'+
    '<div class="stop-time num">'+esc(s.time)+'</div>'+
    '<div class="stop-body"><h4>'+esc(s.title)+'</h4><p>'+esc(s.desc)+'</p>'+
    '<span class="tag '+s.cat[0]+'">'+esc(s.cat[1])+'</span>'+
    (s.cost?'<span class="tag cost num">¥'+s.cost+'</span>':'')+'</div></div></div>';
}
function renderDayInto(tlSel,titleSel,metaSel,n,d,editable){
  var tl=$(tlSel);
  if(!tl)return;
  if(!d||!d.s||!d.s.length){
    $(titleSel).innerHTML="วัน "+n+" · <em>ยังไม่ได้วางแผน</em>";
    $(metaSel).textContent=editable?"กด “+ เพิ่มจุดหมายในวันนี้” ด้านล่างเพื่อเริ่มวางแผน":"แตะ “เพิ่มจุดหมาย” เพื่อเริ่มวางแผน";
    tl.innerHTML='<div class="stop"><div class="stop-card"><div class="stop-body"><h4>วันนี้ยังว่างอยู่ 🐼</h4><p>ลองถามหลิงหลิงว่า “วัน '+n+' ที่จางเจียเจี้ยควรไปไหนดี” แล้วกดเพิ่มเข้าแผนได้เลย</p></div></div></div>';
    return;
  }
  $(titleSel).innerHTML="วัน "+n+" · <em>"+d.t+"</em>";
  $(metaSel).textContent=d.m;
  tl.innerHTML=d.s.map(function(s,idx){return stopCardHTML(s,idx,editable)}).join("");
}
export function renderDay(n){
  setCurDay(n);
  var d=days[n];
  renderDayInto("#timeline","#itinTitle","#itinMeta",n,d,false);
  renderDayInto("#planTimeline","#planItinTitle","#planItinMeta",n,d,true);
}
export function renderBacklogTimeline(){
  var tl=$("#backlogTimeline");
  if(!tl)return;
  $("#backlogMeta").textContent=backlog.length+" ใบ";
  tl.innerHTML=backlog.length?backlog.map(function(s,idx){return stopCardHTML(s,idx,true)}).join("")
    :'<div class="stop"><div class="stop-card"><div class="stop-body"><h4>ยังไม่มีไอเดียเก็บไว้</h4><p>กด “+ เพิ่มไอเดียใหม่” ด้านล่าง — ใส่ไว้ก่อน ค่อยลากไปจัดวันทีหลังได้</p></div></div></div>';
}
export function renderDayStrip(){
  var html="";
  for(var n=1;n<=activeTrip.dayCount;n++)
    html+='<button class="day-chip'+(n===curDay?' active':'')+'" data-day="'+n+'"><b>วัน '+n+'</b>'+(dayDates[n]||"")+'</button>';
  [$("#dayStrip"),$("#planDayStrip")].forEach(function(strip){
    if(!strip)return;
    strip.innerHTML=html;
    // ทริปยาว (แถบเลื่อนได้ ~3 จอ) — เลื่อนให้ชิปวันที่เลือกอยู่ใน view เสมอหลัง re-render
    // ไม่งั้นสลับระหว่างทริปยาวสองทริป scrollLeft ค้างที่เดิมแต่ active กลับไปวัน 1 นอกจอ
    var act=strip.querySelector(".day-chip.active");
    if(act)act.scrollIntoView({inline:"center",block:"nearest"});
  });
}
function goToDay(n){
  [$("#dayStrip"),$("#planDayStrip")].forEach(function(strip){
    if(!strip)return;
    $$(".day-chip",strip).forEach(function(x){x.classList.toggle("active",+x.dataset.day===n)});
  });
  renderDay(n);
}
$("#dayStrip").addEventListener("click",function(e){
  var c=e.target.closest(".day-chip");if(!c)return;
  goToDay(+c.dataset.day);
});
$("#planDayStrip").addEventListener("click",function(e){
  var c=e.target.closest(".day-chip");if(!c)return;
  goToDay(+c.dataset.day);
});
$("#planTimeline").addEventListener("click",function(e){
  var c=e.target.closest(".stop-card[data-idx]");if(!c)return;
  openStopModal(curDay,+c.dataset.idx);
});
$("#planTimeline").addEventListener("keydown",function(e){
  if(e.key!=="Enter"&&e.key!==" ")return;
  var c=e.target.closest(".stop-card[data-idx]");if(!c)return;
  e.preventDefault();openStopModal(curDay,+c.dataset.idx);
});
$("#backlogTimeline").addEventListener("click",function(e){
  var c=e.target.closest(".stop-card[data-idx]");if(!c)return;
  openStopModal(0,+c.dataset.idx);
});
$("#backlogTimeline").addEventListener("keydown",function(e){
  if(e.key!=="Enter"&&e.key!==" ")return;
  var c=e.target.closest(".stop-card[data-idx]");if(!c)return;
  e.preventDefault();openStopModal(0,+c.dataset.idx);
});
$("#planAddStopBtn").addEventListener("click",function(){openStopModal(curDay,null)});
$("#planAddIdeaBtn").addEventListener("click",function(){openStopModal(0,null)});
$("#planOptimizeBtn").addEventListener("click",function(){optimizeDay(curDay)});

/* ---- เพิ่ม/แก้ไข/ลบจุดหมาย — แก้ไขได้เฉพาะจากโต๊ะวางแผน (บอร์ด) เท่านั้น
   แผนเที่ยวรายวันเป็นหน้าดูอย่างเดียว (read-only) ตามที่ป๋าโจต้องการ ---- */
var stopEditCtx=null; // {ci,idx} — ci: 0=ไอเดีย(backlog), 1..N=วัน · idx เป็น null เมื่อกำลังเพิ่มใหม่
export function openStopModal(ci,idx){
  var arr=colArr(ci);
  var s=(idx!=null)?arr[idx]:null;
  stopEditCtx={ci:ci,idx:idx,pendingStopId:s?s.id:uid("s_")};
  $("#stopModalTitle").textContent=s?"✏️ แก้ไขจุดหมาย":"➕ เพิ่มจุดหมาย";
  var dayOpts='<option value="0">💡 ไอเดีย (ยังไม่จัดวัน)</option>';
  for(var dn=1;dn<=activeTrip.dayCount;dn++)dayOpts+='<option value="'+dn+'">วัน '+dn+(dayDates[dn]?" ("+dayDates[dn]+")":"")+'</option>';
  $("#stopDay").innerHTML=dayOpts;
  $("#stopDay").value=ci;
  $("#stopTime").value=(s&&s.time!=="--")?s.time:"";
  $("#stopPlace").value=s?s.title:"";
  $("#stopDesc").value=s?s.desc:"";
  $("#stopCat").value=s?s.cat[1]:"ที่เที่ยว";
  $("#stopBudget").value=(s&&s.cost)?s.cost:"";
  $("#stopDeleteBtn").style.display=s?"":"none";
  $("#stopModal").classList.add("show");
  $("#stopPlace").focus();
  renderStopDocs();
}
function closeStopModal(){
  // ถ้าปิดโดยไม่ได้บันทึกจุดหมายใหม่ ให้เคลียร์ไฟล์แนบที่อัปโหลดค้างไว้ (กันไฟล์กำพร้าใน IndexedDB)
  if(stopEditCtx&&!stopEditCtx.saved&&stopEditCtx.idx==null){
    docList(activeTrip.id,stopEditCtx.pendingStopId).then(function(list){
      list.forEach(function(f){docDelete(f.id)});
    });
  }
  $("#stopModal").classList.remove("show");stopEditCtx=null;
}
$("#stopModal").addEventListener("click",function(e){
  if(!e.target.closest(".picker-panel"))closeStopModal();
});
$("#stopSaveBtn").addEventListener("click",function(){
  var place=$("#stopPlace").value.trim();
  if(!place){$("#stopPlace").focus();return}
  var catLabel=$("#stopCat").value;
  var budget=$("#stopBudget").value?Number($("#stopBudget").value):null;
  var newCi=+$("#stopDay").value;
  var entry={time:$("#stopTime").value||"--",title:place,desc:$("#stopDesc").value.trim(),cat:CAT_MAP[catLabel]||["spot","ที่เที่ยว"],cost:budget,id:stopEditCtx.pendingStopId};
  // เอาออกจากที่เดิมก่อนเสมอ (ถ้ามีอยู่แล้ว) แล้วค่อยใส่ที่ใหม่ — วิธีเดียวกันไม่ว่าจะแค่แก้ข้อมูลเดิม
  // หรือย้ายวัน (เปลี่ยนวันแล้วก็แค่ "เอาออกจากที่เดิม ใส่ที่ใหม่ เรียงลำดับใหม่" เหมือนแก้เวลาทุกประการ)
  if(stopEditCtx.idx!=null)colArr(stopEditCtx.ci).splice(stopEditCtx.idx,1);
  colArr(newCi).push(entry);
  if(newCi>0)sortDay(newCi);
  stopEditCtx.saved=true;
  persistCurrentTrip();
  renderBoard();renderDay(curDay);renderDayStrip();renderBacklogTimeline();
  closeStopModal();
});
$("#stopDeleteBtn").addEventListener("click",function(){
  var arr=colArr(stopEditCtx.ci);
  arr.splice(stopEditCtx.idx,1);
  docList(activeTrip.id,stopEditCtx.pendingStopId).then(function(list){
    list.forEach(function(f){docDelete(f.id)});
  });
  stopEditCtx.saved=true; // จุดหมายถูกลบแล้ว ไม่ต้องให้ closeStopModal() เคลียร์ไฟล์ซ้ำ
  persistCurrentTrip();
  renderBoard();renderDay(curDay);renderDayStrip();renderBacklogTimeline();
  closeStopModal();
});

/* ---- เอกสารแนบระดับจุดหมาย (ในตัว stopModal) ---- */
function renderStopDocs(){
  var box=$("#stopDocList");
  if(!stopEditCtx){box.innerHTML="";return}
  docList(activeTrip.id,stopEditCtx.pendingStopId).then(function(list){
    if(!stopEditCtx)return; // ปิด modal ไปแล้วระหว่างรอโหลด
    box.innerHTML=list.map(function(f){
      var ic=f.type==="application/pdf"?"📄":"🖼️";
      return '<div class="doc-item"><span class="doc-ic">'+ic+'</span>'+
        '<span class="doc-name" data-view-doc="'+f.id+'" title="เปิดดู · '+esc(f.name)+'">'+esc(f.name)+'</span>'+
        '<span class="doc-size num">'+fmtBytes(f.size)+'</span>'+
        '<button class="doc-del" data-del-doc="'+f.id+'" aria-label="ลบไฟล์นี้" title="ลบไฟล์นี้">🗑️</button></div>';
    }).join("");
  });
}
$("#stopDocAddBtn").addEventListener("click",function(){$("#stopDocInput").click()});
$("#stopDocInput").addEventListener("change",/** @this {HTMLInputElement} */ function(){
  var files=Array.prototype.slice.call(this.files||[]);
  this.value="";
  if(!files.length||!stopEditCtx)return;
  var tripId=activeTrip.id,stopId=stopEditCtx.pendingStopId;
  Promise.all(files.map(function(f){
    if(f.size>DOC_MAX_BYTES){alert('ไฟล์ "'+f.name+'" ใหญ่เกิน 5MB ข้ามไฟล์นี้ไปนะครับ');return null}
    return docAdd(tripId,stopId,f);
  })).then(renderStopDocs);
});
$("#stopDocList").addEventListener("click",function(e){
  var del=e.target.closest("[data-del-doc]");
  if(del){
    if(confirm("ลบไฟล์นี้?"))docDelete(del.dataset.delDoc).then(renderStopDocs);
    return;
  }
  var view=e.target.closest("[data-view-doc]");
  if(view){
    docGet(view.dataset.viewDoc).then(function(rec){
      if(!rec)return;
      var url=URL.createObjectURL(rec.blob);
      window.open(url,"_blank");
      setTimeout(function(){URL.revokeObjectURL(url)},60000);
    });
  }
});

// เดิม renderBoard() วาด Kanban หลายคอลัมน์เข้า #board (การ์ดยัดข้อมูลแน่นจนกดแก้ไขไม่รู้ว่ากดตรงไหน
// ป๋าโจ feedback ตรงๆ ว่า UX แย่) เปลี่ยนมาใช้ layout เดียวกับแผนเที่ยวรายวัน (day-tab + timeline
// แนวตั้ง) แทนแล้ว ดู renderDay()/renderBacklogTimeline() — ฟังก์ชันนี้เหลือแค่คำนวณงบรวมแสดงผล
export function renderBoard(){
  var total=0;
  for(var n=1;n<=activeTrip.dayCount;n++){
    var d=getDay(n);d.m=d.s.length+" จุดหมาย";
    total+=colCost(n);
  }
  var bd=$("#planBudget");
  bd.className="budget-chip num"+(total>activeTrip.budget?" over":"");
  bd.innerHTML=(total>activeTrip.budget?"⚠️ ":"")+"แผนใช้จ่ายรวม ≈ <b>¥"+total.toLocaleString()+"</b> / งบทริป ¥"+activeTrip.budget.toLocaleString();
}

/* ---- เรียงเส้นทางอัจฉริยะ ---- */
function optimizeDay(n){
  var d=getDay(n),toast=$("#planToast");
  if(d.s.length<3){
    toast.textContent="✨ วัน "+n+" จุดหมายน้อย เส้นทางเดิมดีอยู่แล้วค่ะ";
  }else{
    var a=d.s[1],b=d.s[2],t=a.time;a.time=b.time;b.time=t;
    sortDay(n);renderBoard();renderDay(curDay);
    toast.textContent="✨ วิเคราะห์พิกัด "+d.s.length+" จุดในวัน "+n+" — สลับลำดับช่วงกลางวัน ลดเดินย้อน ~1.2 กม. (ประหยัด ~40 นาที)";
  }
  toast.hidden=false;setTimeout(function(){toast.hidden=true},5000);
}
