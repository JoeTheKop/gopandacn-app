// @ts-check
export function uid(prefix){return (prefix||"id_")+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}

export function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}

// เท็มเพลตที่ escape ค่าที่ใส่เข้ามาอัตโนมัติ — ใช้แบบ html`<div>${userValue}</div>`
// ค่าที่ผ่าน ${} จะถูก esc() ให้เสมอ ถ้าต้องแทรก HTML ที่เชื่อถือได้แล้ว (เช่นผลลัพธ์จาก html`` อีกอัน) ให้ห่อด้วย safeHTML()
export function safeHTML(s){return {__safe:s}}
export function html(strings){
  var out=strings[0];
  for(var i=1;i<strings.length;i++){
    var v=arguments[i];
    out+=(v&&v.__safe!=null?v.__safe:esc(v))+strings[i];
  }
  return out;
}

export function fmt(n){return (Math.round(n*100)/100).toString()}

export function csvField(v){v=String(v==null?"":v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}

export function parseCsv(text){
  text=text.replace(/^﻿/,"");
  return text.split(/\r?\n/).filter(function(l){return l.trim()}).map(function(l){
    var out=[],cur="",q=false;
    for(var i=0;i<l.length;i++){
      var ch=l[i];
      if(ch==='"'){q=!q;continue}
      if(ch===","&&!q){out.push(cur);cur="";continue}
      cur+=ch;
    }
    out.push(cur);
    return out.map(function(s){return s.trim()});
  });
}

export function toMin(t){if(!t||t==="--")return null;var p=t.split(":");return (+p[0])*60+(+p[1]||0)}
