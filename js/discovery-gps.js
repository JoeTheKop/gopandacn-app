// @ts-check
// พิกัด GPS ต่อ candidate_key จาก China Travel WIKI GPS enrichment (แยกไฟล์จาก discovery-data.js
// โดยตั้งใจ เพราะไฟล์นี้ถูกส่งมาทับใหม่ทั้งเมืองเวลากุ๊กไก่อัปเดต ในขณะที่ discovery-data.js
// เป็นข้อความไทยที่พิมพ์มือ ไม่อยากให้การอัปเดต GPS เสี่ยงไปกระทบข้อความนั้น
//
// เกณฑ์ปักหมุด (ตัดสินใจร่วมกับป๋าโจ 2026-08-07): เฉพาะ confidence high/medium เท่านั้น
// ถึงจะมี lat/lng จริง — low confidence (ถ้ามีในอนาคต) และ not_found จะมี record อยู่
// (เก็บ status ไว้เพื่อ debug/audit) แต่ lat/lng เป็น null เสมอ ไม่ปักหมุด
//
// id ที่ไม่มี key อยู่ในอ็อบเจกต์นี้เลย = ยังไม่มีไฟล์ GPS ส่งมาจาก WIKI เลย (คนละสถานะกับ
// not_found)
//
// osmType/osmId เก็บไว้ตรวจสอบย้อนกลับกับ raw OSM object ใน WIKI เท่านั้น ไม่ได้ใช้ render
// (ตามคำขอป๋าโจ 2026-08-07 ให้เก็บ provenance ไว้ด้วย)
//
// uncertainty: จาก uncertainty_th ของ WIKI — โชว์เป็นคำเตือนเพิ่มใน popup เฉพาะหมุด
// confidence:"medium" (ตามคำขอ zhangjiajie-gps-supplement-handoff-v1.0.json "Show
// uncertainty_th when a medium-confidence marker is opened")

/**
 * @typedef {Object} DiscoveryGps
 * @property {number|null} lng - WGS-84, null ถ้ายังไม่มีพิกัดที่ปักหมุดได้ (confidence ไม่ถึง/not_found)
 * @property {number|null} lat
 * @property {"resolved"|"not_found"} status - match_status จาก WIKI GPS enrichment
 * @property {"high"|"medium"|"low"|null} confidence
 * @property {string|null} osmType
 * @property {number|null} osmId
 * @property {string|null} uncertainty - uncertainty_th จาก WIKI, โชว์เมื่อ confidence เป็น medium
 */

/** @type {Object<string, Object<string, DiscoveryGps>>} */
export var DISCOVERY_GPS = {
  // changsha: changsha-gps-enrichment-v2.1-reviewed.json — 31 resolved / 7 not_found
  changsha:{
    "cn-430100-hunan-museum":{lng:112.988241,lat:28.215313,status:"resolved",confidence:"high",osmType:"way",osmId:269856520,uncertainty:null},
    "cn-430100-changsha-museum":{lng:112.975061,lat:28.245249,status:"resolved",confidence:"high",osmType:"way",osmId:466202947,uncertainty:null},
    "cn-430100-bamboo-slip-museum":{lng:112.977554,lat:28.18832,status:"resolved",confidence:"high",osmType:"relation",osmId:7082008,uncertainty:null},
    "cn-430100-yuelu-academy":{lng:112.935169,lat:28.183923,status:"resolved",confidence:"high",osmType:"way",osmId:272516791,uncertainty:"object เป็นสถาบัน/อาคารเรียน (way) พิกัดเป็นศูนย์กลางตัวอาคาร"},
    "cn-430100-first-normal-school":{lng:112.967557,lat:28.179297,status:"resolved",confidence:"medium",osmType:"way",osmId:646859576,uncertainty:"object เป็นวิทยาเขต (way) พิกัดเป็นศูนย์กลาง campus ไม่ใช่จุดเดียวของสถานที่"},
    "cn-430100-tianxin-pavilion":{lng:112.975751,lat:28.187181,status:"resolved",confidence:"high",osmType:"way",osmId:481120086,uncertainty:null},
    "cn-430100-dufu-pavilion":{lng:112.963195,lat:28.188474,status:"resolved",confidence:"high",osmType:"node",osmId:4515330189,uncertainty:null},
    "cn-430100-kaifu-temple":{lng:112.974136,lat:28.225765,status:"resolved",confidence:"high",osmType:"relation",osmId:16162257,uncertainty:null},
    "cn-430100-orange-isle":{lng:112.957333,lat:28.18987,status:"resolved",confidence:"high",osmType:"relation",osmId:16734077,uncertainty:"object เป็นเกาะ/เขตทัศนียภาพ (relation) พิกัดเป็นศูนย์กลาง ไม่ใช่จุดเดียว"},
    "cn-430100-mao-statue-orange-isle":{lng:112.954792,lat:28.171082,status:"resolved",confidence:"high",osmType:"way",osmId:1165042478,uncertainty:null},
    "cn-430100-yuelu-mountain":{lng:112.930901,lat:28.186932,status:"resolved",confidence:"high",osmType:"relation",osmId:21127459,uncertainty:"object เป็นเทือกเขา/เขตทัศนียภาพ (relation) พิกัดเป็นศูนย์กลาง ไม่ใช่จุดเดียว"},
    "cn-430100-aixin-pavilion":{lng:112.93217,lat:28.184008,status:"resolved",confidence:"high",osmType:"node",osmId:4394591392,uncertainty:"object เป็นศาลา (node) ตรง identity"},
    "cn-430100-lieshi-park":{lng:112.993749,lat:28.214268,status:"resolved",confidence:"high",osmType:"way",osmId:273676907,uncertainty:"object เป็นสวนสาธารณะ (way) พิกัดเป็นศูนย์กลางสวน"},
    "cn-430100-xiang-river-waterfront":{lng:112.961957,lat:28.184552,status:"resolved",confidence:"medium",osmType:"way",osmId:547357069,uncertainty:"object เป็นเส้นทางเลียบแม่น้ำ (way) พิกัดเป็นจุดกลางเส้น ไม่ใช่ทางเข้าจุดเดียว"},
    "cn-430100-ifs-changsha":{lng:112.973137,lat:28.195882,status:"resolved",confidence:"high",osmType:"way",osmId:527545440,uncertainty:null},
    "cn-430100-huangxing-walking-street":{lng:112.970772,lat:28.191006,status:"resolved",confidence:"medium",osmType:"relation",osmId:15988592,uncertainty:"object เป็นถนนคนเดิน (relation) พิกัดเป็นจุดกลางเส้น ไม่ใช่ทางเข้าจุดเดียว"},
    "cn-430100-taiping-street":{lng:112.96621,lat:28.197067,status:"resolved",confidence:"medium",osmType:"way",osmId:445814171,uncertainty:"object เป็นถนนเก่า (way) พิกัดเป็นจุดกลางเส้น ไม่ใช่ทางเข้าจุดเดียว"},
    "cn-430100-pozi-street":{lng:112.968445,lat:28.193656,status:"resolved",confidence:"medium",osmType:"way",osmId:184960645,uncertainty:"object เป็นถนน (way) พิกัดเป็นจุดกลางเส้น ไม่ใช่ทางเข้าจุดเดียว"},
    "cn-430100-wenheyou":{lng:112.964194,lat:28.192357,status:"resolved",confidence:"medium",osmType:"node",osmId:10796263239,uncertainty:"object เป็นร้านอาหาร (node) จาก OSM ยืนยัน identity ชื่อ 'เหวินเหอโหย่ว' — พิกัดเป็นตัวร้าน ไม่ใช่ guarantee entrance"},
    "cn-430100-plan-exhibition-hall":{lng:112.975046,lat:28.245512,status:"resolved",confidence:"high",osmType:"node",osmId:4794443122,uncertainty:null},
    "cn-430100-yuloudong-cuisine":{lng:113.025658,lat:28.192653,status:"resolved",confidence:"medium",osmType:"way",osmId:273730025,uncertainty:"OSM ใช้ชื่อ 'ซินอวี้โหลวตง' ซึ่งเป็นสาขาของแบรนด์ 'อวี้โหลวตง' — พิกัดเป็นตัวร้านสาขานี้ ไม่ใช่ guarantee entrance"},
    "cn-430100-huogongdian":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"ร้านอาหารชื่อดังแต่ OSM ยังไม่มี object ที่ยืนยัน identity ตรงตัว ห้ามเดาพิกัดร้านอาหาร"},
    "cn-430100-changsha-south-station":{lng:113.059696,lat:28.149963,status:"resolved",confidence:"high",osmType:"way",osmId:283553006,uncertainty:"object เป็นอาคารสถานี (way) พิกัดเป็นศูนย์กลางตัวอาคาร"},
    "cn-430100-changsha-airport":{lng:113.22122,lat:28.190043,status:"resolved",confidence:"high",osmType:"relation",osmId:16735999,uncertainty:"object เป็น aerodrome (relation) พิกัดเป็นศูนย์กลางสนามบิน ไม่ใช่ terminal จุดเดียว"},
    "cn-430100-metro-line1-line2-hub":{lng:112.970967,lat:28.196967,status:"resolved",confidence:"high",osmType:"relation",osmId:7726984,uncertainty:"object เป็นสถานี/จุดจอด (relation) พิกัดเป็นสถานีกลาง ไม่ใช่ทางเข้าจุดเดียว"},
    "cn-430100-xiang-river-night-cruise":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"เรือล่องแม่น้ำกลางคืนเป็น experience ชั่วคราว OSM ไม่มีจุดขึ้นเรือถาวรที่ยืนยัน identity ได้ ห้ามเดาพิกัด"},
    "cn-430100-wuyi-square-zone":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"ย่านที่พัก ห้ามเดาพิกัด accommodation zone ตาม stop rule"},
    "cn-430100-hunan-museum-zone":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"ย่านที่พัก ห้ามเดาพิกัด accommodation zone ตาม stop rule"},
    "cn-430100-changsha-south-zone":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"ย่านที่พัก ห้ามเดาพิกัด accommodation zone ตาม stop rule"},
    "cn-430100-xiang-river-west-zone":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"ย่านที่พัก ห้ามเดาพิกัด accommodation zone ตาม stop rule"},
    "cn-430100-changsha-world-window":{lng:113.048885,lat:28.240295,status:"resolved",confidence:"high",osmType:"way",osmId:486708169,uncertainty:"object เป็นสวนสนุก (way) พิกัดเป็นศูนย์กลางสวน"},
    "cn-430100-meixi-lake-cultural-center":{lng:112.901609,lat:28.199828,status:"resolved",confidence:"high",osmType:"way",osmId:1277896414,uncertainty:null},
    "cn-430100-dezeen-mall":{lng:113.007435,lat:28.114879,status:"resolved",confidence:"medium",osmType:"way",osmId:649953191,uncertainty:"object เป็น 'เต๋อซือฉินซื่อจี้ฮุ่ย' (way) ซึ่งเป็นส่วนหนึ่งของคอมเพล็กซ์ทาสคิน ซิตี้ พลาซา — พิกัดเป็นส่วนประกอบ ไม่ใช่ศูนย์กลางทั้งคอมเพล็กซ์"},
    "cn-430100-meixi-lake-park":{lng:112.89504,lat:28.191723,status:"resolved",confidence:"high",osmType:"way",osmId:902352037,uncertainty:"object เป็นสวน (way) พิกัดเป็นศูนย์กลางสวน"},
    "cn-430100-yanghu-wetland-park":{lng:112.924498,lat:28.129665,status:"resolved",confidence:"high",osmType:"relation",osmId:15867482,uncertainty:"object เป็นอุทยานพื้นที่ชุ่มน้ำ (relation) พิกัดเป็นศูนย์กลาง"},
    "cn-430100-hunan-grand-theatre":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"OSM ไม่พบ object ชื่อ 'โรงละครใหญ่หูหนาน' (มีเพียง 'โรงละครเถียนฮั่น' ที่เป็นคนละโรง) ห้ามเดาพิกัด"},
    "cn-430100-changsha-zoo":{lng:112.999283,lat:28.035951,status:"resolved",confidence:"high",osmType:"way",osmId:568516861,uncertainty:"object เป็นสวนสัตว์ (way) พิกัดเป็นศูนย์กลางสวน"},
    "cn-430100-botanical-garden-cs":{lng:113.025386,lat:28.106971,status:"resolved",confidence:"high",osmType:"way",osmId:1076849410,uncertainty:"object เป็นสวนพฤกษศาสตร์ (way) พิกัดเป็นศูนย์กลางสวน"},
  },
  // zhangjiajie: zhangjiajie-gps-enrichment-v1.2-reviewed.json — 20 resolved / 6 not_found
  // + zhangjiajie-gps-supplement-v1.0-reviewed.json (delta 9 จุด, ไม่แทนที่ชุดหลัก) — 5 resolved / 4 not_found
  zhangjiajie:{
    "cn-430800-zjj-national-forest-park":{lng:110.46154,lat:29.35331,status:"resolved",confidence:"high",osmType:"relation",osmId:8536773,uncertainty:null},
    "cn-430800-yuanjiajie":{lng:110.43515,lat:29.34992,status:"resolved",confidence:"medium",osmType:"node",osmId:7832565635,uncertainty:"representative = ฐานนักท่องเที่ยว ไม่ใช่จุดชมวิวเฉพาะจุด"},
    "cn-430800-bailong-elevator":{lng:110.46117,lat:29.35118,status:"resolved",confidence:"high",osmType:"node",osmId:11454280669,uncertainty:null},
    "cn-430800-tianzi-mountain":{lng:110.49476,lat:29.39414,status:"resolved",confidence:"high",osmType:"node",osmId:5836003341,uncertainty:null},
    "cn-430800-jinxi-xi":{lng:110.4389,lat:29.33387,status:"resolved",confidence:"high",osmType:"node",osmId:12525847752,uncertainty:null},
    "cn-430800-huangshi-village":{lng:110.42621,lat:29.3328,status:"resolved",confidence:"high",osmType:"node",osmId:12525847753,uncertainty:null},
    "cn-430800-tianmen-mountain":{lng:110.47375,lat:29.05024,status:"resolved",confidence:"high",osmType:"way",osmId:573098921,uncertainty:null},
    "cn-430800-tianmen-cave":{lng:110.48274,lat:29.05136,status:"resolved",confidence:"high",osmType:"node",osmId:5521705221,uncertainty:null},
    "cn-430800-tianmen-cablecar":{lng:110.47708,lat:29.08274,status:"resolved",confidence:"high",osmType:"way",osmId:264991447,uncertainty:null},
    "cn-430800-glass-skywalk":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"ทางเดินกระจกเขาเทียนเหมินซานมีจริงตามข้อมูลท่องเที่ยว แต่ OSM ยังไม่มี object"},
    "cn-430800-grand-canyon-glass-bridge":{lng:110.69799,lat:29.39905,status:"resolved",confidence:"high",osmType:"way",osmId:434849557,uncertainty:null},
    "cn-430800-baofeng-lake":{lng:110.54266,lat:29.32317,status:"resolved",confidence:"high",osmType:"way",osmId:1352953744,uncertainty:null},
    "cn-430800-yellow-dragon-cave":{lng:110.61144,lat:29.3664,status:"resolved",confidence:"high",osmType:"way",osmId:958072609,uncertainty:null},
    "cn-430800-charming-xiangxi":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"โชว์เสน่ห์เซียงซีจัดที่หอประชุมในตำบลอู่หลิงหยวน แต่ OSM ยังไม่มี object ยืนยัน"},
    "cn-430800-zjj-west-station":{lng:110.458,lat:29.17137,status:"resolved",confidence:"high",osmType:"node",osmId:6615309047,uncertainty:null},
    "cn-430800-zjj-airport":{lng:110.4435,lat:29.10311,status:"resolved",confidence:"high",osmType:"way",osmId:787987141,uncertainty:null},
    "cn-430800-wulingyuan-east-gate":{lng:110.53044,lat:29.3543,status:"resolved",confidence:"medium",osmType:"node",osmId:6717732385,uncertainty:"representative = ศูนย์บริการนักท่องเที่ยวฝั่งอู่หลิงหยวน ไม่ใช่ตัวประตูสัญลักษณ์"},
    "cn-430800-zjj-city-center-zone":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"ย่านตัวเมืองเขตหย่งติ้ง โดยประมาณรอบสถานีจางเจียเจี้ยตะวันตก (29.17,110.46) แต่ไม่ใช่ object เดียว"},
    "cn-430800-wulingyuan-zone":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"ย่านตำบลอู่หลิงหยวน รอบสถานีขนส่งรถโดยสารอู่หลิงหยวน (29.353,110.540) แต่ไม่ใช่ object เดียว"},
    "cn-430800-tujia-folk-custom-park":{lng:110.45848,lat:29.12751,status:"resolved",confidence:"high",osmType:"way",osmId:572304726,uncertainty:null},
    "cn-430800-zjj-museum":{lng:110.4497,lat:29.1348,status:"resolved",confidence:"high",osmType:"node",osmId:5498357347,uncertainty:null},
    "cn-430800-72-qilou":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"เป็น landmark กลางคืนในตัวเมือง แต่ OSM ยังไม่มี object"},
    "cn-430800-yangjiajie":{lng:110.42322,lat:29.3617,status:"resolved",confidence:"medium",osmType:"way",osmId:326984502,uncertainty:"representative = สถานีรถบัสในพื้นที่ ไม่ใช่จุดชมวิวเฉพาะจุด"},
    "cn-430800-shili-gallery":{lng:110.48369,lat:29.36771,status:"resolved",confidence:"high",osmType:"way",osmId:484638629,uncertainty:null},
    "cn-430800-zjj-river-cruise":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"แม่น้ำหลีสุ่ยมีอยู่ใน OSM แต่จุดล่องเรือ/ท่าเรือกลางคืนยังไม่มี object"},
    "cn-430800-xibu-street":{lng:110.55243,lat:29.34717,status:"resolved",confidence:"medium",osmType:"way",osmId:1350845340,uncertainty:"object เป็นเส้นถนน ไม่ใช่ขอบเขตย่าน"},
    "cn-430800-qixing-mountain":{lng:110.4028867,lat:29.016346,status:"resolved",confidence:"medium",osmType:"node",osmId:13001154976,uncertainty:"พิกัดเป็นยอดเขา/พื้นที่สวนโดยรวม ไม่ใช่ทางเข้าหรือลานจอดจริงของสวนผจญภัย"},
    "cn-430800-qixing-sky-ladder":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:null},
    "cn-430800-tianmen-fox-fairy":{lng:110.4714079,lat:29.0690253,status:"resolved",confidence:"high",osmType:"way",osmId:1338361746,uncertainty:null},
    "cn-430800-jiutian-cave":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:null},
    "cn-430800-maoyan-river-rafting":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:null},
    "cn-430800-qian-gu-qing":{lng:110.5661403,lat:29.3495191,status:"resolved",confidence:"high",osmType:"way",osmId:1355314668,uncertainty:null},
    "cn-430800-helong-residence":{lng:110.163627,lat:29.4774709,status:"resolved",confidence:"high",osmType:"way",osmId:1520733746,uncertainty:null},
    "cn-430800-jiangya-hotspring":{lng:110.7572787,lat:29.5039418,status:"resolved",confidence:"medium",osmType:"way",osmId:492605594,uncertainty:"object เป็น resort/hotel ทั้งคอมเพล็กซ์ ไม่ใช่บ่อน้ำพุร้อนจุดเดียว"},
    "cn-430800-wanfu-hotspring":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:null},
  },
  // fenghuang: fenghuang-gps-enrichment-v1.1-reviewed.json — 18 resolved / 1 not_found
  fenghuang:{
    "cn-433123-fenghuang-ancient-town":{lng:109.6026831,lat:27.9508893,status:"resolved",confidence:"high",osmType:"way",osmId:1375371709,uncertainty:null},
    "cn-433123-tuojiang-boat":{lng:109.602982,lat:27.965681,status:"resolved",confidence:"medium",osmType:"way",osmId:224277807,uncertainty:"เป็นเส้นทางแม่น้ำ ไม่ใช่จุดขึ้นเรือเฉพาะ"},
    "cn-433123-hongqiao-bridge":{lng:109.601825,lat:27.951729,status:"resolved",confidence:"high",osmType:"way",osmId:286788519,uncertainty:null},
    "cn-433123-shen-congwen-residence":{lng:109.59831,lat:27.950633,status:"resolved",confidence:"high",osmType:"node",osmId:4471198291,uncertainty:null},
    "cn-433123-tiao-yan":{lng:109.598099,lat:27.953461,status:"resolved",confidence:"high",osmType:"way",osmId:286788525,uncertainty:null},
    "cn-433123-xiong-xiling-residence":{lng:109.5973304,lat:27.9530816,status:"resolved",confidence:"high",osmType:"node",osmId:4471226689,uncertainty:null},
    "cn-433123-east-gate":{lng:109.6009364,lat:27.9514637,status:"resolved",confidence:"high",osmType:"node",osmId:3251426700,uncertainty:null},
    "cn-433123-ancient-town-museum":{lng:109.59814,lat:27.951246,status:"resolved",confidence:"high",osmType:"node",osmId:4471151190,uncertainty:null},
    "cn-433123-wanming-pagoda":{lng:109.6036921,lat:27.9513072,status:"resolved",confidence:"high",osmType:"node",osmId:7835370757,uncertainty:null},
    "cn-433123-wanshou-palace":{lng:109.603684,lat:27.9518334,status:"resolved",confidence:"high",osmType:"node",osmId:4471198292,uncertainty:"ราคาค่าเข้าปัจจุบัน/แพ็กเกจตั๋วรวมยังไม่ยืนยัน — ข้อมูลค่าธรรมเนียมใน OSM เป็นข้อมูลเก่า ต้องตรวจสอบใหม่ก่อนเผยแพร่หรือใช้วางแผน"},
    "cn-433123-yang-family-hall":{lng:109.6002358,lat:27.9516619,status:"resolved",confidence:"high",osmType:"node",osmId:7838928179,uncertainty:null},
    "cn-433123-chongde-hall":{lng:109.5996186,lat:27.9513789,status:"resolved",confidence:"high",osmType:"node",osmId:4470034690,uncertainty:null},
    "cn-433123-nanhua-mountain":{lng:109.601477,lat:27.94961,status:"resolved",confidence:"medium",osmType:"way",osmId:1351507625,uncertainty:"จุดเข้าจริงของเขตวัฒนธรรมหนานฮวาซาน-เสินเฟิ่ง ต้อง re-check; OSM ระบุเป็น park กว้าง ๆ"},
    "cn-433123-shen-congwen-tomb":{lng:109.6097961,lat:27.9466383,status:"resolved",confidence:"high",osmType:"node",osmId:7491244405,uncertainty:null},
    "cn-433123-qiliang-cave":{lng:109.591201,lat:27.98869,status:"resolved",confidence:"medium",osmType:"way",osmId:1351216872,uncertainty:"OSM ระบุเป็น nature_reserve กว้าง ๆ ไม่ใช่ทางเข้าถ้ำ; จุดเข้าจริงควร re-check"},
    "cn-433123-fenghuang-gucheng-station":{lng:109.5991902,lat:28.0205093,status:"resolved",confidence:"high",osmType:"node",osmId:9544816611,uncertainty:"OSM ใช้ name=เมืองโบราณเฟิ่งหวง (ชื่อสถานีจริงคือ สถานีเฟิ่งหวงกูเฉิง) แต่ alt_name และ wikipedia ยืนยันว่าเป็นสถานีเดียวกัน"},
    "cn-433123-dehang-miao-village":{lng:109.5826637,lat:28.3474962,status:"resolved",confidence:"high",osmType:"way",osmId:1353433800,uncertainty:"อยู่ในเมืองจี๋โส่ว (administrative code 433101); เป็น nearby day trip ของเฟิ่งหวง และใช้ explicit admin mapping ตอน import"},
    "cn-433123-aizhai-bridge":{lng:109.596296,lat:28.333675,status:"resolved",confidence:"high",osmType:"way",osmId:668587797,uncertainty:"อยู่ในเมืองจี๋โส่ว (administrative code 433101); เป็น nearby day trip ของเฟิ่งหวง และใช้ explicit admin mapping ตอน import"},
    "cn-433123-border-town-show":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"ไม่มีพิกัดทดแทน; ห้ามเดา — รอ source ผู้จัด/ตั๋วออนไลน์ก่อนเติมพิกัด"},
  },
  // furong: furong-gps-enrichment-v0.4-reviewed.json — 7 resolved / 5 not_found
  furong:{
    "cn-433127-furong-ancient-town":{lng:109.94019,lat:28.74492,status:"resolved",confidence:"high",osmType:"relation",osmId:18721200,uncertainty:null},
    "cn-433127-furong-waterfall":{lng:109.9397999,lat:28.745069,status:"resolved",confidence:"high",osmType:"node",osmId:6602003986,uncertainty:null},
    "cn-433127-xizhou-copper-pillar":{lng:109.9395144,lat:28.7453918,status:"resolved",confidence:"high",osmType:"node",osmId:5222358822,uncertainty:null},
    "cn-433127-tuwang-bridge":{lng:109.9416925,lat:28.7453002,status:"resolved",confidence:"high",osmType:"way",osmId:1197149144,uncertainty:null},
    "cn-433127-tuwang-residence":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"identity ผ่าน Discovery (platform_verified) แต่ยังไม่มีตำแหน่ง GPS ที่เปิดตรวจได้"},
    "cn-433127-wangcun-wharf":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"identity ผ่าน Discovery (platform_verified) แต่ยังไม่มีตำแหน่ง GPS ที่เปิดตรวจได้"},
    "cn-433127-wuli-stone-street":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"identity ผ่าน Discovery (platform_verified) แต่ยังไม่มีตำแหน่ง GPS ที่เปิดตรวจได้"},
    "cn-433127-furong-midoutofu":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"Discovery ระบุร้านเลขที่ 113 (อ้างอิง ifeng ว่าหลิวเสี่ยวชิ่ง 2008 ยืนยันเลขที่ 113 เป็นจุดถ่ายทำ) แต่ไม่มีพิกัด OSM ตรวจสอบได้"},
    "cn-433127-xizhou-tusi-garden":{lng:null,lat:null,status:"not_found",confidence:null,osmType:null,osmId:null,uncertainty:"identity ผ่าน Discovery (platform_verified) แต่ยังไม่มีตำแหน่ง GPS ที่เปิดตรวจได้"},
    "cn-433127-laosicheng":{lng:109.9694751,lat:28.9979823,status:"resolved",confidence:"high",osmType:"way",osmId:1356179319,uncertainty:null},
    "cn-433127-mengdong-rafting":{lng:109.8664029,lat:28.7980734,status:"resolved",confidence:"medium",osmType:"way",osmId:162895131,uncertainty:"จุดขึ้นเรือ/ท่าเฉพาะของล่องแพแม่น้ำเมิ่งตง ยังไม่พบใน OSM — representative_point เป็น reference ตามแนวแม่น้ำเท่านั้น"},
    "cn-433127-hongshilin":{lng:109.8321139,lat:28.7595238,status:"resolved",confidence:"high",osmType:"node",osmId:6897252085,uncertainty:null},
  },
};
