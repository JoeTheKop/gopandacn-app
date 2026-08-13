// @ts-check
// นำเข้า/ส่งออกแผนทริป (CSV/Excel) — แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
import {$,uid,esc,parseCsv,csvField} from "./utils.js";
import {activeTrip,curDay,getDay,sortDay,applyCalendar} from "./state.js";
import {CAT_MAP} from "./seed-data.js";
import {renderBoard,renderDay} from "./board.js";
import {persistCurrentTrip} from "./trip-store.js";

/* ---- โหลดสคริปต์หนักแบบ lazy เฉพาะตอนใช้จริง (SheetJS/ExcelJS) — vendor เข้ามาเองแทน CDN ต่างประเทศ
   เพราะ cdn.sheetjs.com/cdn.jsdelivr.net เข้าไม่ได้/ช้ามากในจีน ถ้าโหลดตอนเปิดแอปจะบล็อกทั้งแอปรอ timeout
   ก่อนหน้านี้ ตอนนี้โหลดเฉพาะตอนกดนำเข้า/ส่งออก Excel เท่านั้น + cache ไว้ใน SW ให้ใช้ออฟไลน์ได้ครั้งถัดไป ---- */
var scriptLoadPromises={};
function loadScriptOnce(src){
  if(scriptLoadPromises[src])return scriptLoadPromises[src];
  scriptLoadPromises[src]=new Promise(function(resolve,reject){
    var s=document.createElement("script");
    s.src=src;
    s.onload=function(){resolve()};
    s.onerror=function(){delete scriptLoadPromises[src];reject(new Error("โหลด "+src+" ไม่สำเร็จ"))};
    document.body.appendChild(s);
  });
  return scriptLoadPromises[src];
}

/* ---- import Excel/CSV ---- */
var importModal=$("#importModal"),parsedRows=null;
var CSV_HEAD="วัน,เวลา,สถานที่,รายละเอียด,หมวด,งบ(¥)";
var CSV_TMPL=CSV_HEAD+"\n4,07:30,เขาเทียนเหมินซาน,กระเช้ายาวที่สุดในโลก,ที่เที่ยว,278\n4,12:30,ร้านหมี่ถู่เจีย,เส้นข้าวซุปกระดูกหมู,อาหาร,15";
var DEMO_CSV=CSV_HEAD+"\n"+
  "6,20:00,🦊 โชว์จิ้งจอกเหมยลี่,โชว์กลางแจ้งฉากภูเขาจริง จองรอบ 20:00,ที่เที่ยว,238\n"+
  "7,16:00,🌉 สะพานแก้วแกรนด์แคนยอน,เผื่อเวลาเดินทางจากเทียนเหมินซาน ~1 ชม.,ที่เที่ยว,141\n"+
  "8,21:00,🍧 บิงเฟิ่นถนนไท่ผิง,ของหวานปิดคืนแรกที่ฉางซา,อาหาร,15\n"+
  "9,20:30,🌃 ล่องเรือแม่น้ำเซียงยามค่ำ,รอบ 20:30 เห็นไฟตึก IFS เต็มตา,ที่เที่ยว,128";
$("#dlTemplate").href="data:text/csv;charset=utf-8,%EF%BB%BF"+encodeURIComponent(CSV_TMPL);
/* ---- อ่านคอลัมน์ตามชื่อหัวตาราง ไม่ใช่ตำแหน่งตรงๆ (2026-08-13) — เพราะไฟล์ที่ผู้ใช้แก้เองมักแทรก/สลับ
   คอลัมน์เพิ่ม (เช่น "วันที่" จริง, แยกงบเป็น "บาท (THB)"/"หยวน (CNY)" คนละคอลัมน์) ถ้ายังอ่านตำแหน่ง A-F
   ตรงๆ แบบเดิม ข้อมูลจะเลื่อนตำแหน่งผิดหมดแบบไม่มี error เตือน — รองรับทั้งไฟล์เก่า (6 คอลัมน์ตำแหน่งเดิม)
   และไฟล์ใหม่ที่มีคอลัมน์เพิ่มได้พร้อมกัน โดยไม่ต้องรื้อฟอร์แมตเทมเพลต/export เดิม ---- */
function detectCols(headerRow){
  var idx={day:-1,time:-1,place:-1,desc:-1,cat:-1,cny:-1,thb:-1};
  (headerRow||[]).forEach(function(h,i){
    var t=String(h==null?"":h).trim();
    if(t==="วัน")idx.day=i;
    else if(t==="เวลา")idx.time=i;
    else if(t==="สถานที่")idx.place=i;
    else if(t==="รายละเอียด")idx.desc=i;
    else if(t==="หมวด")idx.cat=i;
    else if(t.indexOf("หยวน")>-1||t.indexOf("CNY")>-1||t.indexOf("งบ")>-1)idx.cny=i;
    else if(t.indexOf("บาท")>-1||t.indexOf("THB")>-1)idx.thb=i;
  });
  return idx;
}
var LEGACY_IDX={day:0,time:1,place:2,desc:3,cat:4,cny:5,thb:-1};
function toNum(v){var n=+String(v==null?"":v).replace(/[^\d.\-]/g,"");return isNaN(n)?0:n}
// สะสมค่าใช้จ่ายที่จ่ายเป็นเงินบาทไว้ก่อนเดินทาง (ตั๋วเครื่องบิน/จองล่วงหน้าจากไทย) แยกจาก Stop.cost
// ที่เป็น ¥ ล้วนเสมอ — ไม่แปลงเป็น ¥ ปนเข้าไปในการ์ด เพราะยังไงก็ต้องแปลงทุกอย่างกลับเป็นบาทตอนสรุปทริป
// อยู่ดี (ตามที่ป๋าโจตัดสินใจ 2026-08-13) โชว์แยกใน Trip Recap (js/qr-recap.js) แทน
var parsedPreTripThb=0;
function previewRows(rows){
  // สแกนสูงสุด 3 แถวแรกหา header จริง — รองรับไฟล์ที่มีแถวหัวเรื่อง (title row) ก่อนแถว header
  var idx={day:-1,time:-1,place:-1,desc:-1,cat:-1,cny:-1,thb:-1},headerAt=-1;
  for(var _r=0;_r<Math.min(3,rows.length);_r++){
    var _c=detectCols(rows[_r]);
    if(_c.day>-1){idx=_c;headerAt=_r;break;}
  }
  var hasHeader=headerAt>-1;
  if(hasHeader)rows=rows.slice(headerAt+1);else idx=LEGACY_IDX;
  parsedPreTripThb=0;
  var norm=[],skippedNoDay=[];
  rows.forEach(function(r){
    if(!r||r.length<3)return;
    // เซลล์ว่าง (แถวคั่นหัวข้อวัน/แถวรวมยอด/แถวว่างท้ายไฟล์) กลายเป็น "" จาก SheetJS ซึ่ง +"" คือ 0
    // ไม่ใช่ NaN ใน JS — เช็คสตริงว่างก่อนแปลงเลข กันไม่ให้แถวขยะเหล่านี้ถูกเข้าใจผิดว่าเป็น "วัน 0" จริง
    // แถวที่มีข้อความสถานที่จริงแต่ลืมใส่เลขวัน (ไม่ใช่แถวว่างเปล่าล้วน) ไม่เดาว่าเป็นวันไหน แต่เก็บชื่อไว้
    // เตือนในสรุปแทน ให้ผู้ใช้กลับไปเติมเลขวันในไฟล์เอง
    var rawDay=String(idx.day>-1?r[idx.day]:"").trim();
    if(rawDay===""){
      var skippedPlace=String(idx.place>-1?(r[idx.place]||""):"").trim();
      if(skippedPlace)skippedNoDay.push(skippedPlace);
      return;
    }
    var day=+rawDay;
    if(isNaN(day))return;
    var isPreTrip=day===0; // วันก่อนออกเดินทางจริง (เช่นขับรถไปสนามบิน/ขึ้นเครื่องคืนก่อน) — รวมเข้าวัน 1
    if(isPreTrip)day=1;
    if(day<1)return;
    var cny=idx.cny>-1?toNum(r[idx.cny]):0;
    var thb=idx.thb>-1?toNum(r[idx.thb]):0;
    var cost=0;
    if(cny>0)cost=cny;
    else if(thb>0)parsedPreTripThb+=thb; // จ่ายเป็นบาทตอนอยู่ไทย — ไม่ใส่ ¥ ที่การ์ด กันปนสกุลเงิน
    norm.push({
      day:day,time:(idx.time>-1?r[idx.time]:"")||"--",
      title:(isPreTrip?"[ก่อนเดินทาง] ":"")+(idx.place>-1?r[idx.place]:"")||"",
      desc:(idx.desc>-1?r[idx.desc]:"")||"",
      cat:(idx.cat>-1?r[idx.cat]:"")||"ที่เที่ยว",
      cost:cost
    });
  });
  parsedRows=norm;
  $("#impPreview").style.display="flex";
  if(!norm.length){
    $("#impTable").innerHTML="";
    $("#impMsg").textContent="อ่านไฟล์ไม่สำเร็จ หรือไม่พบแถวที่คอลัมน์ วัน = 1–"+activeTrip.dayCount;
    return;
  }
  $("#impTable").innerHTML="<tr><th>วัน</th><th>เวลา</th><th>สถานที่</th><th>รายละเอียด</th><th>หมวด</th><th>งบ(¥)</th></tr>"+
    norm.slice(0,8).map(function(r){
      return "<tr><td class='num'>"+esc(r.day)+"</td><td class='num'>"+esc(r.time)+"</td><td>"+esc(r.title)+"</td><td>"+esc(r.desc)+"</td><td>"+esc(r.cat)+"</td><td class='num'>"+(r.cost?esc(r.cost):"–")+"</td></tr>";
    }).join("");
  var maxImportDay=norm.reduce(function(m,r){return Math.max(m,r.day)},0);
  var extendNote=maxImportDay>activeTrip.dayCount?" · จะขยายทริปเป็น "+maxImportDay+" วัน":"";
  var skipNote=skippedNoDay.length?" · ⚠️ ข้าม "+skippedNoDay.length+" แถวที่ไม่มีเลขวัน ("+
    skippedNoDay.slice(0,3).join(", ")+(skippedNoDay.length>3?" ฯลฯ":"")+") — กลับไปเติมเลขวันในไฟล์แล้วนำเข้าใหม่":"";
  $("#impMsg").textContent="พบ "+norm.length+" รายการ"+(norm.length>8?" (แสดงตัวอย่าง 8 แถวแรก)":"")+
    (parsedPreTripThb>0?" · ค่าใช้จ่ายก่อนเดินทาง (บาท) รวม ฿"+parsedPreTripThb.toLocaleString():"")+
    extendNote+skipNote+" — กด “นำเข้าทั้งหมด” เพื่อยืนยัน";
}
function previewCsv(text){ previewRows(parseCsv(text)); }
function handleFile(f){
  if(/\.xlsx?$/i.test(f.name)){
    parsedRows=null;
    $("#impPreview").style.display="flex";
    $("#impTable").innerHTML="";
    $("#impMsg").textContent="กำลังโหลดตัวอ่าน Excel...";
    loadScriptOnce("vendor/sheetjs/xlsx.full.min.js").then(function(){
      $("#impMsg").textContent="กำลังอ่านไฟล์ Excel...";
      var rd=new FileReader();
      rd.onload=function(){
        try{
          var wb=XLSX.read(rd.result,{type:"array"});
          var ws=wb.Sheets[wb.SheetNames[0]];
          var rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:""})
            .map(function(r){return r.map(function(c){return String(c==null?"":c).trim()})});
          previewRows(rows);
        }catch(e){
          $("#impMsg").textContent="✗ อ่านไฟล์ Excel ไม่สำเร็จ: "+e.message;
        }
      };
      rd.readAsArrayBuffer(f);
    }).catch(function(){
      $("#impMsg").textContent="✗ โหลดตัวอ่าน Excel (SheetJS) ไม่สำเร็จ — เช็กการเชื่อมต่อเน็ตแล้วลองใหม่ หรือ Save As เป็น CSV UTF-8 แทน";
    });
    return;
  }
  var rd=new FileReader();
  rd.onload=function(){previewCsv(rd.result)};
  rd.readAsText(f,"utf-8");
}
function resetImport(){$("#impPreview").style.display="none";$("#impTable").innerHTML="";$("#impMsg").textContent="";parsedRows=null;$("#fileInput").value=""}
$("#openImport").addEventListener("click",function(){resetImport();importModal.classList.add("show")});
importModal.addEventListener("click",function(e){
  if(!e.target.closest(".picker-panel"))importModal.classList.remove("show");
});
$("#impCancel").addEventListener("click",function(){importModal.classList.remove("show")});
var dz=$("#dropZone"),fi=$("#fileInput");
dz.addEventListener("click",function(){fi.click()});
dz.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();fi.click()}});
dz.addEventListener("dragover",function(e){e.preventDefault();dz.classList.add("over")});
dz.addEventListener("dragleave",function(){dz.classList.remove("over")});
dz.addEventListener("drop",function(e){
  e.preventDefault();dz.classList.remove("over");
  if(e.dataTransfer.files.length)handleFile(e.dataTransfer.files[0]);
});
fi.addEventListener("change",function(){if(fi.files.length)handleFile(fi.files[0])});
$("#demoImport").addEventListener("click",function(){previewCsv(DEMO_CSV)});
$("#exportCsv").addEventListener("click",function(){
  var rows=[CSV_HEAD],cnt=0;
  for(var n=1;n<=activeTrip.dayCount;n++){
    getDay(n).s.forEach(function(s){
      rows.push([n,s.time==="--"?"":s.time,s.title,s.desc,s.cat[1],s.cost||""].map(csvField).join(","));
      cnt++;
    });
  }
  var a=document.createElement("a");
  a.href="data:text/csv;charset=utf-8,%EF%BB%BF"+encodeURIComponent(rows.join("\n"));
  a.download="gopanda-trip-"+activeTrip.id+".csv";
  document.body.appendChild(a);a.click();a.remove();
  var toast=$("#planToast");
  toast.textContent="✓ ส่งออกแผน "+cnt+" รายการเป็นไฟล์ CSV แล้ว (เปิดใน Excel ได้เลย)";
  toast.hidden=false;
  setTimeout(function(){toast.hidden=true},4000);
});
var CAT_FILL={"อาหาร":"FFF6E0B8","ที่เที่ยว":"FFCDE4F7","เดินทาง":"FFE2E2E2","ที่พัก":"FFE2E2E2"};
function loadLogoPngBuffer(maxSize){
  return fetch("assets/mascot-lingling.png").then(function(r){return r.blob()}).then(function(blob){
    return createImageBitmap(blob);
  }).then(function(bmp){
    var scale=Math.min(1,maxSize/Math.max(bmp.width,bmp.height));
    var w=Math.round(bmp.width*scale),h=Math.round(bmp.height*scale);
    var canvas=document.createElement("canvas");
    canvas.width=w;canvas.height=h;
    canvas.getContext("2d").drawImage(bmp,0,0,w,h);
    return new Promise(function(resolve){
      canvas.toBlob(function(b){b.arrayBuffer().then(function(buf){resolve({buf:buf,w:w,h:h})})},"image/png");
    });
  });
}
$("#exportXlsx").addEventListener("click",function(){
  var toast=$("#planToast");
  toast.textContent="กำลังโหลดตัวเขียน Excel...";
  toast.hidden=false;
  loadScriptOnce("vendor/exceljs/exceljs.min.js").then(function(){
  var wb=new ExcelJS.Workbook();
  wb.creator="GoPandaCN";
  var ws=wb.addWorksheet("แผนทริป",{views:[{state:"frozen",ySplit:2,showGridLines:false}]});
  wb.views=[{activeTab:0}];
  ws.columns=[
    {key:"day",width:8},{key:"time",width:10},{key:"place",width:45},
    {key:"desc",width:60},{key:"cat",width:15},{key:"budget",width:15}
  ];
  ws.mergeCells("A1:F1");
  var titleCell=ws.getCell("A1");
  titleCell.value="🐼 GoPandaCN — แผนทริป: "+(activeTrip.name||activeTrip.id);
  titleCell.font={bold:true,size:20,color:{argb:"FF1E3A5F"}};
  titleCell.alignment={vertical:"middle",horizontal:"center"};
  ws.getRow(1).height=40;
  function estRowHeight(place,desc){
    var lineH=16,base=35;
    var linesC=Math.ceil(String(place||"").length/38);
    var linesD=Math.ceil(String(desc||"").length/52);
    var lines=Math.max(1,linesC,linesD);
    return Math.max(base,lines*lineH+8);
  }
  var head=["วัน","เวลา","สถานที่","รายละเอียด","หมวด","งบ (¥)"];
  var headRow=ws.getRow(2);
  head.forEach(function(h,i){headRow.getCell(i+1).value=h});
  headRow.eachCell(function(cell){
    cell.font={bold:true,size:12,color:{argb:"FFFFFFFF"}};
    cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF1E3A5F"}};
    cell.alignment={vertical:"middle",horizontal:"center"};
    cell.border={top:{style:"thin"},left:{style:"thin"},bottom:{style:"thin"},right:{style:"thin"}};
  });
  headRow.height=35;
  var thinBorder={top:{style:"thin",color:{argb:"FFD0D0D0"}},left:{style:"thin",color:{argb:"FFD0D0D0"}},
    bottom:{style:"thin",color:{argb:"FFD0D0D0"}},right:{style:"thin",color:{argb:"FFD0D0D0"}}};
  var cnt=0,totalBudget=0;
  for(var n=1;n<=activeTrip.dayCount;n++){
    getDay(n).s.forEach(function(s){
      var catLabel=s.cat[1],budget=s.cost?Number(s.cost):null;
      var row=ws.addRow({
        day:n,time:s.time==="--"?"":s.time,place:s.title,desc:s.desc,cat:catLabel,
        budget:budget
      });
      row.height=estRowHeight(s.title,s.desc);
      row.eachCell({includeEmpty:true},function(cell,colNum){
        cell.border=thinBorder;
        cell.font={size:12};
        cell.alignment={vertical:"middle"};
        if(colNum===1||colNum===2||colNum===5||colNum===6)cell.alignment.horizontal="center";
        if(colNum===3||colNum===4)cell.alignment={vertical:"middle",wrapText:true,indent:1};
      });
      if(budget!=null){row.getCell(6).numFmt="#,##0";totalBudget+=budget}
      var fill=CAT_FILL[catLabel];
      if(fill)row.getCell(5).fill={type:"pattern",pattern:"solid",fgColor:{argb:fill}};
      cnt++;
    });
  }
  ws.autoFilter={from:{row:2,column:1},to:{row:2,column:6}};
  var sumRow=ws.addRow({day:"",time:"",place:"",desc:"",cat:"รวมงบทั้งทริป",budget:totalBudget});
  sumRow.height=35;
  sumRow.getCell(5).font={bold:true,size:12};
  sumRow.getCell(5).alignment={horizontal:"center",vertical:"middle"};
  sumRow.getCell(6).font={bold:true,size:12};
  sumRow.getCell(6).numFmt="#,##0";
  sumRow.getCell(6).alignment={horizontal:"center",vertical:"middle"};
  sumRow.eachCell(function(cell){cell.border={top:{style:"double"}}});
  ws.pageSetup={printArea:"A1:F"+ws.rowCount,fitToPage:true,fitToWidth:1,fitToHeight:0};
  loadLogoPngBuffer(72).then(function(logo){
    var imgId=wb.addImage({buffer:logo.buf,extension:"png"});
    var h=Math.min(36,logo.h),w=Math.round(h*(logo.w/logo.h));
    ws.addImage(imgId,{tl:{col:0.15,row:0.12},ext:{width:w,height:h}});
  }).catch(function(e){console.warn("โลโก้ไม่สามารถฝังในไฟล์ Excel ได้ (ส่งออกต่อโดยไม่มีโลโก้):",e)})
  .then(function(){return wb.xlsx.writeBuffer()}).then(function(buf){
    var blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    var safeName=String(activeTrip.name||activeTrip.id).replace(/[\\/:*?"<>|]+/g,"").trim()||activeTrip.id;
    a.href=url;a.download="gopanda-trip-"+safeName+".xlsx";
    document.body.appendChild(a);a.click();a.remove();
    URL.revokeObjectURL(url);
    toast.textContent="✓ ส่งออกแผน "+cnt+" รายการเป็นไฟล์ Excel จัดฟอร์แมตแล้ว";
    toast.hidden=false;setTimeout(function(){toast.hidden=true},4000);
  });
  }).catch(function(){
    toast.textContent="✗ โหลดตัวเขียน Excel (ExcelJS) ไม่สำเร็จ — เช็กการเชื่อมต่อเน็ตแล้วลองใหม่ หรือใช้ปุ่ม “ส่งออก CSV” แทน";
    toast.hidden=false;setTimeout(function(){toast.hidden=true},4500);
  });
});
$("#impConfirm").addEventListener("click",function(){
  if(!parsedRows||!parsedRows.length)return;
  var maxDay=parsedRows.reduce(function(m,r){return Math.max(m,r.day)},0);
  if(maxDay>activeTrip.dayCount){activeTrip.dayCount=maxDay;applyCalendar(activeTrip);}
  var touched={};
  parsedRows.forEach(function(r){
    var d=getDay(r.day);
    d.s.push({time:r.time,title:r.title,desc:r.desc,cat:CAT_MAP[r.cat]||["spot","ที่เที่ยว"],cost:r.cost||0,id:uid("s_")});
    touched[r.day]=1;
    if(d.t==="ยังไม่ได้วางแผน")d.t="แผนที่นำเข้าจากไฟล์";
  });
  Object.keys(touched).forEach(function(n){sortDay(+n)});
  if(parsedPreTripThb>0)activeTrip.preTripThb=(activeTrip.preTripThb||0)+parsedPreTripThb;
  renderBoard();renderDay(curDay);
  persistCurrentTrip();
  importModal.classList.remove("show");
  var toast=$("#planToast");
  toast.textContent="✓ นำเข้า "+parsedRows.length+" รายการ เข้าสู่วัน "+Object.keys(touched).join(", ")+" แล้ว"+
    (parsedPreTripThb>0?" (+ ค่าใช้จ่ายก่อนเดินทาง ฿"+parsedPreTripThb.toLocaleString()+")":"");
  toast.hidden=false;
  setTimeout(function(){toast.hidden=true},5000);
  resetImport();
});
