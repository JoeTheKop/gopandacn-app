// @ts-check
// ไฮไลต์แนะนำ GTTS (feature 2.2 ตัดขอบเขต) — แยกจาก app.js
// (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
// บทความ GTTS จริงยังไม่มีเนื้อหาเจาะจง 7 เมืองที่แอปนี้ครอบคลุม (ตรวจสอบแล้ว 2026-07-23
// — ดู docs/business/DEPLOYMENT-QA.md) เลยเริ่มจากระบบให้ทีมป้อนไฮไลต์เองแบบ manual ก่อน
// ใช้ข้อมูลจริงที่วิจัย/ยืนยันพิกัดไว้แล้วในแอป (pinData + itinerary หูหนาน) เป็นชุดตัวอย่างเริ่มต้น
// — ทีมเพิ่มเมือง/ไฮไลต์ใหม่ได้เองโดยแก้ object GTTS_HIGHLIGHTS นี้ตรงๆ ไม่ต้องรอบทความจริง
import {$,esc} from "./utils.js";
import {curDay} from "./state.js";
import {openStopModal} from "./board.js";
import {pinData} from "./map-data.js";

var GTTS_HIGHLIGHTS={
  "ฉางซา":[
    {ic:pinData.ifs.ic,title:pinData.ifs.title,desc:pinData.ifs.desc,cat:"ที่เที่ยว"},
    {ic:pinData.orange.ic,title:pinData.orange.title,desc:pinData.orange.desc,cat:"ที่เที่ยว"},
    {ic:pinData.pozi.ic,title:pinData.pozi.title,desc:pinData.pozi.desc,cat:"อาหาร"},
    {ic:pinData.yuelu.ic,title:pinData.yuelu.title,desc:pinData.yuelu.desc,cat:"ที่เที่ยว"}
  ],
  "จางเจียเจี้ย":[
    {ic:"🗻",title:"หยวนเจียเจี้ย เสาหินอวตาร",desc:"จุดชมวิวเทียนเสี้ยตี้อี้เฉียว (สะพานหินธรรมชาติ) — แรงบันดาลใจฉากภาพยนตร์ Avatar",cat:"ที่เที่ยว"},
    {ic:"🚡",title:"เทียนเหมินซาน + Sky Ladder",desc:"ประตูสวรรค์ + บันได 999 ขั้น ⚠️ เช็กสถานะซ่อมบำรุงก่อนไป กระเช้ายาวสุดในโลก 7.4 กม.",cat:"ที่เที่ยว",budget:285},
    {ic:"🌉",title:"ระเบียงกระจกหน้าผา",desc:"เสียวสุดในทริป · เตรียมค่าถุงผ้าหุ้มรองเท้า",cat:"ที่เที่ยว",budget:5},
    {ic:"🎢",title:"Qixingshan (七星山) International Adventure Park",desc:"สวนสนุกผจญภัยนานาชาติ — แผนที่ออฟไลน์ครอบคลุมพื้นที่แล้ว",cat:"ที่เที่ยว"}
  ],
  "เฟิ่งหวง":[
    {ic:"🏮",title:"เดินเมืองเก่า สะพานหงเฉียว",desc:"เข้าตัวเมืองฟรี! ตั๋วรวม 9 จุด (บ้านเสิ่นฉงเหวิน+กำแพงเมือง+ล่องเรือ)",cat:"ที่เที่ยว",budget:148},
    {ic:"🛶",title:"ล่องเรือแม่น้ำถัวเจียงยามเช้า",desc:"แสงเช้า+หมอกบนน้ำ คนน้อยกว่ากลางวันมาก",cat:"ที่เที่ยว",budget:30}
  ],
  "ฝูหรง":[
    {ic:"💦",title:"เมืองโบราณบนน้ำตกฝูหรง",desc:"เมืองพันปีที่ตั้งอยู่บนน้ำตกจริงๆ เปิดไฟยามค่ำสวยมาก",cat:"ที่เที่ยว",budget:103}
  ],
  "ฉงลี่":[
    {ic:pinData.wanlong.ic,title:pinData.wanlong.title,desc:pinData.wanlong.desc,cat:"ที่เที่ยว"},
    {ic:pinData.thaiwoo.ic,title:pinData.thaiwoo.title,desc:pinData.thaiwoo.desc,cat:"ที่เที่ยว"},
    {ic:pinData.yunding.ic,title:pinData.yunding.title,desc:pinData.yunding.desc,cat:"ที่เที่ยว"}
  ],
  "ปักกิ่ง":[],
  "เทียนจิน":[]
};
var curHlCity=Object.keys(GTTS_HIGHLIGHTS)[0];
function renderHighlights(){
  $("#gttsHlCityChips").innerHTML=Object.keys(GTTS_HIGHLIGHTS).map(function(c){
    return '<button class="cat-chip'+(c===curHlCity?' active':'')+'" data-hlcity="'+esc(c)+'" role="tab" aria-selected="'+(c===curHlCity)+'">'+esc(c)+'</button>';
  }).join("");
  var list=GTTS_HIGHLIGHTS[curHlCity]||[];
  $("#gttsHlGrid").innerHTML=list.length?list.map(function(h,i){
    return '<div class="pack"><div class="pack-top"><div class="pack-flag">'+h.ic+'</div><h4>'+esc(h.title)+'</h4></div>'+
      '<p style="margin:0;font-size:.8rem;color:var(--muted);line-height:1.5">'+esc(h.desc)+'</p>'+
      '<div class="pack-foot">'+(h.budget?'<span class="pack-size num">≈¥'+h.budget+'</span>':'<span></span>')+
      '<button class="btn-gold" data-hl-add="'+i+'">+ เพิ่มเข้าแผน</button></div></div>';
  }).join(""):'<div class="sub2">ยังไม่มีไฮไลต์คัดสรรสำหรับเมืองนี้ — ทีมกำลังเพิ่มเติม 🐼</div>';
}
renderHighlights();
$("#gttsHlCityChips").addEventListener("click",function(e){
  var c=e.target.closest("[data-hlcity]");if(!c)return;
  curHlCity=c.dataset.hlcity;renderHighlights();
});
$("#gttsHlGrid").addEventListener("click",function(e){
  var b=e.target.closest("[data-hl-add]");if(!b)return;
  var h=GTTS_HIGHLIGHTS[curHlCity][+b.dataset.hlAdd];
  openStopModal(curDay,null);
  $("#stopPlace").value=h.title;
  $("#stopDesc").value=h.desc;
  $("#stopCat").value=h.cat;
  if(h.budget)$("#stopBudget").value=h.budget;
});
