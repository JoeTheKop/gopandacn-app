// @ts-check
// ข้อมูลแผนที่ล้วนๆ (พิกัด/ธีมสี/คีย์ tile) — แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
// ไฟล์นี้ไม่แตะ gpMap/DOM เลย (ต่างจาก js/map.js ที่จะตามมาในขั้นถัดไป) เพื่อให้โมดูลอื่น (เช่น
// GTTS_HIGHLIGHTS ใน app.js) import pinData ได้โดยไม่ต้องดึง MapLibre มาด้วย

/* ---- แผนที่จริง (feature 1.2): MapLibre GL + PMTiles ออฟไลน์ — พิกัดจริงจาก poc/pack-src/changsha-mini/poi.json ----
   ตอนนี้มีแค่ฉางซาเมืองเดียวที่มี .pmtiles จริง (ดู FEATURE-ROADMAP 1.2) เมืองอื่นในทริปยังไม่มีข้อมูลแผนที่จริง */
export var pinData={
  ifs:{ic:"📍",title:"IFS ฉางซา (国金中心)",desc:"แลนด์มาร์กใจกลางเมือง จุดถ่ายรูปหมี KAWS ชั้น 7 · ห่างจากที่พัก 850 ม. เดิน 11 นาที · เปิด 10:00–22:00",lng:112.9793,lat:28.1938,city:"ฉางซา"},
  orange:{ic:"🍊",title:"เกาะส้ม (橘子洲)",desc:"เกาะกลางแม่น้ำเซียง จุดชมวิวรูปปั้นเหมาเจ๋อตงหนุ่ม · นั่งรถรางรอบเกาะ ¥40 · เหมาะช่วงเย็นถึงค่ำ",lng:112.96,lat:28.1965,city:"ฉางซา"},
  pozi:{ic:"🏮",title:"ถนนโบราณโผจื่อเจีย (坡子街)",desc:"ถนนสายของกินอายุ 1,200 ปี · เต้าหู้เหม็นดำเจ้าดัง Huogongdian · คนแน่นช่วง 18:00 เป็นต้นไป",lng:112.9723,lat:28.1927,city:"ฉางซา"},
  yuelu:{ic:"⛰️",title:"เขาเยว่ลู่ (岳麓山)",desc:"จุดชมวิวเมืองฉางซา + วิทยาลัยเยว่ลู่พันปี · กระเช้าขึ้น ¥30 · ใช้เวลาครึ่งวัน แนะนำไปเช้า",lng:112.9316,lat:28.1855,city:"ฉางซา"},
  wanlong:{ic:"⛷️",title:"หวันหลง สกีรีสอร์ต (万龙滑雪场)",desc:"หนึ่งในสกีรีสอร์ตแรกๆ ของฉงลี่ · พิกัดยืนยันจาก OpenStreetMap",lng:115.3930784,lat:40.9613283,city:"ฉงลี่"},
  thaiwoo:{ic:"⛷️",title:"ไท่อู่ สกีรีสอร์ต (太舞滑雪场)",desc:"太舞滑雪小镇 (Thaiwoo) · พิกัดยืนยันจาก OpenStreetMap",lng:115.4366885,lat:40.8833809,city:"ฉงลี่"},
  yunding:{ic:"⛷️",title:"มี่หย่วน หยุนติ่ง (密苑云顶乐园)",desc:"หรือชื่อ Genting Secret Garden / Yunding Ski Park · พิกัดยืนยันจาก OpenStreetMap",lng:115.4185984,lat:40.9483320,city:"ฉงลี่"},
  /* ---- หมุดสถานีรถไฟหลักของแต่ละเมือง (feature: ป๋าโจขอให้ปักหมุดจริงบนแผนที่ ไม่ใช่แค่ใช้เป็นจุดกึ่งกลางเฉยๆ)
     พิกัดเดียวกับใน cityCenters (ยืนยันจาก OpenStreetMap แล้ว) — ทำให้เมืองที่เคยไม่มีหมุดเลย
     (จางเจียเจี้ย/เฟิ่งหวง/ฝูหรง/ปักกิ่ง/เทียนจิน) มีหมุดจริงอย่างน้อย 1 จุดด้วย ---- */
  csxStation:{ic:"🚄",title:"สถานีฉางซาใต้ (长沙南站)",desc:"สถานีรถไฟความเร็วสูงหลักของฉางซา จุดเชื่อมต่อเข้า-ออกเมืองสำคัญ",lng:113.058967,lat:28.150084,city:"ฉางซา",type:"station"},
  taizichengStation:{ic:"🚄",title:"สถานีไท่จื่อเฉิง (太子城站)",desc:"สถานีรถไฟความเร็วสูงใจกลางโซนสกีฉงลี่ ใกล้รีสอร์ตทั้ง 3 แห่ง",lng:115.441134,lat:40.912367,city:"ฉงลี่",type:"station"},
  bjnStation:{ic:"🚄",title:"สถานีปักกิ่งใต้ (北京南站)",desc:"สถานีรถไฟความเร็วสูงหลักของปักกิ่ง",lng:116.372753,lat:39.863555,city:"ปักกิ่ง",type:"station"},
  tjStation:{ic:"🚄",title:"สถานีเทียนจิน (天津站)",desc:"สถานีรถไฟหลักของเทียนจิน",lng:117.203684,lat:39.135752,city:"เทียนจิน",type:"station"},
  zjjwStation:{ic:"🚄",title:"สถานีจางเจียเจี้ยตะวันตก (张家界西站)",desc:"สถานีรถไฟความเร็วสูงหลักของจางเจียเจี้ย ฮับเชื่อมต่อไปเฟิ่งหวง/ฝูหรง",lng:110.458002,lat:29.171368,city:"จางเจียเจี้ย",type:"station"},
  fhStation:{ic:"🚄",title:"สถานีเฟิ่งหวงกู่เฉิง (凤凰古城站)",desc:"สถานีรถไฟความเร็วสูงหลักของเฟิ่งหวง",lng:109.59919,lat:28.020509,city:"เฟิ่งหวง",type:"station"},
  frStation:{ic:"🚄",title:"สถานีฝูหรงเจิ้น (芙蓉镇站)",desc:"สถานีรถไฟความเร็วสูงหลักของฝูหรงเจิ้น",lng:109.982015,lat:28.773023,city:"ฝูหรง",type:"station"},
  /* ---- หมุดโรงแรม/ที่พักจากแผนทริปจริง — เช็คแล้วมีแค่ 2 จาก 6 ที่พักในทริปหูหนานที่หาเจอใน OSM
     (ที่พักบูติกเล็กๆ/民宿 ส่วนใหญ่ยังไม่มีใครลงข้อมูลไว้ใน OpenStreetMap) เก็บไว้แค่ 2 จุดที่ยืนยันได้จริง
     ไม่ปั้นพิกัดที่เหลือ ---- */
  furongHotel:{ic:"🏨",title:"悬园·观景庭院民宿（芙蓉镇景区店）",desc:"ที่พักวันที่ 3 ของทริปหูหนาน (Xuanyuan Courtyard B&B) · วิวน้ำตกฝูหรง",lng:109.9439238,lat:28.7458229,city:"ฝูหรง",type:"hotel"},
  zjjHotel:{ic:"🏨",title:"喜见·枫庭酒店（张家界国家森林公园标志门店）",desc:"ที่พักวันที่ 4 ของทริปหูหนาน (Xijian Shanyu) · หน้าอุทยานจางเจียเจี้ย — ชื่อใน OSM ต่างจากแผนทริปเล็กน้อย (คนละแบรนด์ย่อยของเชนเดียวกัน ที่ตั้งเดียวกัน) ควรเช็คซ้ำก่อนใช้จริง",lng:110.5420018,lat:29.3511187,city:"จางเจียเจี้ย",type:"hotel"}
};
/* ---- จุดกึ่งกลาง+ซูมของแต่ละเมือง ใช้ "สถานีรถไฟหลัก" ของเมืองนั้นเป็นหมุด default (ตามที่ป๋าโจขอ)
   พิกัดยืนยันจาก OpenStreetMap (Overpass API) ทุกจุด ไม่ใช่พิกัดเดา · "ประเทศจีน" เป็นตัวเลือกพิเศษ
   จุดกึ่งกลางคำนวณจากรูปทรงมณฑลจริง (area-weighted centroid) ไม่ใช่พิกัดจำ ต้องอยู่ตัวแรกของอ็อบเจกต์
   เพราะ Object.keys() เรียงตามลำดับที่ใส่ ใช้กำหนดลำดับ dropdown "ดูแผนที่เมืองอื่น" ด้วย */
export var cityCenters={
  "ประเทศจีน":{lng:103.8229,lat:36.5624,zoom:3},
  "ฉางซา":{lng:113.058967,lat:28.150084,zoom:11.5}, // สถานีฉางซาใต้ 长沙南站
  "ฉงลี่":{lng:115.441134,lat:40.912367,zoom:11.5}, // สถานีไท่จื่อเฉิง 太子城站 (ใจกลางโซนสกี)
  "ปักกิ่ง":{lng:116.372753,lat:39.863555,zoom:11.5}, // สถานีปักกิ่งใต้ 北京南站
  "เทียนจิน":{lng:117.203684,lat:39.135752,zoom:11.5}, // สถานีเทียนจิน 天津站
  "จางเจียเจี้ย":{lng:110.458002,lat:29.171368,zoom:11.5}, // สถานีจางเจียเจี้ยตะวันตก 张家界西站
  "เฟิ่งหวง":{lng:109.59919,lat:28.020509,zoom:11.5}, // สถานีเฟิ่งหวงกู่เฉิง 凤凰古城站
  "ฝูหรง":{lng:109.982015,lat:28.773023,zoom:11.5} // สถานีฝูหรงเจิ้น 芙蓉镇站
};
/* ---- WGS-84 → GCJ-02 (สูตรมาตรฐานสาธารณะที่ใช้กันทั่วไปในงานแผนที่จีน ไม่ใช่ของ Amap เอง)
   จำเป็นเพราะแอปแผนที่จีน (Amap ฯลฯ) ใช้พิกัดเพี้ยนแบบ GCJ-02 ไม่ใช่ WGS-84 ดิบที่เราเก็บไว้
   ไม่งั้นหมุดจะไปโผล่คลาดเคลื่อน 50–500 ม. (ดู § ข้อจำกัดทางเทคนิคใน FEATURE-ROADMAP.md) ---- */
export function wgs84ToGcj02(lng,lat){
  var a=6378245.0,ee=0.00669342162296594323;
  function outOfChina(lng,lat){return lng<72.004||lng>137.8347||lat<0.8293||lat>55.8271}
  function transformLat(x,y){
    var ret=-100.0+2.0*x+3.0*y+0.2*y*y+0.1*x*y+0.2*Math.sqrt(Math.abs(x));
    ret+=(20.0*Math.sin(6.0*x*Math.PI)+20.0*Math.sin(2.0*x*Math.PI))*2.0/3.0;
    ret+=(20.0*Math.sin(y*Math.PI)+40.0*Math.sin(y/3.0*Math.PI))*2.0/3.0;
    ret+=(160.0*Math.sin(y/12.0*Math.PI)+320*Math.sin(y*Math.PI/30.0))*2.0/3.0;
    return ret;
  }
  function transformLng(x,y){
    var ret=300.0+x+2.0*y+0.1*x*x+0.1*x*y+0.1*Math.sqrt(Math.abs(x));
    ret+=(20.0*Math.sin(6.0*x*Math.PI)+20.0*Math.sin(2.0*x*Math.PI))*2.0/3.0;
    ret+=(20.0*Math.sin(x*Math.PI)+40.0*Math.sin(x/3.0*Math.PI))*2.0/3.0;
    ret+=(150.0*Math.sin(x/12.0*Math.PI)+300.0*Math.sin(x/30.0*Math.PI))*2.0/3.0;
    return ret;
  }
  if(outOfChina(lng,lat))return [lng,lat];
  var dLat=transformLat(lng-105.0,lat-35.0);
  var dLng=transformLng(lng-105.0,lat-35.0);
  var radLat=lat/180.0*Math.PI;
  var magic=Math.sin(radLat);
  magic=1-ee*magic*magic;
  var sqrtMagic=Math.sqrt(magic);
  dLat=(dLat*180.0)/((a*(1-ee))/(magic*sqrtMagic)*Math.PI);
  dLng=(dLng*180.0)/(a/sqrtMagic*Math.cos(radLat)*Math.PI);
  return [lng+dLng,lat+dLat];
}
export function amapNavUrl(d){
  var gcj=wgs84ToGcj02(d.lng,d.lat);
  return "https://uri.amap.com/navigation?to="+gcj[0].toFixed(6)+","+gcj[1].toFixed(6)+","+encodeURIComponent(d.title)+
    "&mode=car&policy=1&src=gopandacn&coordinate=gaode&callnative=1";
}
/* ---- หมุดรวมคลังสถานที่ตอนซูมออกกว้าง (ตัวเลขจาก DISCOVERY ใน discovery-data.js) ----
   อัปเดต 2026-08-07: ฉางซา/จางเจียเจี้ย/เฟิ่งหวง/ฝูหรง มีพิกัดจริงจาก China Travel WIKI ครบ 4 เมืองแล้ว
   (ดู js/discovery-gps.js) — ปักกิ่งยังไม่มี ใช้ discoveryPlaceProto (ค่าโดยประมาณ "ทดลอง") ต่อไปก่อน
   จนกว่าจะมีชุดข้อมูลยืนยันจากกุ๊กไก่/China Travel WIKI เหมือนที่ผ่านมา ---- */
export var discoveryCityAgg={
  "ฉางซา":{count:38,lng:cityCenters["ฉางซา"].lng,lat:cityCenters["ฉางซา"].lat},
  "จางเจียเจี้ย":{count:35,lng:cityCenters["จางเจียเจี้ย"].lng,lat:cityCenters["จางเจียเจี้ย"].lat},
  "เฟิ่งหวง":{count:19,lng:cityCenters["เฟิ่งหวง"].lng,lat:cityCenters["เฟิ่งหวง"].lat},
  "ฝูหรง":{count:12,lng:cityCenters["ฝูหรง"].lng,lat:cityCenters["ฝูหรง"].lat},
  "ปักกิ่ง":{count:38,lng:cityCenters["ปักกิ่ง"].lng,lat:cityCenters["ปักกิ่ง"].lat}
};
/* ---- Prototype: หมุดคลังสถานที่แบบทดลอง (task #8, 2026-08-04, ดู project_gopandacn_ux_redesign.md)
   เหลือเฉพาะปักกิ่งที่ยังไม่มีพิกัดจริง — ค่า "โดยประมาณ" จากความรู้ทั่วไป ไม่ได้ยืนยันจาก Overpass
   ห้ามเอาไปอ้างอิงพิกัดจริง ต้องถอดออกทันทีเมื่อมีชุดข้อมูลยืนยันจากกุ๊กไก่/China Travel WIKI (ตกลงกับ
   ป๋าโจไว้แบบนี้ 2026-08-07 — เหมือนที่เพิ่งทำกับฉางซา/จางเจียเจี้ยไปแล้ว) ---- */
export var discoveryPlaceProto={
  "ปักกิ่ง":[
    {ic:"🏯",title:"พระราชวังต้องห้าม",lng:116.3972,lat:39.9163},
    {ic:"⛩️",title:"หอบูชาฟ้าเทียนถาน",lng:116.4066,lat:39.8822},
    {ic:"🏞️",title:"พระราชวังฤดูร้อน",lng:116.2755,lat:39.9999}
  ]
};

/* ---- toggle สีถนนบนแผนที่ (feature: ป๋าโจไม่มีไอเดียสีตายตัว ขอเป็นปุ่มลองสลับดูง่ายๆ แทน)
   ข้อมูลธีมล้วนๆ อยู่ที่นี่ — ตัวปุ่ม/applyRoadTheme() ที่เรียก gpMap.setPaintProperty() ยังอยู่ js/map.js ---- */
export var ROAD_THEME_KEY="gopanda_road_theme_v1";
export var roadThemes=[
  {name:"ฟ้าเทา (เดิม)",
    casing:["match",["get","class"],
      ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],"#3d5c8c",
      ["secondary","secondary_link","tertiary","tertiary_link"],"#2e4568","#243450"],
    line:["match",["get","class"],
      ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],"#a9c4ee",
      ["secondary","secondary_link","tertiary","tertiary_link"],"#7896c2","#4a6285"]},
  {name:"ทอง",
    casing:["match",["get","class"],
      ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],"#6b4a1a",
      ["secondary","secondary_link","tertiary","tertiary_link"],"#55401f","#3d2f1a"],
    line:["match",["get","class"],
      ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],"#f5c869",
      ["secondary","secondary_link","tertiary","tertiary_link"],"#d9a94f","#a8823f"]},
  {name:"ขาว/เทาสว่าง",
    casing:["match",["get","class"],
      ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],"#2c2c30",
      ["secondary","secondary_link","tertiary","tertiary_link"],"#252528","#1c1c1e"],
    line:["match",["get","class"],
      ["motorway","motorway_link","trunk","trunk_link","primary","primary_link"],"#f1f5f9",
      ["secondary","secondary_link","tertiary","tertiary_link"],"#cbd5e1","#94a3b8"]}
];

/* ---- โหลด/สลับ tile ของเมืองที่กำลังดูอยู่แบบไดนามิก (feature: แยก pmtiles รายเมือง) — ดู js/map.js
   สำหรับ addCityTileLayers()/loadCityTiles() ที่ใช้ค่าพวกนี้จริง ---- */
export var CITY_TILE_KEY={"ฉางซา":"changsha","จางเจียเจี้ย":"zhangjiajie","เฟิ่งหวง":"fenghuang",
  "ฝูหรง":"furong","ฉงลี่":"chongli","ปักกิ่ง":"beijing","เทียนจิน":"tianjin"};
// กลับด้าน CITY_TILE_KEY (feature 2026-08-07: ปุ่มขยายมินิแมปในแผงคลังสถานที่ต้องแปลง city key
// อังกฤษของ DISCOVERY/DISCOVERY_GPS กลับเป็นชื่อไทยเพื่อเรียก flyToCity() ของแผนที่เต็มจอ)
export var CITY_KEY_TO_TH=Object.keys(CITY_TILE_KEY).reduce(function(o,th){o[CITY_TILE_KEY[th]]=th;return o},{});
export var CITY_TILE_LAYER_IDS=["water","water-line","landuse-park","buildings","roads-casing","roads-line","roads-label"];

/* ---- โครงข่ายถนน/น้ำจริงระดับภูมิภาค (2026-08-06) — ครอบกลุ่มเมืองทริปเป็นโซน ไม่ใช่รายเมือง
   ต่างจาก CITY_TILE_KEY จึงแยก mapping ไว้ต่างหาก ใช้ทั้งฝั่งวาดแผนที่ (js/map.js) และฝั่งปุ่ม
   "ดาวน์โหลดแผนที่ทริปนี้" (โหลดไฟล์ภูมิภาคที่เกี่ยวข้องมาด้วยพร้อมเมืองในทริป — ป๋าโจขอให้เป็น
   มาตรฐานตั้งแต่รอบนี้: โหลดทุกอย่างตอนมี WiFi ที่บ้าน ไม่พึ่งเน็ตหน้างาน) ---- */
export var REGION_FOR_CITY_KEY={
  changsha:"hunan-trip-region",zhangjiajie:"hunan-trip-region",
  fenghuang:"hunan-trip-region",furong:"hunan-trip-region",
  // เทียนจินแยกไฟล์ภูมิภาคของตัวเองแล้ว (2026-08-06) — กรอบ beijing-tianjin-chongli-region เดิม
  // ป๋าโจวาดไว้ขอบล่างสุด lat 39.5 ซึ่งอยู่เหนือตัวเมืองเทียนจินจริง (lat ~39.14) ไปแล้ว ข้อมูลถนน/น้ำ
  // รอบเทียนจินเลยว่างเปล่าไม่มีจริงในไฟล์เดิม (ไม่ใช่บั๊กโค้ด เป็นบั๊กกรอบที่ดาวน์โหลด) แก้โดยขอไฟล์ใหม่
  // เฉพาะโซนเทียนจิน (bbox 116.6,38.7,117.9,39.5) แทนที่จะฝากรวมกับกรอบปักกิ่ง
  beijing:"beijing-tianjin-chongli-region",tianjin:"tianjin-region",
  chongli:"beijing-tianjin-chongli-region"
};
export var REGIONAL_TILE_LABELS={
  "hunan-trip-region":"แผนที่เส้นทางหูหนาน (พื้นหลัง)",
  "beijing-tianjin-chongli-region":"แผนที่เส้นทางปักกิ่ง-ฉงลี่ (พื้นหลัง)",
  "tianjin-region":"แผนที่เส้นทางเทียนจิน (พื้นหลัง)"
};

/* ---- แหล่งสีเดียวของแผนที่ทั้งหมด (feature: ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 5 — ก่อนหน้านี้สีกระจาย
   อยู่ 2 จุดที่ต้องแก้พร้อมกันเวลาเปลี่ยนธีม: map-style.json (พื้นหลังประเทศ/มณฑล, static) และ
   addCityTileLayers() ใน js/map.js (น้ำ/อาคาร/ถนนต่อเมือง) — ตอนนี้รวมมาไว้ที่เดียวที่นี่ map-style.json
   ยังเก็บค่าตั้งต้นไว้เป็น fallback (กันแผนที่ขาวโล่งถ้า JS ยังโหลดไม่ทัน) แต่ gpMap.on("load") ใน map.js
   จะ setPaintProperty ทับด้วยค่าจากที่นี่ทันทีเสมอ ที่นี่จึงเป็นแหล่งจริงที่ต้องแก้เวลาเปลี่ยนธีมสี ---- */
export var MAP_COLORS={
  background:{
    bg:"#f7f8f7",
    countryFill:"#e2e8e5",
    provinceLine:"#8fa89f",
    countryLine:"#4f7268",
    // city-bounds-fill/city-bounds-line ถูกลบออกจาก map-style.json แล้ว (2026-08-05, § 4.5 ข้อ 4) —
    // เคยเป็นกรอบ placeholder เติมช่องว่าง z10.5-11 ให้เมืองที่ยังไม่มี tile จริงต่ำกว่า z11
    // ตอนนี้ทั้ง 7 เมืองมี progressive zoom ถึง z6 ครบแล้ว ไม่ต้องใช้กรอบคร่าวๆ อีก
    // ทะเลสาบ/แม่น้ำระดับประเทศ (Natural Earth 1:50m, เพิ่ม 2026-08-06) — เติมพื้นที่ว่างเปล่าช่วง
    // z6-11 ก่อนถึง city tile จริง ใช้สีเดียวกับ MAP_COLORS.city.water/waterOutline เพื่อให้กลืนกัน
    // ตอนซูมเข้าเจอ city tile จริง (ดูคำขอป๋าโจ 2026-08-06: "เพิ่มลายแผนที่" ที่ z3/z6 + ไล่ให้กลมกลืนถึง z11)
    lakeFill:"#c3dce8",lakeOutline:"#7fa8c2",riverLine:"#7fa8c2",
    // ถนนสายหลักระดับภูมิภาค (Natural Earth 1:10m, clip เฉพาะโซนหูหนาน+ปักกิ่ง-เทียนจิน-ฉงลี่ 345KB)
    // เพิ่ม 2026-08-06 เติมรายละเอียด z3-11 ก่อนถึง city tile จริง — ป๋าโจถามต่อจากรอบแม่น้ำ/ทะเลสาบ
    regionalRoadLine:"#9aa8b3",
    // Level 2/3 (2026-08-06, ป๋าโจขอสเกล "detail level" ชัดเจนแทนคำว่า "อีกนิด"): ป้ายชื่อมณฑล/เมือง
    // + ทางรถไฟ/เมืองรองระดับภูมิภาค — cityLabel ใช้กับ layer ที่เพิ่มแบบ dynamic ใน js/map.js
    // (ข้อมูลมาจาก cityCenters ไม่ใช่ static geojson) ส่วนที่เหลือ static อยู่ใน map-style.json แล้ว
    railroadLine:"#b0abc4",townPoint:"#8a97a3",townLabel:"#6b7680",
    provinceLabel:"#5c7268",cityLabel:"#33414d"
  },
  city:{
    water:"#c3dce8",waterOutline:"#7fa8c2",
    landusePark:"#cfe3d4",
    buildingFill:"#d8dde5",buildingOutline:"#aab3c2",
    roadCasingMajor:"#5b6b7a",roadCasingMid:"#8290a0",roadCasingMinor:"#a3aebb",
    roadLineMajor:"#ffffff",roadLineMid:"#f2f4f7",roadLineMinor:"#e8ecf0",
    roadLabelText:"#33414d",roadLabelHalo:"#f7f8f7"
  }
};
