// @ts-check
// QR handoff + .gopanda file export/import-preview + Trip Recap — แยกจาก app.js
// (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
//
// หมายเหตุสำคัญ: ตัวไฟล์นี้มีแค่ "ครึ่งอ่านไฟล์/แสดงตัวอย่าง" ของการนำเข้า .gopanda เท่านั้น
// (gopandaImportData, resetGopandaImport, #gopandaFileInput change, #gopandaImportCancel) —
// ปุ่ม #gopandaImportConfirm ที่ reassign activeTrip จริงและเรียก switchToLiveData() ยังอยู่ app.js
// เป็น trip-lifecycle code (ตามแผน Opus) โดย import gopandaImportData/resetGopandaImport กลับไปใช้
import {$,esc,fmt,html} from "./utils.js";
import {days,backlog,activeTrip,dayDates,journalState,checklist,getDay,colCost} from "./state.js";

function hashStr(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return h}
var qrMascotImg=new Image(),qrMascotReady=false;
qrMascotImg.onload=function(){qrMascotReady=true;drawQr()};
qrMascotImg.src="assets/mascot-64.png";
function drawQr(){
  var cv=$("#qrCanvas"),ctx=cv.getContext("2d"),N=29,pad=2,cell=cv.width/(N+pad*2);
  var seed=hashStr(JSON.stringify(days)+JSON.stringify(backlog));
  function rnd(){seed=(seed*1103515245+12345)>>>0;return seed/4294967296}
  function box(x,y,w,h){ctx.fillRect((x+pad)*cell,(y+pad)*cell,w*cell,h*cell)}
  ctx.fillStyle="#fff";ctx.fillRect(0,0,cv.width,cv.height);
  ctx.fillStyle="#0f172a";
  for(var y=0;y<N;y++)for(var x=0;x<N;x++){
    var inF=(x<9&&y<9)||(x>=N-9&&y<9)||(x<9&&y>=N-9);
    if(!inF&&rnd()<.45)box(x,y,1,1);
  }
  function finder(x,y){box(x,y,7,1);box(x,y+6,7,1);box(x,y,1,7);box(x+6,y,1,7);box(x+2,y+2,3,3)}
  finder(0,0);finder(N-7,0);finder(0,N-7);
  for(var i=8;i<N-8;i+=2){box(i,6,1,1);box(6,i,1,1)}
  ctx.fillStyle="#fff";ctx.fillRect((N/2-2.5+pad)*cell,(N/2-2.5+pad)*cell,5*cell,5*cell);
  if(qrMascotReady){
    var s=5*cell*0.88,cx=(N/2+pad)*cell,cy=(N/2+pad)*cell;
    ctx.save();
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(cx-s/2,cy-s/2,s,s,6);else ctx.rect(cx-s/2,cy-s/2,s,s);
    ctx.clip();
    ctx.drawImage(qrMascotImg,cx-s/2,cy-s/2,s,s);
    ctx.restore();
  }else{
    ctx.font=(cell*3.6)+"px serif";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText("🐼",(N/2+pad)*cell,(N/2+pad+0.1)*cell);
  }
}
function tripStats(){
  var c=0,total=0;
  for(var n=1;n<=activeTrip.dayCount;n++){c+=getDay(n).s.length;total+=colCost(n)}
  return {c:c,total:total};
}
$("#openQr").addEventListener("click",function(){
  var st=tripStats();
  $("#qrMeta").textContent="ทริป"+activeTrip.name+" "+dayDates[1]+"–"+dayDates[activeTrip.dayCount]+" · "+st.c+" จุดหมาย · งบ ≈ ¥"+st.total.toLocaleString()+" · QR อัปเดตตามแผนล่าสุดเสมอ";
  drawQr();
  resetGopandaImport();
  $("#qrModal").classList.add("show");
});
$("#qrModal").addEventListener("click",function(e){
  if(e.target.closest("#dlTrip")){
    var data={app:"GoPandaCN",version:1,trip:{name:activeTrip.name,startDate:activeTrip.startDate,dayCount:activeTrip.dayCount,budget:activeTrip.budget,cities:activeTrip.cities||[]},days:days,backlog:backlog,journal:journalState,checklist:checklist};
    var a=document.createElement("a");
    a.href="data:application/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(data));
    a.download=activeTrip.id+".gopanda";
    document.body.appendChild(a);a.click();a.remove();
    return;
  }
  if(!e.target.closest(".picker-panel"))$("#qrModal").classList.remove("show");
});

/* ---- Import .gopanda (reverse of dlTrip export above) — ครึ่งอ่านไฟล์/แสดงตัวอย่างเท่านั้น
   ครึ่ง "ยืนยันนำเข้าจริง" (#gopandaImportConfirm) ยังอยู่ app.js เพราะแตะ activeTrip/switchToLiveData ---- */
export var gopandaImportData=null;
export function resetGopandaImport(){
  $("#gopandaImportPreview").style.display="none";
  $("#gopandaImportMsg").innerHTML="";
  $("#gopandaFileInput").value="";
  gopandaImportData=null;
}
$("#importGopanda").addEventListener("click",function(){$("#gopandaFileInput").click()});
$("#gopandaFileInput").addEventListener("change",function(){
  var f=this.files[0];
  if(!f)return;
  var rd=new FileReader();
  rd.onload=function(){
    var data;
    try{data=JSON.parse(/** @type {string} */ (rd.result))}catch(e){data=null}
    if(!data||data.app!=="GoPandaCN"||!data.days){
      $("#gopandaImportMsg").innerHTML="✗ ไฟล์นี้ไม่ใช่ไฟล์ทริป .gopanda ของ GoPandaCN ที่ถูกต้อง";
      $("#gopandaImportPreview").style.display="block";
      gopandaImportData=null;
      return;
    }
    var dayCount=Object.keys(data.days).length;
    var stopCount=Object.values(data.days).reduce(function(a,d){return a+(d.s?d.s.length:0)},0);
    var backlogCount=(data.backlog||[]).length;
    var tripName=(data.trip&&data.trip.name)||"ทริปไม่มีชื่อ";
    $("#gopandaImportMsg").innerHTML=html`พบไฟล์ทริป <b>${tripName}</b> — ${dayCount} วัน ${stopCount} จุดหมาย`+
      (backlogCount?html` + ไอเดียค้าง ${backlogCount} ใบ`:"")+
      "<br><small style=\"color:#f59e0b\">⚠️ การนำเข้าจะแทนที่แผนทั้งหมดที่มีอยู่ตอนนี้</small>";
    $("#gopandaImportPreview").style.display="block";
    gopandaImportData=data;
  };
  rd.readAsText(f,"utf-8");
});
$("#gopandaImportCancel").addEventListener("click",resetGopandaImport);

/* ---- Trip Recap ---- */
// ก้าวเดิน/จำนวนรูปถ่ายเคยเป็นเลขปลอม hardcode ไว้ (87,420 ก้าว, 214 รูป) — PWA อ่านค่าจริง
// จากเซนเซอร์เดินนับก้าว/คลังรูปเครื่องไม่ได้ (ต้องมี native app จริงถึงจะทำได้) เลยตัดออก
// ใช้สถิติที่คำนวณได้จริงจากข้อมูลทริปแทน (จุดหมาย/งบ/วัน ล้วนมาจาก tripStats()+journalState จริง)
function recapSummaryText(st){
  return "🐼 "+activeTrip.name+" · "+dayDates[1]+"–"+dayDates[activeTrip.dayCount]+
    " ("+activeTrip.dayCount+" วัน "+(activeTrip.dayCount-1)+" คืน)\n"+
    (activeTrip.sub?activeTrip.sub+"\n":"")+
    st.c+" จุดหมาย · ใช้จ่ายจริง ¥"+fmt(journalState.spent)+" · งบที่วางแผน ¥"+fmt(st.total)+
    "\nวางแผนด้วย GoPandaCN 🐼";
}
$("#openRecap").addEventListener("click",function(){
  var st=tripStats();
  $("#recapCard").innerHTML='<div class="rc-top">🐼 TRIP RECAP</div>'+
    '<div class="rc-route">'+esc(activeTrip.sub||activeTrip.name)+'</div>'+
    '<div class="rc-dates num">'+dayDates[1]+' – '+dayDates[activeTrip.dayCount]+' · '+activeTrip.dayCount+' วัน '+(activeTrip.dayCount-1)+' คืน · '+esc(activeTrip.name)+'</div>'+
    '<div class="rc-stats num"><div><b>'+st.c+'</b><span>จุดหมาย</span></div><div><b>¥'+fmt(journalState.spent)+'</b><span>ใช้จ่ายจริง</span></div><div><b>¥'+fmt(st.total)+'</b><span>งบที่วางแผน</span></div><div><b>'+activeTrip.dayCount+'</b><span>วัน</span></div></div>'+
    '<div class="rc-foot">สร้างด้วย GoPandaCN · เพื่อนแตะลิงก์เพื่อโหลดแผนทริปนี้ไปใช้ได้เลย 🐼</div>';
  $("#recapMsg").textContent="";
  $("#recapModal").classList.add("show");
});
$("#recapShare").addEventListener("click",function(){
  var st=tripStats(),text=recapSummaryText(st);
  if(navigator.share){
    navigator.share({title:"GoPandaCN Trip Recap",text:text}).then(function(){
      $("#recapMsg").textContent="✓ แชร์แล้ว";
    }).catch(function(e){
      if(e.name!=="AbortError")$("#recapMsg").textContent="✗ แชร์ไม่สำเร็จ: "+e.message;
    });
  }else if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){
      $("#recapMsg").textContent="✓ คัดลอกสรุปทริปแล้ว (เครื่องนี้ไม่รองรับแชร์โดยตรง วางไปแปะที่แชทเพื่อนได้เลย)";
    }).catch(function(e){
      $("#recapMsg").textContent="✗ คัดลอกไม่สำเร็จ: "+e.message;
    });
  }else{
    $("#recapMsg").textContent="✗ เบราว์เซอร์นี้ไม่รองรับการแชร์/คัดลอกอัตโนมัติ";
  }
});
$("#recapSave").addEventListener("click",function(){
  var st=tripStats();
  var cv=document.createElement("canvas");cv.width=900;cv.height=560;
  var ctx=cv.getContext("2d");
  ctx.fillStyle="#0f172a";ctx.fillRect(0,0,cv.width,cv.height);
  ctx.fillStyle="#1a2a4a";ctx.fillRect(0,0,cv.width,90);
  ctx.fillStyle="#f5c26b";ctx.font="700 22px sans-serif";ctx.fillText("🐼 GOPANDACN · TRIP RECAP",40,55);
  ctx.fillStyle="#fff";ctx.font="700 40px sans-serif";
  wrapText(ctx,activeTrip.sub||activeTrip.name,40,160,820,46);
  ctx.fillStyle="#94a3b8";ctx.font="20px sans-serif";
  ctx.fillText(dayDates[1]+" – "+dayDates[activeTrip.dayCount]+" · "+activeTrip.dayCount+" วัน "+(activeTrip.dayCount-1)+" คืน · "+activeTrip.name,40,300);
  var stats=[[st.c,"จุดหมาย"],["¥"+fmt(journalState.spent),"ใช้จ่ายจริง"],["¥"+fmt(st.total),"งบที่วางแผน"],[activeTrip.dayCount,"วัน"]];
  stats.forEach(function(s,i){
    var x=40+i*210;
    ctx.fillStyle="#f5c26b";ctx.font="700 30px sans-serif";ctx.fillText(String(s[0]),x,400);
    ctx.fillStyle="#94a3b8";ctx.font="16px sans-serif";ctx.fillText(String(s[1]),x,428);
  });
  ctx.strokeStyle="#334155";ctx.beginPath();ctx.moveTo(40,470);ctx.lineTo(860,470);ctx.stroke();
  ctx.fillStyle="#64748b";ctx.font="14px sans-serif";
  ctx.fillText("วางแผนด้วย GoPandaCN 🐼 — แอปนำเที่ยวจีนออฟไลน์สำหรับคนไทย",40,500);
  cv.toBlob(function(blob){
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url;a.download="gopanda-recap-"+activeTrip.id+".png";
    document.body.appendChild(a);a.click();a.remove();
    URL.revokeObjectURL(url);
    $("#recapMsg").textContent="✓ บันทึกรูปแล้ว";
  },"image/png");
});
function wrapText(ctx,text,x,y,maxWidth,lineHeight){
  var words=text.split(" "),line="",lines=[];
  words.forEach(function(w){
    var test=line?line+" "+w:w;
    if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=w}else{line=test}
  });
  lines.push(line);
  lines.slice(0,2).forEach(function(l,i){ctx.fillText(l,x,y+i*lineHeight)});
}
