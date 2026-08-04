// @ts-check
/* ---- booking affiliate (ใส่ ID จริงที่นี่ที่เดียว) ---- */
var AFF={
  trip:{allianceid:"YOUR_ALLIANCEID",sid:"YOUR_SID"}, // Trip.com Affiliate
  klook:{aid:"YOUR_AID"},                             // Klook Affiliate
  kkday:{cid:"YOUR_CID"}                              // KKday Affiliate
};
export function qs(q){return Object.keys(q).map(function(k){return k+"="+encodeURIComponent(q[k])}).join("&")}
export function tripUrl(path,q){q=q||{};q.allianceid=AFF.trip.allianceid;q.sid=AFF.trip.sid;q.locale="th-TH";return "https://th.trip.com/"+path+"?"+qs(q)}
export function klookUrl(query){return "https://www.klook.com/th/search/result/?"+qs({query:query,aid:AFF.klook.aid})}
export function kkdayUrl(query){return "https://www.kkday.com/th/product/productlist?"+qs({keyword:query,cid:AFF.kkday.cid})}
export function cleanTitle(t){return t.replace(/[^฀-๿a-zA-Z0-9 ().+\-]/g,"").trim()}
