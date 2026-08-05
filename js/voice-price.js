// @ts-check
// หูฟังราคา (feature 2.1): ASR ฟังราคาจีน → กรอกช่อง CNY อัตโนมัติ — แยกจาก app.js
// (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
// ก่อนสร้างฟีเจอร์นี้ ทดสอบเทียบ Whisper-tiny (ผ่าน WebGPU) กับ Vosk ด้วยเสียงจีนจริงก่อน (ไม่ใช่แค่ synthetic
// noise) — Whisper ผิดตัวเลขทั้ง 2 เคสทดสอบ (บางครั้งผิดแบบเงียบๆ อันตรายกว่า) ส่วน Vosk ถูกทั้งคู่ ถึงเลือกมาใช้จริง
// (ดู docs/business/DEPLOYMENT-QA.md) — โมเดล vosk-model-small-cn-0.22 (~44MB) vendor ไว้เองใน models/ ไม่พึ่ง CDN
// ภายนอก (เหตุผลเดียวกับที่ vendor maplibre/pmtiles ไว้เอง — พึ่ง CDN ต่างชาติเสี่ยงเข้าไม่ได้ตอนอยู่ในจีนจริง)
// `Vosk` เป็น global จาก <script src="vendor/vosk/vosk.js"> ธรรมดา (ไม่ใช่ module) โหลดก่อน app.js ใน index.html
import {$,esc,fmt} from "./utils.js";

var MODEL_URL="models/vosk-model-small-cn.tar.gz";
var voskModel=null,voskRecognizer=null,micStream=null,audioCtx=null,micNode=null;
// #fxCny เป็น input เดียวกับที่ js/app.js ใช้ในกล่องแลกเงิน — query ตรงเองแทนการ import ตัวแปร
// เพราะเป็นแค่ DOM element reference ไม่ใช่ state ที่ต้อง sync ข้ามโมดูล
var cny=$("#fxCny");

function plSetStatus(t){$("#plModelStatus").textContent=t}

// แปลงลำดับอักษรจีน (十/百/千 + เลข 0-9 + 两) เป็นตัวเลข — พอสำหรับช่วงราคาริมถนนทั่วไป (0-9999)
function parseChineseNumber(s){
  var digits={"零":0,"一":1,"二":2,"两":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9};
  var units={"十":10,"百":100,"千":1000};
  if(!s)return null;
  if(/^\d+$/.test(s))return parseInt(s,10); // เผื่อ ASR ถอดเป็นเลขอารบิกตรงๆ
  var section=0,num=0,hasDigit=false,hasUnit=false;
  for(var i=0;i<s.length;i++){
    var c=s[i];
    if(c in digits){num=digits[c];hasDigit=true}
    else if(c in units){section+=(num||1)*units[c];num=0;hasUnit=true}
  }
  section+=num;
  return hasDigit||hasUnit?section:null;
}
// แยกหน่วยเงิน 块/元 (หยวน) · 毛/角 (มุ้ย=0.1 หยวน) · 分 (สตางค์=0.01 หยวน) + รองรับพูดย่อแบบ "十五块五" (=15.5)
function parseChinesePrice(text){
  if(!text)return null;
  text=text.replace(/\s+/g,""); // Vosk คั่นคำด้วย space เช่น "十五块 五" — ตัดออกก่อนแยกหน่วย
  var yuanMatch=text.match(/^(.*?)[块元]/);
  var yuanStr=yuanMatch?yuanMatch[1]:null;
  var afterYuan=yuanMatch?text.slice(yuanMatch[0].length):text;
  var jiaoMatch=afterYuan.match(/^(.*?)[毛角]/);
  var jiaoStr=jiaoMatch?jiaoMatch[1]:null;
  var afterJiao=jiaoMatch?afterYuan.slice(jiaoMatch[0].length):afterYuan;
  var fenMatch=afterJiao.match(/^(.*?)分/);
  var fenStr=fenMatch?fenMatch[1]:null;
  if(yuanStr===null&&jiaoStr===null&&fenStr===null)return parseChineseNumber(text);
  var yuan=yuanStr?parseChineseNumber(yuanStr):0;
  var jiao=jiaoStr?parseChineseNumber(jiaoStr):0;
  var fen=fenStr?parseChineseNumber(fenStr):0;
  if(yuanStr!==null&&jiaoStr===null&&fenStr===null&&afterYuan){
    var trailing=parseChineseNumber(afterYuan);
    if(trailing!=null&&trailing>=1&&trailing<=9)jiao=trailing;
  }
  var total=(yuan||0)+(jiao||0)*0.1+(fen||0)*0.01;
  return total>0?Math.round(total*100)/100:null;
}

$("#plDownloadBtn").addEventListener("click",function(){
  $("#plDownloadBtn").disabled=true;
  $("#plDlBar").style.display="block";
  loadVoskModel();
});
function loadVoskModel(){
  var modelUrl=new URL(MODEL_URL,location.href).href;
  fetch(modelUrl).then(function(resp){
    // fetch นี้ผ่าน sw.js's serveCacheThenNetwork อยู่แล้ว (เก็บ cache ให้อัตโนมัติ) — อ่าน stream
    // เองแค่เพื่อโชว์ % ความคืบหน้า ไม่ต้องเขียน cache เองซ้ำ
    if(!resp.ok)throw new Error("HTTP "+resp.status);
    var total=+resp.headers.get("Content-Length")||46000000;
    var loaded=0,reader=resp.body.getReader();
    function pump(){
      return reader.read().then(function(res){
        if(res.done)return;
        loaded+=res.value.length;
        var pct=Math.min(100,Math.round(loaded/total*100));
        $("#plDlBar i").style.width=pct+"%";
        plSetStatus("กำลังโหลด "+pct+"%");
        return pump();
      });
    }
    return pump();
  }).then(function(){
    plSetStatus("กำลังเตรียมโมเดล...");
    return Vosk.createModel(modelUrl); // ชนแคชที่เพิ่งเก็บไว้ ไม่โหลดซ้ำ
  }).then(function(model){
    voskModel=model;
    plSetStatus("✅ พร้อมใช้งาน (ออฟไลน์)");
    $("#plDownloadBtn").style.display="none";
    $("#plDlBar").style.display="none";
    $("#plListenBtn").style.display="";
  }).catch(function(e){
    plSetStatus("✗ โหลดล้มเหลว: "+e.message);
    $("#plDownloadBtn").disabled=false;
  });
}

$("#plListenBtn").addEventListener("click",function(){
  if(voskRecognizer){stopListening();return}
  startListening();
});
function startListening(){
  navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1}}).then(function(stream){
    micStream=stream;
    audioCtx=new (window.AudioContext||/** @type {any} */ (window).webkitAudioContext)();
    voskRecognizer=new voskModel.KaldiRecognizer(audioCtx.sampleRate);
    voskRecognizer.on("result",function(msg){handlePriceText(msg.result.text)});
    voskRecognizer.on("partialresult",function(msg){$("#plLive").textContent=msg.result.partial||""});
    micNode=audioCtx.createScriptProcessor(4096,1,1);
    micNode.onaudioprocess=function(e){
      try{voskRecognizer.acceptWaveform(e.inputBuffer)}catch(err){/* ข้ามเฟรมที่แปลงเสียงไม่ได้ ไม่ให้ทั้งฟีเจอร์ล่ม */}
    };
    audioCtx.createMediaStreamSource(stream).connect(micNode);
    micNode.connect(audioCtx.destination);
    $("#plListenBtn").textContent="⏹️ หยุดฟัง";
    $("#plLive").textContent="กำลังฟัง...";
  }).catch(function(e){
    $("#plResult").innerHTML='<span style="color:#f87171">✗ ขอสิทธิ์ไมค์ไม่สำเร็จ: '+esc(e.message)+'</span>';
  });
}
function stopListening(){
  if(micNode)micNode.disconnect();
  if(micStream)micStream.getTracks().forEach(function(t){t.stop()});
  if(audioCtx)audioCtx.close();
  if(voskRecognizer)voskRecognizer.remove();
  voskRecognizer=null;micStream=null;audioCtx=null;micNode=null;
  $("#plListenBtn").textContent="🎙️ เริ่มฟัง";
  $("#plLive").textContent="";
}
function handlePriceText(text){
  $("#plLive").textContent="";
  var amt=parseChinesePrice(text);
  if(amt==null){
    $("#plResult").innerHTML='<span style="color:var(--muted)">ได้ยิน: "'+esc(text)+'" — ไม่พบตัวเลขราคาชัดเจน ลองพูดใหม่</span>';
    return;
  }
  cny.value=fmt(amt);
  cny.dispatchEvent(new Event("input"));
  $("#plResult").innerHTML='<b style="color:#6ee7b7">✓ ได้ยิน "'+esc(text)+'" → ¥'+fmt(amt)+'</b>';
}
