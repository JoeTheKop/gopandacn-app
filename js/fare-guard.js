// @ts-check
// Fare Guard (feature 2.4): เช็คราคาแท็กซี่/DiDi ก่อนขึ้นรถ — แยกจาก app.js
// (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
// ข้อมูลจริงที่มี: ค้นในแผนรายวันหูหนานเจอแค่ 2 รายการที่เป็นค่ารถแท็กซี่จริง (🚗/🚖 ไม่ใช่รถไฟ/เครื่องบิน)
// — ไม่พอจะทำเป็นตารางเรทต่อเมืองที่ยืนยันแล้ว เลยแยก 2 ส่วน: (1) โชว์ราคาจริงที่มีเท่าที่มี ไม่ปั้นเพิ่ม
// (2) เครื่องมือประมาณช่วงราคาคร่าวๆ จากโครงสร้างมิเตอร์แท็กซี่จีนทั่วไป (ค่าเริ่มต้น+ต่อกิโล) — บอกชัดว่า
// เป็นค่าประมาณทั่วไป ไม่ใช่เรทยืนยันเฉพาะเมือง กันไม่ให้ผู้ใช้เข้าใจผิดว่าแม่นระดับเดียวกับราคาจริงที่บันทึกไว้
import {$,esc,fmt} from "./utils.js";

var FARE_REFERENCE=[
  {route:"ในเมืองจางเจียเจี้ย (ไปฝั่งเทียนเหมินซาน) ~40 นาที",cny:30},
  {route:"สนามบินหวงฮวา T2 → ตัวเมืองฉางซา",cny:100}
];
function renderFareReference(){
  $("#fgRealFares").innerHTML=FARE_REFERENCE.map(function(f){
    return '<div style="display:flex;justify-content:space-between;gap:8px;font-size:.78rem">'+
      '<span style="color:var(--muted)">'+esc(f.route)+'</span><b class="num">¥'+f.cny+'</b></div>';
  }).join("");
}
renderFareReference();
$("#fgCheckBtn").addEventListener("click",function(){
  var quote=parseFloat($("#fgQuote").value),dist=parseFloat($("#fgDist").value);
  var out=$("#fgResult");
  if(!quote||quote<=0){out.innerHTML='<span style="color:#f87171">กรอกราคาที่คนขับเสนอก่อน</span>';return}
  if(!dist||dist<=0){out.innerHTML='<span style="color:#f87171">กรอกระยะทางโดยประมาณด้วย (กม.)</span>';return}
  var low=8+dist*1.8,high=15+dist*2.8;
  var verdict,color;
  if(quote<=high){verdict="✓ ดูสมเหตุสมผล อยู่ในช่วงคาดหวัง";color="#6ee7b7"}
  else if(quote<=high*1.3){verdict="⚠️ แพงกว่าช่วงคาดหวังเล็กน้อย ลองต่อรองดู";color="#f59e0b"}
  else{verdict="🚨 สูงกว่าช่วงคาดหวังมาก ระวังโดนโก่งราคา";color="#f87171"}
  out.innerHTML='<div>ช่วงราคาคาดหวังคร่าวๆ: <b class="num">¥'+fmt(low)+'–¥'+fmt(high)+'</b></div>'+
    '<div style="color:'+color+';font-weight:700;margin-top:4px">'+verdict+'</div>';
});
