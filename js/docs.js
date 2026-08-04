// @ts-check
import {uid} from "./utils.js";

/* ---- เอกสารแนบ (ตั๋ว/ใบจอง ฯลฯ) เก็บเป็น Blob ดิบใน IndexedDB — ไม่ผ่าน base64/localStorage
   เพราะไฟล์ภาพ/PDF กิน quota ของ localStorage หมดเร็วมาก ---- */
export var DOC_DB_NAME="gopanda_docs_v1";
var DOC_STORE="files";
export var DOC_MAX_BYTES=5*1024*1024;
var docDbP=null;
export function docDb(){
  if(docDbP)return docDbP;
  docDbP=new Promise(function(resolve,reject){
    var req=indexedDB.open(DOC_DB_NAME,1);
    req.onupgradeneeded=function(){
      var db=req.result;
      if(!db.objectStoreNames.contains(DOC_STORE)){
        var st=db.createObjectStore(DOC_STORE,{keyPath:"id"});
        st.createIndex("byTrip","tripId",{unique:false});
      }
    };
    req.onsuccess=function(){resolve(req.result)};
    req.onerror=function(){reject(req.error)};
  });
  return docDbP;
}
export function docAdd(tripId,stopId,file){
  if(file.size>DOC_MAX_BYTES)return Promise.reject(new Error("ไฟล์ใหญ่เกิน 5MB"));
  var rec={id:uid("doc_"),tripId:tripId,stopId:stopId||null,name:file.name,type:file.type,size:file.size,blob:file,addedAt:Date.now()};
  return docDb().then(function(db){
    return new Promise(function(resolve,reject){
      var tx=db.transaction(DOC_STORE,"readwrite");
      tx.objectStore(DOC_STORE).add(rec);
      tx.oncomplete=function(){resolve(rec)};
      tx.onerror=function(){reject(tx.error)};
    });
  });
}
export function docList(tripId,stopId){
  return docDb().then(function(db){
    return new Promise(function(resolve,reject){
      var out=[];
      var tx=db.transaction(DOC_STORE,"readonly");
      var idx=tx.objectStore(DOC_STORE).index("byTrip");
      var req=idx.openCursor(IDBKeyRange.only(tripId));
      req.onsuccess=function(){
        var cur=req.result;
        if(!cur){resolve(out);return}
        if(stopId===undefined||cur.value.stopId===(stopId||null))out.push(cur.value);
        cur.continue();
      };
      req.onerror=function(){reject(req.error)};
    });
  });
}
export function docGet(id){
  return docDb().then(function(db){
    return new Promise(function(resolve,reject){
      var tx=db.transaction(DOC_STORE,"readonly");
      var req=tx.objectStore(DOC_STORE).get(id);
      req.onsuccess=function(){resolve(req.result)};
      req.onerror=function(){reject(req.error)};
    });
  });
}
export function docDelete(id){
  return docDb().then(function(db){
    return new Promise(function(resolve,reject){
      var tx=db.transaction(DOC_STORE,"readwrite");
      tx.objectStore(DOC_STORE).delete(id);
      tx.oncomplete=function(){resolve()};
      tx.onerror=function(){reject(tx.error)};
    });
  });
}
