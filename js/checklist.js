// @ts-check
// เช็กลิสต์ความพร้อมก่อนบิน — แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
// checklist มาจาก js/state.js — ทริปที่สร้าง/นำเข้าใหม่ยังไม่มีเช็กลิสต์เฉพาะเมือง ใช้
// defaultChecklist() (js/seed-data.js) เป็นค่าเริ่มต้นทั่วไปไปก่อน (ดู setLiveData ใน state.js)
import {$,html} from "./utils.js";
import {checklist} from "./state.js";
import {persistCurrentTrip} from "./trip-store.js";
import {showView} from "./shell.js";

var RING_C=326.7;
export function renderChecklist(){
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
export function updateReady(){
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
