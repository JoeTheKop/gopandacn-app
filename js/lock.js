// @ts-check
// ล็อกแอปด้วย PIN — แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
// ทางเลือก ไม่บังคับตั้ง กันคนอื่นหยิบมือถือแล้วเห็นข้อมูลทริป/บัตรสุขภาพ เก็บแค่ hash(salt+PIN)
// ไม่เก็บ PIN ตรงๆ · ไม่มีเซิร์ฟเวอร์เลยจึงกู้รหัสลืมไม่ได้ — มีปุ่ม "ลืมรหัส" รีเซ็ตแอปแทน
// เป็น side-effect module ล้วน (ไม่มีอะไรให้ import ใช้ต่อ) — app.js สั่ง import "./lock.js" ครั้งเดียวพอ
import {$} from "./utils.js";
import {DOC_DB_NAME} from "./docs.js";

var LOCK_KEY="gopanda_lock_v1",UNLOCK_SESSION_KEY="gopanda_unlocked_v1";
function sha256Hex(str){
  return crypto.subtle.digest("SHA-256",new TextEncoder().encode(str)).then(function(buf){
    return Array.prototype.map.call(new Uint8Array(buf),function(b){return b.toString(16).padStart(2,"0")}).join("");
  });
}
function getLockConfig(){try{return JSON.parse(localStorage.getItem(LOCK_KEY))}catch(e){return null}}
function isLocked(){return !!getLockConfig()&&!sessionStorage.getItem(UNLOCK_SESSION_KEY)}
function showLockScreen(){
  $("#lockScreen").classList.add("show");
  $("#lockError").textContent="";
  $("#lockPinInput").value="";
  setTimeout(function(){$("#lockPinInput").focus()},50);
}
function hideLockScreen(){$("#lockScreen").classList.remove("show")}
if(isLocked())showLockScreen();
$("#lockUnlockBtn").addEventListener("click",function(){
  var cfg=getLockConfig(),pin=$("#lockPinInput").value.trim();
  if(!cfg){hideLockScreen();return}
  sha256Hex(cfg.salt+pin).then(function(hash){
    if(hash===cfg.hash){
      sessionStorage.setItem(UNLOCK_SESSION_KEY,"1");
      hideLockScreen();
    }else{
      $("#lockError").textContent="รหัส PIN ไม่ถูกต้อง ลองอีกครั้ง";
      $("#lockPinInput").value="";$("#lockPinInput").focus();
    }
  });
});
$("#lockPinInput").addEventListener("keydown",function(e){if(e.key==="Enter")$("#lockUnlockBtn").click()});
$("#lockForgotBtn").addEventListener("click",function(){
  if(!confirm("ลืมรหัส PIN?\n\nการกดยืนยันจะล้างข้อมูลทริป/เอกสารแนบทั้งหมดในเครื่องนี้ถาวร (กู้คืนไม่ได้ ยกเว้นเคยส่งออกไฟล์ .gopanda/Excel สำรองไว้)\n\nต้องการล้างข้อมูลแล้วเริ่มใหม่ใช่ไหม?"))return;
  localStorage.clear();
  sessionStorage.clear();
  indexedDB.deleteDatabase(DOC_DB_NAME);
  caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){return caches.delete(k)}));
  }).then(function(){location.reload()});
});
$("#lockSettingsBtn").addEventListener("click",function(){
  var cfg=getLockConfig();
  $("#lockSettingsTitle").textContent=cfg?"🔒 เปลี่ยน/ปิดรหัสล็อกแอป":"🔒 ตั้งรหัสล็อกแอป";
  $("#lockRemoveBtn").style.display=cfg?"":"none";
  $("#lockNewPin").value="";$("#lockConfirmPin").value="";$("#lockSettingsError").textContent="";
  $("#lockSettingsModal").classList.add("show");
});
$("#lockSaveBtn").addEventListener("click",function(){
  var p1=$("#lockNewPin").value.trim(),p2=$("#lockConfirmPin").value.trim();
  if(!/^\d{4,6}$/.test(p1)){$("#lockSettingsError").textContent="รหัส PIN ต้องเป็นตัวเลข 4-6 หลัก";return}
  if(p1!==p2){$("#lockSettingsError").textContent="รหัส PIN ทั้งสองช่องไม่ตรงกัน";return}
  var salt=Array.prototype.map.call(crypto.getRandomValues(new Uint8Array(16)),function(b){return b.toString(16).padStart(2,"0")}).join("");
  sha256Hex(salt+p1).then(function(hash){
    localStorage.setItem(LOCK_KEY,JSON.stringify({salt:salt,hash:hash}));
    sessionStorage.setItem(UNLOCK_SESSION_KEY,"1"); // ตั้งรหัสใหม่แล้วไม่ต้องให้ล็อกตัวเองออกทันที
    $("#lockSettingsModal").classList.remove("show");
  });
});
$("#lockRemoveBtn").addEventListener("click",function(){
  if(!confirm("ปิดการล็อกแอป? ใครก็เปิดแอปนี้เข้าดูข้อมูลทริปได้เลยโดยไม่ต้องใส่รหัส"))return;
  localStorage.removeItem(LOCK_KEY);
  sessionStorage.removeItem(UNLOCK_SESSION_KEY);
  $("#lockSettingsModal").classList.remove("show");
});
$("#lockSettingsModal").addEventListener("click",function(e){
  if(!e.target.closest(".picker-panel"))$("#lockSettingsModal").classList.remove("show");
});
