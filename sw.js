/* GoPandaCN Flagship Service Worker (feature 1.1)
   Shell: precache + cache-first — เปิดออฟไลน์ได้ทั้งแอป (ไฟล์ HTML เดียว + asset)
   ตามแนวเดียวกับ poc/app/sw.js — same-origin cache-first, ไม่แตะไฟล์ข้าม origin (เช่น SheetJS CDN)
*/
const SHELL_CACHE = "gopandacn-shell-v41";
const SHELL = [
  "./", "./index.html",
  "./manifest.webmanifest",
  "./assets/mascot-64.png", "./assets/mascot-lingling.png",
  "./icons/icon-192.png", "./icons/icon-512.png",
  "./map-style.json",
  "./map-data/world-outline.geojson", "./map-data/china-provinces.geojson",
  "./vendor/maplibre/maplibre-gl.js", "./vendor/maplibre/maplibre-gl.css",
  "./vendor/pmtiles/pmtiles.js",
  "./tiles/changsha.pmtiles",
  "./audio/phrases/sos-0.mp3", "./audio/phrases/sos-1.mp3", "./audio/phrases/sos-2.mp3",
  "./audio/phrases/sos-3.mp3", "./audio/phrases/sos-4.mp3", "./audio/phrases/sos-5.mp3",
  "./audio/phrases/food-0.mp3", "./audio/phrases/food-1.mp3", "./audio/phrases/food-2.mp3",
  "./audio/phrases/food-3.mp3", "./audio/phrases/food-4.mp3", "./audio/phrases/food-5.mp3",
  "./audio/phrases/move-0.mp3", "./audio/phrases/move-1.mp3", "./audio/phrases/move-2.mp3",
  "./audio/phrases/move-3.mp3", "./audio/phrases/move-4.mp3",
  "./audio/phrases/shop-0.mp3", "./audio/phrases/shop-1.mp3", "./audio/phrases/shop-2.mp3",
  "./audio/phrases/shop-3.mp3", "./audio/phrases/shop-4.mp3",
  "./audio/phrases/hotel-0.mp3", "./audio/phrases/hotel-1.mp3", "./audio/phrases/hotel-2.mp3",
  "./audio/phrases/hotel-3.mp3", "./audio/phrases/hotel-4.mp3",
  // ฟอนต์ glyph SDF สำหรับชื่อถนน/สถานที่บนแผนที่ (poc/tools/build_font_glyphs.py)
  // เฉพาะตัวอักษรที่ใช้จริงในชื่อสถานที่ทั้ง 7 เมือง + ASCII พื้นฐาน (ไม่ใช่ CJK เต็มชุด ~45,000 ตัว)
  "./fonts/Noto Sans SC/0-255.pbf",
  "./fonts/Noto Sans SC/12288-12543.pbf",
  "./fonts/Noto Sans SC/19968-20223.pbf",
  "./fonts/Noto Sans SC/20224-20479.pbf",
  "./fonts/Noto Sans SC/20480-20735.pbf",
  "./fonts/Noto Sans SC/20736-20991.pbf",
  "./fonts/Noto Sans SC/20992-21247.pbf",
  "./fonts/Noto Sans SC/21248-21503.pbf",
  "./fonts/Noto Sans SC/21504-21759.pbf",
  "./fonts/Noto Sans SC/21760-22015.pbf",
  "./fonts/Noto Sans SC/22016-22271.pbf",
  "./fonts/Noto Sans SC/22272-22527.pbf",
  "./fonts/Noto Sans SC/22528-22783.pbf",
  "./fonts/Noto Sans SC/22784-23039.pbf",
  "./fonts/Noto Sans SC/23040-23295.pbf",
  "./fonts/Noto Sans SC/23296-23551.pbf",
  "./fonts/Noto Sans SC/23552-23807.pbf",
  "./fonts/Noto Sans SC/23808-24063.pbf",
  "./fonts/Noto Sans SC/24064-24319.pbf",
  "./fonts/Noto Sans SC/24320-24575.pbf",
  "./fonts/Noto Sans SC/24576-24831.pbf",
  "./fonts/Noto Sans SC/24832-25087.pbf",
  "./fonts/Noto Sans SC/25088-25343.pbf",
  "./fonts/Noto Sans SC/25344-25599.pbf",
  "./fonts/Noto Sans SC/25600-25855.pbf",
  "./fonts/Noto Sans SC/25856-26111.pbf",
  "./fonts/Noto Sans SC/26112-26367.pbf",
  "./fonts/Noto Sans SC/26368-26623.pbf",
  "./fonts/Noto Sans SC/26624-26879.pbf",
  "./fonts/Noto Sans SC/26880-27135.pbf",
  "./fonts/Noto Sans SC/27136-27391.pbf",
  "./fonts/Noto Sans SC/27392-27647.pbf",
  "./fonts/Noto Sans SC/27648-27903.pbf",
  "./fonts/Noto Sans SC/27904-28159.pbf",
  "./fonts/Noto Sans SC/28160-28415.pbf",
  "./fonts/Noto Sans SC/28416-28671.pbf",
  "./fonts/Noto Sans SC/28672-28927.pbf",
  "./fonts/Noto Sans SC/28928-29183.pbf",
  "./fonts/Noto Sans SC/29184-29439.pbf",
  "./fonts/Noto Sans SC/29440-29695.pbf",
  "./fonts/Noto Sans SC/29696-29951.pbf",
  "./fonts/Noto Sans SC/29952-30207.pbf",
  "./fonts/Noto Sans SC/30208-30463.pbf",
  "./fonts/Noto Sans SC/30464-30719.pbf",
  "./fonts/Noto Sans SC/30720-30975.pbf",
  "./fonts/Noto Sans SC/30976-31231.pbf",
  "./fonts/Noto Sans SC/31232-31487.pbf",
  "./fonts/Noto Sans SC/31488-31743.pbf",
  "./fonts/Noto Sans SC/31744-31999.pbf",
  "./fonts/Noto Sans SC/32000-32255.pbf",
  "./fonts/Noto Sans SC/32256-32511.pbf",
  "./fonts/Noto Sans SC/32512-32767.pbf",
  "./fonts/Noto Sans SC/32768-33023.pbf",
  "./fonts/Noto Sans SC/33024-33279.pbf",
  "./fonts/Noto Sans SC/33280-33535.pbf",
  "./fonts/Noto Sans SC/33536-33791.pbf",
  "./fonts/Noto Sans SC/33792-34047.pbf",
  "./fonts/Noto Sans SC/34048-34303.pbf",
  "./fonts/Noto Sans SC/34304-34559.pbf",
  "./fonts/Noto Sans SC/34560-34815.pbf",
  "./fonts/Noto Sans SC/34816-35071.pbf",
  "./fonts/Noto Sans SC/35072-35327.pbf",
  "./fonts/Noto Sans SC/35328-35583.pbf",
  "./fonts/Noto Sans SC/35584-35839.pbf",
  "./fonts/Noto Sans SC/35840-36095.pbf",
  "./fonts/Noto Sans SC/36096-36351.pbf",
  "./fonts/Noto Sans SC/36352-36607.pbf",
  "./fonts/Noto Sans SC/36608-36863.pbf",
  "./fonts/Noto Sans SC/36864-37119.pbf",
  "./fonts/Noto Sans SC/37120-37375.pbf",
  "./fonts/Noto Sans SC/37376-37631.pbf",
  "./fonts/Noto Sans SC/37632-37887.pbf",
  "./fonts/Noto Sans SC/37888-38143.pbf",
  "./fonts/Noto Sans SC/38144-38399.pbf",
  "./fonts/Noto Sans SC/38400-38655.pbf",
  "./fonts/Noto Sans SC/38656-38911.pbf",
  "./fonts/Noto Sans SC/38912-39167.pbf",
  "./fonts/Noto Sans SC/39168-39423.pbf",
  "./fonts/Noto Sans SC/39424-39679.pbf",
  "./fonts/Noto Sans SC/39680-39935.pbf",
  "./fonts/Noto Sans SC/39936-40191.pbf",
  "./fonts/Noto Sans SC/40192-40447.pbf",
  "./fonts/Noto Sans SC/40448-40703.pbf",
  "./fonts/Noto Sans SC/40704-40959.pbf",
  "./fonts/Noto Sans SC/64000-64255.pbf",
  "./fonts/Noto Sans SC/65280-65535.pbf",
  "./fonts/Noto Sans SC/8192-8447.pbf"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// PMTiles (feature 1.2) ต้องรองรับ HTTP Range เอง — ปล่อยให้ caches.match() slice range อัตโนมัติ
// ไม่นิ่งพอ (เจอ error "content-length exceeding request" เป็นบางครั้ง) เลย slice เองตรงนี้แทน
// เคยเจอปัญหาคล้ายกันมาแล้วฝั่ง POC เลยย้ายไปใช้ OPFS (ดู poc/app/sw.js) — แต่เรือธงยังไม่มีระบบนั้น
// จึง cache ไฟล์เต็มไว้เฉยๆ แล้ว slice ตาม Range header เองแทน ไม่พึ่งพฤติกรรม browser ที่ไม่นิ่ง
async function servePmtilesRange(request) {
  const cache = await caches.open(SHELL_CACHE);
  const full = await cache.match(request, { ignoreSearch: true });
  if (!full) return fetch(request); // ยังไม่เคย cache (เช่นระหว่าง install) — ปล่อยผ่านเน็ตตรงๆ
  const rangeHeader = request.headers.get("range");
  if (!rangeHeader) return full;
  const buf = await full.clone().arrayBuffer();
  const total = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader) || [];
  const start = m[1] ? parseInt(m[1], 10) : 0;
  const end = Math.min(m[2] ? parseInt(m[2], 10) : total - 1, total - 1);
  const chunk = buf.slice(start, end + 1);
  return new Response(chunk, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": full.headers.get("Content-Type") || "application/octet-stream",
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Content-Length": String(chunk.byteLength),
      "Accept-Ranges": "bytes"
    }
  });
}

// โมเดล Vosk (feature 2.1 หูฟังราคา) หนัก ~44MB — ไม่ precache รวมกับ SHELL ตอนติดตั้งแอป
// (จะทำให้ install แรกหนักเกินจำเป็นสำหรับคนที่ไม่ใช้ฟีเจอร์นี้) แต่ยัง "โหลดครั้งเดียว ใช้ออฟไลน์ได้ตลอด"
// ด้วย runtime caching: cache-first ปกติ ถ้า miss ก็ fetch จริงแล้วเก็บผลลง cache ก่อนคืนค่า
// ต่างจาก path อื่นด้านล่างที่แค่ fallback ไป fetch เฉยๆ ไม่เก็บ (เพราะ path อื่นถูก precache ไว้แล้วตั้งแต่ install)
async function serveCacheThenNetwork(request) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const resp = await fetch(request);
  if (resp.ok) cache.put(request, resp.clone());
  return resp;
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // ปล่อย SheetJS CDN ให้ browser จัดการเอง (ไม่ vendor วันนี้)
  if (url.pathname.endsWith(".pmtiles")) {
    e.respondWith(servePmtilesRange(e.request));
    return;
  }
  if (url.pathname.includes("/models/") || url.pathname.includes("/vendor/vosk/")) {
    e.respondWith(serveCacheThenNetwork(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request))
  );
});
