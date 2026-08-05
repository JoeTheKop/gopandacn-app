// @ts-check
// SOS page: ปุ่มโชว์การ์ดต่างๆ (คนขับ, ตำแหน่ง, ข้อมูลแพทย์) + ทางลัดไปหน้าอื่น
// แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
import {esc} from "./utils.js";
import {places,openDriverCard,openInfoCard} from "./driver.js";
import {medProfile,BLOOD_CN} from "./medical.js";
import {showPhraseCat} from "./phrases.js";
import {showView} from "./shell.js";

document.getElementById("sosDriverHome").addEventListener("click",function(){openDriverCard(places[0])});
document.getElementById("sosShowLoc").addEventListener("click",function(){
  openInfoCard({
    head:'我在这里，请过来帮我 <small>(ฉันอยู่ตรงนี้ ช่วยมาหาหน่อย)</small>',
    title:'湖南省长沙市芙蓉区',
    lines:['五一大道98号附近','28.1958° N, 112.9773° E'],
    thai:'ตำแหน่งปัจจุบันจาก GPS ออฟไลน์ · แม่นยำ ±8 เมตร',
    speak:'我在湖南省长沙市芙蓉区五一大道98号附近，请过来帮我'
  });
});
document.getElementById("sosShowMed").addEventListener("click",function(){
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
document.getElementById("sosInsurance").addEventListener("click",function(){showView("ready")});
document.getElementById("sosPhrases").addEventListener("click",function(){showPhraseCat("sos");showView("phrases")});
document.getElementById("sosPacksLink").addEventListener("click",function(){showView("packs")});
