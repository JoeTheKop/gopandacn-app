// @ts-check
// บัตรสุขภาพฉุกเฉิน (SOS page) — แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
// แก้ไขได้จริง เก็บในเครื่องเท่านั้น (localStorage) ไม่ sync ขึ้น cloud เด็ดขาด (ดู § 5 ของ roadmap doc)
import {$} from "./utils.js";

// กรุ๊ปเลือดเป็นชุดจำกัด (8 ค่า) แปลจีนได้แม่นยำ 100% — ต่างจากแพ้ยา/โรคประจำตัว/ยา
// ที่เป็น free text ผู้ใช้พิมพ์เอง แปลอัตโนมัติแม่นๆ ไม่ได้ (เสี่ยงอันตรายถ้าแปลผิดตอนฉุกเฉินจริง)
// เลยโชว์เป็นภาษาไทย/อังกฤษ+label ภาษาอังกฤษกำกับ แทนการเดี้ยงแปลเป็นจีนเอง
export var BLOOD_CN={"A+":"A型 RH阳性","A-":"A型 RH阴性","B+":"B型 RH阳性","B-":"B型 RH阴性","AB+":"AB型 RH阳性","AB-":"AB型 RH阴性","O+":"O型 RH阳性","O-":"O型 RH阴性"};
var MED_PROFILE_KEY="gopanda_med_profile_v1";
// export var (ไม่ใช่ const) เพราะ #medSaveBtn reassign ค่าใหม่ทั้งก้อนตอนบันทึก — ES module live
// binding ทำให้ app.js ที่ import ไปอ่านค่าล่าสุดได้เสมอโดยไม่ต้องมี getter function แยก
export var medProfile=(function(){
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
