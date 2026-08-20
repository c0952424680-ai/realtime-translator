const COUNTRY_LANGUAGE_PROFILE={
 TW:{label:"繁體中文",voice:"zh-TW",phrase:"zh"},
 JP:{label:"日本語",voice:"ja-JP",phrase:"ja"},
 KR:{label:"한국어",voice:"ko-KR",phrase:"ko"},
 HK:{label:"廣東話",voice:"zh-HK",phrase:"yue"},
 VN:{label:"Tiếng Việt",voice:"vi-VN",phrase:"vi"},
 TH:{label:"ภาษาไทย",voice:"th-TH",phrase:"th"},
 SG:{label:"English",voice:"en-SG",phrase:"en"},
 MY:{label:"Bahasa Melayu",voice:"ms-MY",phrase:"ms"},
 PH:{label:"Filipino",voice:"fil-PH",phrase:"fil"},
 ID:{label:"Bahasa Indonesia",voice:"id-ID",phrase:"id"},
 DE:{label:"Deutsch",voice:"de-DE",phrase:"de"},
 FR:{label:"Français",voice:"fr-FR",phrase:"fr"},
 ES:{label:"Español",voice:"es-ES",phrase:"es"}
};

const LOCAL_PHRASES={};
for(const lang of ["zh","en","ja","ko","yue","vi","th","ms","fil","id","de","fr","es"]){
  LOCAL_PHRASES[lang]=Object.fromEntries(
    Object.entries(EMERGENCY_PHRASES).map(([k,v])=>[k,v[lang]||v.en])
  );
}

window.COUNTRY_LANGUAGE_PROFILE=COUNTRY_LANGUAGE_PROFILE;
window.LOCAL_PHRASES=LOCAL_PHRASES;
