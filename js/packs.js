// @ts-check
// แพ็กข้อมูลเมือง (city packs) — แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
// side-effect module ล้วน ไม่มี state ที่ต้องแชร์กับส่วนอื่นของแอป
import {$} from "./utils.js";

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
