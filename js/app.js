// @ts-check
// gopandacn-prototype.html / index.html โหลดไฟล์นี้ผ่าน <script type="module" src="js/app.js">
// ย้ายมาจาก inline <script> เดิมทั้งก้อน (ไม่มีการแก้ logic) เพื่อให้ tsc ตรวจ type ได้ — ดู
// docs/design/ARCHITECTURE-ROADMAP.md § 4 ข้อ 4
//
// typedefs (Stop/Day/JournalEntry/ChecklistAction/ChecklistItem/ChecklistCategory/Trip) ย้ายไป
// js/state.js แล้ว (§ 4.5 ข้อ 6) — alias กลับมาที่นี่เพื่อให้ @type/@param annotation เดิมทั้งไฟล์
// ยังใช้ชื่อ bare (Stop, Day, ...) ได้เหมือนเดิมโดยไม่ต้องไล่แก้ทุกจุด
/** @typedef {import("./state.js").Stop} Stop */
/** @typedef {import("./state.js").Day} Day */
/** @typedef {import("./state.js").JournalEntry} JournalEntry */
/** @typedef {import("./state.js").ChecklistAction} ChecklistAction */
/** @typedef {import("./state.js").ChecklistItem} ChecklistItem */
/** @typedef {import("./state.js").ChecklistCategory} ChecklistCategory */
/** @typedef {import("./state.js").Trip} Trip */

import {$,$$,esc,html,safeHTML,fmt,fmtBytes} from "./utils.js";
import {docList,docDelete} from "./docs.js";
import {qs,tripUrl,klookUrl,kkdayUrl,cleanTitle} from "./booking-links.js";
import {BLOOD_CN,medProfile} from "./medical.js";
import "./lock.js";
import "./voice-price.js";
import "./fare-guard.js";
import "./packs.js";
import {speakCn,openBig,showPhraseCat} from "./phrases.js";
import {places,openDriverCard,openInfoCard} from "./driver.js";
import {RATE} from "./currency.js";
import {SEED_DAYS,SEED_BACKLOG,DEFAULT_TRIP,blankChecklist,defaultJournalEntries} from "./seed-data.js";
import {days,curDay,setCurDay,dayDates,computeCalendar,applyCalendar,activeTrip,setActiveTrip,
  backlog,journalState,checklist,setLiveData} from "./state.js";
import {loadTripsList,saveTripsList,normalizeTrip,persistCurrentTrip,loadActiveTripId} from "./trip-store.js";
import {flyToCity,renderCityChips,refreshMapDownloadBtn,renderTileReadyCard} from "./map.js";
import {titles,showView,closeDrawers,sidebar,overlay} from "./shell.js";
import "./chat.js";
import "./sos.js";
import {renderDay,renderBoard,renderDayStrip,renderBacklogTimeline} from "./board.js";
import "./highlights.js";
import "./discovery.js";
import {renderChecklist,updateReady} from "./checklist.js";
import {renderJournalSummary,renderJournalEntries} from "./journal.js";
import {renderTripDocs} from "./trip-docs.js";
import "./trip-io.js";
import "./doctor.js";
import {gopandaImportData,resetGopandaImport} from "./qr-recap.js";
(function(){
  /* ---- loadScriptOnce (SheetJS/ExcelJS lazy loader) ย้ายไป js/trip-io.js แล้ว (import ด้านบน) ---- */

  /* ---- เอกสารแนบ (ตั๋ว/ใบจอง ฯลฯ) เก็บเป็น Blob ดิบใน IndexedDB — ย้ายไป js/docs.js แล้ว (import ด้านบน) ---- */
  /* ---- ล็อกแอปด้วย PIN — ย้ายไป js/lock.js แล้ว (import ด้านบน) ---- */
  /* ---- view switching/dock/mobile drawers/Planning hero drawer — ย้ายไป js/shell.js แล้ว (import ด้านบน) ---- */
  /* ---- map pins/road-theme/city-tiles/GPS ย้ายไป js/map.js แล้ว (import ด้านบน) ---- */

  /* ---- itinerary data — days/curDay/normalizeStop ย้ายไป js/state.js แล้ว (import ด้านบน) ---- */
  /* ---- โต๊ะวางแผน (การ์ดจุดหมาย/backlog/modal เพิ่ม-แก้ไข-ลบ/เอกสารแนบระดับจุดหมาย/เรียงเส้นทาง)
     ย้ายไป js/board.js แล้ว (import ด้านบน) — เรียก renderDay(1) ตรงนี้ต่อ (ตำแหน่งเดิม) เพราะ
     ES module import ของ board.js รันเสร็จก่อนโค้ดส่วนนี้อยู่แล้ว (days พร้อมใช้จาก state.js) ---- */
  renderDay(1);

  /* ---- FAQ ออฟไลน์ — ย้ายไป js/chat.js แล้ว (import ด้านบน) ---- */

  /* ---- currency — ย้ายไป js/currency.js แล้ว (import ด้านบน) ---- */

  /* ---- หูฟังราคา (feature 2.1) — ย้ายไป js/voice-price.js แล้ว (import ด้านบน) ---- */
  /* ---- Fare Guard (feature 2.4) — ย้ายไป js/fare-guard.js แล้ว (import ด้านบน) ---- */

  /* ---- แปลงราคา = จดบัญชีเลย (feature 1.6) + สมุดบันทึก — ย้ายไป js/journal.js แล้ว (import ด้านบน) ---- */

  /* ---- city packs — ย้ายไป js/packs.js แล้ว (import ด้านบน) ---- */

  /* ---- ไฮไลต์แนะนำ GTTS — ย้ายไป js/highlights.js แล้ว (import ด้านบน) ---- */

  /* ---- phrases — ย้ายไป js/phrases.js แล้ว (import ด้านบน) ---- */

  /* ---- ready checklist — ย้ายไป js/checklist.js แล้ว (import ด้านบน) ---- */

  /* ---- driver card & saved places — ย้ายไป js/driver.js แล้ว (import ด้านบน) ---- */

  /* ---- Discovery: คลังสถานที่ — ย้ายไป js/discovery.js แล้ว (import ด้านบน) ---- */

  /* ---- SOS page: บัตรสุขภาพฉุกเฉิน — ย้ายไป js/medical.js แล้ว (import ด้านบน) ---- */
  /* ---- SOS page: ปุ่มโชว์การ์ดต่างๆ — ย้ายไป js/sos.js แล้ว (import ด้านบน) ---- */
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

  /* ---- planning board — renderBoard()/renderDayStrip()/renderBacklogTimeline() ย้ายไป js/board.js
     แล้ว (import ด้านบน) เรียกตรงนี้ต่อ (ตำแหน่งเดิม) — renderDayStrip() ต้องรันหลัง state.js ตั้ง
     activeTrip เริ่มต้นเสร็จแล้ว (การันตีโดย ES module evaluation order) ---- */
  renderDayStrip();
  renderBoard();
  renderBacklogTimeline();

  /* ---- เอกสารแนบระดับทริปทั้งก้อน — ย้ายไป js/trip-docs.js แล้ว (import ด้านบน) เรียก renderTripDocs()
     ตรงนี้ต่อ (ตำแหน่งเดิม) เพราะมี async race ที่รู้อยู่แล้วกับการเรียกซ้ำใน initTrips ท้ายไฟล์
     (ดู R7 ในแผน Opus) — ไม่ย้าย call นี้เข้าไปเป็น top-level side effect ของ trip-docs.js เอง ---- */
  renderTripDocs();

  /* ---- นำเข้า/ส่งออกแผนทริป (CSV/Excel) ย้ายไป js/trip-io.js แล้ว (import ด้านบน) ---- */
  /* ---- Plan Doctor — ย้ายไป js/doctor.js แล้ว (import ด้านบน) ---- */

  /* ---- QR handoff & .gopanda file — ย้ายไป js/qr-recap.js แล้ว (import ด้านบน) ยกเว้นปุ่มยืนยัน
     นำเข้าด้านล่างนี้ ซึ่งแตะ activeTrip/switchToLiveData โดยตรง จึงยังอยู่ที่นี่เป็น trip-lifecycle ---- */
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
    setActiveTrip({id:activeTrip.id,name:tripName,sub:activeTrip.sub,
      startDate:startDate||"2026-09-12",dayCount:dayCount||Object.keys(gopandaImportData.days||{}).length||10,
      budget:tm.budget||6000,cities:tm.cities||[]});
    switchToLiveData(gopandaImportData.days,gopandaImportData.backlog||[],gopandaImportData.journal||{spent:0,entries:[]},gopandaImportData.checklist||blankChecklist());
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

  /* ---- เรียงเส้นทางอัจฉริยะ (optimizeDay) ย้ายไป js/board.js แล้ว (import ด้านบน) ---- */

  /* ---- Trip Recap — ย้ายไป js/qr-recap.js แล้ว (import ด้านบน) ---- */

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


  /* ---- เรทสดเมื่อออนไลน์ — ย้ายไป js/currency.js แล้ว (import ด้านบน) ---- */

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

  /* ---- หลายทริป: บันทึก/สลับ/ลบ ผ่าน localStorage —
     loadTripsList/saveTripsList/normalizeTrip/persistCurrentTrip ย้ายไป js/trip-store.js แล้ว
     (import ด้านบน) แต่ละทริปมีปฏิทินของตัวเอง (startDate+dayCount) — คำนวณ dayDates/dayDow ใหม่
     ทุกครั้งที่สลับทริป ผ่าน applyCalendar() รองรับข้ามปีถูกต้อง (เช่นทริป 24 ธ.ค.–4 ม.ค. ข้ามปีใหม่) ---- */
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
    $("#phTripName").textContent=activeTrip.name;
    $("#phTripMeta").textContent=dateRange+" · "+duration;
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
  // normalizeStop() ย้ายไป js/state.js แล้ว (import ด้านบน)
  /**
   * ครึ่ง "render fan-out" ของ switchToLiveData เดิม — ครึ่ง "state" (การ assign days/backlog/
   * journalState/checklist จริง) ย้ายไป js/state.js's setLiveData() แล้ว เก็บฟังก์ชันนี้ไว้ใน
   * app.js ในฐานะ composition root เพราะ render function ต่างๆ กระจายอยู่คนละโมดูล การรวมไว้ที่นี่
   * แทนที่จะย้ายเข้า state.js ด้วย กัน import cycle (ดู Risk R1 ในแผน Opus)
   * @param {Object<string,Day>} days2
   * @param {Stop[]} backlog2
   * @param {{spent:number, entries:JournalEntry[]}} journal2
   * @param {ChecklistCategory[]} checklist2
   * @returns {void}
   */
  function switchToLiveData(days2,backlog2,journal2,checklist2){
    setLiveData(days2,backlog2,journal2,checklist2);
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
    setActiveTrip({id:t.id,name:t.name,sub:t.sub,startDate:t.startDate,dayCount:t.dayCount,budget:t.budget,cities:t.cities||[]});
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
    setActiveTrip({id:id,name:name,sub:"ทริปใหม่ — ยังไม่มีแผน",startDate:startDate,dayCount:dayCount,budget:budget,cities:[]});
    switchToLiveData(blankDays,[],{spent:0,entries:[]},blankChecklist());
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
        setActiveTrip({id:t.id,name:t.name,sub:t.sub,startDate:t.startDate,dayCount:t.dayCount,budget:t.budget,cities:t.cities||[]});
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

  /* ---- สร้างทริปใหม่: เส้นทาง "เลือกจากเทมเพลต" (task #4, ผัง 2026-08-04) ----
     ไฟล์ template อยู่ใน templates/*.gopanda — โครง days เหมือน .gopanda ทริปจริงทุกอย่าง
     (ดู docs/design/TRIP-PLANNING-WORKFLOW.md § 4) เลยส่งตรงเข้า switchToLiveData ได้เลย
     ไม่ต้อง map รูปแบบใหม่ ---- */
  var TEMPLATE_FILES=["templates/changsha-zhangjiajie-5d.gopanda"];
  var loadedTemplates=null;
  $$(".ph-start-tab").forEach(function(tab){
    tab.addEventListener("click",function(){
      $$(".ph-start-tab").forEach(function(t){t.classList.toggle("active",t===tab)});
      var isTpl=tab.dataset.startPath==="template";
      $("#startPathScratch").hidden=isTpl;
      $("#startPathTemplate").hidden=!isTpl;
      if(isTpl&&!loadedTemplates)loadTemplates();
    });
  });
  function loadTemplates(){
    loadedTemplates=[];
    Promise.all(TEMPLATE_FILES.map(function(f){
      return fetch(f).then(function(r){return r.json()}).catch(function(){return null});
    })).then(function(list){
      loadedTemplates=list.filter(function(t){return t&&t.isTemplate});
      renderTemplateList();
    });
  }
  function renderTemplateList(){
    var box=$("#templateList");
    if(!loadedTemplates.length){
      box.innerHTML='<div class="sub2">ยังไม่มีเทมเพลตพร้อมใช้งาน</div>';
      return;
    }
    box.innerHTML=loadedTemplates.map(function(tpl,i){
      var t=tpl.template;
      return html`<div class="tpl-card">
        <h4>${t.name_th}</h4>
        <span class="tag spot">${t.region}</span>
        <p>${t.summary}</p>
        <label style="margin-top:4px">วันเริ่มทริป
          <input type="date" class="tpl-start" data-tpl-i="${i}">
        </label>
        <button class="btn-gold" data-use-tpl="${i}" style="width:100%;margin-top:6px;justify-content:center">ใช้เทมเพลตนี้</button>
      </div>`;
    }).join("");
  }
  $("#templateList").addEventListener("click",function(e){
    var btn=e.target.closest("[data-use-tpl]");
    if(!btn)return;
    var i=+btn.dataset.useTpl;
    var tpl=loadedTemplates[i];
    var dateInput=/** @type {HTMLInputElement} */($("#templateList").querySelector('.tpl-start[data-tpl-i="'+i+'"]'));
    var startDate=dateInput.value;
    if(!startDate){dateInput.focus();return}
    createTripFromTemplate(tpl,startDate);
  });
  /** @param {any} tpl @param {string} startDate @returns {void} */
  function createTripFromTemplate(tpl,startDate){
    persistCurrentTrip();
    var id="trip-"+Date.now();
    var dayCount=tpl.template.dayCount||Object.keys(tpl.days).length;
    var name=tpl.template.name_th;
    setActiveTrip({id:id,name:name,sub:"เริ่มจากเทมเพลต "+tpl.template.region,startDate:startDate,dayCount:dayCount,budget:6000,cities:tpl.template.cities||[]});
    switchToLiveData(tpl.days,[],{spent:0,entries:[]},blankChecklist());
    persistCurrentTrip();
    var toast=$("#planToast");
    toast.textContent="✓ สร้างทริป \""+name+"\" จากเทมเพลตแล้ว ("+dayCount+" วัน) ปรับแก้ต่อได้เลย";toast.hidden=false;
    setTimeout(function(){toast.hidden=true},5000);
  }
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
    // กลับไปทริปที่เปิดค้างไว้ล่าสุดก่อนเสมอ (เขียนไว้ทุกครั้งใน persistCurrentTrip()) — ใช้
    // pickNearestTrip() เป็น fallback เฉพาะตอนยังไม่เคยมีการเซฟค่านี้ หรือทริปนั้นถูกลบไปแล้ว
    var normalized=list.map(normalizeTrip);
    var lastId=loadActiveTripId();
    var t=(lastId&&normalized.find(function(x){return x.id===lastId}))||pickNearestTrip(normalized);
    setActiveTrip({id:t.id,name:t.name,sub:t.sub,startDate:t.startDate,dayCount:t.dayCount,budget:t.budget,cities:t.cities||[]});
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
