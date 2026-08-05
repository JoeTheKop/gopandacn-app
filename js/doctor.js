// @ts-check
// Plan Doctor: ตรวจแผนทริปหาจุดเสี่ยง/คำเตือน — แยกจาก app.js
// (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
import {$,toMin} from "./utils.js";
import {activeTrip,backlog,dayDates,dayDow,getDay,colCost} from "./state.js";

function runDoctor(){
  var f=[],totalStops=0,total=0;
  for(var n=1;n<=activeTrip.dayCount;n++){
    var d=getDay(n),items=d.s,cost=colCost(n);
    totalStops+=items.length;total+=cost;
    items.forEach(function(s){
      if(/พิพิธภัณฑ์/.test(s.title)&&dayDow[n]==="จันทร์")
        f.push({sev:"crit",msg:"วัน "+n+" ("+dayDates[n]+") เป็นวันจันทร์ — พิพิธภัณฑ์ปิดนะคะป๋า!",fix:"ลากการ์ดไปวันอื่น พิพิธภัณฑ์หูหนานปิดทุกวันจันทร์"});
    });
    if(items.length>5)f.push({sev:"warn",msg:"วัน "+n+" อัดแน่น "+items.length+" จุดหมาย",fix:"แนะนำไม่เกิน 5 จุด/วัน เผื่อเวลาหลง + ต่อคิว + ถ่ายรูป"});
    if(n<activeTrip.dayCount&&items.length>=3&&!items.some(function(s){return s.cat[0]==="food"}))
      f.push({sev:"warn",msg:"วัน "+n+" ยังไม่มีมื้ออาหารในแผนเลย",fix:"เพิ่มการ์ดร้านอาหาร หรือดูใน FAQ ว่าแถวนั้นมีอะไรเด็ด"});
    if(cost>900)f.push({sev:"warn",msg:"วัน "+n+" งบสูง ¥"+cost.toLocaleString(),fix:"เกลี่ยกิจกรรมราคาแรงไปวันอื่น ช่วยให้กระเป๋าเงินหายใจทัน"});
    var ts=items.map(function(s){return toMin(s.time)}).filter(function(x){return x!==null}).sort(function(a,b){return a-b});
    for(var i=1;i<ts.length;i++)if(ts[i]-ts[i-1]<45){
      f.push({sev:"warn",msg:"วัน "+n+" มีจุดหมายเวลาชิดกันไม่ถึง 45 นาที",fix:"เมืองจีนใหญ่กว่าที่คิด เผื่อเวลาเดินทางระหว่างจุดอย่างน้อย 45 นาที"});break;
    }
    if(n===activeTrip.dayCount&&items.length>4)f.push({sev:"warn",msg:"วัน "+n+" เป็นวันเดินทางกลับ แต่มีถึง "+items.length+" กิจกรรม",fix:"เผื่อเวลาไปสนามบิน/สถานี อย่างน้อย 2.5–3 ชม.ก่อนเวลาออกเดินทาง"});
    if(items.length===0)f.push({sev:"warn",msg:"วัน "+n+" ("+dayDates[n]+") ยังว่างเปล่า",fix:"ลากไอเดียจากคอลัมน์ซ้ายมาลง หรือกดนำเข้าจากไฟล์ Excel"});
  }
  if(total>activeTrip.budget)f.push({sev:"crit",msg:"งบรวม ¥"+total.toLocaleString()+" เกินงบทริป ¥"+activeTrip.budget.toLocaleString()+" แล้ว",fix:"ตัดหรือเลื่อนกิจกรรมจนชิปงบด้านบนหายแดง"});
  if(backlog.length)f.push({sev:"ok",msg:"มีไอเดียค้างอยู่ "+backlog.length+" ใบในคอลัมน์ซ้าย",fix:"ลองหาช่องว่างให้พวกมันดูนะคะ เสียดายของดี"});
  var crit=f.filter(function(x){return x.sev==="crit"}).length;
  var warn=f.filter(function(x){return x.sev==="warn"}).length;
  if(!crit&&!warn)f.unshift({sev:"ok",msg:"แผนดูดีมากค่ะป๋า พร้อมออกเดินทาง! 🐼",fix:""});
  $("#docSummary").textContent="ตรวจ "+activeTrip.dayCount+" วัน "+totalStops+" จุดหมาย — พบ "+crit+" จุดวิกฤต · "+warn+" คำเตือน";
  $("#docList").innerHTML=f.map(function(x){
    var lbl=x.sev==="crit"?"วิกฤต":x.sev==="warn"?"เตือน":"ทิป";
    return '<div class="doc-item"><span class="sev '+x.sev+'">'+lbl+'</span><p>'+x.msg+(x.fix?'<small>💡 '+x.fix+'</small>':'')+'</p></div>';
  }).join("");
  $("#docModal").classList.add("show");
}
$("#openDoctor").addEventListener("click",runDoctor);
$("#docClose").addEventListener("click",function(){$("#docModal").classList.remove("show")});
$("#docModal").addEventListener("click",function(e){
  if(!e.target.closest(".picker-panel"))$("#docModal").classList.remove("show");
});
