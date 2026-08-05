// @ts-check
// แปลงราคา = จดบัญชีเลย (feature 1.6) + สมุดบันทึกผูกกับระบบหลายทริปจริง (feature 1.4)
// แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
// journalState มาจาก js/state.js — เป็นของทริปที่กำลังเปิดอยู่เท่านั้น สลับ/สร้าง/นำเข้าทริปแล้ว
// จะสลับชุดนี้ตาม (ดู setLiveData ใน state.js)
import {$,html,fmt} from "./utils.js";
import {journalState,activeTrip} from "./state.js";
import {persistCurrentTrip} from "./trip-store.js";
import {RATE} from "./currency.js";

export function renderJournalSummary(){
  // เดิมตั้งชื่อ local var ว่า "days" ชนกับ days (แผนที่วัน) ที่ import จาก state.js ได้ทั่วทั้งแอป —
  // เปลี่ยนชื่อเป็น dayCount ให้ชัดเจนตอนแยกไฟล์นี้ (ค่าเดิมคือ activeTrip.dayCount อยู่แล้ว ไม่ใช่การแก้ logic)
  var total=journalState.spent,budget=activeTrip.budget||0,dayCount=activeTrip.dayCount||1;
  $("#jTotalSpent").textContent="¥"+fmt(total);
  $("#jTotalSub").textContent="≈ ฿"+fmt(total*RATE)+" · "+dayCount+" วัน";
  $("#jRemaining").textContent=budget>0?"¥"+fmt(budget-total):"—";
  $("#jRemainingSub").textContent=budget>0?"จากงบ ¥"+fmt(budget):"ยังไม่ได้ตั้งงบ";
  $("#jAvgPerDay").textContent="¥"+fmt(total/dayCount);
}
export function renderJournalEntries(){
  $("#expListSaved").innerHTML=journalState.entries.map(function(e){
    return html`<div class="exp"><div class="exp-ic">${e.ic}</div><div class="exp-body"><h5>${e.title}</h5>`+
      html`<span>${e.time?e.time+" · ":""}${e.cat}</span></div><div class="exp-amt num"><b>¥${fmt(e.cny)}</b><span>≈ ฿${fmt(e.cny*RATE)}</span></div></div>`;
  }).join("")||'<div class="sub2">ยังไม่มีรายการ — กดบันทึกจากกล่องแลกเงิน หรือ "＋ จดรายการใหม่" ได้เลย</div>';
}
$("#fxSaveExpense").addEventListener("click",function(){
  var amt=parseFloat($("#fxCny").value);
  if(!amt||amt<=0){$("#fxCny").focus();return}
  amt=Math.round(amt*100)/100;
  journalState.entries.unshift({ic:"💱",title:"แลกเงินเป็นรายจ่าย",cat:"แลกเงิน",
    time:new Date().toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"}),cny:amt});
  journalState.spent=Math.round((journalState.spent+amt)*100)/100;
  persistCurrentTrip();
  renderJournalSummary();renderJournalEntries();
  var msg=$("#fxSaveMsg");
  msg.textContent="✓ บันทึก ¥"+fmt(amt)+" ลงสมุดบันทึกแล้ว";
  msg.hidden=false;
  setTimeout(function(){msg.hidden=true},3500);
});
