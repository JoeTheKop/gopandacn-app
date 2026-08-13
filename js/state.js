// @ts-check
// js/state.js — แกนกลางข้อมูลทริปที่กำลังเปิดอยู่ (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
// ออกแบบร่วมกับรีวิว Opus 5 (premise-check งานเสี่ยงสูง 2026-08-05) ก่อนลงมือ — ดูแผนเต็มใน
// commit message ของ "Build js/state.js"
//
// กติกาหลัก: ตัวแปรที่ reassign ทั้งก้อน (ไม่ใช่แค่แก้ property) จากโค้ดที่ยัง "อยู่นอกไฟล์นี้"
// (เช่น app.js's switchTrip/createTrip/deleteTrip) ต้อง export เป็น live binding (`export var`)
// + setter function เท่านั้น เพราะ ES module ห้าม assign ตรงๆ ให้ binding ที่ import มา (tsc จะฟ้อง
// "Cannot assign to 'x' because it is an import" ทันทีถ้าลืม — ใช้ error นี้เป็นตัวช่วยหาจุดที่ลืมแก้)
// ส่วนตัวแปรที่ reassign เฉพาะ "ภายในไฟล์นี้เอง" (เช่น days/backlog/journalState/checklist ที่ถูก
// reassign ทั้งก้อนเฉพาะใน setLiveData()) แค่ export var เฉยๆ พอ ไม่ต้องมี setter แยก
import {uid} from "./utils.js";
import {SEED_DAYS,SEED_BACKLOG,DEFAULT_TRIP,defaultChecklist,blankChecklist,defaultJournalEntries} from "./seed-data.js";

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
 * @property {number} [preTripThb] - ค่าใช้จ่ายที่จ่ายเป็นเงินบาทไว้ก่อนเดินทาง (ตั๋วเครื่องบิน/จองล่วงหน้าจากไทย)
 *   สะสมจากการนำเข้า Excel/CSV เท่านั้น (js/trip-io.js) ไม่ปนกับ Stop.cost ที่เป็น ¥ ล้วน — โชว์แยกใน Trip Recap
 */

// แปลงจุดหมาย (stop) รูปแบบเดิม (array ตำแหน่ง) ให้เป็น object ชื่อฟิลด์เสมอ — ใช้กับข้อมูล
// legacy ทุกทาง (ทริปเก่าใน localStorage, ไฟล์ .gopanda เก่า, seed data ในซอร์สนี้เอง) ก็ยังรับได้
// เติม stopId ถาวรให้ด้วยถ้ายังไม่มี ไว้ผูกไฟล์แนบใน IndexedDB ไม่หลุดตามเมื่อย้ายวัน/สลับลำดับ
/** @param {any} s - array ตำแหน่ง (legacy) หรือ object ({@link Stop}) อยู่แล้วก็ได้ @returns {Stop} */
export function normalizeStop(s){
  if(Array.isArray(s))
    return {time:s[0]||"--",title:s[1]||"",desc:s[2]||"",cat:s[3]||["spot","ที่เที่ยว"],cost:s[4]||null,id:s[5]||uid("s_")};
  return {time:s.time||"--",title:s.title||"",desc:s.desc||"",cat:s.cat||["spot","ที่เที่ยว"],cost:s.cost||null,id:s.id||uid("s_")};
}

// seed literal เป็นรูปแบบ legacy (s เป็น array ตำแหน่ง ไม่ใช่ Stop object) — normalizeStop() แปลงให้ทันที
/** @type {Object<string,Day>} */
export var days=/** @type {any} */ (SEED_DAYS);
Object.keys(days).forEach(function(n){days[n].s=days[n].s.map(normalizeStop)});

export var curDay=1;
// เขียนจาก renderDay() (ยังอยู่ใน app.js ในตอนนี้ — จะย้ายมา board.js ในขั้นถัดๆ ไป) เพราะ
// import binding reassign ตรงๆ จากนอกโมดูลนี้ไม่ได้
export function setCurDay(n){curDay=n}

/* dayDates/dayDow ผูกกับทริปที่กำลังเปิดอยู่ (activeTrip.startDate + dayCount) คำนวณใหม่ทุกครั้งที่
   สลับ/สร้าง/โหลดทริป ผ่าน applyCalendar() — ใช้ Date object ล้วน จึงข้ามปี (เช่น 31 ธ.ค.→1 ม.ค.) ถูกต้องเอง */
var THAI_MONTHS_ABBR=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
var THAI_DOW_FULL=["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์"];
export function computeCalendar(startISO,dayCount){
  var dates={},dow={},base=new Date(startISO+"T00:00:00");
  for(var n=1;n<=dayCount;n++){
    var d=new Date(base.getTime());
    d.setDate(d.getDate()+(n-1));
    dates[n]=d.getDate()+" "+THAI_MONTHS_ABBR[d.getMonth()];
    dow[n]=THAI_DOW_FULL[d.getDay()];
  }
  return {dates:dates,dow:dow};
}
export var dayDates={},dayDow={};
export function applyCalendar(trip){
  var cal=computeCalendar(trip.startDate,trip.dayCount);
  dayDates=cal.dates;dayDow=cal.dow;
}

/* activeTrip ต้องมีค่าก่อน renderBoard()/runDoctor() ตัวแรกที่รันตอนโหลดสคริปต์ (ใน app.js) —
   ค่าเริ่มต้นนี้คือดีโมหูหนาน (js/seed-data.js) ระบบหลายทริปใน app.js จะ override ให้ตรงกับทริปที่
   บันทึกไว้ล่าสุดอีกที ผ่าน setActiveTrip()+setLiveData() คู่กันเสมอ (ห้ามเรียกแยกกัน — setLiveData
   จบด้วย applyCalendar(activeTrip) ซึ่งต้องอ่านทริปใหม่ ไม่ใช่ทริปเก่า) */
// หมายเหตุ: activeTrip ไม่ใช่ Trip เต็มรูปแบบ (ไม่มี days/backlog/journal/checklist ฝังอยู่ — เก็บแยก
// เป็น days/backlog/journalState/checklist ข้างล่างต่างหาก) เป็นแค่ metadata ของทริปที่เปิดอยู่
export var activeTrip=DEFAULT_TRIP();
applyCalendar(activeTrip);
// เขียนจาก trip-lifecycle code ใน app.js (switchTrip/createTrip/deleteTrip/createTripFromTemplate/
// initTrips/.gopanda import confirm) — ทุกจุดเรียก setLiveData() ต่อทันทีเสมอ ไม่มีจุดไหนเรียกเดี่ยวๆ
export function setActiveTrip(t){if(t.preTripThb==null)t.preTripThb=0;activeTrip=t}

export var backlog=SEED_BACKLOG.map(normalizeStop);

/** @param {number} n @returns {Day} */
export function getDay(n){if(!days[n])days[n]={t:"ยังไม่ได้วางแผน",m:"0 จุดหมาย",s:[]};return days[n]}
/** @param {number} ci - 0 = backlog, 1..N = วันที่ n @returns {Stop[]} */
export function colArr(ci){return ci===0?backlog:getDay(ci).s}
export function colCost(ci){return colArr(ci).reduce(function(a,s){return a+(+s.cost||0)},0)}
// รายการ "[ก่อนเดินทาง] " (นำเข้าจากวัน 0 ในไฟล์ Excel/CSV — เหตุการณ์เย็นวันก่อนออกเดินทางจริง เช่น
// ไปสนามบิน/ขึ้นเครื่องคืนก่อน) ต้องเรียงอยู่บนสุดของวัน 1 เสมอ ไม่งั้นเวลาบนนาฬิกา (16:00/19:55) จะ
// เรียงตามหลังกิจกรรมเช้าวันจริง (เช่น 09:20 ถึงจุดหมาย) ทำให้ดูเหมือนไปสนามบินหลังถึงจุดหมายแล้ว
function isPreTripStop(s){return s.title.indexOf("[ก่อนเดินทาง] ")===0}
export function sortDay(n){
  getDay(n).s.sort(function(a,b){
    var aPre=isPreTripStop(a)?0:1,bPre=isPreTripStop(b)?0:1;
    if(aPre!==bPre)return aPre-bPre;
    return (a.time==="--"?"99":a.time).localeCompare(b.time==="--"?"99":b.time);
  });
}

/* ---- แปลงราคา = จดบัญชีเลย (feature 1.6) + สมุดบันทึกผูกกับระบบหลายทริปจริง (feature 1.4)
   journalState เป็นของทริปที่กำลังเปิดอยู่เท่านั้น — สลับ/สร้าง/นำเข้าทริปแล้วจะสลับชุดนี้ตาม (ดู setLiveData) */
/** @type {{spent:number, entries:JournalEntry[]}} */
export var journalState={spent:1286,entries:defaultJournalEntries()}; // ค่าเริ่มต้น = ดีโมทริปหูหนาน สลับทริปแล้วจะถูกแทนที่

/** @type {ChecklistCategory[]} */
export var checklist=defaultChecklist();

/**
 * ครึ่ง "state" ของ switchToLiveData เดิม (ครึ่ง "render fan-out" ยังอยู่ app.js เป็น composition
 * root เพราะ render function ต่างๆ กระจายอยู่คนละโมดูล — เอามารวมที่นี่ทำให้เกิด import cycle ทันที
 * ดู R1 ในแผน Opus) เรียกจาก app.js ที่ trip-lifecycle 6 จุด คู่กับ setActiveTrip() เสมอ (setActiveTrip
 * ก่อน setLiveData ทุกครั้ง — ไม่งั้น applyCalendar ท้ายฟังก์ชันนี้จะอ่าน activeTrip เก่าผิดตัว)
 * @param {Object<string,Day>} days2
 * @param {Stop[]} backlog2
 * @param {{spent:number, entries:JournalEntry[]}} journal2
 * @param {ChecklistCategory[]} checklist2
 * @returns {void}
 */
export function setLiveData(days2,backlog2,journal2,checklist2){
  days=days2;backlog=(backlog2||[]).map(normalizeStop);curDay=1;
  Object.keys(days).forEach(function(n){days[n].s=(days[n].s||[]).map(normalizeStop)});
  journalState=journal2||{spent:0,entries:[]};
  checklist=checklist2||blankChecklist();
  applyCalendar(activeTrip);
}
