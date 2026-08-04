// @ts-check
// gopandacn-prototype.html / index.html โหลดไฟล์นี้ผ่าน <script type="module" src="js/app.js">
// ย้ายมาจาก inline <script> เดิมทั้งก้อน (ไม่มีการแก้ logic) เพื่อให้ tsc ตรวจ type ได้ — ดู
// docs/design/ARCHITECTURE-ROADMAP.md § 4 ข้อ 4

/**
 * @typedef {Object} Stop
 * @property {string} time - "HH:MM" หรือ "--" ถ้ายังไม่กำหนดเวลา
 * @property {string} title
 * @property {string} desc
 * @property {[string,string]} cat - [catClass, catLabel] เช่น ["spot","ที่เที่ยว"]
 * @property {number|null} cost - หน่วยหยวน
 * @property {string} id - ใช้ผูกกับเอกสารแนบใน IndexedDB (docs.js)
 */

/**
 * @typedef {Object} Day
 * @property {string} t - หัวข้อของวัน
 * @property {string} m - ข้อความ meta (เช่น "5 จุดหมาย")
 * @property {Stop[]} s
 */

/**
 * @typedef {Object} JournalEntry
 * @property {string} ic - emoji ไอคอน
 * @property {string} title
 * @property {string} cat
 * @property {number} cny
 * @property {string} [time]
 */

/**
 * @typedef {Object} ChecklistAction
 * @property {"view"|"aff"} kind
 * @property {string} label
 * @property {string} [view]
 * @property {string} [href]
 */

/**
 * @typedef {Object} ChecklistItem
 * @property {string} t
 * @property {string} n
 * @property {boolean} [done]
 * @property {ChecklistAction} [act]
 * @property {string} [due]
 */

/**
 * @typedef {Object} ChecklistCategory
 * @property {string} cat
 * @property {string} ic
 * @property {ChecklistItem[]} items
 */

/**
 * @typedef {Object} Trip
 * @property {string} id
 * @property {string} name
 * @property {string} [sub]
 * @property {string} startDate - "YYYY-MM-DD"
 * @property {number} dayCount
 * @property {number} budget
 * @property {string[]} [cities]
 * @property {Object<string,Day>} days
 * @property {Stop[]} backlog
 * @property {{spent:number, entries:JournalEntry[]}} journal
 * @property {ChecklistCategory[]} checklist
 * @property {number} [updatedAt]
 */

import {uid,esc,html,safeHTML,fmt,csvField,parseCsv,toMin} from "./utils.js";
import {docDb,docAdd,docList,docGet,docDelete,DOC_MAX_BYTES,DOC_DB_NAME} from "./docs.js";
import {qs,tripUrl,klookUrl,kkdayUrl,cleanTitle} from "./booking-links.js";
import {DISCOVERY} from "./discovery-data.js";
(function(){
  var $=function(s,c){return (c||document).querySelector(s)};
  var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};

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

  /* ---- เอกสารแนบ (ตั๋ว/ใบจอง ฯลฯ) เก็บเป็น Blob ดิบใน IndexedDB — ย้ายไป js/docs.js แล้ว (import ด้านบน) ---- */

  /* ---- ล็อกแอปด้วย PIN — ทางเลือก ไม่บังคับตั้ง กันคนอื่นหยิบมือถือแล้วเห็นข้อมูลทริป/บัตรสุขภาพ
     เก็บแค่ hash(salt+PIN) ไม่เก็บ PIN ตรงๆ · ไม่มีเซิร์ฟเวอร์เลยจึงกู้รหัสลืมไม่ได้ — มีปุ่ม "ลืมรหัส" รีเซ็ตแอปแทน ---- */
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

  /* ---- view switching ---- */
  var titles={
    map:["แผนที่ท่องเที่ยว","10 วัน 9 คืน"],
    itin:["แผนเที่ยวรายวัน","ทริปหูหนานครบสูตร · 12–21 ก.ย. · 10 วัน 9 คืน"],
    journal:["สมุดบันทึก & ค่าใช้จ่าย","งบทริป ¥6,000 · ใช้ไป 21%"],
    packs:["แพ็กข้อมูลเมือง","จัดการแผนที่ & ข้อมูลออฟไลน์รายเมือง"],
    phrases:["วลีจีนฉุกเฉิน","แตะการ์ดเพื่อขยายตัวอักษรใหญ่ให้คนจีนอ่าน"],
    ready:["ความพร้อมก่อนบิน","บิน 12 ก.ย. 03:00 (CZ3036) · แตะรายการเพื่อติ๊กว่าเสร็จแล้ว"],
    sos:["SOS & บัตรสุขภาพ","ทุกอย่างในหน้านี้ใช้ได้แบบออฟไลน์ · แตะการ์ดเพื่อขยายโชว์"],
    plan:["โต๊ะวางแผน-แก้ไขทริป","โหมดวางแผนสำหรับจอใหญ่ · ย้ายการ์ดข้ามวัน + นำเข้าไฟล์ Excel/CSV"]
  };
  function showView(v){
    $$(".nav-btn").forEach(function(b){b.classList.toggle("active",b.dataset.view===v)});
    $$(".view").forEach(function(s){s.classList.remove("active")});
    $("#view-"+v).classList.add("active");
    if(v==="map")$("#viewTitle").textContent=activeTrip.name;
    else $("#viewTitle").textContent=titles[v][0];
    $("#viewSub").textContent=titles[v][1];
    $("#modePlan").classList.toggle("active",v==="plan");
    $("#modeTrip").classList.toggle("active",v!=="plan");
    if(v==="ready"&&typeof renderTileReadyCard==="function")renderTileReadyCard();
    closeDrawers();
  }
  $("#modePlan").addEventListener("click",function(){showView("plan")});
  $("#modeTrip").addEventListener("click",function(){showView("map")});
  $$(".nav-btn").forEach(function(btn){
    btn.addEventListener("click",function(){showView(btn.dataset.view)});
  });
  var openReady=$("#openReady");
  openReady.addEventListener("click",function(){showView("ready")});
  openReady.addEventListener("keydown",function(e){
    if(e.key==="Enter"||e.key===" "){e.preventDefault();showView("ready")}
  });

  /* ---- dock collapse (desktop) ---- */
  var app=$("#app");
  $("#dockToggle").addEventListener("click",function(){app.classList.add("dock-collapsed")});
  $("#railExpand").addEventListener("click",function(){app.classList.remove("dock-collapsed")});
  $$(".dock-rail .rail-btn").forEach(function(b){
    b.addEventListener("click",function(){app.classList.remove("dock-collapsed")});
  });

  /* ---- แท็บกล่องเครื่องมือ ---- */
  $("#dockTabs").addEventListener("click",function(e){
    var b=e.target.closest(".dock-tab-btn");if(!b)return;
    $$("#dockTabs .dock-tab-btn").forEach(function(x){x.classList.remove("active")});
    b.classList.add("active");
    $$(".dock-pane").forEach(function(p){p.classList.toggle("active",p.dataset.pane===b.dataset.pane)});
  });

  /* ---- mobile drawers ---- */
  var sidebar=$("#sidebar"),dock=$("#dock"),overlay=$("#overlay");
  function closeDrawers(){
    sidebar.classList.remove("open");dock.classList.remove("open");
    overlay.classList.remove("show");
  }
  $("#openSidebar").addEventListener("click",function(){
    sidebar.classList.add("open");overlay.classList.add("show");
  });
  $("#openDock").addEventListener("click",function(){
    dock.classList.add("open");overlay.classList.add("show");
  });
  $("#closeDock").addEventListener("click",closeDrawers);
  overlay.addEventListener("click",closeDrawers);
  document.addEventListener("keydown",function(e){
    if(e.key==="Escape"){
      closeDrawers();
      $$(".big-show,.picker").forEach(function(x){x.classList.remove("show")});
    }
  });

  /* ---- map pins ---- */
  /* ---- แผนที่จริง (feature 1.2): MapLibre GL + PMTiles ออฟไลน์ — พิกัดจริงจาก poc/pack-src/changsha-mini/poi.json ----
     ตอนนี้มีแค่ฉางซาเมืองเดียวที่มี .pmtiles จริง (ดู FEATURE-ROADMAP 1.2) เมืองอื่นในทริปยังไม่มีข้อมูลแผนที่จริง */
  var curPinId="ifs";
  var pinData={
    ifs:{ic:"📍",title:"IFS ฉางซา (国金中心)",desc:"แลนด์มาร์กใจกลางเมือง จุดถ่ายรูปหมี KAWS ชั้น 7 · ห่างจากที่พัก 850 ม. เดิน 11 นาที · เปิด 10:00–22:00",lng:112.9793,lat:28.1938,city:"ฉางซา"},
    orange:{ic:"🍊",title:"เกาะส้ม (橘子洲)",desc:"เกาะกลางแม่น้ำเซียง จุดชมวิวรูปปั้นเหมาเจ๋อตงหนุ่ม · นั่งรถรางรอบเกาะ ¥40 · เหมาะช่วงเย็นถึงค่ำ",lng:112.96,lat:28.1965,city:"ฉางซา"},
    pozi:{ic:"🏮",title:"ถนนโบราณโผจื่อเจีย (坡子街)",desc:"ถนนสายของกินอายุ 1,200 ปี · เต้าหู้เหม็นดำเจ้าดัง Huogongdian · คนแน่นช่วง 18:00 เป็นต้นไป",lng:112.9723,lat:28.1927,city:"ฉางซา"},
    yuelu:{ic:"⛰️",title:"เขาเยว่ลู่ (岳麓山)",desc:"จุดชมวิวเมืองฉางซา + วิทยาลัยเยว่ลู่พันปี · กระเช้าขึ้น ¥30 · ใช้เวลาครึ่งวัน แนะนำไปเช้า",lng:112.9316,lat:28.1855,city:"ฉางซา"},
    wanlong:{ic:"⛷️",title:"หวันหลง สกีรีสอร์ต (万龙滑雪场)",desc:"หนึ่งในสกีรีสอร์ตแรกๆ ของฉงลี่ · พิกัดยืนยันจาก OpenStreetMap",lng:115.3930784,lat:40.9613283,city:"ฉงลี่"},
    thaiwoo:{ic:"⛷️",title:"ไท่อู่ สกีรีสอร์ต (太舞滑雪场)",desc:"太舞滑雪小镇 (Thaiwoo) · พิกัดยืนยันจาก OpenStreetMap",lng:115.4366885,lat:40.8833809,city:"ฉงลี่"},
    yunding:{ic:"⛷️",title:"มี่หย่วน หยุนติ่ง (密苑云顶乐园)",desc:"หรือชื่อ Genting Secret Garden / Yunding Ski Park · พิกัดยืนยันจาก OpenStreetMap",lng:115.4185984,lat:40.9483320,city:"ฉงลี่"},
    /* ---- หมุดสถานีรถไฟหลักของแต่ละเมือง (feature: ป๋าโจขอให้ปักหมุดจริงบนแผนที่ ไม่ใช่แค่ใช้เป็นจุดกึ่งกลางเฉยๆ)
       พิกัดเดียวกับใน cityCenters (ยืนยันจาก OpenStreetMap แล้ว) — ทำให้เมืองที่เคยไม่มีหมุดเลย
       (จางเจียเจี้ย/เฟิ่งหวง/ฝูหรง/ปักกิ่ง/เทียนจิน) มีหมุดจริงอย่างน้อย 1 จุดด้วย ---- */
    csxStation:{ic:"🚄",title:"สถานีฉางซาใต้ (长沙南站)",desc:"สถานีรถไฟความเร็วสูงหลักของฉางซา จุดเชื่อมต่อเข้า-ออกเมืองสำคัญ",lng:113.058967,lat:28.150084,city:"ฉางซา",type:"station"},
    taizichengStation:{ic:"🚄",title:"สถานีไท่จื่อเฉิง (太子城站)",desc:"สถานีรถไฟความเร็วสูงใจกลางโซนสกีฉงลี่ ใกล้รีสอร์ตทั้ง 3 แห่ง",lng:115.441134,lat:40.912367,city:"ฉงลี่",type:"station"},
    bjnStation:{ic:"🚄",title:"สถานีปักกิ่งใต้ (北京南站)",desc:"สถานีรถไฟความเร็วสูงหลักของปักกิ่ง",lng:116.372753,lat:39.863555,city:"ปักกิ่ง",type:"station"},
    tjStation:{ic:"🚄",title:"สถานีเทียนจิน (天津站)",desc:"สถานีรถไฟหลักของเทียนจิน",lng:117.203684,lat:39.135752,city:"เทียนจิน",type:"station"},
    zjjwStation:{ic:"🚄",title:"สถานีจางเจียเจี้ยตะวันตก (张家界西站)",desc:"สถานีรถไฟความเร็วสูงหลักของจางเจียเจี้ย ฮับเชื่อมต่อไปเฟิ่งหวง/ฝูหรง",lng:110.458002,lat:29.171368,city:"จางเจียเจี้ย",type:"station"},
    fhStation:{ic:"🚄",title:"สถานีเฟิ่งหวงกู่เฉิง (凤凰古城站)",desc:"สถานีรถไฟความเร็วสูงหลักของเฟิ่งหวง",lng:109.59919,lat:28.020509,city:"เฟิ่งหวง",type:"station"},
    frStation:{ic:"🚄",title:"สถานีฝูหรงเจิ้น (芙蓉镇站)",desc:"สถานีรถไฟความเร็วสูงหลักของฝูหรงเจิ้น",lng:109.982015,lat:28.773023,city:"ฝูหรง",type:"station"},
    /* ---- หมุดโรงแรม/ที่พักจากแผนทริปจริง — เช็คแล้วมีแค่ 2 จาก 6 ที่พักในทริปหูหนานที่หาเจอใน OSM
       (ที่พักบูติกเล็กๆ/民宿 ส่วนใหญ่ยังไม่มีใครลงข้อมูลไว้ใน OpenStreetMap) เก็บไว้แค่ 2 จุดที่ยืนยันได้จริง
       ไม่ปั้นพิกัดที่เหลือ ---- */
    furongHotel:{ic:"🏨",title:"悬园·观景庭院民宿（芙蓉镇景区店）",desc:"ที่พักวันที่ 3 ของทริปหูหนาน (Xuanyuan Courtyard B&B) · วิวน้ำตกฝูหรง",lng:109.9439238,lat:28.7458229,city:"ฝูหรง",type:"hotel"},
    zjjHotel:{ic:"🏨",title:"喜见·枫庭酒店（张家界国家森林公园标志门店）",desc:"ที่พักวันที่ 4 ของทริปหูหนาน (Xijian Shanyu) · หน้าอุทยานจางเจียเจี้ย — ชื่อใน OSM ต่างจากแผนทริปเล็กน้อย (คนละแบรนด์ย่อยของเชนเดียวกัน ที่ตั้งเดียวกัน) ควรเช็คซ้ำก่อนใช้จริง",lng:110.5420018,lat:29.3511187,city:"จางเจียเจี้ย",type:"hotel"}
  };
  /* ---- จุดกึ่งกลาง+ซูมของแต่ละเมือง ใช้ "สถานีรถไฟหลัก" ของเมืองนั้นเป็นหมุด default (ตามที่ป๋าโจขอ)
     พิกัดยืนยันจาก OpenStreetMap (Overpass API) ทุกจุด ไม่ใช่พิกัดเดา · "ประเทศจีน" เป็นตัวเลือกพิเศษ
     จุดกึ่งกลางคำนวณจากรูปทรงมณฑลจริง (area-weighted centroid) ไม่ใช่พิกัดจำ ต้องอยู่ตัวแรกของอ็อบเจกต์
     เพราะ Object.keys() เรียงตามลำดับที่ใส่ ใช้กำหนดลำดับ dropdown "ดูแผนที่เมืองอื่น" ด้วย */
  var cityCenters={
    "ประเทศจีน":{lng:103.8229,lat:36.5624,zoom:3},
    "ฉางซา":{lng:113.058967,lat:28.150084,zoom:11.5}, // สถานีฉางซาใต้ 长沙南站
    "ฉงลี่":{lng:115.441134,lat:40.912367,zoom:11.5}, // สถานีไท่จื่อเฉิง 太子城站 (ใจกลางโซนสกี)
    "ปักกิ่ง":{lng:116.372753,lat:39.863555,zoom:11.5}, // สถานีปักกิ่งใต้ 北京南站
    "เทียนจิน":{lng:117.203684,lat:39.135752,zoom:11.5}, // สถานีเทียนจิน 天津站
    "จางเจียเจี้ย":{lng:110.458002,lat:29.171368,zoom:11.5}, // สถานีจางเจียเจี้ยตะวันตก 张家界西站
    "เฟิ่งหวง":{lng:109.59919,lat:28.020509,zoom:11.5}, // สถานีเฟิ่งหวงกู่เฉิง 凤凰古城站
    "ฝูหรง":{lng:109.982015,lat:28.773023,zoom:11.5} // สถานีฝูหรงเจิ้น 芙蓉镇站
  };
  var pinMarkers={};
  /* ---- WGS-84 → GCJ-02 (สูตรมาตรฐานสาธารณะที่ใช้กันทั่วไปในงานแผนที่จีน ไม่ใช่ของ Amap เอง)
     จำเป็นเพราะแอปแผนที่จีน (Amap ฯลฯ) ใช้พิกัดเพี้ยนแบบ GCJ-02 ไม่ใช่ WGS-84 ดิบที่เราเก็บไว้
     ไม่งั้นหมุดจะไปโผล่คลาดเคลื่อน 50–500 ม. (ดู § ข้อจำกัดทางเทคนิคใน FEATURE-ROADMAP.md) ---- */
  function wgs84ToGcj02(lng,lat){
    var a=6378245.0,ee=0.00669342162296594323;
    function outOfChina(lng,lat){return lng<72.004||lng>137.8347||lat<0.8293||lat>55.8271}
    function transformLat(x,y){
      var ret=-100.0+2.0*x+3.0*y+0.2*y*y+0.1*x*y+0.2*Math.sqrt(Math.abs(x));
      ret+=(20.0*Math.sin(6.0*x*Math.PI)+20.0*Math.sin(2.0*x*Math.PI))*2.0/3.0;
      ret+=(20.0*Math.sin(y*Math.PI)+40.0*Math.sin(y/3.0*Math.PI))*2.0/3.0;
      ret+=(160.0*Math.sin(y/12.0*Math.PI)+320*Math.sin(y*Math.PI/30.0))*2.0/3.0;
      return ret;
    }
    function transformLng(x,y){
      var ret=300.0+x+2.0*y+0.1*x*x+0.1*x*y+0.1*Math.sqrt(Math.abs(x));
      ret+=(20.0*Math.sin(6.0*x*Math.PI)+20.0*Math.sin(2.0*x*Math.PI))*2.0/3.0;
      ret+=(20.0*Math.sin(x*Math.PI)+40.0*Math.sin(x/3.0*Math.PI))*2.0/3.0;
      ret+=(150.0*Math.sin(x/12.0*Math.PI)+300.0*Math.sin(x/30.0*Math.PI))*2.0/3.0;
      return ret;
    }
    if(outOfChina(lng,lat))return [lng,lat];
    var dLat=transformLat(lng-105.0,lat-35.0);
    var dLng=transformLng(lng-105.0,lat-35.0);
    var radLat=lat/180.0*Math.PI;
    var magic=Math.sin(radLat);
    magic=1-ee*magic*magic;
    var sqrtMagic=Math.sqrt(magic);
    dLat=(dLat*180.0)/((a*(1-ee))/(magic*sqrtMagic)*Math.PI);
    dLng=(dLng*180.0)/(a/sqrtMagic*Math.cos(radLat)*Math.PI);
    return [lng+dLng,lat+dLat];
  }
  function amapNavUrl(d){
    var gcj=wgs84ToGcj02(d.lng,d.lat);
    return "https://uri.amap.com/navigation?to="+gcj[0].toFixed(6)+","+gcj[1].toFixed(6)+","+encodeURIComponent(d.title)+
      "&mode=car&policy=1&src=gopandacn&coordinate=gaode&callnative=1";
  }
  function selectPin(id){
    curPinId=id;
    Object.keys(pinMarkers).forEach(function(k){pinMarkers[k].getElement().classList.toggle("selected",k===id)});
    var d=pinData[id];
    $("#popTitle").innerHTML="<span>"+d.ic+"</span>"+d.title;
    $("#popDesc").textContent=d.desc;
    $("#amapNav").href=amapNavUrl(d);
    $("#pinPop .row").style.display="";
    $("#pinPop").classList.add("show");
  }
  $("#pinPopClose").addEventListener("click",function(){
    $("#pinPop").classList.remove("show");
    Object.keys(pinMarkers).forEach(function(k){pinMarkers[k].getElement().classList.remove("selected")});
  });
  /* ---- fallback ต่อเมือง (feature: บอกตรงๆ ถ้าเมืองนั้นยังไม่มีหมุด POI คัดสรร
     แทนที่จะปล่อยแผนที่ว่างเปล่าดูเหมือนพัง — เมืองที่มีหมุดจริงแค่ซ่อนกล่องไว้เฉยๆ
     รอให้กดหมุดเองแทน ไม่มีข้อความ default ค้างจออีกต่อไป) ---- */
  function showCityPinState(name){
    var hasPins=Object.keys(pinData).some(function(id){return pinData[id].city===name});
    var pop=$("#pinPop");
    if(hasPins){
      pop.classList.remove("show");
      return;
    }
    $("#popTitle").innerHTML="<span>🐼</span>ยังไม่มีจุดแนะนำสำหรับ"+esc(name);
    $("#popDesc").textContent="ทีมงานยังไม่ได้คัดหมุดสถานที่สำหรับเมืองนี้ — ลองเลื่อนแผนที่สำรวจเองได้เลย หรือถามน้องหลิงหลิงในกล่องเครื่องมือ";
    pop.querySelector(".row").style.display="none";
    pop.classList.add("show");
  }
  var pmProtocol=new pmtiles.Protocol();
  maplibregl.addProtocol("pmtiles",pmProtocol.tile);
  var gpMap=new maplibregl.Map({
    container:"mapCanvas",style:"map-style.json",
    center:[pinData.ifs.lng,pinData.ifs.lat],zoom:11.5,maxZoom:17,
    attributionControl:{compact:true,customAttribution:"© OpenStreetMap contributors"}
  });
  /** @type {any} */ (window).gpMap=gpMap; // เปิดให้ debug ผ่าน console ได้ (ไม่กระทบ UX)
  gpMap.on("error",function(e){console.warn("MapLibre error:",e && e.error && e.error.message,e)});
  gpMap.on("load",function(){
    Object.keys(pinData).forEach(function(id){
      var d=pinData[id];
      var el=document.createElement("div");
      // 3 กลุ่มหมุด แยกสีให้ดูออกทันทีว่าอันไหนคืออะไร: สถานีรถไฟ (ฟ้า) / ที่พัก (ม่วง) / ที่เที่ยว-ร้าน (ทอง, ค่าเริ่มต้น)
      var pinColors={station:["#22d3ee","#083344"],hotel:["#a78bfa","#4c1d95"],attraction:["#f59e0b","#78350f"]};
      var pc=pinColors[d.type]||pinColors.attraction;
      el.className="gp-pin"+(d.type?" gp-pin-"+d.type:"")+(id==="ifs"?" selected":"");
      el.innerHTML='<svg viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg"><path d="M11 0C5 0 0 5 0 11c0 8 11 19 11 19s11-11 11-19C22 5 17 0 11 0z" fill="'+pc[0]+'" stroke="'+pc[1]+'" stroke-width="1"/><circle cx="11" cy="11" r="8" fill="#0f172a"/><text x="11" y="11.5" text-anchor="middle" dominant-baseline="central" font-size="10">'+d.ic+'</text></svg>';
      el.setAttribute("role","button");el.setAttribute("tabindex","0");
      el.setAttribute("aria-label","หมุด: "+d.title);
      el.addEventListener("click",function(){selectPin(id)});
      el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();selectPin(id)}});
      pinMarkers[id]=new maplibregl.Marker({element:el}).setLngLat([d.lng,d.lat]).addTo(gpMap);
    });
  });
  /* ---- คลิกแล้วบินซูมเข้าแบบ Google Earth (feature: ตอนซูมออกกว้างเห็นแค่เงาประเทศ
     คลิกจุดไหนก็บินเข้าไปที่จุดนั้นให้เห็นระดับถนน) — ทำงานเฉพาะตอนซูมออกกว้างพอ (ยังไม่ถึงระดับเห็นถนนจริง)
     เพื่อไม่ให้ไปรบกวนการดูแผนที่ปกติตอนซูมเข้าเมืองแล้ว (คลิกหมุดเองมี marker DOM ของตัวเองแยกอยู่แล้ว ไม่ชนกัน) */
  gpMap.on("click",function(e){
    var z=gpMap.getZoom();
    if(z>=12)return;
    gpMap.flyTo({center:e.lngLat,zoom:Math.min(14,z+4),speed:1.2,curve:1.4});
  });
  /* TEMP DEBUG: อัปเดตตัวเลขซูมสด ๆ ไว้ช่วยรายงานผลตอนเทส เอาออกทีหลังได้ */
  function updateZoomIndicator(){$("#zoomIndicator").textContent="zoom: "+gpMap.getZoom().toFixed(2)}
  gpMap.on("zoom",updateZoomIndicator);
  gpMap.on("move",updateZoomIndicator);
  gpMap.on("load",updateZoomIndicator);
  updateZoomIndicator();
  $("#mapZoomIn").addEventListener("click",function(){gpMap.zoomIn()});
  $("#mapZoomOut").addEventListener("click",function(){gpMap.zoomOut()});
  $("#mapFullscreen").addEventListener("click",/** @this {HTMLElement} */ function(){
    var frame=$("#mapFrame"),on=frame.classList.toggle("fullscreen");
    this.setAttribute("aria-label",on?"ย่อแผนที่กลับ":"ขยายแผนที่เต็มจอ");
    this.textContent=on?"⤢":"⛶";
    setTimeout(function(){gpMap.resize()},260);
  });

  /* ---- toggle สีถนนบนแผนที่ (feature: ป๋าโจไม่มีไอเดียสีตายตัว ขอเป็นปุ่มลองสลับดูง่ายๆ แทน) ----
     สลับผ่าน setPaintProperty ไม่ต้องโหลด style ใหม่ทั้งชุด จำค่าที่เลือกไว้ใน localStorage */
  var ROAD_THEME_KEY="gopanda_road_theme_v1";
  var roadThemes=[
    {name:"ฟ้าเทา (เดิม)",
      casing:["match",["get","class"],
        ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],"#3d5c8c",
        ["secondary","secondary_link","tertiary","tertiary_link"],"#2e4568","#243450"],
      line:["match",["get","class"],
        ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],"#a9c4ee",
        ["secondary","secondary_link","tertiary","tertiary_link"],"#7896c2","#4a6285"]},
    {name:"ทอง",
      casing:["match",["get","class"],
        ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],"#6b4a1a",
        ["secondary","secondary_link","tertiary","tertiary_link"],"#55401f","#3d2f1a"],
      line:["match",["get","class"],
        ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],"#f5c869",
        ["secondary","secondary_link","tertiary","tertiary_link"],"#d9a94f","#a8823f"]},
    {name:"ขาว/เทาสว่าง",
      casing:["match",["get","class"],
        ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],"#2c2c30",
        ["secondary","secondary_link","tertiary","tertiary_link"],"#252528","#1c1c1e"],
      line:["match",["get","class"],
        ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],"#f1f5f9",
        ["secondary","secondary_link","tertiary","tertiary_link"],"#cbd5e1","#94a3b8"]}
  ];
  function applyRoadTheme(i){
    var t=roadThemes[i];
    gpMap.setPaintProperty("roads-casing","line-color",t.casing);
    gpMap.setPaintProperty("roads-line","line-color",t.line);
    localStorage.setItem(ROAD_THEME_KEY,i);
  }
  $("#mapTheme").addEventListener("click",function(){
    var cur=+(localStorage.getItem(ROAD_THEME_KEY)||0);
    var next=(cur+1)%roadThemes.length;
    applyRoadTheme(next);
    var toast=$("#planToast");
    if(toast){toast.textContent="🎨 สีถนน: "+roadThemes[next].name;toast.hidden=false;setTimeout(function(){toast.hidden=true},2000)}
  });
  gpMap.on("load",function(){
    var saved=+(localStorage.getItem(ROAD_THEME_KEY)||0);
    if(saved)applyRoadTheme(saved);
  });

  /* ---- โหลด/สลับ tile ของเมืองที่กำลังดูอยู่แบบไดนามิก (feature: แยก pmtiles รายเมือง)
     เดิม map-style.json มี source+layer ของฉางซาฝังตายตัวไว้เลย ทำให้ต้อง precache รวมทุกเมือง
     เข้า SW shell แบบ atomic (พังง่าย + โหลดของที่ทริปนี้ไม่ได้ใช้) ตอนนี้ style มีแค่พื้นหลัง
     ประเทศ/มณฑลคงที่ ส่วน source+layer ของถนน/น้ำ/อาคาร/ป้ายชื่อ ใส่/ถอดตรงนี้เองตอนสลับเมือง
     ดู ARCHITECTURE-ROADMAP.md § 3.2 ---- */
  var CITY_TILE_KEY={"ฉางซา":"changsha","จางเจียเจี้ย":"zhangjiajie","เฟิ่งหวง":"fenghuang",
    "ฝูหรง":"furong","ฉงลี่":"chongli","ปักกิ่ง":"beijing","เทียนจิน":"tianjin"};
  var CITY_TILE_LAYER_IDS=["water","water-line","landuse-park","buildings","roads-casing","roads-line","roads-label"];
  var currentTileCity=null;
  function addCityTileLayers(){
    gpMap.addSource("citytiles",{type:"vector",url:"pmtiles://tiles/"+currentTileCity+".pmtiles",
      minzoom:11,maxzoom:16,attribution:"© OpenStreetMap contributors"});
    gpMap.addLayer({id:"water",type:"fill",source:"citytiles","source-layer":"water",
      paint:{"fill-color":"#0d2438","fill-outline-color":"#164e63"}});
    gpMap.addLayer({id:"water-line",type:"line",source:"citytiles","source-layer":"water",
      paint:{"line-color":"#164e63","line-width":["interpolate",["linear"],["zoom"],11,0.8,16,3]}});
    gpMap.addLayer({id:"landuse-park",type:"fill",source:"citytiles","source-layer":"landuse",
      paint:{"fill-color":"#10261e","fill-opacity":0.9}});
    gpMap.addLayer({id:"buildings",type:"fill",source:"citytiles","source-layer":"buildings",minzoom:14,
      paint:{"fill-color":"#2c4064","fill-outline-color":"#5870aa",
        "fill-opacity":["interpolate",["linear"],["zoom"],14,0.65,16,0.95]}});
    gpMap.addLayer({id:"roads-casing",type:"line",source:"citytiles","source-layer":"roads",paint:{
      "line-color":["match",["get","class"],
        ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],"#3d5c8c",
        ["secondary","secondary_link","tertiary","tertiary_link"],"#2e4568","#243450"],
      "line-width":["interpolate",["linear"],["zoom"],
        11,["match",["get","class"],["motorway","trunk","primary"],2,1],
        16,["match",["get","class"],["motorway","trunk","primary"],10,["secondary","tertiary"],7,4]]}});
    gpMap.addLayer({id:"roads-line",type:"line",source:"citytiles","source-layer":"roads",paint:{
      "line-color":["match",["get","class"],
        ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],"#a9c4ee",
        ["secondary","secondary_link","tertiary","tertiary_link"],"#7896c2","#4a6285"],
      "line-width":["interpolate",["linear"],["zoom"],
        11,["match",["get","class"],["motorway","trunk","primary"],0.8,0.4],
        16,["match",["get","class"],["motorway","trunk","primary"],5,["secondary","tertiary"],3,1.5]]}});
    gpMap.addLayer({id:"roads-label",type:"symbol",source:"citytiles","source-layer":"roads",minzoom:14,
      filter:["has","name"],
      layout:{"symbol-placement":"line","text-field":["get","name"],"text-font":["Noto Sans SC"],
        "text-size":["interpolate",["linear"],["zoom"],14,10,18,13]},
      paint:{"text-color":"#e2e8f0","text-halo-color":"#0a1324","text-halo-width":1.2}});
  }
  function loadCityTiles(cityTh){
    var key=CITY_TILE_KEY[cityTh]||null;
    if(key===currentTileCity)return;
    function apply(){
      CITY_TILE_LAYER_IDS.forEach(function(id){if(gpMap.getLayer(id))gpMap.removeLayer(id)});
      if(gpMap.getSource("citytiles"))gpMap.removeSource("citytiles");
      currentTileCity=key;
      if(key)addCityTileLayers();
    }
    if(gpMap.isStyleLoaded())apply();else gpMap.once("load",apply);
  }

  /* ---- ดาวน์โหลดแผนที่ออฟไลน์ของทริปนี้ล่วงหน้า (feature: แทนที่การ precache รวมทุกเมืองแบบเดิม
     ที่ทำให้ทุกคนโหลดของทุกเมืองแม้ทริปนั้นไม่ได้ไป) — เก็บใน cache แยกจาก SHELL_CACHE
     (gopanda-tiles-v1 เดียวกับที่ sw.js ใช้ serve) เพื่อไม่ให้การ bump SHELL_CACHE รอบต่อๆ ไป
     ทำให้ต้องโหลด tile ซ้ำทุกครั้ง ---- */
  var TILE_CACHE_NAME="gopanda-tiles-v1";
  function tripTileCities(){
    var seen={};
    return (activeTrip.cities||[]).map(function(c){return {th:c,key:CITY_TILE_KEY[c]}})
      .filter(function(x){return x.key&&!seen[x.key]&&(seen[x.key]=1)});
  }
  function downloadTripTiles(){
    var mapBtn=$("#mapDownloadTiles"),readyBtn=$("#tileReadyDownloadBtn");
    var cities=tripTileCities().map(function(x){return x.key});
    if(!cities.length){
      mapBtn.textContent="∅";setTimeout(refreshMapDownloadBtn,1500);
      return;
    }
    mapBtn.disabled=true;if(readyBtn)readyBtn.disabled=true;
    caches.open(TILE_CACHE_NAME).then(function(cache){
      var done=0,failed=0;
      function next(){
        if(done+failed>=cities.length){
          mapBtn.textContent=failed?"⚠️":"✓";mapBtn.disabled=false;
          setTimeout(refreshMapDownloadBtn,2500);
          renderTileReadyCard();
          return;
        }
        var url="tiles/"+cities[done+failed]+".pmtiles";
        cache.match(url).then(function(hit){
          return hit?Promise.resolve():cache.add(url);
        }).then(function(){
          done++;mapBtn.textContent="⬇️ "+(done+failed)+"/"+cities.length;next();
        }).catch(function(){
          failed++;mapBtn.textContent="⬇️ "+(done+failed)+"/"+cities.length;next(); // ข้ามไฟล์ที่โหลดพลาด (เช่นไม่มีเน็ต) ไม่ให้ค้าง
        });
      }
      next();
    });
  }
  $("#mapDownloadTiles").addEventListener("click",downloadTripTiles);
  $("#tileReadyDownloadBtn").addEventListener("click",downloadTripTiles);

  /* ---- ตัวบอกสถานะพร้อมออฟไลน์จริง (feature: เดิมไม่มีทางรู้เลยว่าดาวน์โหลดครบหรือยังก่อนขึ้นเครื่อง
     ตอนนี้เช็คสถานะจริงจาก TILE_CACHE ทุกครั้งที่โหลดทริป/สลับทริป/เปิดหน้าเช็กลิสต์ก่อนบิน
     ดู ARCHITECTURE-ROADMAP.md § 3.4 ---- */
  function tileReadinessStatus(){
    var cities=tripTileCities();
    if(!cities.length)return Promise.resolve([]);
    return caches.open(TILE_CACHE_NAME).then(function(cache){
      return Promise.all(cities.map(function(c){
        return cache.match("tiles/"+c.key+".pmtiles").then(function(hit){
          if(!hit)return {th:c.th,ready:false};
          return hit.clone().blob().then(function(b){return {th:c.th,ready:true,size:b.size}});
        });
      }));
    });
  }
  function refreshMapDownloadBtn(){
    var btn=$("#mapDownloadTiles");
    if(!btn||btn.disabled)return;
    tileReadinessStatus().then(function(results){
      if(!results.length){btn.textContent="⬇️";return}
      var readyCount=results.filter(function(r){return r.ready}).length;
      btn.textContent=readyCount===results.length?"🗺️✓":"🗺️"+readyCount+"/"+results.length;
      btn.title=readyCount===results.length?"แผนที่ออฟไลน์พร้อมครบแล้ว":"ดาวน์โหลดแผนที่ออฟไลน์สำหรับทริปนี้ ("+readyCount+"/"+results.length+" พร้อมแล้ว)";
    });
  }
  function renderTileReadyCard(){
    var box=$("#tileReadyList");
    if(!box)return;
    tileReadinessStatus().then(function(results){
      if(!results.length){
        box.innerHTML='<div class="sub2">ทริปนี้ยังไม่มีเมืองที่มีแผนที่ออฟไลน์ให้ดาวน์โหลด</div>';
        $("#tileReadyDownloadBtn").style.display="none";
        return;
      }
      box.innerHTML=results.map(function(r){
        return '<div class="doc-item"><span class="doc-ic">'+(r.ready?"✅":"⬇️")+'</span>'+
          '<span class="doc-name" style="cursor:default;text-decoration:none">'+esc(r.th)+'</span>'+
          '<span class="doc-size num">'+(r.ready?fmtBytes(r.size):"ยังไม่ได้โหลด")+'</span></div>';
      }).join("");
      var readyCount=results.filter(function(r){return r.ready}).length;
      $("#tileReadyDownloadBtn").style.display=readyCount<results.length?"":"none";
      refreshMapDownloadBtn();
    });
  }

  /* ---- ชิปเมือง (feature: กรองเมืองตามทริปที่เปิดอยู่ ไม่ปนข้ามทริป) ----
     renderCityChips ถูกเรียกจริงจาก renderTripCardMeta() (ทำงานหลัง activeTrip
     พร้อมค่าเสมอ ไม่ใช่ตรงนี้) เพราะ activeTrip ยังไม่ถูก assign ค่าตอนบรรทัดนี้รันจริง (ประกาศอยู่ถัดไปในไฟล์) */
  function flyToCity(name){
    var msg=$("#cityMsg");
    var city=cityCenters[name];
    loadCityTiles(name);
    if(city){
      msg.hidden=true;
      gpMap.flyTo({center:[city.lng,city.lat],zoom:city.zoom});
      if(name==="ประเทศจีน")$("#pinPop").classList.remove("show"); // มุมมองทั้งประเทศ ไม่มี POI ระดับเมืองให้โชว์
      else showCityPinState(name);
    }else{
      msg.hidden=false;
      msg.textContent="⚠️ แผนที่จริงของ"+name+"ยังไม่พร้อม — ตอนนี้มีแค่ฉางซา/ฉงลี่/ปักกิ่ง/เทียนจินที่ใช้แผนที่ออฟไลน์จริงได้";
      $("#pinPop").classList.remove("show");
    }
  }
  function renderCityChips(){
    var wrap=$("#cityChips");
    var cities=activeTrip.cities||[];
    wrap.innerHTML=cities.map(function(name,i){
      return '<button class="city-chip'+(i===0?" active":"")+'" data-city="'+esc(name)+'">'+esc(name)+"</button>";
    }).join("");
    if(cities.length)flyToCity(cities[0]);
  }
  $("#cityChips").addEventListener("click",function(e){
    var c=e.target.closest(".city-chip");if(!c)return;
    $$("#cityChips .city-chip").forEach(function(x){x.classList.remove("active")});
    c.classList.add("active");
    flyToCity(c.dataset.city);
  });
  /* ---- ดรอปดาวน์ "ดูแผนที่เมืองอื่น" — ทางลัดดูเฉยๆ ไม่เกี่ยวกับทริป/ชิปเมืองที่เลือกอยู่เลย ----
     ใช้ flyToCity() เดียวกับตอนกดชิป (ปรับ welcome/fallback ของหมุดให้ตรงเมืองที่ดู) แต่ไม่แตะ
     .city-chip.active หรือ activeTrip ใดๆ ทั้งสิ้น — ปิดจบแล้ว reset กลับ placeholder ทันที */
  (function renderCityJumpSelect(){
    var sel=$("#cityJumpSelect");
    sel.innerHTML='<option value="">🌍 ดูแผนที่เมืองอื่น…</option>'+Object.keys(cityCenters).map(function(name){
      return '<option value="'+esc(name)+'">'+esc(name)+"</option>";
    }).join("");
  })();
  $("#cityJumpSelect").addEventListener("change",function(){
    if(!this.value)return;
    flyToCity(this.value);
    this.value="";
  });

  /* ---- GPS จริง (feature 1.3): ปักหมุด "ฉันอยู่ตรงนี้" บนแผนที่จริงถ้าขอสิทธิ์สำเร็จ ---- */
  var userMarker=null,userPos=null;
  function placeUserMarker(){
    if(!gpMap||!userPos)return;
    if(userMarker)userMarker.remove();
    var el=document.createElement("div");
    el.className="gp-user-dot";
    el.setAttribute("aria-label","ตำแหน่งปัจจุบันของฉัน");
    userMarker=new maplibregl.Marker({element:el}).setLngLat([userPos.lng,userPos.lat]).addTo(gpMap);
  }
  if("geolocation" in navigator){
    navigator.geolocation.getCurrentPosition(function(pos){
      userPos={lat:pos.coords.latitude,lng:pos.coords.longitude};
      placeUserMarker();
    },function(){},{timeout:8000,maximumAge:60000});
  }
  /* ---- ปุ่ม "ไปตำแหน่งปัจจุบันของฉัน" — ถ้ามีพิกัดอยู่แล้ว (ปักหมุดตอนโหลดหน้าไปแล้ว) เลื่อนแผนที่ไปเลย
     ถ้ายังไม่มี (ตอนโหลดขอสิทธิ์ไม่สำเร็จ) ลองขอใหม่ตรงนี้ พร้อมแจ้งเหตุผลชัดๆ ถ้ายังไม่ได้อีก ---- */
  $("#mapLocate").addEventListener("click",function(){
    if(userPos){gpMap.flyTo({center:[userPos.lng,userPos.lat],zoom:15});return}
    if(!("geolocation" in navigator)){alert("อุปกรณ์นี้ไม่รองรับ GPS");return}
    navigator.geolocation.getCurrentPosition(function(pos){
      userPos={lat:pos.coords.latitude,lng:pos.coords.longitude};
      placeUserMarker();
      gpMap.flyTo({center:[userPos.lng,userPos.lat],zoom:15});
    },function(err){
      alert(err.code===1?"ยังไม่ได้เปิดสิทธิ์เข้าถึงตำแหน่ง — เปิดสิทธิ์ในตั้งค่าเบราว์เซอร์/แอปแล้วลองใหม่":"หาสัญญาณ GPS ไม่เจอตอนนี้ ลองใหม่อีกครั้ง");
    },{timeout:8000,maximumAge:0});
  });
  $("#goHome").addEventListener("click",function(){openDriverCard(places[0])});

  /* ---- itinerary data ---- */
  // seed literal เป็นรูปแบบ legacy (s เป็น array ตำแหน่ง ไม่ใช่ Stop object) — normalizeStop() แปลงให้ตอนใช้จริง
  // ด้านล่าง (ก่อน renderDay(1)) จึงประกาศ type เป็น Object<string,Day> ตรงๆ แต่ cast literal เป็น any
  // เพื่อไม่ให้ tsc เช็ค shape ของ seed array ตรงๆ (ตั้งใจไม่ตรง shape เพราะยังไม่ผ่าน normalizeStop)
  /** @type {Object<string,Day>} */
  var days=/** @type {any} */ ({
    1:{t:"บินถึงฉางซา ต่อรถไฟเข้าอู่หลิงหยวน",m:"",s:[
      ["03:00","✈️ CZ3036 BKK → ฉางซา","China Southern ต่อเครื่องกว่างโจว · ถึง CSX 10:50 · เปิด eSIM ตอนลงเครื่อง",["move","เดินทาง"]],
      ["12:00","🚇 สนามบิน → สถานีฉางซาใต้","Maglev 19 นาที + เผื่อเวลาเข้าสถานีรถไฟ 40 นาที",["move","เดินทาง"],25],
      ["14:00","🚄 รถไฟ ฉางซาใต้ → จางเจียเจี้ยตะวันตก","~3 ชม. · เสบียงซื้อในสถานี",["move","เดินทาง"],210],
      ["17:30","🏨 เช็กอิน Shanjian Boutique (อู่หลิงหยวน)","山见精品民宿（武陵源标志门店）· ใกล้ประตูอุทยาน",["move","ที่พัก"]],
      ["19:00","🍲 หม้อไฟถู่เจียต้อนรับหูหนาน","ร้านแถวที่พัก อุ่นเครื่องรับทริป",["food","อาหาร"],120]
    ]},
    2:{t:"สู่เมืองโบราณเฟิ่งหวง",m:"",s:[
      ["10:00","🚄 Zhangjiajie West → สถานีเฟิ่งหวงกู่เฉิง","รถไฟความเร็วสูง ~50 นาที",["move","เดินทาง"],56],
      ["12:00","🏨 เช็กอิน Yuanshe Riverview (ริมน้ำ)","宿旅·原舍江景民宿（南华店）· วิวแม่น้ำถัวเจียง",["move","ที่พัก"]],
      ["14:00","🏮 เดินเมืองเก่า สะพานหงเฉียว","เข้าตัวเมืองฟรี! ตั๋วรวม 9 จุด (บ้านเสิ่นฉงเหวิน+กำแพงเมือง+ล่องเรือ) ¥148",["spot","ที่เที่ยว"],148],
      ["18:00","🦆 มื้อเย็นของท้องถิ่นเซียงซี","เป็ดเลือดข้าวเหนียว (血粑鸭) + ปลาเปรี้ยวชนเผ่าแม้ว (酸鱼) ร้านแถวถนนริมน้ำมีให้เลือกเยอะ",["food","อาหาร"],90],
      ["19:30","🌃 ไฟเมืองเก่าริมแม่น้ำถัวเจียง","จุดถ่ายรูปสะท้อนน้ำสวยสุดของทริป — อย่าลืม power bank",["spot","ที่เที่ยว"]]
    ]},
    3:{t:"เฟิ่งหวงยามเช้า → ฝูหรงเจิ้น",m:"",s:[
      ["07:30","🛶 ล่องเรือแม่น้ำถัวเจียงยามเช้า","แสงเช้า + หมอกบนน้ำ คนน้อยกว่ากลางวันมาก",["spot","ที่เที่ยว"],30],
      ["13:00","🚄 เฟิ่งหวง → สถานีฝูหรงเจิ้น","รถไฟ ~30 นาที",["move","เดินทาง"],22],
      ["15:00","🏨 เช็กอิน Xuanyuan Courtyard B&B","悬园·观景庭院民宿（芙蓉镇景区店）· วิวน้ำตก",["move","ที่พัก"]],
      ["16:30","💦 เมืองโบราณบนน้ำตกฝูหรง","เมืองพันปีที่ตั้งอยู่บนน้ำตกจริง ๆ · ตั๋วเข้าเมือง ¥103 (รวมโชว์)",["spot","ที่เที่ยว"],103],
      ["19:00","🥢 ปาท่องโก๋สายไหม + โชว์ไฟน้ำตก","ของขึ้นชื่อฝูหรง · น้ำตกเปิดไฟยามค่ำสวยมาก",["food","อาหาร"],40]
    ]},
    4:{t:"ฝูหรงยามเช้า → กลับจางเจียเจี้ย",m:"",s:[
      ["08:30","📸 เก็บตกน้ำตกแสงเช้า","มุมสะพานข้ามหุบ ถ่ายทั้งเมือง+น้ำตกเฟรมเดียว",["spot","ที่เที่ยว"]],
      ["12:30","🚄 ฝูหรงเจิ้น → Zhangjiajie West","รถไฟ ~40 นาที",["move","เดินทาง"],33],
      ["15:00","🏨 เช็กอิน Xijian Shanyu (หน้าอุทยาน)","喜见·山语酒店（张家界国家森林公园标志门店）",["move","ที่พัก"]],
      ["16:00","🎫 ซื้อตั๋วอุทยาน 4 วัน + รถราง","¥236 ที่เคาน์เตอร์ (ตั๋ว ¥165 + รถรางในอุทยาน) · สแกนหน้าเข้าได้เลยวันถัดไป",["spot","ที่เที่ยว"],236],
      ["18:30","🍜 มื้อเย็นหน้าประตูป่าดึกดำบรรพ์","พักผ่อนเร็ว พรุ่งนี้ลุยหนัก",["food","อาหาร"],90]
    ]},
    5:{t:"อุทยานจางเจียเจี้ย วันแรก — ฝั่งอวตาร",m:"",s:[
      ["08:00","⛰️ เข้าประตูอู่หลิงหยวน + ลิฟต์ไป่หลง","ลิฟต์แก้วกลางหน้าผาสูงสุดในโลก",["spot","ที่เที่ยว"],65],
      ["10:00","🗻 หยวนเจียเจี้ย เสาหินอวตาร","จุดชมวิวเทียนเสี้ยตี้อี้เฉียว (สะพานหินธรรมชาติ)",["spot","ที่เที่ยว"]],
      ["13:00","🍱 ข้าวกล่องบนเขา","ร้านบนเขาแพง แนะนำเตรียมเสบียงขึ้นไปด้วย",["food","อาหาร"],50],
      ["19:00","🥘 หม้อไฟสามหินถู่เจีย","ร้านดังในหมู่บ้านอู่หลิงหยวน",["food","อาหาร"],138]
    ]},
    6:{t:"อุทยานวันสอง → ย้ายไปเทียนเหมินซาน",m:"",s:[
      ["08:00","🚠 เทียนจื่อซาน + สวนเฮ่อหลง","กระเช้าขึ้น เดินชมวิวยอดเขา",["spot","ที่เที่ยว"],72],
      ["11:30","🍜 ข้าวกลางวันแถวประตูอุทยาน","ร้านท้องถิ่นก่อนเดินธาร ราคาย่อมเยากว่าบนเขา",["food","อาหาร"],45],
      ["12:30","🏞️ ธารทองจินเปียน","เดินเลียบธาร 5.7 กม. ทางเรียบ ผ่อนขา",["spot","ที่เที่ยว"]],
      ["15:30","🚗 รถไปเมืองจางเจียเจี้ย (ฝั่งเทียนเหมินซาน)","~40 นาที",["move","เดินทาง"],30],
      ["17:30","🏨 เช็กอิน The Mansion Inn","四大名筑美学客栈（天门山国家森林公园店）",["move","ที่พัก"]],
      ["19:00","🥘 มื้อเย็นซานเซี่ยกัว (三下锅)","หม้อไฟสไตล์จางเจียเจี้ย เนื้อ+เครื่องในหมู+เต้าหู้ อุ่นท้องก่อนลุยวันถัดไป",["food","อาหาร"],110]
    ]},
    7:{t:"เทียนเหมินซาน + Sky Ladder",m:"",s:[
      ["07:30","🚡 กระเช้าเทียนเหมินซาน","⚠️ เช็กสถานะซ่อมบำรุงก่อนไป (ปิดช่วงกลาง-ยอดเขา ณ ก.ค.69) ยาวสุดในโลก 7.4 กม. · ตั๋วรวม ¥285 · จองรอบเช้าล่วงหน้า",["spot","ที่เที่ยว"],285],
      ["10:00","🚪 ประตูสวรรค์ + บันได 999 ขั้น (Sky Ladder)","มุมถ่ายรูปไฮไลต์ของทริป",["spot","ที่เที่ยว"]],
      ["13:00","🌉 ระเบียงกระจกหน้าผา","เสียวสุดในทริป · ค่าถุงผ้าหุ้มรองเท้า",["spot","ที่เที่ยว"],5],
      ["19:00","🍲 มื้อเย็นเมืองจางเจียเจี้ย","แถวตีนกระเช้า มีร้านให้เลือกเยอะ",["food","อาหาร"],100]
    ]},
    8:{t:"เช้าว่าง → กลับฉางซา",m:"",s:[
      ["09:00","🧺 ตลาดเช้า/เก็บตกเมืองจางเจียเจี้ย","ซื้อของฝากท้องถิ่น ชาถู่เจีย",["spot","ที่เที่ยว"],50],
      ["13:00","🚄 Zhangjiajie West → ฉางซาใต้","~3 ชม.",["move","เดินทาง"],210],
      ["16:30","🏨 เช็กอิน Pujing Hotel ฉางซา","长沙璞境酒店 · ติดรถไฟฟ้าสถานี Gaoqiao North",["move","ที่พัก"]],
      ["19:00","🦞 กุ้งเผายือเหวินเหอโหย่ว","ฉลองกลับเมืองใหญ่ · จองคิวผ่านแอปตอน 17:00",["food","อาหาร"],250]
    ]},
    9:{t:"เที่ยวฉางซาเต็มวัน",m:"",s:[
      ["09:00","🏛️ พิพิธภัณฑ์หูหนาน","จองล่วงหน้า 7 วันผ่านเว็บ/WeChat (เปิดจองรอบใหม่ทุก 20:00) · ชุดไหมมาดามซินจุย",["spot","ที่เที่ยว"]],
      ["13:00","🍊 เกาะส้ม + รถราง","รถราง ¥40 ไปสุดเกาะ รูปปั้นเหมาเจ๋อตงหนุ่ม",["spot","ที่เที่ยว"],44],
      ["16:00","🧋 IFS + Sexy Tea","หมี KAWS ชั้น 7 + ชานมแก้วดัง",["spot","ที่เที่ยว"],19],
      ["18:30","🏮 ถนนโผจื่อเจีย","เต้าหู้เหม็นดำฮั่วกงเตี้ยน + ของกินเล่นยามค่ำ",["food","อาหาร"],80]
    ]},
    10:{t:"เก็บตกฉางซา → บินกลับไทย",m:"",s:[
      ["09:00","🛍️ ช้อปของฝากหวงซิงลู่","ขนม เครื่องเทศ ชา — เผื่อที่ว่างในกระเป๋าไว้ด้วย",["spot","ที่เที่ยว"],150],
      ["12:00","🥟 มื้อสุดท้าย เส้นหมี่หูหนาน","ปิดทริปด้วยชามที่กินวันแรกไม่ได้ 😄",["food","อาหาร"],13],
      ["14:30","🚖 ไปสนามบินหวงฮวา T2","เผื่อเวลาถึงก่อนไฟลท์ 2.5 ชม.",["move","เดินทาง"],100],
      ["18:00","✈️ CZ559 ฉางซา → BKK","ต่อเครื่องกว่างโจว · ถึงไทย 01:30",["move","เดินทาง"]]
    ]}
  });
  // แปลง stop จาก array ตำแหน่งเดิม (seed data ด้านบน) เป็น object ทันทีตอนประกาศ — ต้องทำก่อน
  // renderDay(1) ด้านล่างซึ่งอ่านค่าแบบ object เลย (normalizeStop hoisted มาใช้ได้ทั้งที่นิยามท้ายไฟล์)
  Object.keys(days).forEach(function(n){days[n].s=days[n].s.map(normalizeStop)});
  var curDay=1;
  /* ---- การ์ดจุดหมาย 1 ใบ — ใช้ร่วมกันทั้งแผนเที่ยวรายวัน (ดูอย่างเดียว) และโต๊ะวางแผน (แก้ไขได้)
     ต่างกันแค่ editable: true จะมี data-idx/role=button/class พิเศษให้คลิกเปิดแก้ไขได้ ---- */
  function stopCardHTML(s,idx,editable){
    return '<div class="stop"><div class="stop-card'+(editable?' stop-card-editable':'')+'"'+
      (editable?' data-idx="'+idx+'" role="button" tabindex="0" aria-label="แก้ไขจุดหมายนี้"':'')+'>'+
      '<div class="stop-time num">'+esc(s.time)+'</div>'+
      '<div class="stop-body"><h4>'+esc(s.title)+'</h4><p>'+esc(s.desc)+'</p>'+
      '<span class="tag '+s.cat[0]+'">'+esc(s.cat[1])+'</span>'+
      (s.cost?'<span class="tag cost num">¥'+s.cost+'</span>':'')+'</div></div></div>';
  }
  function renderDayInto(tlSel,titleSel,metaSel,n,d,editable){
    var tl=$(tlSel);
    if(!tl)return;
    if(!d||!d.s||!d.s.length){
      $(titleSel).innerHTML="วัน "+n+" · <em>ยังไม่ได้วางแผน</em>";
      $(metaSel).textContent=editable?"กด “+ เพิ่มจุดหมายในวันนี้” ด้านล่างเพื่อเริ่มวางแผน":"แตะ “เพิ่มจุดหมาย” เพื่อเริ่มวางแผน";
      tl.innerHTML='<div class="stop"><div class="stop-card"><div class="stop-body"><h4>วันนี้ยังว่างอยู่ 🐼</h4><p>ลองถามหลิงหลิงว่า “วัน '+n+' ที่จางเจียเจี้ยควรไปไหนดี” แล้วกดเพิ่มเข้าแผนได้เลย</p></div></div></div>';
      return;
    }
    $(titleSel).innerHTML="วัน "+n+" · <em>"+d.t+"</em>";
    $(metaSel).textContent=d.m;
    tl.innerHTML=d.s.map(function(s,idx){return stopCardHTML(s,idx,editable)}).join("");
  }
  function renderDay(n){
    curDay=n;
    var d=days[n];
    renderDayInto("#timeline","#itinTitle","#itinMeta",n,d,false);
    renderDayInto("#planTimeline","#planItinTitle","#planItinMeta",n,d,true);
  }
  renderDay(1);
  function renderBacklogTimeline(){
    var tl=$("#backlogTimeline");
    if(!tl)return;
    $("#backlogMeta").textContent=backlog.length+" ใบ";
    tl.innerHTML=backlog.length?backlog.map(function(s,idx){return stopCardHTML(s,idx,true)}).join("")
      :'<div class="stop"><div class="stop-card"><div class="stop-body"><h4>ยังไม่มีไอเดียเก็บไว้</h4><p>กด “+ เพิ่มไอเดียใหม่” ด้านล่าง — ใส่ไว้ก่อน ค่อยลากไปจัดวันทีหลังได้</p></div></div></div>';
  }
  function renderDayStrip(){
    var html="";
    for(var n=1;n<=activeTrip.dayCount;n++)
      html+='<button class="day-chip'+(n===curDay?' active':'')+'" data-day="'+n+'"><b>วัน '+n+'</b>'+(dayDates[n]||"")+'</button>';
    [$("#dayStrip"),$("#planDayStrip")].forEach(function(strip){
      if(!strip)return;
      strip.innerHTML=html;
      // ทริปยาว (แถบเลื่อนได้ ~3 จอ) — เลื่อนให้ชิปวันที่เลือกอยู่ใน view เสมอหลัง re-render
      // ไม่งั้นสลับระหว่างทริปยาวสองทริป scrollLeft ค้างที่เดิมแต่ active กลับไปวัน 1 นอกจอ
      var act=strip.querySelector(".day-chip.active");
      if(act)act.scrollIntoView({inline:"center",block:"nearest"});
    });
  }
  function goToDay(n){
    [$("#dayStrip"),$("#planDayStrip")].forEach(function(strip){
      if(!strip)return;
      $$(".day-chip",strip).forEach(function(x){x.classList.toggle("active",+x.dataset.day===n)});
    });
    renderDay(n);
  }
  $("#dayStrip").addEventListener("click",function(e){
    var c=e.target.closest(".day-chip");if(!c)return;
    goToDay(+c.dataset.day);
  });
  $("#planDayStrip").addEventListener("click",function(e){
    var c=e.target.closest(".day-chip");if(!c)return;
    goToDay(+c.dataset.day);
  });
  $("#planTimeline").addEventListener("click",function(e){
    var c=e.target.closest(".stop-card[data-idx]");if(!c)return;
    openStopModal(curDay,+c.dataset.idx);
  });
  $("#planTimeline").addEventListener("keydown",function(e){
    if(e.key!=="Enter"&&e.key!==" ")return;
    var c=e.target.closest(".stop-card[data-idx]");if(!c)return;
    e.preventDefault();openStopModal(curDay,+c.dataset.idx);
  });
  $("#backlogTimeline").addEventListener("click",function(e){
    var c=e.target.closest(".stop-card[data-idx]");if(!c)return;
    openStopModal(0,+c.dataset.idx);
  });
  $("#backlogTimeline").addEventListener("keydown",function(e){
    if(e.key!=="Enter"&&e.key!==" ")return;
    var c=e.target.closest(".stop-card[data-idx]");if(!c)return;
    e.preventDefault();openStopModal(0,+c.dataset.idx);
  });
  $("#planAddStopBtn").addEventListener("click",function(){openStopModal(curDay,null)});
  $("#planAddIdeaBtn").addEventListener("click",function(){openStopModal(0,null)});
  $("#planOptimizeBtn").addEventListener("click",function(){optimizeDay(curDay)});

  /* ---- เพิ่ม/แก้ไข/ลบจุดหมาย — แก้ไขได้เฉพาะจากโต๊ะวางแผน (บอร์ด) เท่านั้น
     แผนเที่ยวรายวันเป็นหน้าดูอย่างเดียว (read-only) ตามที่ป๋าโจต้องการ ---- */
  var stopEditCtx=null; // {ci,idx} — ci: 0=ไอเดีย(backlog), 1..N=วัน · idx เป็น null เมื่อกำลังเพิ่มใหม่
  function openStopModal(ci,idx){
    var arr=colArr(ci);
    var s=(idx!=null)?arr[idx]:null;
    stopEditCtx={ci:ci,idx:idx,pendingStopId:s?s.id:uid("s_")};
    $("#stopModalTitle").textContent=s?"✏️ แก้ไขจุดหมาย":"➕ เพิ่มจุดหมาย";
    var dayOpts='<option value="0">💡 ไอเดีย (ยังไม่จัดวัน)</option>';
    for(var dn=1;dn<=activeTrip.dayCount;dn++)dayOpts+='<option value="'+dn+'">วัน '+dn+(dayDates[dn]?" ("+dayDates[dn]+")":"")+'</option>';
    $("#stopDay").innerHTML=dayOpts;
    $("#stopDay").value=ci;
    $("#stopTime").value=(s&&s.time!=="--")?s.time:"";
    $("#stopPlace").value=s?s.title:"";
    $("#stopDesc").value=s?s.desc:"";
    $("#stopCat").value=s?s.cat[1]:"ที่เที่ยว";
    $("#stopBudget").value=(s&&s.cost)?s.cost:"";
    $("#stopDeleteBtn").style.display=s?"":"none";
    $("#stopModal").classList.add("show");
    $("#stopPlace").focus();
    renderStopDocs();
  }
  function closeStopModal(){
    // ถ้าปิดโดยไม่ได้บันทึกจุดหมายใหม่ ให้เคลียร์ไฟล์แนบที่อัปโหลดค้างไว้ (กันไฟล์กำพร้าใน IndexedDB)
    if(stopEditCtx&&!stopEditCtx.saved&&stopEditCtx.idx==null){
      docList(activeTrip.id,stopEditCtx.pendingStopId).then(function(list){
        list.forEach(function(f){docDelete(f.id)});
      });
    }
    $("#stopModal").classList.remove("show");stopEditCtx=null;
  }
  $("#stopModal").addEventListener("click",function(e){
    if(!e.target.closest(".picker-panel"))closeStopModal();
  });
  $("#stopSaveBtn").addEventListener("click",function(){
    var place=$("#stopPlace").value.trim();
    if(!place){$("#stopPlace").focus();return}
    var catLabel=$("#stopCat").value;
    var budget=$("#stopBudget").value?Number($("#stopBudget").value):null;
    var newCi=+$("#stopDay").value;
    var entry={time:$("#stopTime").value||"--",title:place,desc:$("#stopDesc").value.trim(),cat:catMap[catLabel]||["spot","ที่เที่ยว"],cost:budget,id:stopEditCtx.pendingStopId};
    // เอาออกจากที่เดิมก่อนเสมอ (ถ้ามีอยู่แล้ว) แล้วค่อยใส่ที่ใหม่ — วิธีเดียวกันไม่ว่าจะแค่แก้ข้อมูลเดิม
    // หรือย้ายวัน (เปลี่ยนวันแล้วก็แค่ "เอาออกจากที่เดิม ใส่ที่ใหม่ เรียงลำดับใหม่" เหมือนแก้เวลาทุกประการ)
    if(stopEditCtx.idx!=null)colArr(stopEditCtx.ci).splice(stopEditCtx.idx,1);
    colArr(newCi).push(entry);
    if(newCi>0)sortDay(newCi);
    stopEditCtx.saved=true;
    persistCurrentTrip();
    renderBoard();renderDay(curDay);renderDayStrip();renderBacklogTimeline();
    closeStopModal();
  });
  $("#stopDeleteBtn").addEventListener("click",function(){
    var arr=colArr(stopEditCtx.ci);
    arr.splice(stopEditCtx.idx,1);
    docList(activeTrip.id,stopEditCtx.pendingStopId).then(function(list){
      list.forEach(function(f){docDelete(f.id)});
    });
    stopEditCtx.saved=true; // จุดหมายถูกลบแล้ว ไม่ต้องให้ closeStopModal() เคลียร์ไฟล์ซ้ำ
    persistCurrentTrip();
    renderBoard();renderDay(curDay);renderDayStrip();renderBacklogTimeline();
    closeStopModal();
  });

  /* ---- เอกสารแนบระดับจุดหมาย (ในตัว stopModal) ---- */
  function fmtBytes(n){return n<1024?n+" B":n<1048576?Math.round(n/1024)+" KB":(n/1048576).toFixed(1)+" MB"}
  function renderStopDocs(){
    var box=$("#stopDocList");
    if(!stopEditCtx){box.innerHTML="";return}
    docList(activeTrip.id,stopEditCtx.pendingStopId).then(function(list){
      if(!stopEditCtx)return; // ปิด modal ไปแล้วระหว่างรอโหลด
      box.innerHTML=list.map(function(f){
        var ic=f.type==="application/pdf"?"📄":"🖼️";
        return '<div class="doc-item"><span class="doc-ic">'+ic+'</span>'+
          '<span class="doc-name" data-view-doc="'+f.id+'" title="เปิดดู · '+esc(f.name)+'">'+esc(f.name)+'</span>'+
          '<span class="doc-size num">'+fmtBytes(f.size)+'</span>'+
          '<button class="doc-del" data-del-doc="'+f.id+'" aria-label="ลบไฟล์นี้" title="ลบไฟล์นี้">🗑️</button></div>';
      }).join("");
    });
  }
  $("#stopDocAddBtn").addEventListener("click",function(){$("#stopDocInput").click()});
  $("#stopDocInput").addEventListener("change",/** @this {HTMLInputElement} */ function(){
    var files=Array.prototype.slice.call(this.files||[]);
    this.value="";
    if(!files.length||!stopEditCtx)return;
    var tripId=activeTrip.id,stopId=stopEditCtx.pendingStopId;
    Promise.all(files.map(function(f){
      if(f.size>DOC_MAX_BYTES){alert('ไฟล์ "'+f.name+'" ใหญ่เกิน 5MB ข้ามไฟล์นี้ไปนะครับ');return null}
      return docAdd(tripId,stopId,f);
    })).then(renderStopDocs);
  });
  $("#stopDocList").addEventListener("click",function(e){
    var del=e.target.closest("[data-del-doc]");
    if(del){
      if(confirm("ลบไฟล์นี้?"))docDelete(del.dataset.delDoc).then(renderStopDocs);
      return;
    }
    var view=e.target.closest("[data-view-doc]");
    if(view){
      docGet(view.dataset.viewDoc).then(function(rec){
        if(!rec)return;
        var url=URL.createObjectURL(rec.blob);
        window.open(url,"_blank");
        setTimeout(function(){URL.revokeObjectURL(url)},60000);
      });
    }
  });

  /* ---- FAQ ออฟไลน์ (เดิมกรอบเป็น "แชท AI หลายชั้น" — ตัดกรอบนั้นออกแล้ว เหลือแค่ค้นหาคำถามจาก
     FAQ ที่เตรียมไว้ในเครื่องตรงๆ ไม่มีการันตี "ชั้น 2/3" ที่ไม่มีจริง ---- */
  var LFAQ=[
    {id:"csx-faq-0001",p:9,t:["ร้านเช้า","อาหารเช้า","กินเช้า","มื้อเช้า","breakfast"],
     a:"แนะนำร้านเส้นหมี่เมี่ยนฝู่หูหนานค่ะป๋า เส้นข้าวน้ำซุปกระดูกชามละ ¥13 เปิดตั้งแต่ตี 5 ครึ่ง เดินจากที่พัก 6 นาทีค่ะ"},
    {id:"csx-faq-0002",p:9,t:["เย็นนี้กิน","มื้อเย็น","ดินเนอร์","กุ้ง","ของกินดัง"],
     a:"มื้อเย็นต้องเหวินเหอโหย่วค่ะ กุ้งเผายือเจ้าดังของฉางซา คิวยาวมาก กดจองคิวผ่านแอปตั้งแต่ 5 โมงเย็นนะคะ 🦞"},
    {id:"csx-faq-0003",p:8,pin:"pozi",t:["เต้าหู้เหม็น","สตรีทฟู้ด","ของกินเล่น","ถนนคนเดิน"],
     a:"ไปถนนโผจื่อเจียเลยค่ะ เต้าหู้เหม็นดำต้องร้านฮั่วกงเตี้ยน คนแน่นหลัง 6 โมงเย็น ระวังกระเป๋าด้วยนะคะ 🏮"},
    {id:"csx-faq-0004",p:8,pin:"orange",t:["เกาะส้ม","จุดชมวิว","พระอาทิตย์ตก","รูปปั้นเหมา"],
     a:"เกาะส้มอยู่กลางแม่น้ำเซียงค่ะ นั่งสาย 2 ลง Juzizhou ต่อรถราง ¥40 รอบเกาะ ช่วงเย็นถึงค่ำสวยสุดค่ะ 🍊"},
    {id:"csx-faq-0005",p:9,t:["ไปจางเจียเจี้ย","รถไฟ","สถานีรถไฟ","ฉางซาใต้"],
     a:"นั่งรถไฟความเร็วสูงจากฉางซาใต้ไปจางเจียเจี้ยตะวันตก ~3 ชม. ค่ะ วันแรก (12 ก.ย.) ลงเครื่อง 10:50 แล้วต่อรถไฟช่วงบ่ายพอดี เผื่อเวลาเข้าสถานี 40 นาทีนะคะ 🚄"},
    {id:"csx-faq-0006",p:7,t:["พิพิธภัณฑ์","มาดามซินจุย","ชุดไหม"],
     a:"พิพิธภัณฑ์หูหนานเข้าฟรีค่ะ แต่ต้องจองล่วงหน้า 7 วันผ่านเว็บ/WeChat (เปิดจองรอบใหม่ทุกวัน 20:00) ⚠️ ปิดทุกวันจันทร์ — แผนเราวางไว้วันอาทิตย์ที่ 20 ก.ย. (วัน 9) พอดี เลี่ยงได้สวย ๆ ค่ะ"},
    {id:"csx-faq-0007",p:10,phrase:["ไม่เอาเผ็ด","不要辣","bú yào là","ปู๋ เหย้า ล่า"],t:["ไม่เผ็ด","ขอไม่เผ็ด","ไม่กินเผ็ด"],
     a:"พูดว่า “ปู๋ เหย้า ล่า” (不要辣) ค่ะ — ขยายตัวใหญ่ให้โชว์แม่ค้าแล้วนะคะ 🌶️🚫"},
    {id:"csx-faq-0008",p:8,pin:"ifs",t:["จุดถ่ายรูป","หมี kaws","ตึก ifs","แลนด์มาร์ก","ifs"],
     a:"IFS ฉางซาค่ะ ชั้น 7 มีหมี KAWS บนดาดฟ้า แสงสวยสุดช่วงเย็น ปักหมุดบนแผนที่ให้แล้วค่ะ 🧸"},
    {id:"csx-faq-0009",p:7,pin:"yuelu",t:["เขาเยว่ลู่","ภูเขา","กระเช้า"],
     a:"เขาเยว่ลู่ค่ะ ขาขึ้นนั่งกระเช้า ¥30 เก็บแรงไว้เดินชมวิทยาลัยเยว่ลู่พันปี ไปเช้าหมอกสวยค่ะ ⛰️"},
    {id:"fh-faq-0001",p:9,t:["เฟิ่งหวง","เมืองโบราณ","ล่องเรือถัวเจียง","ถัวเจียง"],
     a:"เมืองโบราณเฟิ่งหวงค่ะ เข้าตัวเมืองฟรี! ถ้าอยากเข้าจุดสำคัญ (บ้านเสิ่นฉงเหวิน+ล่องเรือ+อื่นๆ) ซื้อตั๋วรวม ¥148 ค่ะ แนะนำล่องเรือเช้าตรู่คนน้อยหมอกสวย ตอนค่ำไฟเมืองเก่าสะท้อนน้ำคือไฮไลต์ 🏮"},
    {id:"fr-faq-0001",p:9,t:["ฝูหรง","น้ำตก","หมี่โต้วฝู่","ปาท่องโก๋"],
     a:"ฝูหรงเจิ้นคือเมืองพันปีที่ตั้งอยู่บนน้ำตกจริง ๆ ค่ะ ตั๋วเข้าเมือง ¥103 (รวมโชว์แล้ว) อย่าพลาดหมี่โต้วฝู่ร้านดังกับโชว์ไฟน้ำตกยามค่ำนะคะ 💦"},
    {id:"tms-faq-0001",p:9,t:["เทียนเหมินซาน","กระเช้า","ประตูสวรรค์","บันได 999","sky ladder"],
     a:"เทียนเหมินซานค่ะ ⚠️ ช่วงนี้กระเช้ากลาง-ยอดเขากำลังปิดซ่อม ต้องเช็กสถานะใกล้วันเดินทางอีกทีนะคะ ราคาปกติตั๋วรวม ¥285 ต้องจองรอบล่วงหน้า คิวหน้างานยาวมากค่ะ 🚡"},
    {id:"zjj-faq-0001",p:8,t:["ไปเฟิ่งหวง","ไปฝูหรง","จางเจียเจี้ยตะวันตก","ต่อรถไฟ"],
     a:"ใช้สถานีจางเจียเจี้ยตะวันตกเป็นฮับค่ะ รถไฟไปเฟิ่งหวง ~50 นาที · ฝูหรง ~40 นาที · กลับฉางซาใต้ ~3 ชม.ค่ะ 🚄"}
  ];
  function tier1(q){
    var n=q.toLowerCase(),best=null,bs=0;
    LFAQ.forEach(function(f){
      var hits=f.t.filter(function(t){return n.includes(t.toLowerCase())}).length;
      var s=hits*10+(f.p||0);
      if(hits>0&&s>bs){best=f;bs=s}
    });
    return best;
  }
  function sendChat(text){
    var box=$("#chatMsgs");
    var mine=document.createElement("div");
    mine.className="msg me";mine.textContent=text;box.appendChild(mine);
    box.scrollTop=box.scrollHeight;
    setTimeout(function(){
      var f=tier1(text);
      var ai=document.createElement("div");
      ai.className="msg ai";
      var src='<small style="display:block;color:var(--faint);font-size:.62rem;margin-top:4px">';
      if(f){
        ai.innerHTML=f.a+src+'จาก FAQ ในแอป · '+f.id+' · ออฟไลน์ 100%</small>';
        if(f.pin){
          var pinEl=document.querySelector('.map-pin[data-pin="'+f.pin+'"]');
          if(pinEl){showView("map");pinEl.dispatchEvent(new Event("click"))}
        }
        if(f.phrase)openBig(f.phrase);
      }else{
        ai.innerHTML='ยังไม่มีคำตอบสำหรับคำถามนี้ใน FAQ ค่ะ ลองคำอื่น หรือดูหมวดวลี/แพ็กข้อมูลเมืองแทนได้นะคะ 🔍'+src+'ค้นจาก FAQ ในเครื่อง</small>';
      }
      box.appendChild(ai);box.scrollTop=box.scrollHeight;
    },600);
  }
  $("#chatSend").addEventListener("click",function(){
    var v=$("#chatBox").value.trim();
    if(v){sendChat(v);$("#chatBox").value=""}
  });
  $("#chatBox").addEventListener("keydown",function(e){
    if(e.key==="Enter"){var v=e.target.value.trim();if(v){sendChat(v);e.target.value=""}}
  });
  $$(".chips button").forEach(function(b){
    b.addEventListener("click",function(){sendChat(b.dataset.q)});
  });

  /* ---- currency ---- */
  var RATE=4.86,cny=$("#fxCny"),thb=$("#fxThb");
  // fmt ย้ายไป js/utils.js แล้ว (import ด้านบน)
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

  /* ---- หูฟังราคา (feature 2.1): ASR ฟังราคาจีน → กรอกช่อง CNY อัตโนมัติ
     ก่อนสร้างฟีเจอร์นี้ ทดสอบเทียบ Whisper-tiny (ผ่าน WebGPU) กับ Vosk ด้วยเสียงจีนจริงก่อน (ไม่ใช่แค่ synthetic
     noise) — Whisper ผิดตัวเลขทั้ง 2 เคสทดสอบ (บางครั้งผิดแบบเงียบๆ อันตรายกว่า) ส่วน Vosk ถูกทั้งคู่ ถึงเลือกมาใช้จริง
     (ดู docs/business/DEPLOYMENT-QA.md) — โมเดล vosk-model-small-cn-0.22 (~44MB) vendor ไว้เองใน models/ ไม่พึ่ง CDN
     ภายนอก (เหตุผลเดียวกับที่ vendor maplibre/pmtiles ไว้เอง — พึ่ง CDN ต่างชาติเสี่ยงเข้าไม่ได้ตอนอยู่ในจีนจริง) */
  var MODEL_URL="models/vosk-model-small-cn.tar.gz";
  var voskModel=null,voskRecognizer=null,micStream=null,audioCtx=null,micNode=null;

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

  /* ---- Fare Guard (feature 2.4): เช็คราคาแท็กซี่/DiDi ก่อนขึ้นรถ
     ข้อมูลจริงที่มี: ค้นในแผนรายวันหูหนานเจอแค่ 2 รายการที่เป็นค่ารถแท็กซี่จริง (🚗/🚖 ไม่ใช่รถไฟ/เครื่องบิน)
     — ไม่พอจะทำเป็นตารางเรทต่อเมืองที่ยืนยันแล้ว เลยแยก 2 ส่วน: (1) โชว์ราคาจริงที่มีเท่าที่มี ไม่ปั้นเพิ่ม
     (2) เครื่องมือประมาณช่วงราคาคร่าวๆ จากโครงสร้างมิเตอร์แท็กซี่จีนทั่วไป (ค่าเริ่มต้น+ต่อกิโล) — บอกชัดว่า
     เป็นค่าประมาณทั่วไป ไม่ใช่เรทยืนยันเฉพาะเมือง กันไม่ให้ผู้ใช้เข้าใจผิดว่าแม่นระดับเดียวกับราคาจริงที่บันทึกไว้ */
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

  /* ---- แปลงราคา = จดบัญชีเลย (feature 1.6) + สมุดบันทึกผูกกับระบบหลายทริปจริง (feature 1.4)
     journalState เป็นของทริปที่กำลังเปิดอยู่เท่านั้น — สลับ/สร้าง/นำเข้าทริปแล้วจะสลับชุดนี้ตาม (ดู switchToLiveData) */
  function defaultJournalEntries(){
    // ของเดิมที่เคย hardcode ไว้เป็นดีโมทริปหูหนาน — ใช้เป็นค่าเริ่มต้นของทริป "default" เท่านั้น
    return [
      {ic:"🦞",title:"กุ้งเผายือฉางซา ถนนโผจื่อเจีย",cat:"อาหาร · เผ็ดจริงตามคำร่ำลือ 🌶️",time:"19:20",cny:128},
      {ic:"🎫",title:"ตั๋วรถรางเกาะส้ม + จุดชมวิวเหมาเจ๋อตง",cat:"ตั๋วเข้าชม · จองผ่าน mini-program",time:"14:00",cny:40},
      {ic:"🧋",title:"ชานมกล้วยไม้ Sexy Tea (茶颜悦色)",cat:"อาหาร · ต่อคิว 20 นาที คุ้ม!",time:"11:30",cny:19},
      {ic:"🚇",title:"รถไฟฟ้าสาย 2 → สถานี Wuyi Square",cat:"เดินทาง · บัตรเที่ยว 1 วัน",time:"09:10",cny:4},
      {ic:"🥟",title:"เสี่ยวหลงเปา + โจวร้อน ร้านหน้าโรงแรม",cat:"อาหาร · จ่ายด้วย Alipay",time:"07:45",cny:28},
      {ic:"📊",title:"ยอดสะสมวันที่ 1-8 (ก่อนเริ่มบันทึกละเอียด)",cat:"สรุป",time:"",cny:1067}
    ];
  }
  /** @type {{spent:number, entries:JournalEntry[]}} */
  var journalState={spent:1286,entries:defaultJournalEntries()}; // ค่าเริ่มต้น = ดีโมทริปหูหนาน สลับทริปแล้วจะถูกแทนที่
  function renderJournalSummary(){
    var total=journalState.spent,budget=activeTrip.budget||0,days=activeTrip.dayCount||1;
    $("#jTotalSpent").textContent="¥"+fmt(total);
    $("#jTotalSub").textContent="≈ ฿"+fmt(total*RATE)+" · "+days+" วัน";
    $("#jRemaining").textContent=budget>0?"¥"+fmt(budget-total):"—";
    $("#jRemainingSub").textContent=budget>0?"จากงบ ¥"+fmt(budget):"ยังไม่ได้ตั้งงบ";
    $("#jAvgPerDay").textContent="¥"+fmt(total/days);
  }
  function renderJournalEntries(){
    $("#expListSaved").innerHTML=journalState.entries.map(function(e){
      return html`<div class="exp"><div class="exp-ic">${e.ic}</div><div class="exp-body"><h5>${e.title}</h5>`+
        html`<span>${e.time?e.time+" · ":""}${e.cat}</span></div><div class="exp-amt num"><b>¥${fmt(e.cny)}</b><span>≈ ฿${fmt(e.cny*RATE)}</span></div></div>`;
    }).join("")||'<div class="sub2">ยังไม่มีรายการ — กดบันทึกจากกล่องแลกเงิน หรือ "＋ จดรายการใหม่" ได้เลย</div>';
  }
  $("#fxSaveExpense").addEventListener("click",function(){
    var amt=parseFloat(cny.value);
    if(!amt||amt<=0){cny.focus();return}
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

  /* ---- city packs ---- */
  var packs=[
    {id:"cs",flag:"🌶️",n:"ฉางซา",cn:"长沙",size:214,st:"ok",note:"อัปเดต 16 ก.ค.",parts:["แผนที่","POI 1,240 จุด","รถไฟฟ้า","เมนูร้านดัง"],trip:1},
    {id:"zjj",flag:"⛰️",n:"จางเจียเจี้ย",cn:"张家界",size:186,st:"ok",note:"อัปเดต 16 ก.ค.",parts:["แผนที่","เส้นเทรลอุทยาน","กระเช้า/รถบัส"],trip:1},
    {id:"fh",flag:"🏮",n:"เฟิ่งหวง",cn:"凤凰古城",size:96,st:"none",note:"",parts:["แผนที่เมืองเก่า","POI 320 จุด","ล่องเรือ/ตั๋ว"],trip:1},
    {id:"fr",flag:"💦",n:"ฝูหรงเจิ้น",cn:"芙蓉镇",size:64,st:"none",note:"",parts:["แผนที่","POI 180 จุด","น้ำตก/โชว์ไฟ"],trip:1},
    {id:"tms",flag:"🚡",n:"เทียนเหมินซาน",cn:"天门山",size:88,st:"ok",note:"อัปเดต 18 ก.ค.",parts:["แผนที่","กระเช้า/บันได 999","ระเบียงกระจก"],trip:1},
    {id:"bj",flag:"🏮",n:"ปักกิ่ง",cn:"北京",size:412,st:"none",note:"",parts:["แผนที่","POI 2,900 จุด","รถไฟฟ้า 27 สาย"],trip:0},
    {id:"sh",flag:"🌃",n:"เซี่ยงไฮ้",cn:"上海",size:386,st:"none",note:"",parts:["แผนที่","POI 2,400 จุด","รถไฟฟ้า"],trip:0},
    {id:"cd",flag:"🐼",n:"เฉิงตู",cn:"成都",size:298,st:"none",note:"",parts:["แผนที่","POI 1,700 จุด","ศูนย์วิจัยแพนด้า"],trip:0}
  ];
  function packHtml(p){
    var badge=p.st==="ok"?'<span class="pk-badge ok">✓ ติดตั้งแล้ว</span>'
      :p.st==="update"?'<span class="pk-badge update">มีอัปเดต</span>'
      :p.st==="dl"?'<span class="pk-badge update">กำลังโหลด…</span>'
      :'<span class="pk-badge none">ยังไม่ได้โหลด</span>';
    var foot;
    if(p.st==="dl"){
      foot='<div class="pack-bar"><i style="width:'+p.pct+'%"></i></div><span class="pct num">'+p.pct+'%</span>';
    }else{
      var btn=p.st==="ok"?'<button class="btn-ghost" data-act="del" data-id="'+p.id+'">ลบ</button>'
        :p.st==="update"?'<button class="btn-gold" data-act="dl" data-id="'+p.id+'">อัปเดต</button>'
        :'<button class="btn-gold" data-act="dl" data-id="'+p.id+'">⬇ ดาวน์โหลด</button>';
      foot='<span class="pack-size num">'+p.size+' MB'+(p.note?' · '+p.note:'')+'</span>'+btn;
    }
    return '<div class="pack" id="pack-'+p.id+'">'+
      '<div class="pack-top"><div class="pack-flag">'+p.flag+'</div><h4>'+p.n+'<small>'+p.cn+'</small></h4>'+badge+'</div>'+
      '<div class="pack-chips">'+p.parts.map(function(x){return '<span>'+x+'</span>'}).join('')+'</div>'+
      '<div class="pack-foot">'+foot+'</div></div>';
  }
  function renderPacks(){
    $("#packGridTrip").innerHTML=packs.filter(function(p){return p.trip}).map(packHtml).join("");
    $("#packGridMore").innerHTML=packs.filter(function(p){return !p.trip}).map(packHtml).join("");
    var used=0,cnt=0;
    packs.forEach(function(p){if(p.st!=="none"&&p.st!=="dl"){used+=p.size;cnt++}});
    $("#storeUsed").textContent=used+" MB";
    $("#storeFill").style.width=Math.min(100,used/2048*100)+"%";
    $("#packCount").textContent=cnt+" เมือง";
  }
  $("#view-packs").addEventListener("click",function(e){
    var b=e.target.closest("[data-act]");if(!b)return;
    var p=packs.filter(function(x){return x.id===b.dataset.id})[0];
    if(b.dataset.act==="del"){p.st="none";p.note="";renderPacks();return}
    var isUpd=p.st==="update";
    p.st="dl";p.pct=0;renderPacks();
    var t=setInterval(function(){
      p.pct=Math.min(100,p.pct+(isUpd?16:6)+Math.floor(Math.random()*6));
      var el=$("#pack-"+p.id);
      if(el){el.querySelector(".pack-bar i").style.width=p.pct+"%";el.querySelector(".pct").textContent=p.pct+"%"}
      if(p.pct>=100){clearInterval(t);p.st="ok";p.note="เพิ่งดาวน์โหลด";renderPacks()}
    },220);
  });
  renderPacks();

  /* ---- ไฮไลต์แนะนำ GTTS (feature 2.2 ตัดขอบเขต) ----
     บทความ GTTS จริงยังไม่มีเนื้อหาเจาะจง 7 เมืองที่แอปนี้ครอบคลุม (ตรวจสอบแล้ว 2026-07-23
     — ดู docs/business/DEPLOYMENT-QA.md) เลยเริ่มจากระบบให้ทีมป้อนไฮไลต์เองแบบ manual ก่อน
     ใช้ข้อมูลจริงที่วิจัย/ยืนยันพิกัดไว้แล้วในแอป (pinData + itinerary หูหนาน) เป็นชุดตัวอย่างเริ่มต้น
     — ทีมเพิ่มเมือง/ไฮไลต์ใหม่ได้เองโดยแก้ object GTTS_HIGHLIGHTS นี้ตรงๆ ไม่ต้องรอบทความจริง */
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

  /* ---- phrases ---- */
  var phCats=[["sos","🚨 ฉุกเฉิน"],["food","🍜 ร้านอาหาร"],["move","🚇 เดินทาง"],["shop","🛍️ ช้อปปิ้ง"],["hotel","🏨 โรงแรม"]];
  var phrases={
    sos:[
      ["ช่วยด้วย!","救命!","jiù mìng","จิ้ว-มิ่ง"],
      ["เรียกตำรวจให้หน่อย","请帮我叫警察","qǐng bāng wǒ jiào jǐngchá","ฉิ่ง ปัง หว่อ เจี้ยว จิ่ง-ฉา"],
      ["ฉันต้องไปโรงพยาบาล","我要去医院","wǒ yào qù yīyuàn","หว่อ เหย้า ชวี่ อี-ย่วน"],
      ["ฉันแพ้อาหารทะเล","我对海鲜过敏","wǒ duì hǎixiān guòmǐn","หว่อ ตุ้ย ไห่-เซียน กั้ว-หมิ่น"],
      ["กระเป๋าเงินหาย","我的钱包丢了","wǒ de qiánbāo diū le","หว่อ เตอ เฉียน-เปา ติว เลอ"],
      ["ฉันหลงทาง ช่วยหน่อย","我迷路了，请帮帮我","wǒ mílù le, qǐng bāngbang wǒ","หว่อ หมี-ลู่ เลอ, ฉิ่ง ปัง-ปัง หว่อ"]
    ],
    food:[
      ["ไม่เอาเผ็ด","不要辣","bú yào là","ปู๋ เหย้า ล่า"],
      ["ไม่ใส่ผักชี","不要香菜","bú yào xiāngcài","ปู๋ เหย้า เซียง-ไช่"],
      ["เอาอันนี้ 1 ที่","要这个，一份","yào zhège, yí fèn","เหย้า เจ้อ-เก้อ, อี๋ เฟิ่น"],
      ["ขอน้ำเปล่าเย็น 1 ขวด","要一瓶冰水","yào yì píng bīng shuǐ","เหย้า อี้ ผิง ปิง สุ่ย"],
      ["เช็กบิล","买单","mǎi dān","หม่าย-ตัน"],
      ["อร่อยมาก!","很好吃!","hěn hǎochī","เหิ่น ห่าว-ชือ"]
    ],
    move:[
      ["สถานีรถไฟฟ้าอยู่ทางไหน","地铁站在哪里","dìtiě zhàn zài nǎlǐ","ตี้-เถี่ย จ้าน ไจ้ หนา-หลี่"],
      ["พาไปที่นี่ (โชว์ที่อยู่)","请带我去这里","qǐng dài wǒ qù zhèlǐ","ฉิ่ง ไต้ หว่อ ชวี่ เจ้อ-หลี่"],
      ["จอดตรงนี้ได้เลย","停这里就可以","tíng zhèlǐ jiù kěyǐ","ถิง เจ้อ-หลี่ จิ้ว เข่อ-อี่"],
      ["ห้องน้ำอยู่ไหน","洗手间在哪里","xǐshǒujiān zài nǎlǐ","สี-โส่ว-เจียน ไจ้ หนา-หลี่"],
      ["ไปสนามบินใช้เวลานานไหม","去机场要多久","qù jīchǎng yào duōjiǔ","ชวี่ จี-ฉ่าง เหย้า ตัว-จิ่ว"]
    ],
    shop:[
      ["ราคาเท่าไหร่","多少钱","duōshǎo qián","ตัว-เส่า เฉียน"],
      ["ลดหน่อยได้ไหม","便宜一点可以吗","piányí yìdiǎn kěyǐ ma","เผียน-อี๋ อี้-เตี่ยน เข่อ-อี่ มา"],
      ["แพงไปหน่อย","太贵了","tài guì le","ไท่ กุ้ย เลอ"],
      ["สแกนจ่ายได้ไหม","可以扫码吗","kěyǐ sǎo mǎ ma","เข่อ-อี่ เส่า หม่า มา"],
      ["ขอถุงใบนึง","要一个袋子","yào yí ge dàizi","เหย้า อี๋ เกอ ไต้-จึ"]
    ],
    hotel:[
      ["เช็กอิน จองในชื่อ…","办理入住，名字是…","bànlǐ rùzhù, míngzi shì…","ปั้น-หลี่ รู่-จู้, หมิง-จึ ชื่อ…"],
      ["ขอรหัส Wi-Fi หน่อย","Wi-Fi密码是多少","Wi-Fi mìmǎ shì duōshǎo","วาย-ฟาย มี่-หม่า ชื่อ ตัว-เส่า"],
      ["ฝากกระเป๋าได้ไหม","可以寄存行李吗","kěyǐ jìcún xínglǐ ma","เข่อ-อี่ จี้-ฉุน สิง-หลี่ มา"],
      ["แอร์เสีย ช่วยดูหน่อย","空调坏了","kōngtiáo huài le","คง-เถียว ไฮว่ เลอ"],
      ["เช็กเอาต์ ขอบคุณครับ/ค่ะ","退房，谢谢","tuì fáng, xièxie","ทุ่ย ฝัง, เซี่ย-เซี่ย"]
    ]
  };
  var curCat="sos";
  function renderPhrases(){
    $("#phCats").innerHTML=phCats.map(function(c){
      return '<button class="cat-chip'+(c[0]===curCat?' active':'')+'" data-cat="'+c[0]+'" role="tab" aria-selected="'+(c[0]===curCat)+'">'+c[1]+'</button>';
    }).join("");
    $("#phGrid").innerHTML=phrases[curCat].map(function(p,i){
      return '<div class="ph-card" data-i="'+i+'" tabindex="0" role="button" aria-label="'+p[0]+'">'+
        '<button class="ph-speak" data-i="'+i+'" aria-label="อ่านออกเสียง: '+p[0]+'">🔊</button>'+
        '<span class="th">'+p[0]+'</span><span class="cn">'+p[1]+'</span>'+
        '<span class="py">'+p[2]+'</span><span class="pron">อ่านว่า: '+p[3]+'</span>'+
        '<span class="ph-hint">แตะเพื่อขยายโชว์ให้คนจีนอ่าน ↗</span></div>';
    }).join("");
  }
  /* ---- เสียงพูดภาษาจีน (feature 1.5): ใช้ไฟล์เสียงจริงที่อัดไว้ล่วงหน้าก่อน (ไม่พึ่ง voice ของเครื่อง)
     ตกไป speechSynthesis เฉพาะประโยคที่ไม่มีไฟล์ (เช่น ประโยคคนขับที่ประกอบชื่อสถานที่แบบไดนามิก) */
  var phraseAudioMap=(function(){
    var map={};
    phCats.forEach(function(c){
      (phrases[c[0]]||[]).forEach(function(p,i){map[p[1]]="audio/phrases/"+c[0]+"-"+i+".mp3"});
    });
    return map;
  })();
  var curPhraseAudio=null;
  function speakCn(txt){
    if(curPhraseAudio){curPhraseAudio.pause();curPhraseAudio=null}
    var file=phraseAudioMap[txt];
    if(file){curPhraseAudio=new Audio(file);curPhraseAudio.play();return}
    if(!window.speechSynthesis)return;
    var u=new SpeechSynthesisUtterance(txt);u.lang="zh-CN";u.rate=.85;
    speechSynthesis.cancel();speechSynthesis.speak(u);
  }
  var bigShow=$("#bigShow");
  function openBig(p){
    $("#bigCn").textContent=p[1];$("#bigPy").textContent=p[2];
    $("#bigTh").textContent=p[0]+" · อ่านว่า "+p[3];
    bigShow.classList.add("show");
  }
  $("#view-phrases").addEventListener("click",function(e){
    var chip=e.target.closest(".cat-chip");
    if(chip){curCat=chip.dataset.cat;renderPhrases();return}
    var sp=e.target.closest(".ph-speak");
    if(sp){speakCn(phrases[curCat][+sp.dataset.i][1]);return}
    var card=e.target.closest(".ph-card");
    if(card)openBig(phrases[curCat][+card.dataset.i]);
  });
  $("#view-phrases").addEventListener("keydown",function(e){
    var card=e.target.closest(".ph-card");
    if(card&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openBig(phrases[curCat][+card.dataset.i])}
  });
  bigShow.addEventListener("click",function(e){
    if(e.target.closest("#bigSpeak"))return;
    bigShow.classList.remove("show");
  });
  $("#bigSpeak").addEventListener("click",function(e){
    e.stopPropagation();speakCn($("#bigCn").textContent);
  });
  renderPhrases();

  /* ---- ready checklist ---- */
  // ทริปที่สร้าง/นำเข้าใหม่ยังไม่มีเช็กลิสต์เฉพาะเมือง — ใช้ชุดนี้เป็นค่าเริ่มต้นทั่วไปไปก่อน (ดู switchToLiveData)
  /** @returns {ChecklistCategory[]} */
  function defaultChecklist(){return [
    {cat:"เอกสาร",ic:"🛂",items:[
      {t:"พาสปอร์ตเหลืออายุเกิน 6 เดือน",n:"หมดอายุ มี.ค. 2572 — ผ่าน",done:true},
      {t:"เช็กเงื่อนไขฟรีวีซ่าจีน 30 วัน",n:"ไทย–จีน ฟรีวีซ่าถาวร ไม่ต้องยื่นเอกสาร",done:true},
      {t:"พิมพ์ใบจองโรงแรม + ตั๋วรถไฟ",n:"เผื่อ ตม. ถาม · เก็บไฟล์ไว้ในแอปแล้วด้วย",done:true},
      {t:"ซื้อประกันเดินทาง",n:"คุ้มครองสุขภาพ + เที่ยวบินดีเลย์",done:false,due:"ก่อนบิน 7 วัน",act:{kind:"aff",label:"🛡️ เทียบประกัน ↗",href:"https://www.axa.co.th/travel-insurance"}},
      {t:"จองตั๋วเดินทาง/เข้าชมล่วงหน้า",n:"เครื่องบิน รถไฟ ตั๋วอุทยาน — จองผ่าน Booking Hub ในโต๊ะวางแผนได้เลย",done:false,due:"ก่อนบิน 5 วัน",act:{kind:"view",view:"plan",label:"🎟️ ไปจองเลย"}}
    ]},
    {cat:"การเงิน",ic:"💰",items:[
      {t:"เปิด Alipay ผูกบัตรเครดิต",n:"ใช้จ่ายหลักที่จีน สแกน QR ได้ทุกร้าน",done:true},
      {t:"เปิด WeChat Pay สำรอง",n:"บางร้านเล็กรับแต่ WeChat",done:true},
      {t:"แลกเงินสด CNY สำรอง",n:"แนะนำ ¥1,000 ติดตัว เผื่อร้านไม่รับสแกน",done:false,due:"ก่อนบิน 3 วัน",act:{kind:"aff",label:"📈 เช็กเรทวันนี้ ↗",href:"https://www.superrichthailand.com"}},
      {t:"แจ้งธนาคารใช้บัตรที่ต่างประเทศ",n:"กันบัตรโดนล็อกตอนรูดที่จีน",done:true}
    ]},
    {cat:"ดิจิทัล",ic:"📱",items:[
      {t:"โหลดแผนที่ฉางซา + จางเจียเจี้ย + เทียนเหมินซาน",n:"เสร็จแล้ว 460 MB ใช้ออฟไลน์ได้",done:true},
      {t:"โหลดแผนที่เฟิ่งหวง + ฝูหรง",n:"ไปหน้าแพ็กข้อมูลเมือง → กดดาวน์โหลด",done:false,due:"ก่อนบิน 1 วัน",act:{kind:"view",view:"packs",label:"📦 ไปโหลดเลย"}},
      {t:"ซื้อ eSIM จีน 15GB",n:"เปิดใช้เมื่อลงเครื่อง ไม่ต้องเปลี่ยนซิม",done:true,act:{kind:"aff",label:"📶 ซื้อ eSIM ↗",href:"https://www.klook.com/th/search/result/?query=china+esim&aid=YOUR_AID"}},
      {t:"ติดตั้ง VPN",n:"สำหรับใช้ LINE / Google / Facebook ที่จีน",done:true},
      {t:"โหลดวลีจีน + เสียงอ่านออฟไลน์",n:"อยู่ในแอปครบแล้ว 5 หมวด",done:true}
    ]},
    {cat:"สัมภาระ",ic:"🎒",items:[
      {t:"ปลั๊กแปลง Type A/C/I",n:"จีนใช้ 220V ขาแบนเหมือนไทยเป็นส่วนใหญ่",done:true},
      {t:"จัดยาประจำตัว + ยาสามัญ",n:"ยาแก้แพ้ ยาแก้ท้องเสีย พลาสเตอร์",done:false,due:"ก่อนบิน 2 วัน"},
      {t:"เสื้อกันฝน / ร่มพับ",n:"กลาง ก.ย. หูหนานยังมีฝน + หมอกบนเขาหนา",done:true},
      {t:"รองเท้าเดินเขา",n:"จางเจียเจี้ยเดินวันละ 15,000+ ก้าว",done:true},
      {t:"Power bank ไม่เกิน 20,000 mAh",n:"เกินนี้ขึ้นเครื่องไม่ได้",done:true}
    ]}
  ]}
  /** @type {ChecklistCategory[]} */
  var checklist=defaultChecklist();
  var RING_C=326.7;
  function renderChecklist(){
    $("#clGrid").innerHTML=checklist.map(function(c,ci){
      var done=c.items.filter(function(i){return i.done}).length;
      return html`<div class="cl-card">`+
        html`<div class="cl-head"><span>${c.ic}</span><h4>${c.cat}</h4>`+
        html`<span class="cnt num${done===c.items.length?' full':''}">${done}/${c.items.length}${done===c.items.length?' ✓':''}</span></div>`+
        c.items.map(function(it,ii){
          return html`<div class="cl-item${it.done?' done':''}" data-ci="${ci}" data-ii="${ii}" role="checkbox" aria-checked="${!!it.done}" tabindex="0">`+
            html`<span class="cl-check">${it.done?'✓':''}</span>`+
            html`<div class="cl-body"><div class="cl-t">${it.t}</div><div class="cl-n">${it.n}</div></div>`+
            (it.act&&!it.done?(it.act.kind==="view"
              ?html`<button class="cl-act" data-view-link="${it.act.view}">${it.act.label}</button>`
              :html`<a class="cl-act aff" target="_blank" rel="noopener sponsored" href="${it.act.href}">${it.act.label}</a>`):'')+
            (it.due&&!it.done?html`<span class="cl-due">${it.due}</span>`:'')+
            '</div>';
        }).join("")+'</div>';
    }).join("");
  }
  function updateReady(){
    var total=0,done=0,pending=[];
    checklist.forEach(function(c){c.items.forEach(function(i){
      total++;if(i.done)done++;else pending.push(i.t);
    })});
    var pct=Math.round(done/total*100);
    $("#readyPct").textContent=pct+"%";
    $("#ringPct").textContent=pct+"%";
    $("#ringDone").textContent=done+"/"+total;
    $("#readyFill").style.width=pct+"%";
    $("#readyBar").setAttribute("aria-valuenow",pct);
    $("#ringFg").style.strokeDashoffset=RING_C*(1-pct/100);
    $("#ringMsg").textContent=pct>=100?"พร้อมบินเต็มร้อย! 🎉":pct>=75?"เกือบพร้อมแล้ว 🐼":pct>=50?"ไปได้ครึ่งทางแล้ว":"เริ่มเตรียมตัวกันเถอะ";
    $("#readyHint").textContent=pending.length===0?"ครบทุกรายการ พร้อมออกเดินทาง! 🎉"
      :"เหลือ: "+pending.slice(0,2).join(" · ")+(pending.length>2?" +อีก "+(pending.length-2):"");
    // checklist[0].items[3] คือ "ประกันเดินทาง" ในเช็กลิสต์ default — แต่ทริปที่นำเข้าจาก .gopanda
    // ไฟล์นอกอาจมี checklist สั้นกว่านี้ (ไม่ validate schema) เลยต้อง guard ก่อนอ่าน ไม่งั้น throw
    // แล้วพัง switchToLiveData() กลางคันจนฟังก์ชัน render อื่นที่ตามมาไม่ทำงานเลย
    var ins=checklist[0]&&checklist[0].items&&checklist[0].items[3],strip=$("#sosInsurance");
    if(strip){
      if(!ins){
        strip.className="ins-strip";
        strip.innerHTML="";
      }else{
        strip.className="ins-strip"+(ins.done?" ok":"");
        strip.innerHTML=ins.done
          ?"🛡️ ประกันเดินทาง: <b>คุ้มครองแล้ว</b> · กรมธรรม์ TR-889-004512 · เคลมโทร 02-123-4567 กด 2 (ภาษาไทย)"
          :"⚠️ <b>ยังไม่ได้ซื้อประกันเดินทาง</b> — แตะเพื่อไปติ๊กในเช็กลิสต์ก่อนบิน (แนะนำซื้อก่อนบิน 7 วัน)";
      }
    }
  }
  function toggleItem(el){
    var it=checklist[+el.dataset.ci].items[+el.dataset.ii];
    it.done=!it.done;
    renderChecklist();updateReady();persistCurrentTrip();
  }
  $("#clGrid").addEventListener("click",function(e){
    var vl=e.target.closest("[data-view-link]");
    if(vl){showView(vl.dataset.viewLink);return}
    if(e.target.closest(".cl-act"))return;
    var el=e.target.closest(".cl-item");if(el)toggleItem(el);
  });
  $("#clGrid").addEventListener("keydown",function(e){
    var el=e.target.closest(".cl-item");
    if(el&&(e.key==="Enter"||e.key===" ")){e.preventDefault();toggleItem(el)}
  });
  renderChecklist();updateReady();

  /* ---- driver card & saved places ---- */
  var places=[
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
  function openDriverCard(p){
    placePick.classList.remove("show");
    $("#drvHead").innerHTML='师傅您好，请带我去：<small>(คนขับครับ ช่วยพาไปที่นี่หน่อยครับ)</small>';
    $("#drvTitle").textContent=p.cn;
    $("#drvLines").innerHTML=html`<div>${p.addr}</div>`+(p.tel?html`<div style="color:#a5f3fc">☎ ${p.tel}</div>`:'');
    $("#drvThai").textContent=p.th+" · "+p.py;
    drvSpeakTxt="请带我去"+p.cn+"，地址是"+p.addr;
    driverShow.classList.add("show");
  }
  function openInfoCard(cfg){
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

  /* ---- Discovery: คลังสถานที่ (Planning Phase § 3 — docs/design/TRIP-PLANNING-WORKFLOW.md)
     ข้อมูลจาก js/discovery-data.js (Changsha v1.1 ผ่าน QA จากกุ๊กไก่แล้ว 2026-08-03)
     กดเพิ่มแล้วตกเข้า backlog ("ไอเดียที่ยังไม่จัดวัน") เสมอ — ใช้ flow ลากเข้าวันที่มีอยู่แล้ว
     ไม่ต้องมี "เลือกวัน" ซ้ำในโมดัลนี้ ---- */
  var discoveryCat="all",discoverySearchTerm="";
  /** @param {import("./discovery-data.js").DiscoveryCard} card @returns {string} */
  function discoveryCardHTML(card){
    var seniorBadge=(card.seniorScore!=null&&card.seniorScore>=4)
      ?html`<span class="tag" title="${card.seniorNote||''}">♿ ${card.seniorScore}/5</span>`:'';
    return html`<div class="stop-card"><div class="stop-body"><h4>${card.name_th}</h4><p>${card.pitch}</p>`+
      html`<span class="tag ${card.cat[0]}">${card.cat[1]}</span>`+seniorBadge+
      (card.note?html`<p style="font-size:.72rem;color:var(--faint);margin-top:4px">💡 ${card.note}</p>`:'')+
      `<button class="btn-gold" data-discovery-add="${card.id}" style="margin-top:8px;width:100%;justify-content:center">＋ เพิ่มเข้าไอเดีย</button>`+
      '</div></div>';
  }
  function renderDiscoveryList(){
    var city=/** @type {HTMLSelectElement} */($("#discoveryCity")).value;
    var cards=(DISCOVERY[city]||[]).filter(function(c){
      var catOk=discoveryCat==="all"||(c.cat[0]+(c.cat[0]==="move"?"-"+c.cat[1]:""))===discoveryCat;
      var searchOk=!discoverySearchTerm||c.name_th.toLowerCase().indexOf(discoverySearchTerm)>-1;
      return catOk&&searchOk;
    });
    $("#discoveryList").innerHTML=cards.length
      ?cards.map(discoveryCardHTML).join("")
      :'<div class="sub2">ไม่พบสถานที่ที่ตรงกับตัวกรอง</div>';
  }
  function addDiscoveryCard(id){
    var city=/** @type {HTMLSelectElement} */($("#discoveryCity")).value;
    var card=(DISCOVERY[city]||[]).find(function(c){return c.id===id});
    if(!card)return;
    backlog.push({time:"--",title:card.name_th,desc:card.pitch,cat:card.cat,cost:null,id:uid("s_")});
    renderBacklogTimeline();renderBoard();persistCurrentTrip();
    var toast=$("#planToast");
    toast.textContent="✓ เพิ่ม \""+card.name_th+"\" เข้าไอเดียแล้ว";toast.hidden=false;
    setTimeout(function(){toast.hidden=true},3000);
  }
  $("#openDiscovery").addEventListener("click",function(){
    $("#discoveryModal").classList.add("show");renderDiscoveryList();
  });
  $("#discoveryModal").addEventListener("click",function(e){
    if(!e.target.closest(".picker-panel"))$("#discoveryModal").classList.remove("show");
    if(e.target.closest("#discoveryClose"))$("#discoveryModal").classList.remove("show");
    var addBtn=e.target.closest("[data-discovery-add]");
    if(addBtn)addDiscoveryCard(/** @type {HTMLElement} */(addBtn).dataset.discoveryAdd);
  });
  $("#discoveryCity").addEventListener("change",renderDiscoveryList);
  $("#discoverySearch").addEventListener("input",function(){
    discoverySearchTerm=/** @type {HTMLInputElement} */($("#discoverySearch")).value.trim().toLowerCase();
    renderDiscoveryList();
  });
  $("#discoveryCats").addEventListener("click",function(e){
    var c=e.target.closest(".cat-chip");if(!c)return;
    discoveryCat=/** @type {HTMLElement} */(c).dataset.cat||"all";
    $$("#discoveryCats .cat-chip").forEach(function(x){x.classList.toggle("active",x===c)});
    renderDiscoveryList();
  });

  /* ---- SOS page: บัตรสุขภาพฉุกเฉิน (แก้ไขได้จริง เก็บในเครื่องเท่านั้น) ---- */
  // กรุ๊ปเลือดเป็นชุดจำกัด (8 ค่า) แปลจีนได้แม่นยำ 100% — ต่างจากแพ้ยา/โรคประจำตัว/ยา
  // ที่เป็น free text ผู้ใช้พิมพ์เอง แปลอัตโนมัติแม่นๆ ไม่ได้ (เสี่ยงอันตรายถ้าแปลผิดตอนฉุกเฉินจริง)
  // เลยโชว์เป็นภาษาไทย/อังกฤษ+label ภาษาอังกฤษกำกับ แทนการเดี้ยงแปลเป็นจีนเอง
  var BLOOD_CN={"A+":"A型 RH阳性","A-":"A型 RH阴性","B+":"B型 RH阳性","B-":"B型 RH阴性","AB+":"AB型 RH阳性","AB-":"AB型 RH阴性","O+":"O型 RH阳性","O-":"O型 RH阴性"};
  var MED_PROFILE_KEY="gopanda_med_profile_v1";
  var medProfile=(function(){
    try{
      var saved=JSON.parse(localStorage.getItem(MED_PROFILE_KEY));
      if(saved)return saved;
    }catch(e){/* ข้อมูลเสีย — ใช้ค่าเริ่มต้นแทน */}
    return {name:"นายโจ ใจดี · MR. JOE JAIDEE",blood:"O+",allergy:"เพนิซิลลิน (Penicillin)",
      condition:"ความดันโลหิตสูง",meds:"Amlodipine 5mg (เช้า)",contactName:"คุณหมวย (ภรรยา)",contactTel:"+66 89 123 4567"};
  })();
  function renderMedCard(){
    $("#medName").textContent=medProfile.name||"—";
    $("#medBloodV").textContent=medProfile.blood||"ไม่ทราบ";
    $("#medBloodC").textContent=medProfile.blood?("血型 "+BLOOD_CN[medProfile.blood]):"";
    $("#medAllergyV").textContent=medProfile.allergy||"ไม่มี";
    $("#medConditionV").textContent=medProfile.condition||"ไม่มี";
    $("#medMedsV").textContent=medProfile.meds||"ไม่มี";
    $("#medContactV").textContent=[medProfile.contactName,medProfile.contactTel].filter(Boolean).join(" ")||"—";
  }
  renderMedCard();
  $("#medEditBtn").addEventListener("click",function(){
    $("#medFName").value=medProfile.name||"";
    $("#medFBlood").value=medProfile.blood||"";
    $("#medFAllergy").value=medProfile.allergy||"";
    $("#medFCondition").value=medProfile.condition||"";
    $("#medFMeds").value=medProfile.meds||"";
    $("#medFContactName").value=medProfile.contactName||"";
    $("#medFContactTel").value=medProfile.contactTel||"";
    $("#medModal").classList.add("show");
  });
  $("#medModal").addEventListener("click",function(e){
    if(!e.target.closest(".picker-panel"))$("#medModal").classList.remove("show");
  });
  $("#medSaveBtn").addEventListener("click",function(){
    medProfile={
      name:$("#medFName").value.trim(),blood:$("#medFBlood").value,
      allergy:$("#medFAllergy").value.trim(),condition:$("#medFCondition").value.trim(),
      meds:$("#medFMeds").value.trim(),
      contactName:$("#medFContactName").value.trim(),contactTel:$("#medFContactTel").value.trim()
    };
    localStorage.setItem(MED_PROFILE_KEY,JSON.stringify(medProfile));
    renderMedCard();
    $("#medModal").classList.remove("show");
  });

  $("#sosDriverHome").addEventListener("click",function(){openDriverCard(places[0])});
  $("#sosShowLoc").addEventListener("click",function(){
    openInfoCard({
      head:'我在这里，请过来帮我 <small>(ฉันอยู่ตรงนี้ ช่วยมาหาหน่อย)</small>',
      title:'湖南省长沙市芙蓉区',
      lines:['五一大道98号附近','28.1958° N, 112.9773° E'],
      thai:'ตำแหน่งปัจจุบันจาก GPS ออฟไลน์ · แม่นยำ ±8 เมตร',
      speak:'我在湖南省长沙市芙蓉区五一大道98号附近，请过来帮我'
    });
  });
  $("#sosShowMed").addEventListener("click",function(){
    var bloodTitle=medProfile.blood?('血型 '+esc(medProfile.blood)+'（'+BLOOD_CN[medProfile.blood]+'）'):'—';
    var lines=[
      medProfile.allergy?('Allergy 过敏: '+esc(medProfile.allergy)):"",
      medProfile.condition?('Condition 病史: '+esc(medProfile.condition)):"",
      medProfile.meds?('Medication 用药: '+esc(medProfile.meds)):"",
      (medProfile.contactName||medProfile.contactTel)?('Emergency contact 紧急联系人: '+esc(medProfile.contactName)+' '+esc(medProfile.contactTel)):""
    ].filter(Boolean);
    openInfoCard({
      head:'我需要帮助！医疗信息 <small>(ฉันต้องการความช่วยเหลือ — ข้อมูลสุขภาพ)</small>',
      title:bloodTitle,
      lines:lines,
      thai:[medProfile.blood&&("กรุ๊ปเลือด "+medProfile.blood),medProfile.allergy&&("แพ้ "+medProfile.allergy),medProfile.condition,medProfile.meds].filter(Boolean).join(" · "),
      speak:'我需要帮助。'+(medProfile.blood?('我的血型是'+medProfile.blood+'。'):'')
    });
  });
  $("#sosInsurance").addEventListener("click",function(){showView("ready")});
  $("#sosPhrases").addEventListener("click",function(){curCat="sos";renderPhrases();showView("phrases")});
  $("#sosPacksLink").addEventListener("click",function(){showView("packs")});
  updateReady();

  /* ---- booking affiliate — ย้ายไป js/booking-links.js แล้ว (import ด้านบน) ---- */
  function bookBtn(s){
    var u=null;
    if(/✈|บิน/.test(s.title))u=tripUrl("flights/",{dcity:"bkk",acity:"csx"});
    else if(/🚄|รถไฟ|Maglev/i.test(s.title))u=tripUrl("trains/",{});
    else if(s.cat[0]==="spot")u=klookUrl(cleanTitle(s.title));
    return u?'<a class="bbook" target="_blank" rel="noopener sponsored" href="'+u+'" title="จองผ่านพันธมิตร">🎟️ จอง</a>':'';
  }
  $("#bkFlight").href=tripUrl("flights/showfarefirst",{dcity:"bkk",acity:"csx",ddate:"2026-09-12",rdate:"2026-09-21",triptype:"rt",quantity:1});
  $("#bkHotel").href="https://www.trip.com/t/lcO7YWvrkV2"; // ลิงก์พันธมิตรที่ป๋าโจให้มาโดยตรง ไม่ผ่าน tripUrl() เพราะเป็นลิงก์สำเร็จรูปแล้ว
  $("#bkTrain").href=tripUrl("trains/list",{departurecity:"Changsha",arrivalcity:"Zhangjiajie",departdate:"2026-09-12"});
  $("#bkTripTtd").href=tripUrl("things-to-do/list",{keyword:"Zhangjiajie"});
  $("#bkKlook").href=klookUrl("จางเจียเจี้ย Zhangjiajie");
  $("#bkKkday").href=kkdayUrl("จางเจียเจี้ย");

  /* ---- planning board ---- */
  /* dayDates/dayDow ผูกกับทริปที่กำลังเปิดอยู่ (activeTrip.startDate + dayCount) คำนวณใหม่ทุกครั้งที่
     สลับ/สร้าง/โหลดทริป ผ่าน applyCalendar() — ใช้ Date object ล้วน จึงข้ามปี (เช่น 31 ธ.ค.→1 ม.ค.) ถูกต้องเอง */
  var THAI_MONTHS_ABBR=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  var THAI_DOW_FULL=["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์"];
  function computeCalendar(startISO,dayCount){
    var dates={},dow={},base=new Date(startISO+"T00:00:00");
    for(var n=1;n<=dayCount;n++){
      var d=new Date(base.getTime());
      d.setDate(d.getDate()+(n-1));
      dates[n]=d.getDate()+" "+THAI_MONTHS_ABBR[d.getMonth()];
      dow[n]=THAI_DOW_FULL[d.getDay()];
    }
    return {dates:dates,dow:dow};
  }
  var dayDates={},dayDow={};
  function applyCalendar(trip){
    var cal=computeCalendar(trip.startDate,trip.dayCount);
    dayDates=cal.dates;dayDow=cal.dow;
  }
  /* activeTrip ต้องมีค่าก่อน renderBoard()/runDoctor() ตัวแรกที่รันตอนโหลดสคริปต์ (ด้านล่าง) —
     ค่าเริ่มต้นนี้คือดีโมหูหนาน ระบบหลายทริปท้ายไฟล์จะ override ให้ตรงกับทริปที่บันทึกไว้ล่าสุดอีกที */
  var activeTrip={id:"default",name:"หูหนานครบสูตร",sub:"จางเจียเจี้ย · เฟิ่งหวง · ฝูหรง · เทียนเหมินซาน · ฉางซา",startDate:"2026-09-12",dayCount:10,budget:6000,cities:["ฉางซา","จางเจียเจี้ย","เฟิ่งหวง","ฝูหรง"]};
  applyCalendar(activeTrip);
  renderDayStrip();
  var backlog=[
    ["--","🦊 โชว์จิ้งจอกเหมยลี่ (天门狐仙)","โชว์กลางแจ้งฉากภูเขาจริงที่เทียนเหมินซาน รอบ 20:00 · เหมาะคืนวัน 6-7",["spot","ที่เที่ยว"],238],
    ["--","🌃 ล่องเรือแม่น้ำเซียงยามค่ำ","รอบ 20:00 เห็นไฟตึก IFS เต็มตา · เหมาะคืนวัน 8-9",["spot","ที่เที่ยว"],128],
    ["--","🍧 บิงเฟิ่นถนนไท่ผิง","ของหวานเย็นชื่นใจหลังเดินทั้งวันที่ฉางซา",["food","อาหาร"],15]
  ].map(normalizeStop);
  /** @param {number} n @returns {Day} */
  function getDay(n){if(!days[n])days[n]={t:"ยังไม่ได้วางแผน",m:"0 จุดหมาย",s:[]};return days[n]}
  /** @param {number} ci - 0 = backlog, 1..N = วันที่ n @returns {Stop[]} */
  function colArr(ci){return ci===0?backlog:getDay(ci).s}
  function colCost(ci){return colArr(ci).reduce(function(a,s){return a+(+s.cost||0)},0)}
  // เดิม renderBoard() วาด Kanban หลายคอลัมน์เข้า #board (การ์ดยัดข้อมูลแน่นจนกดแก้ไขไม่รู้ว่ากดตรงไหน
  // ป๋าโจ feedback ตรงๆ ว่า UX แย่) เปลี่ยนมาใช้ layout เดียวกับแผนเที่ยวรายวัน (day-tab + timeline
  // แนวตั้ง) แทนแล้ว ดู renderDay()/renderBacklogTimeline() — ฟังก์ชันนี้เหลือแค่คำนวณงบรวมแสดงผล
  function renderBoard(){
    var total=0;
    for(var n=1;n<=activeTrip.dayCount;n++){
      var d=getDay(n);d.m=d.s.length+" จุดหมาย";
      total+=colCost(n);
    }
    var bd=$("#planBudget");
    bd.className="budget-chip num"+(total>activeTrip.budget?" over":"");
    bd.innerHTML=(total>activeTrip.budget?"⚠️ ":"")+"แผนใช้จ่ายรวม ≈ <b>¥"+total.toLocaleString()+"</b> / งบทริป ¥"+activeTrip.budget.toLocaleString();
  }
  function sortDay(n){getDay(n).s.sort(function(a,b){return (a.time==="--"?"99":a.time).localeCompare(b.time==="--"?"99":b.time)})}
  renderBoard();
  renderBacklogTimeline();

  /* ---- เอกสารแนบระดับทริปทั้งก้อน (ตั๋วเครื่องบิน พาสปอร์ต ฯลฯ — ไม่ผูกกับจุดหมายไหนโดยเฉพาะ) ---- */
  function renderTripDocs(){
    var box=$("#tripDocList");
    docList(activeTrip.id,null).then(function(list){
      box.innerHTML=list.map(function(f){
        var ic=f.type==="application/pdf"?"📄":"🖼️";
        return '<div class="doc-item"><span class="doc-ic">'+ic+'</span>'+
          '<span class="doc-name" data-view-tdoc="'+f.id+'" title="เปิดดู · '+esc(f.name)+'">'+esc(f.name)+'</span>'+
          '<span class="doc-size num">'+fmtBytes(f.size)+'</span>'+
          '<button class="doc-del" data-del-tdoc="'+f.id+'" aria-label="ลบไฟล์นี้" title="ลบไฟล์นี้">🗑️</button></div>';
      }).join("")||'<div class="sub2">ยังไม่มีเอกสารแนบ</div>';
    });
  }
  $("#tripDocAddBtn").addEventListener("click",function(){$("#tripDocInput").click()});
  $("#tripDocInput").addEventListener("change",/** @this {HTMLInputElement} */ function(){
    var files=Array.prototype.slice.call(this.files||[]);
    this.value="";
    if(!files.length)return;
    var tripId=activeTrip.id;
    Promise.all(files.map(function(f){
      if(f.size>DOC_MAX_BYTES){alert('ไฟล์ "'+f.name+'" ใหญ่เกิน 5MB ข้ามไฟล์นี้ไปนะครับ');return null}
      return docAdd(tripId,null,f);
    })).then(renderTripDocs);
  });
  $("#tripDocList").addEventListener("click",function(e){
    var del=e.target.closest("[data-del-tdoc]");
    if(del){
      if(confirm("ลบไฟล์นี้?"))docDelete(del.dataset.delTdoc).then(renderTripDocs);
      return;
    }
    var view=e.target.closest("[data-view-tdoc]");
    if(view){
      docGet(view.dataset.viewTdoc).then(function(rec){
        if(!rec)return;
        var url=URL.createObjectURL(rec.blob);
        window.open(url,"_blank");
        setTimeout(function(){URL.revokeObjectURL(url)},60000);
      });
    }
  });
  renderTripDocs();

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
  var catMap={"อาหาร":["food","อาหาร"],"ที่เที่ยว":["spot","ที่เที่ยว"],"เดินทาง":["move","เดินทาง"],"ที่พัก":["move","ที่พัก"]};
  // parseCsv ย้ายไป js/utils.js แล้ว (import ด้านบน)
  // esc/safeHTML/html ย้ายไป js/utils.js แล้ว (import ด้านบน)
  function previewRows(rows){
    if(rows.length&&rows[0].join(",").indexOf("วัน")>-1)rows=rows.slice(1);
    rows=rows.filter(function(r){return r.length>=3&&+r[0]>=1&&+r[0]<=activeTrip.dayCount});
    parsedRows=rows;
    $("#impPreview").style.display="flex";
    if(!rows.length){
      $("#impTable").innerHTML="";
      $("#impMsg").textContent="อ่านไฟล์ไม่สำเร็จ หรือไม่พบแถวที่คอลัมน์ วัน = 1–10";
      return;
    }
    $("#impTable").innerHTML="<tr><th>วัน</th><th>เวลา</th><th>สถานที่</th><th>รายละเอียด</th><th>หมวด</th><th>งบ(¥)</th></tr>"+
      rows.slice(0,8).map(function(r){
        return "<tr><td class='num'>"+esc(r[0])+"</td><td class='num'>"+esc(r[1]||"--")+"</td><td>"+esc(r[2])+"</td><td>"+esc(r[3]||"")+"</td><td>"+esc(r[4]||"ที่เที่ยว")+"</td><td class='num'>"+esc(r[5]||"–")+"</td></tr>";
      }).join("");
    $("#impMsg").textContent="พบ "+rows.length+" รายการ"+(rows.length>8?" (แสดงตัวอย่าง 8 แถวแรก)":"")+" — กด “นำเข้าทั้งหมด” เพื่อยืนยัน";
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
  // csvField ย้ายไป js/utils.js แล้ว (import ด้านบน)
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
    var touched={};
    parsedRows.forEach(function(r){
      var n=+r[0],d=getDay(n);
      var cost=+String(r[5]||"").replace(/[^\d.]/g,"")||0;
      d.s.push({time:r[1]||"--",title:r[2],desc:r[3]||"",cat:catMap[r[4]]||["spot","ที่เที่ยว"],cost:cost,id:uid("s_")});
      touched[n]=1;
      if(d.t==="ยังไม่ได้วางแผน")d.t="แผนที่นำเข้าจากไฟล์";
    });
    Object.keys(touched).forEach(function(n){sortDay(+n)});
    renderBoard();renderDay(curDay);
    importModal.classList.remove("show");
    var toast=$("#planToast");
    toast.textContent="✓ นำเข้า "+parsedRows.length+" รายการ เข้าสู่วัน "+Object.keys(touched).join(", ")+" แล้ว";
    toast.hidden=false;
    setTimeout(function(){toast.hidden=true},5000);
    resetImport();
  });

  /* ---- Plan Doctor ---- */
  // toMin ย้ายไป js/utils.js แล้ว (import ด้านบน)
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

  /* ---- QR handoff & .gopanda file ---- */
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

  /* ---- Import .gopanda (reverse of dlTrip export above) ---- */
  var gopandaImportData=null;
  function resetGopandaImport(){
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
  $("#gopandaImportConfirm").addEventListener("click",function(){
    if(!gopandaImportData)return;
    var tm=gopandaImportData.trip||{};
    var tripName=tm.name||"ทริปนำเข้า";
    // ไฟล์เก่าก่อนรอบอัปเดต custom-วัน อาจมีแค่ dates:"YYYY-MM-DD/YYYY-MM-DD" ไม่มี startDate/dayCount ตรง ๆ
    var startDate=tm.startDate;
    var dayCount=tm.dayCount;
    if(!startDate&&tm.dates){
      var parts=String(tm.dates).split("/");
      startDate=parts[0];
      if(!dayCount&&parts[1]){
        var d1=new Date(parts[0]+"T00:00:00"),d2=new Date(parts[1]+"T00:00:00");
        dayCount=Math.round((+d2-+d1)/86400000)+1;
      }
    }
    // นำเข้าไฟล์แทนที่ days ทั้งก้อนภายใต้ tripId เดิม — stop เดิมทั้งหมด (พร้อม stopId เดิม) หายไป
    // เอกสารแนบที่เคยผูกกับ stopId เก่าจะกลายเป็นกำพร้าทันที เคลียร์ทิ้งไปพร้อมกันเลย (เหมือน deleteTrip)
    docList(activeTrip.id).then(function(list){list.forEach(function(f){docDelete(f.id)})});
    activeTrip={id:activeTrip.id,name:tripName,sub:activeTrip.sub,
      startDate:startDate||"2026-09-12",dayCount:dayCount||Object.keys(gopandaImportData.days||{}).length||10,
      budget:tm.budget||6000,cities:tm.cities||[]};
    switchToLiveData(gopandaImportData.days,gopandaImportData.backlog||[],gopandaImportData.journal||{spent:0,entries:[]},gopandaImportData.checklist||defaultChecklist());
    persistCurrentTrip();
    $("#qrModal").classList.remove("show");
    resetGopandaImport();
    var toast=$("#planToast");
    toast.textContent="✓ นำเข้าทริป \""+tripName+"\" แล้ว";
    toast.hidden=false;
    setTimeout(function(){toast.hidden=true},4000);
  });

  /* ---- Premium ---- */
  var isPremium=false;
  $("#openPremium").addEventListener("click",function(){$("#premModal").classList.add("show")});
  $("#premGo").addEventListener("click",function(){
    if(isPremium)return;
    isPremium=true;
    $("#premChip").hidden=false;
    $("#premGo").textContent="✓ เป็นสมาชิก Premium แล้ว — ขอบคุณที่สนับสนุนครับ 🐼";
    $("#premNote").textContent="ปลดล็อกแล้ว: ทุกเมือง · AI ไม่จำกัด · Party Mode · เสียงไกด์ HD";
    $("#openPremium").innerHTML="✨ Premium ใช้งานอยู่ <small>ทุกเมือง · AI ไม่จำกัด · Party Mode พร้อม</small>";
  });
  [$("#premModal"),$("#recapModal")].forEach(function(m){
    m.addEventListener("click",function(e){
      if(!e.target.closest(".picker-panel"))m.classList.remove("show");
    });
  });

  /* ---- เรียงเส้นทางอัจฉริยะ ---- */
  function optimizeDay(n){
    var d=getDay(n),toast=$("#planToast");
    if(d.s.length<3){
      toast.textContent="✨ วัน "+n+" จุดหมายน้อย เส้นทางเดิมดีอยู่แล้วค่ะ";
    }else{
      var a=d.s[1],b=d.s[2],t=a.time;a.time=b.time;b.time=t;
      sortDay(n);renderBoard();renderDay(curDay);
      toast.textContent="✨ วิเคราะห์พิกัด "+d.s.length+" จุดในวัน "+n+" — สลับลำดับช่วงกลางวัน ลดเดินย้อน ~1.2 กม. (ประหยัด ~40 นาที)";
    }
    toast.hidden=false;setTimeout(function(){toast.hidden=true},5000);
  }

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

  /* ---- ไกด์เสียงป๋าโจ — ซ่อนปุ่มไว้ก่อน (มีสคริปต์ครบแค่ฉางซา 4 จุด ยังไม่ครบทุกเมือง)
     คงฟังก์ชันไว้เผื่อนำกลับมาใช้ทีหลัง ---- */
  var pinGuide={
    ifs:"จุดนี้ต้องขึ้นลิฟต์ไปชั้นเจ็ดครับ ประติมากรรมหมีคอวส์อยู่บนดาดฟ้า ถ่ายรูปช่วงเย็นแสงสวยที่สุด และอย่าลืมลงชั้นใต้ดิน ของกินเพียบครับ",
    orange:"เกาะส้มยาวห้ากิโลเมตรครับ แนะนำนั่งรถรางไปสุดเกาะ ชมรูปปั้นเหมาเจ๋อตงหนุ่ม แล้วเดินย้อนกลับช่วงพระอาทิตย์ตก วิวแม่น้ำเซียงสวยมากครับ",
    pozi:"ถนนสายนี้อายุพันสองร้อยปีครับ เต้าหู้เหม็นดำต้องร้านฮั่วกงเตี้ยนเท่านั้น ต่อคิวหน่อยแต่คุ้ม ระวังกระเป๋าช่วงคนแน่นหลังหกโมงเย็นด้วยนะครับ",
    yuelu:"ขาขึ้นแนะนำนั่งกระเช้าครับ เก็บแรงไว้เดินชมวิทยาลัยเยว่ลู่พันปีด้านล่าง ขาลงค่อยเดินเทรล ช่วงเช้าหมอกสวยอากาศดีครับ"
  };
  function speakTh(txt,btn){
    if(!window.speechSynthesis)return;
    if(speechSynthesis.speaking){speechSynthesis.cancel();btn.textContent="🎧 ไกด์เสียง";return}
    var u=new SpeechSynthesisUtterance(txt);u.lang="th-TH";u.rate=1;
    u.onend=function(){btn.textContent="🎧 ไกด์เสียง"};
    btn.textContent="⏸ กำลังเล่าโดยป๋าโจ…";
    speechSynthesis.speak(u);
  }


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

  /* ---- โหมดประหยัดแบต (feature 1.3) ---- */
  $("#ecoToggle").addEventListener("click",function(){
    var on=document.body.classList.toggle("eco");
    this.classList.toggle("active",on);
  });

  /* ---- จองแล้ว → ติ๊กเช็กลิสต์อัตโนมัติ ---- */
  document.addEventListener("click",function(e){
    var b=/** @type {Element} */ (e.target).closest(".book-card,.bbook");
    if(!b)return;
    var label=b.classList.contains("bbook")?"รายการนี้":(b.querySelector("b")?b.querySelector("b").textContent:"ตั๋ว");
    setTimeout(function(){
      $("#bcText").textContent="เมื่อกี้จอง"+label+"สำเร็จไหมคะ?";
      $("#bookConfirm").hidden=false;
    },1200);
  });
  $("#bcYes").addEventListener("click",function(){
    $("#bookConfirm").hidden=true;
    /** @type {ChecklistItem|null} */
    var it=null;
    checklist.forEach(function(c){c.items.forEach(function(x){if(/จองตั๋ว/.test(x.t))it=x})});
    if(it&&!it.done){it.done=true;renderChecklist();updateReady();persistCurrentTrip();}
    var toast=$("#planToast");
    toast.textContent="✓ ติ๊ก “จองตั๋วล่วงหน้า” ในเช็กลิสต์ให้แล้ว — ความพร้อมตอนนี้ "+$("#readyPct").textContent;
    toast.hidden=false;setTimeout(function(){toast.hidden=true},5000);
  });
  $("#bcNo").addEventListener("click",function(){$("#bookConfirm").hidden=true});

  /* ---- หลายทริป: บันทึก/สลับ/ลบ ผ่าน localStorage ----
     แต่ละทริปมีปฏิทินของตัวเอง (startDate+dayCount) — คำนวณ dayDates/dayDow ใหม่ทุกครั้งที่สลับทริป
     ผ่าน applyCalendar() รองรับข้ามปีถูกต้อง (เช่นทริป 24 ธ.ค.–4 ม.ค. ข้ามปีใหม่) */
  var TRIPS_KEY="gopanda_trips_v1",ACTIVE_KEY="gopanda_active_trip_v1";
  function loadTripsList(){try{return JSON.parse(localStorage.getItem(TRIPS_KEY))||[]}catch(e){return[]}}
  function saveTripsList(list){localStorage.setItem(TRIPS_KEY,JSON.stringify(list))}
  // เติมฟิลด์ที่อาจขาดไปสำหรับทริปที่เคยบันทึกไว้ก่อนรอบอัปเดตนี้ (backward-compat)
  /** @param {any} t - ทริปที่โหลดมาจาก localStorage/.gopanda อาจขาดฟิลด์ใหม่ๆ ไป @returns {Trip} */
  function normalizeTrip(t){
    return {
      id:t.id,name:t.name,sub:t.sub||"",
      startDate:t.startDate||"2026-09-12",
      dayCount:t.dayCount||Object.keys(t.days||{}).length||10,
      budget:t.budget||6000,
      // ทริป "default" (หูหนาน) ที่บันทึกไว้ก่อนรอบที่เพิ่ม field cities จะไม่มีค่านี้เลย —
      // เติมย้อนหลังให้เฉพาะ id นี้ เพื่อไม่ให้ผู้ใช้เก่าต้องลบทริปแล้วสร้างใหม่
      cities:(t.cities&&t.cities.length)?t.cities:(t.id==="default"?["ฉางซา","จางเจียเจี้ย","เฟิ่งหวง","ฝูหรง"]:[]),
      days:t.days,backlog:t.backlog||[],
      journal:t.journal||{spent:0,entries:[]},
      checklist:t.checklist||defaultChecklist(),
      updatedAt:t.updatedAt||Date.now()
    };
  }
  /** บันทึก activeTrip + days/backlog/journalState/checklist ปัจจุบันลง localStorage @returns {void} */
  function persistCurrentTrip(){
    var list=loadTripsList();
    var idx=list.findIndex(function(t){return t.id===activeTrip.id});
    var snap={id:activeTrip.id,name:activeTrip.name,sub:activeTrip.sub||"",
      startDate:activeTrip.startDate,dayCount:activeTrip.dayCount,budget:activeTrip.budget,
      cities:activeTrip.cities||[],
      days:days,backlog:backlog,journal:journalState,checklist:checklist,updatedAt:Date.now()};
    if(idx>-1)list[idx]=snap;else list.push(snap);
    saveTripsList(list);
    localStorage.setItem(ACTIVE_KEY,activeTrip.id);
  }
  function computeCountdown(trip){
    var start=new Date(trip.startDate+"T00:00:00");
    var today=new Date();today.setHours(0,0,0,0);
    var diffDays=Math.round((+start-+today)/86400000);
    if(diffDays>0)return "อีก "+diffDays+" วัน";
    if(diffDays===0)return "เดินทางวันนี้! 🎉";
    if(diffDays>-trip.dayCount)return "กำลังเดินทาง ✈️";
    return "ทริปผ่านไปแล้ว";
  }
  /* ---- "ทริปถัดไป" (ยังไม่ถึงวันเดินทาง) เปลี่ยนเป็น "ทริปปัจจุบัน" อัตโนมัติทันทีที่ถึงวันเดินทางแล้ว ---- */
  function tripStatusLabel(trip){
    var start=new Date(trip.startDate+"T00:00:00");
    var today=new Date();today.setHours(0,0,0,0);
    return start>today?"ทริปถัดไป":"ทริปปัจจุบัน";
  }
  function renderTripCardMeta(){
    $("#tripCityName").textContent=activeTrip.name;
    var dateRange=dayDates[1]+" – "+dayDates[activeTrip.dayCount];
    var duration=activeTrip.dayCount+" วัน "+(activeTrip.dayCount-1)+" คืน";
    $("#tripMetaLine").textContent=dateRange+" · "+duration;
    $("#tripCountdown").textContent=computeCountdown(activeTrip);
    $("#tripStatusLabel").textContent=tripStatusLabel(activeTrip);
    renderCityChips();renderMyTripsList();
    renderDayStrip();
    titles.itin[1]="ทริป"+activeTrip.name+" · "+dateRange+" · "+duration;
    if($("#view-itin").classList.contains("active"))$("#viewSub").textContent=titles.itin[1];
    titles.map[1]=dateRange+" · "+duration;
    if($("#view-map").classList.contains("active")){
      $("#viewSub").textContent=titles.map[1];
      $("#viewTitle").textContent=activeTrip.name;
    }
  }
  // แปลงจุดหมาย (stop) รูปแบบเดิม (array ตำแหน่ง) ให้เป็น object ชื่อฟิลด์เสมอ — ใช้กับข้อมูล
  // legacy ทุกทาง (ทริปเก่าใน localStorage, ไฟล์ .gopanda เก่า, seed data ในซอร์สนี้เอง) ก็ยังรับได้
  // เติม stopId ถาวรให้ด้วยถ้ายังไม่มี ไว้ผูกไฟล์แนบใน IndexedDB ไม่หลุดตามเมื่อย้ายวัน/สลับลำดับ
  /** @param {any} s - array ตำแหน่ง (legacy) หรือ object ({@link Stop}) อยู่แล้วก็ได้ @returns {Stop} */
  function normalizeStop(s){
    if(Array.isArray(s))
      return {time:s[0]||"--",title:s[1]||"",desc:s[2]||"",cat:s[3]||["spot","ที่เที่ยว"],cost:s[4]||null,id:s[5]||uid("s_")};
    return {time:s.time||"--",title:s.title||"",desc:s.desc||"",cat:s.cat||["spot","ที่เที่ยว"],cost:s.cost||null,id:s.id||uid("s_")};
  }
  /**
   * @param {Object<string,Day>} days2
   * @param {Stop[]} backlog2
   * @param {{spent:number, entries:JournalEntry[]}} journal2
   * @param {ChecklistCategory[]} checklist2
   * @returns {void}
   */
  function switchToLiveData(days2,backlog2,journal2,checklist2){
    days=days2;backlog=(backlog2||[]).map(normalizeStop);curDay=1;
    Object.keys(days).forEach(function(n){days[n].s=(days[n].s||[]).map(normalizeStop)});
    journalState=journal2||{spent:0,entries:[]};
    checklist=checklist2||defaultChecklist();
    applyCalendar(activeTrip);
    renderBoard();renderDay(curDay);renderDayStrip();renderTripCardMeta();updateReady();
    if(typeof renderBacklogTimeline==="function")renderBacklogTimeline();
    renderChecklist();renderJournalSummary();renderJournalEntries();
    if(typeof renderTripDocs==="function")renderTripDocs();
    if(typeof refreshMapDownloadBtn==="function")refreshMapDownloadBtn();
  }
  /** @param {string} id @returns {void} */
  function switchTrip(id){
    if(id===activeTrip.id)return;
    persistCurrentTrip();
    var raw=loadTripsList().find(function(x){return x.id===id});
    if(!raw)return;
    var t=normalizeTrip(raw);
    activeTrip={id:t.id,name:t.name,sub:t.sub,startDate:t.startDate,dayCount:t.dayCount,budget:t.budget,cities:t.cities||[]};
    switchToLiveData(t.days,t.backlog,t.journal,t.checklist);
    var toast=$("#planToast");
    toast.textContent="✓ สลับไปทริป \""+t.name+"\" แล้ว";toast.hidden=false;
    setTimeout(function(){toast.hidden=true},4000);
  }
  /** @param {string} name @param {string} startDate @param {number} dayCount @param {number} budget @returns {void} */
  function createTrip(name,startDate,dayCount,budget){
    name=(name||"").trim();
    dayCount=Math.max(1,Math.min(30,+dayCount||7));
    budget=Math.max(0,+budget||0);
    if(!name){$("#newTripName").focus();return}
    if(!startDate){$("#newTripStart").focus();return}
    persistCurrentTrip();
    var id="trip-"+Date.now();
    /** @type {Object<string,Day>} */
    var blankDays={};
    for(var n=1;n<=dayCount;n++)blankDays[n]={t:"ยังไม่ได้วางแผน",m:"0 จุดหมาย",s:[]};
    activeTrip={id:id,name:name,sub:"ทริปใหม่ — ยังไม่มีแผน",startDate:startDate,dayCount:dayCount,budget:budget,cities:[]};
    switchToLiveData(blankDays,[],{spent:0,entries:[]},defaultChecklist());
    persistCurrentTrip();
    $("#newTripName").value="";
    var toast=$("#planToast");
    toast.textContent="✓ สร้างทริป \""+name+"\" ("+dayCount+" วัน) แล้ว เริ่มลากการ์ดจากคอลัมน์ไอเดีย หรือนำเข้าไฟล์ได้เลย";toast.hidden=false;
    setTimeout(function(){toast.hidden=true},5000);
  }
  function deleteTrip(id){
    // เอกสารแนบ (IndexedDB gopanda_docs_v1) ผูกกับ tripId ตรงๆ ไม่ได้ลบตามทริปอัตโนมัติ
    // ถ้าไม่เคลียร์ตรงนี้จะค้างสะสมไปเรื่อยๆ จนอาจกินโควตาจนเบราว์เซอร์ไล่แคชแผนที่ทิ้ง (ดู ARCHITECTURE-ROADMAP.md § 3.5)
    docList(id).then(function(list){list.forEach(function(f){docDelete(f.id)})});
    var list=loadTripsList().filter(function(t){return t.id!==id});
    saveTripsList(list);
    if(activeTrip.id===id){
      if(list.length){
        var t=normalizeTrip(list[0]);
        activeTrip={id:t.id,name:t.name,sub:t.sub,startDate:t.startDate,dayCount:t.dayCount,budget:t.budget,cities:t.cities||[]};
        switchToLiveData(t.days,t.backlog,t.journal,t.checklist);persistCurrentTrip();
      }
      else location.reload(); // ลบทริปสุดท้ายทิ้ง — โหลดดีโมเริ่มต้นใหม่สะอาด ๆ
    }
    renderMyTripsList();
  }
  /* ---- "ทริปของฉัน" การ์ดโชว์อยู่บน Home ตรงๆ (ไม่ต้องกดปุ่มเปิด modal อีกต่อไป)
     เรียงทริปใกล้วันเริ่มที่สุดก่อนเสมอ — กดการ์ด = สลับทริป (ถ้าจำเป็น) + เข้าแผนที่ทันที ---- */
  function renderMyTripsList(){
    persistCurrentTrip(); // ให้ทริปปัจจุบันในลิสต์ตรงกับสถานะล่าสุดเสมอ
    var list=loadTripsList().map(normalizeTrip).sort(function(a,b){
      return +new Date(a.startDate)-+new Date(b.startDate);
    });
    $("#myTripsList").innerHTML=list.map(function(t){
      var stopCount=Object.keys(t.days||{}).reduce(function(a,n){return a+((t.days[n].s||[]).length)},0);
      var isActive=t.id===activeTrip.id;
      var cal=computeCalendar(t.startDate,t.dayCount);
      var dateRange=cal.dates[1]+" – "+cal.dates[t.dayCount];
      return '<div class="modal-card'+(isActive?'':' my-trip-open')+'" '+(isActive?'':'data-open-trip="'+t.id+'" role="button" tabindex="0"')+' style="padding-bottom:40px'+
        (isActive?';border-color:rgba(245,158,11,.5)':';cursor:pointer')+'">'+
        '<div style="display:flex;align-items:center;gap:6px;min-width:0">'+
        '<b class="my-trip-name" title="'+esc(t.name)+'">'+esc(t.name)+'</b>'+
        (isActive?' <span class="prem-chip" style="font-size:.6rem;flex:none">'+tripStatusLabel(t)+'</span>':'')+
        '</div>'+
        '<div class="sub2" style="margin-top:2px">'+dateRange+' · '+t.dayCount+' วัน · '+stopCount+' จุดหมาย</div>'+
        '<div class="sub2">แก้ไขล่าสุด '+new Date(t.updatedAt).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})+'</div>'+
        '<button class="btn-ghost" data-del-trip="'+t.id+'" data-trip-name="'+esc(t.name)+'" style="position:absolute;right:10px;bottom:10px">ลบ</button></div>';
    }).join("")||'<div class="sub2">ยังไม่มีทริปบันทึกไว้</div>';
  }
  $("#myTripsList").addEventListener("click",function(e){
    var delBtn=e.target.closest("[data-del-trip]");
    if(delBtn){
      if(confirm("ลบทริป \""+delBtn.dataset.tripName+"\" ทิ้งจริงไหม?\nแผนเที่ยว/สมุดบันทึก/เช็กลิสต์ของทริปนี้จะหายไปถาวร กู้คืนไม่ได้"))
        deleteTrip(delBtn.dataset.delTrip);
      return;
    }
    var openCard=e.target.closest("[data-open-trip]");
    if(openCard){switchTrip(openCard.dataset.openTrip);showView("map")}
  });
  $("#myTripsList").addEventListener("keydown",function(e){
    if(e.key!=="Enter"&&e.key!==" ")return;
    if(e.target.closest("[data-del-trip]"))return;
    var openCard=e.target.closest("[data-open-trip]");
    if(openCard){e.preventDefault();switchTrip(openCard.dataset.openTrip);showView("map")}
  });
  $("#createTripBtn").addEventListener("click",function(){
    if(!$("#newTripStart").value)$("#newTripStart").value=new Date().toISOString().slice(0,10);
    createTrip($("#newTripName").value,$("#newTripStart").value,$("#newTripDays").value,$("#newTripBudget").value);
  });
  $("#newTripName").addEventListener("keydown",function(e){
    if(e.key==="Enter"){
      if(!$("#newTripStart").value)$("#newTripStart").value=new Date().toISOString().slice(0,10);
      createTrip($("#newTripName").value,$("#newTripStart").value,$("#newTripDays").value,$("#newTripBudget").value);
    }
  });
  /* ---- เลือกทริปที่ควรเปิดเป็นทริปหลักตอนเปิดแอป (แทนการจำทริปล่าสุดที่เคยเปิด) ----
     ลำดับความสำคัญ: (1) ทริปที่กำลังเดินทางอยู่จริงตอนนี้ ต้องมาก่อนเสมอ (แม้มีทริปอื่นในอนาคต)
     (2) ถ้าไม่มีทริปไหนกำลังเดินทางอยู่ → เอาทริปที่ยังไม่ถึงวันแต่ใกล้ที่สุด
     (3) ถ้าทริปทั้งหมดผ่านไปแล้ว → เอาอันที่เพิ่งผ่านมาล่าสุด */
  function pickNearestTrip(list){
    var today=new Date();today.setHours(0,0,0,0);
    var withDiff=list.map(function(t){
      var start=new Date(t.startDate+"T00:00:00");
      var diff=Math.round((+start-+today)/86400000);
      return {t:t,diff:diff,ongoing:diff<=0&&diff>-t.dayCount};
    });
    var ongoing=withDiff.filter(function(x){return x.ongoing});
    if(ongoing.length){
      ongoing.sort(function(a,b){return b.diff-a.diff});
      return ongoing[0].t;
    }
    var upcoming=withDiff.filter(function(x){return x.diff>0});
    var pool=upcoming.length?upcoming:withDiff;
    pool.sort(function(a,b){return upcoming.length?a.diff-b.diff:b.diff-a.diff});
    return pool[0].t;
  }
  (function initTrips(){
    // days/backlog ถูกแปลงเป็น object ตอนประกาศตัวแปรแล้ว (ดูด้านบน) ไม่ต้องทำซ้ำตรงนี้
    var list=loadTripsList();
    if(!list.length){
      // ครั้งแรกที่เปิดแอป — เซฟข้อมูลดีโมที่ hardcode ไว้เป็นทริป "default" ทริปแรกในรายการ
      persistCurrentTrip();
      renderTripCardMeta();
      renderJournalSummary();renderJournalEntries();
      return;
    }
    var t=pickNearestTrip(list.map(normalizeTrip));
    activeTrip={id:t.id,name:t.name,sub:t.sub,startDate:t.startDate,dayCount:t.dayCount,budget:t.budget,cities:t.cities||[]};
    switchToLiveData(t.days,t.backlog,t.journal,t.checklist);
  })();

  /* ---- auto-switch หน้า landing ตามวันทริปจริง (มือถือเท่านั้น — desktop เห็น Dashboard คู่กับแผนที่อยู่แล้วตลอดเวลา)
     ยังไม่ถึงวันเดินทาง → เปิดมาเจอ Dashboard ก่อน · ถึงวันเดินทางแล้ว → เปิดมาเจอแผนที่ (ค่าเริ่มต้นเดิม) ---- */
  (function applyAutoLanding(){
    var start=new Date(activeTrip.startDate+"T00:00:00");
    var today=new Date();today.setHours(0,0,0,0);
    var diffDays=Math.round((+start-+today)/86400000);
    if(diffDays>0 && window.matchMedia("(max-width:1023px)").matches){
      sidebar.classList.add("open");overlay.classList.add("show");
    }
  })();
  window.addEventListener("beforeunload",persistCurrentTrip); // กันลืมบันทึกก่อนปิด/รีเฟรชแท็บ
})();
