// @ts-check
// หลายทริป: บันทึก/โหลด/ทำให้เป็นมาตรฐาน ผ่าน localStorage — แยกจาก app.js
// (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6, Phase B ขั้น 7)
// ตั้งใจไม่มี rendering/DOM เลยในไฟล์นี้ — ให้โมดูล feature อื่น (board.js, checklist.js, journal.js,
// discovery.js ฯลฯ ใน Phase C) import persistCurrentTrip() ได้โดยตรงในอนาคต โดยไม่ต้อง import
// กลับไปที่ app.js (กัน import cycle — ดู Risk R1 ในแผน Opus ของขั้น state.js ก่อนหน้านี้)
import {blankChecklist} from "./seed-data.js";
import {activeTrip,days,backlog,journalState,checklist} from "./state.js";

var TRIPS_KEY="gopanda_trips_v1",ACTIVE_KEY="gopanda_active_trip_v1";
export function loadTripsList(){try{return JSON.parse(localStorage.getItem(TRIPS_KEY))||[]}catch(e){return[]}}
export function saveTripsList(list){localStorage.setItem(TRIPS_KEY,JSON.stringify(list))}
// เติมฟิลด์ที่อาจขาดไปสำหรับทริปที่เคยบันทึกไว้ก่อนรอบอัปเดตนี้ (backward-compat)
/** @param {any} t - ทริปที่โหลดมาจาก localStorage/.gopanda อาจขาดฟิลด์ใหม่ๆ ไป @returns {import("./state.js").Trip} */
export function normalizeTrip(t){
  return {
    id:t.id,name:t.name,sub:t.sub||"",
    startDate:t.startDate||"2026-09-12",
    dayCount:t.dayCount||Object.keys(t.days||{}).length||10,
    budget:t.budget||6000,
    // ทริป "default" (หูหนาน) ที่บันทึกไว้ก่อนรอบที่เพิ่ม field cities จะไม่มีค่านี้เลย —
    // เติมย้อนหลังให้เฉพาะ id นี้ เพื่อไม่ให้ผู้ใช้เก่าต้องลบทริปแล้วสร้างใหม่
    cities:(t.cities&&t.cities.length)?t.cities:(t.id==="default"?["ฉางซา","จางเจียเจี้ย","เฟิ่งหวง","ฝูหรง"]:[]),
    preTripThb:t.preTripThb||0,
    days:t.days,backlog:t.backlog||[],
    journal:t.journal||{spent:0,entries:[]},
    checklist:t.checklist||blankChecklist(),
    updatedAt:t.updatedAt||Date.now()
  };
}
/** บันทึก activeTrip + days/backlog/journalState/checklist ปัจจุบันลง localStorage @returns {void} */
export function persistCurrentTrip(){
  var list=loadTripsList();
  var idx=list.findIndex(function(t){return t.id===activeTrip.id});
  var snap={id:activeTrip.id,name:activeTrip.name,sub:activeTrip.sub||"",
    startDate:activeTrip.startDate,dayCount:activeTrip.dayCount,budget:activeTrip.budget,
    cities:activeTrip.cities||[],preTripThb:activeTrip.preTripThb||0,
    days:days,backlog:backlog,journal:journalState,checklist:checklist,updatedAt:Date.now()};
  if(idx>-1)list[idx]=snap;else list.push(snap);
  saveTripsList(list);
  localStorage.setItem(ACTIVE_KEY,activeTrip.id);
}
