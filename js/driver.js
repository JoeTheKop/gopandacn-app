// @ts-check
// การ์ดคนขับ + สถานที่บันทึกไว้ — แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
import {$,esc,html} from "./utils.js";
import {speakCn} from "./phrases.js";

// export const เพราะ places ไม่เคยถูก reassign ทั้งก้อน มีแต่ push (ที่นี่ และจาก #apSaveBtn) — ปลอดภัย
// ที่ app.js (#goHome/#sosDriverHome) จะ import แล้วอ่าน places[0] ข้ามโมดูลได้เลย ไม่ต้องมี getter
export var places=[
  {ic:"🏨",th:"ที่พักคืน 1 · Shanjian Boutique (อู่หลิงหยวน)",cn:"张家界山见精品民宿（武陵源标志门店）",addr:"武陵源区标志门附近",py:"Shānjiàn Mínsù",tel:""},
  {ic:"🏮",th:"ที่พักคืน 2 · Yuanshe Riverview (เฟิ่งหวง)",cn:"宿旅·原舍江景民宿（凤凰南华店）",addr:"凤凰古城南华门附近",py:"Yuánshè Mínsù",tel:""},
  {ic:"💦",th:"ที่พักคืน 3 · Xuanyuan Courtyard (ฝูหรง)",cn:"悬园·观景庭院民宿（芙蓉镇景区店）",addr:"永顺县芙蓉镇景区",py:"Xuányuán Mínsù",tel:""},
  {ic:"⛰️",th:"ที่พักคืน 4-5 · Xijian Shanyu (หน้าอุทยาน)",cn:"喜见·山语酒店（张家界国家森林公园标志门店）",addr:"武陵源区森林公园标志门",py:"Xǐjiàn Shānyǔ",tel:""},
  {ic:"🚡",th:"ที่พักคืน 6-7 · The Mansion Inn (เทียนเหมินซาน)",cn:"四大名筑美学客栈（天门山国家森林公园店）",addr:"永定区天门山索道附近",py:"Sìdà Míngzhù",tel:""},
  {ic:"🌆",th:"ที่พักคืน 8-9 · Pujing Hotel (ฉางซา)",cn:"长沙璞境酒店（万家丽广场高桥北地铁站店）",addr:"雨花区高桥北地铁站旁",py:"Pújìng Jiǔdiàn",tel:""},
  {ic:"🚄",th:"สถานีรถไฟจางเจียเจี้ยตะวันตก",cn:"张家界西站",addr:"永定区沙堤街道",py:"Zhāngjiājiè Xī Zhàn",tel:""},
  {ic:"✈️",th:"สนามบินหวงฮวา อาคาร T2",cn:"长沙黄花国际机场 T2航站楼",addr:"长沙县机场大道",py:"Huánghuā Jīchǎng",tel:""}
];
var CUSTOM_PLACES_KEY="gopanda_custom_places_v1";
(function loadCustomPlaces(){
  try{
    var saved=JSON.parse(localStorage.getItem(CUSTOM_PLACES_KEY)||"[]");
    saved.forEach(function(p){places.push(p)});
  }catch(e){/* ข้อมูลเสีย — ข้ามไปเงียบๆ ไม่ให้แอปพังเพราะ localStorage เพี้ยน */}
})();
function saveCustomPlaces(){
  var custom=places.filter(function(p){return p.custom});
  localStorage.setItem(CUSTOM_PLACES_KEY,JSON.stringify(custom));
}
var placePick=$("#placePick"),driverShow=$("#driverShow"),drvSpeakTxt="";
function renderPlaces(){
  $("#placeList").innerHTML=places.map(function(p,i){
    return '<button class="place-btn" data-i="'+i+'"><span class="ic2">'+p.ic+'</span>'+
      '<span><b>'+esc(p.th)+'</b><span>'+esc(p.cn)+(p.tel?' · ☎ '+esc(p.tel):'')+'</span></span></button>';
  }).join("");
}
export function openDriverCard(p){
  placePick.classList.remove("show");
  $("#drvHead").innerHTML='师傅您好，请带我去：<small>(คนขับครับ ช่วยพาไปที่นี่หน่อยครับ)</small>';
  $("#drvTitle").textContent=p.cn;
  $("#drvLines").innerHTML=html`<div>${p.addr}</div>`+(p.tel?html`<div style="color:#a5f3fc">☎ ${p.tel}</div>`:'');
  $("#drvThai").textContent=p.th+" · "+p.py;
  drvSpeakTxt="请带我去"+p.cn+"，地址是"+p.addr;
  driverShow.classList.add("show");
}
export function openInfoCard(cfg){
  $("#drvHead").innerHTML=cfg.head;
  $("#drvTitle").textContent=cfg.title;
  $("#drvLines").innerHTML=cfg.lines.map(function(l){return '<div>'+l+'</div>'}).join("");
  $("#drvThai").textContent=cfg.thai;
  drvSpeakTxt=cfg.speak;
  driverShow.classList.add("show");
}
$("#openDriver").addEventListener("click",function(){renderPlaces();placePick.classList.add("show")});
placePick.addEventListener("click",function(e){
  var b=e.target.closest(".place-btn");
  if(b){openDriverCard(places[+b.dataset.i]);return}
  if(!e.target.closest(".picker-panel"))placePick.classList.remove("show");
});
driverShow.addEventListener("click",function(e){
  if(e.target.closest("#drvSpeak"))return;
  driverShow.classList.remove("show");
});
$("#drvSpeak").addEventListener("click",function(e){e.stopPropagation();speakCn(drvSpeakTxt)});

/* ---- เพิ่มสถานที่ของฉัน (บันทึกในเครื่อง ใช้กับการ์ดคนขับได้ทันที) ---- */
$("#addPlaceBtn").addEventListener("click",function(){
  ["apTh","apCn","apAddr","apPy","apTel"].forEach(function(id){$("#"+id).value=""});
  $("#addPlaceModal").classList.add("show");
  $("#apTh").focus();
});
$("#addPlaceModal").addEventListener("click",function(e){
  if(!e.target.closest(".picker-panel"))$("#addPlaceModal").classList.remove("show");
});
$("#apSaveBtn").addEventListener("click",function(){
  var th=$("#apTh").value.trim(),cn=$("#apCn").value.trim();
  if(!th){$("#apTh").focus();return}
  if(!cn){$("#apCn").focus();return}
  places.push({ic:"📍",th:th,cn:cn,addr:$("#apAddr").value.trim(),py:$("#apPy").value.trim(),tel:$("#apTel").value.trim(),custom:true});
  saveCustomPlaces();
  renderPlaces();
  $("#addPlaceModal").classList.remove("show");
});
