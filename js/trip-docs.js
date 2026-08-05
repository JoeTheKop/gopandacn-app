// @ts-check
// เอกสารแนบระดับทริปทั้งก้อน (ตั๋วเครื่องบิน พาสปอร์ต ฯลฯ — ไม่ผูกกับจุดหมายไหนโดยเฉพาะ)
// แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
import {$,esc,fmtBytes} from "./utils.js";
import {docList,docAdd,docGet,docDelete,DOC_MAX_BYTES} from "./docs.js";
import {activeTrip} from "./state.js";

export function renderTripDocs(){
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
