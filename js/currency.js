// @ts-check
// กล่องแลกเงิน CNY↔THB + เรทสด — แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
import {$,$$,fmt} from "./utils.js";

// export var (live binding) เพราะ #fxSync reassign ทั้งค่าตอนกด "ซิงก์เรท" — app.js's journal
// (renderJournalSummary/renderJournalEntries) import RATE แล้วอ่านค่าล่าสุดข้ามโมดูลได้อัตโนมัติ
export var RATE=4.86;
var cny=$("#fxCny"),thb=$("#fxThb");
cny.addEventListener("input",function(){thb.value=cny.value===""?"":fmt(cny.value*RATE)});
thb.addEventListener("input",function(){cny.value=thb.value===""?"":fmt(thb.value/RATE)});
$("#fxSwap").addEventListener("click",function(){
  var a=cny.value;cny.value=thb.value===""?"":fmt(thb.value/RATE);thb.value=a===""?"":fmt(a*RATE);
  cny.dispatchEvent(new Event("input"));
});
$$("#presets .preset").forEach(function(p){
  p.addEventListener("click",function(){
    cny.value=p.dataset.cny;thb.value=fmt(p.dataset.cny*RATE);
  });
});

/* ---- เรทสดเมื่อออนไลน์ ---- */
$("#fxSync").addEventListener("click",function(){
  var note=$("#fxNote");note.textContent="กำลังซิงก์เรท…";
  setTimeout(function(){
    RATE=4.83;
    $("#fxRate").innerHTML='อัตรา <b>¥1 = ฿4.83</b> · เรทสด <span style="color:#6ee7b7">▼0.6%</span> จากเรทออฟไลน์ 4.86';
    $$("#presets .preset").forEach(function(p){p.querySelector("span").textContent="฿"+fmt(p.dataset.cny*RATE)});
    if(cny.value)thb.value=fmt(cny.value*RATE);
    note.textContent="✓ อัปเดตเมื่อครู่ผ่าน Wi-Fi";
  },900);
});
