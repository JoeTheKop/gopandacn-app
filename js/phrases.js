// @ts-check
// วลีจีนฉุกเฉิน — แยกจาก app.js (docs/design/ARCHITECTURE-ROADMAP.md § 4.5 ข้อ 6)
import {$} from "./utils.js";

var phCats=[["sos","🚨 ฉุกเฉิน"],["food","🍜 ร้านอาหาร"],["move","🚇 เดินทาง"],["shop","🛍️ ช้อปปิ้ง"],["hotel","🏨 โรงแรม"]];
var phrases={
  sos:[
    ["ช่วยด้วย!","救命!","jiù mìng","จิ้ว-มิ่ง"],
    ["เรียกตำรวจให้หน่อย","请帮我叫警察","qǐng bāng wǒ jiào jǐngchá","ฉิ่ง ปัง หว่อ เจี้ยว จิ่ง-ฉา"],
    ["ฉันต้องไปโรงพยาบาล","我要去医院","wǒ yào qù yīyuàn","หว่อ เหย้า ชวี่ อี-ย่วน"],
    ["ฉันแพ้อาหารทะเล","我对海鲜过敏","wǒ duì hǎixiān guòmǐn","หว่อ ตุ้ย ไห่-เซียน กั้ว-หมิ่น"],
    ["กระเป๋าเงินหาย","我的钱包丢了","wǒ de qiánbāo diū le","หว่อ เตอ เฉียน-เปา ติว เลอ"],
    ["ฉันหลงทาง ช่วยหน่อย","我迷路了，请帮帮我","wǒ mílù le, qǐng bāngbang wǒ","หว่อ หมี-ลู่ เลอ, ฉิ่ง ปัง-ปัง หว่อ"]
  ],
  food:[
    ["ไม่เอาเผ็ด","不要辣","bú yào là","ปู๋ เหย้า ล่า"],
    ["ไม่ใส่ผักชี","不要香菜","bú yào xiāngcài","ปู๋ เหย้า เซียง-ไช่"],
    ["เอาอันนี้ 1 ที่","要这个，一份","yào zhège, yí fèn","เหย้า เจ้อ-เก้อ, อี๋ เฟิ่น"],
    ["ขอน้ำเปล่าเย็น 1 ขวด","要一瓶冰水","yào yì píng bīng shuǐ","เหย้า อี้ ผิง ปิง สุ่ย"],
    ["เช็กบิล","买单","mǎi dān","หม่าย-ตัน"],
    ["อร่อยมาก!","很好吃!","hěn hǎochī","เหิ่น ห่าว-ชือ"]
  ],
  move:[
    ["สถานีรถไฟฟ้าอยู่ทางไหน","地铁站在哪里","dìtiě zhàn zài nǎlǐ","ตี้-เถี่ย จ้าน ไจ้ หนา-หลี่"],
    ["พาไปที่นี่ (โชว์ที่อยู่)","请带我去这里","qǐng dài wǒ qù zhèlǐ","ฉิ่ง ไต้ หว่อ ชวี่ เจ้อ-หลี่"],
    ["จอดตรงนี้ได้เลย","停这里就可以","tíng zhèlǐ jiù kěyǐ","ถิง เจ้อ-หลี่ จิ้ว เข่อ-อี่"],
    ["ห้องน้ำอยู่ไหน","洗手间在哪里","xǐshǒujiān zài nǎlǐ","สี-โส่ว-เจียน ไจ้ หนา-หลี่"],
    ["ไปสนามบินใช้เวลานานไหม","去机场要多久","qù jīchǎng yào duōjiǔ","ชวี่ จี-ฉ่าง เหย้า ตัว-จิ่ว"]
  ],
  shop:[
    ["ราคาเท่าไหร่","多少钱","duōshǎo qián","ตัว-เส่า เฉียน"],
    ["ลดหน่อยได้ไหม","便宜一点可以吗","piányí yìdiǎn kěyǐ ma","เผียน-อี๋ อี้-เตี่ยน เข่อ-อี่ มา"],
    ["แพงไปหน่อย","太贵了","tài guì le","ไท่ กุ้ย เลอ"],
    ["สแกนจ่ายได้ไหม","可以扫码吗","kěyǐ sǎo mǎ ma","เข่อ-อี่ เส่า หม่า มา"],
    ["ขอถุงใบนึง","要一个袋子","yào yí ge dàizi","เหย้า อี๋ เกอ ไต้-จึ"]
  ],
  hotel:[
    ["เช็กอิน จองในชื่อ…","办理入住，名字是…","bànlǐ rùzhù, míngzi shì…","ปั้น-หลี่ รู่-จู้, หมิง-จึ ชื่อ…"],
    ["ขอรหัส Wi-Fi หน่อย","Wi-Fi密码是多少","Wi-Fi mìmǎ shì duōshǎo","วาย-ฟาย มี่-หม่า ชื่อ ตัว-เส่า"],
    ["ฝากกระเป๋าได้ไหม","可以寄存行李吗","kěyǐ jìcún xínglǐ ma","เข่อ-อี่ จี้-ฉุน สิง-หลี่ มา"],
    ["แอร์เสีย ช่วยดูหน่อย","空调坏了","kōngtiáo huài le","คง-เถียว ไฮว่ เลอ"],
    ["เช็กเอาต์ ขอบคุณครับ/ค่ะ","退房，谢谢","tuì fáng, xièxie","ทุ่ย ฝัง, เซี่ย-เซี่ย"]
  ]
};
var curCat="sos";
function renderPhrases(){
  $("#phCats").innerHTML=phCats.map(function(c){
    return '<button class="cat-chip'+(c[0]===curCat?' active':'')+'" data-cat="'+c[0]+'" role="tab" aria-selected="'+(c[0]===curCat)+'">'+c[1]+'</button>';
  }).join("");
  $("#phGrid").innerHTML=phrases[curCat].map(function(p,i){
    return '<div class="ph-card" data-i="'+i+'" tabindex="0" role="button" aria-label="'+p[0]+'">'+
      '<button class="ph-speak" data-i="'+i+'" aria-label="อ่านออกเสียง: '+p[0]+'">🔊</button>'+
      '<span class="th">'+p[0]+'</span><span class="cn">'+p[1]+'</span>'+
      '<span class="py">'+p[2]+'</span><span class="pron">อ่านว่า: '+p[3]+'</span>'+
      '<span class="ph-hint">แตะเพื่อขยายโชว์ให้คนจีนอ่าน ↗</span></div>';
  }).join("");
}
// เรียกจาก app.js's #sosPhrases handler (นอกโมดูลนี้) แทนการ assign curCat ตรงๆ ข้ามโมดูล
export function showPhraseCat(cat){curCat=cat;renderPhrases()}

/* ---- เสียงพูดภาษาจีน (feature 1.5): ใช้ไฟล์เสียงจริงที่อัดไว้ล่วงหน้าก่อน (ไม่พึ่ง voice ของเครื่อง)
   ตกไป speechSynthesis เฉพาะประโยคที่ไม่มีไฟล์ (เช่น ประโยคคนขับที่ประกอบชื่อสถานที่แบบไดนามิก) */
var phraseAudioMap=(function(){
  var map={};
  phCats.forEach(function(c){
    (phrases[c[0]]||[]).forEach(function(p,i){map[p[1]]="audio/phrases/"+c[0]+"-"+i+".mp3"});
  });
  return map;
})();
var curPhraseAudio=null;
export function speakCn(txt){
  if(curPhraseAudio){curPhraseAudio.pause();curPhraseAudio=null}
  var file=phraseAudioMap[txt];
  if(file){curPhraseAudio=new Audio(file);curPhraseAudio.play();return}
  if(!window.speechSynthesis)return;
  var u=new SpeechSynthesisUtterance(txt);u.lang="zh-CN";u.rate=.85;
  speechSynthesis.cancel();speechSynthesis.speak(u);
}
var bigShow=$("#bigShow");
export function openBig(p){
  $("#bigCn").textContent=p[1];$("#bigPy").textContent=p[2];
  $("#bigTh").textContent=p[0]+" · อ่านว่า "+p[3];
  bigShow.classList.add("show");
}
$("#view-phrases").addEventListener("click",function(e){
  var chip=e.target.closest(".cat-chip");
  if(chip){curCat=chip.dataset.cat;renderPhrases();return}
  var sp=e.target.closest(".ph-speak");
  if(sp){speakCn(phrases[curCat][+sp.dataset.i][1]);return}
  var card=e.target.closest(".ph-card");
  if(card)openBig(phrases[curCat][+card.dataset.i]);
});
$("#view-phrases").addEventListener("keydown",function(e){
  var card=e.target.closest(".ph-card");
  if(card&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openBig(phrases[curCat][+card.dataset.i])}
});
bigShow.addEventListener("click",function(e){
  if(e.target.closest("#bigSpeak"))return;
  bigShow.classList.remove("show");
});
$("#bigSpeak").addEventListener("click",function(e){
  e.stopPropagation();speakCn($("#bigCn").textContent);
});
renderPhrases();
