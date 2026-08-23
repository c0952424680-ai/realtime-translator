#!/usr/bin/env python3
import io,json,os,re,urllib.request,zipfile,xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime,timezone
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),".."));OUT=os.path.join(ROOT,"data");os.makedirs(OUT,exist_ok=True)
ZH={"AC": "阿森松島", "AD": "安道爾", "AE": "阿拉伯聯合大公國", "AF": "阿富汗", "AG": "安地卡及巴布達", "AI": "安奎拉", "AL": "阿爾巴尼亞", "AM": "亞美尼亞", "AO": "安哥拉", "AQ": "南極洲", "AR": "阿根廷", "AS": "美屬薩摩亞", "AT": "奧地利", "AU": "澳洲", "AW": "荷屬阿魯巴", "AX": "奧蘭群島", "AZ": "亞塞拜然", "BA": "波士尼亞與赫塞哥維納", "BB": "巴貝多", "BD": "孟加拉", "BE": "比利時", "BF": "布吉納法索", "BG": "保加利亞", "BH": "巴林", "BI": "蒲隆地", "BJ": "貝南", "BL": "聖巴瑟米", "BM": "百慕達", "BN": "汶萊", "BO": "玻利維亞", "BQ": "荷蘭加勒比區", "BR": "巴西", "BS": "巴哈馬", "BT": "不丹", "BV": "布威島", "BW": "波札那", "BY": "白俄羅斯", "BZ": "貝里斯", "CA": "加拿大", "CC": "科克斯（基靈）群島", "CD": "剛果（金夏沙）", "CF": "中非共和國", "CG": "剛果（布拉薩）", "CH": "瑞士", "CI": "象牙海岸", "CK": "庫克群島", "CL": "智利", "CM": "喀麥隆", "CN": "中國", "CO": "哥倫比亞", "CP": "克里派頓島", "CR": "哥斯大黎加", "CU": "古巴", "CV": "維德角", "CW": "庫拉索", "CX": "聖誕島", "CY": "賽普勒斯", "CZ": "捷克", "DE": "德國", "DG": "迪亞哥加西亞島", "DJ": "吉布地", "DK": "丹麥", "DM": "多米尼克", "DO": "多明尼加共和國", "DZ": "阿爾及利亞", "EA": "休達與梅利利亞", "EC": "厄瓜多", "EE": "愛沙尼亞", "EG": "埃及", "EH": "西撒哈拉", "ER": "厄利垂亞", "ES": "西班牙", "ET": "衣索比亞", "EU": "歐盟", "EZ": "歐元區", "FI": "芬蘭", "FJ": "斐濟", "FK": "福克蘭群島", "FM": "密克羅尼西亞", "FO": "法羅群島", "FR": "法國", "GA": "加彭", "GB": "英國", "GD": "格瑞那達", "GE": "喬治亞", "GF": "法屬圭亞那", "GG": "根息", "GH": "迦納", "GI": "直布羅陀", "GL": "格陵蘭", "GM": "甘比亞", "GN": "幾內亞", "GP": "瓜地洛普", "GQ": "赤道幾內亞", "GR": "希臘", "GS": "南喬治亞與南三明治群島", "GT": "瓜地馬拉", "GU": "關島", "GW": "幾內亞比索", "GY": "蓋亞那", "HK": "中國香港特別行政區", "HM": "赫德島及麥唐納群島", "HN": "宏都拉斯", "HR": "克羅埃西亞", "HT": "海地", "HU": "匈牙利", "IC": "加那利群島", "ID": "印尼", "IE": "愛爾蘭", "IL": "以色列", "IM": "曼島", "IN": "印度", "IO": "英屬印度洋領地", "IQ": "伊拉克", "IR": "伊朗", "IS": "冰島", "IT": "義大利", "JE": "澤西島", "JM": "牙買加", "JO": "約旦", "JP": "日本", "KE": "肯亞", "KG": "吉爾吉斯", "KH": "柬埔寨", "KI": "吉里巴斯", "KM": "葛摩", "KN": "聖克里斯多福及尼維斯", "KP": "北韓", "KR": "南韓", "KW": "科威特", "KY": "開曼群島", "KZ": "哈薩克", "LA": "寮國", "LB": "黎巴嫩", "LC": "聖露西亞", "LI": "列支敦斯登", "LK": "斯里蘭卡", "LR": "賴比瑞亞", "LS": "賴索托", "LT": "立陶宛", "LU": "盧森堡", "LV": "拉脫維亞", "LY": "利比亞", "MA": "摩洛哥", "MC": "摩納哥", "MD": "摩爾多瓦", "ME": "蒙特內哥羅", "MF": "法屬聖馬丁", "MG": "馬達加斯加", "MH": "馬紹爾群島", "MK": "北馬其頓", "ML": "馬利", "MM": "緬甸", "MN": "蒙古", "MO": "中國澳門特別行政區", "MP": "北馬利安納群島", "MQ": "馬丁尼克", "MR": "茅利塔尼亞", "MS": "蒙哲臘", "MT": "馬爾他", "MU": "模里西斯", "MV": "馬爾地夫", "MW": "馬拉威", "MX": "墨西哥", "MY": "馬來西亞", "MZ": "莫三比克", "NA": "納米比亞", "NC": "新喀里多尼亞", "NE": "尼日", "NF": "諾福克島", "NG": "奈及利亞", "NI": "尼加拉瓜", "NL": "荷蘭", "NO": "挪威", "NP": "尼泊爾", "NR": "諾魯", "NU": "紐埃島", "NZ": "紐西蘭", "OM": "阿曼", "PA": "巴拿馬", "PE": "秘魯", "PF": "法屬玻里尼西亞", "PG": "巴布亞紐幾內亞", "PH": "菲律賓", "PK": "巴基斯坦", "PL": "波蘭", "PM": "聖皮埃與密克隆群島", "PN": "皮特肯群島", "PR": "波多黎各", "PS": "巴勒斯坦自治區", "PT": "葡萄牙", "PW": "帛琉", "PY": "巴拉圭", "QA": "卡達", "QO": "大洋洲邊疆群島", "RE": "留尼旺", "RO": "羅馬尼亞", "RS": "塞爾維亞", "RU": "俄羅斯", "RW": "盧安達", "SA": "沙烏地阿拉伯", "SB": "索羅門群島", "SC": "塞席爾", "SD": "蘇丹", "SE": "瑞典", "SG": "新加坡", "SH": "聖赫勒拿島", "SI": "斯洛維尼亞", "SJ": "挪威屬斯瓦巴及尖棉", "SK": "斯洛伐克", "SL": "獅子山", "SM": "聖馬利諾", "SN": "塞內加爾", "SO": "索馬利亞", "SR": "蘇利南", "SS": "南蘇丹", "ST": "聖多美普林西比", "SV": "薩爾瓦多", "SX": "荷屬聖馬丁", "SY": "敘利亞", "SZ": "史瓦帝尼", "TA": "特里斯坦達庫尼亞群島", "TC": "土克斯及開科斯群島", "TD": "查德", "TF": "法屬南部屬地", "TG": "多哥", "TH": "泰國", "TJ": "塔吉克", "TK": "托克勞群島", "TL": "東帝汶", "TM": "土庫曼", "TN": "突尼西亞", "TO": "東加", "TR": "土耳其", "TT": "千里達及托巴哥", "TV": "吐瓦魯", "TW": "台灣", "TZ": "坦尚尼亞", "UA": "烏克蘭", "UG": "烏干達", "UM": "美國本土外小島嶼", "UN": "聯合國", "US": "美國", "UY": "烏拉圭", "UZ": "烏茲別克", "VA": "梵蒂岡", "VC": "聖文森及格瑞那丁", "VE": "委內瑞拉", "VG": "英屬維京群島", "VI": "美屬維京群島", "VN": "越南", "VU": "萬那杜", "WF": "瓦利斯群島和富圖那群島", "WS": "薩摩亞", "XA": "偽區域", "XB": "偽比迪", "XK": "科索沃", "YE": "葉門", "YT": "馬約特島", "ZA": "南非", "ZM": "尚比亞", "ZW": "辛巴威", "ZZ": "未知區域"}
TW_CENTERS={"基隆市": [25.1276, 121.7392], "臺北市": [25.0375, 121.5637], "新北市": [25.0114, 121.4618], "桃園市": [24.9937, 121.301], "新竹市": [24.8138, 120.9675], "新竹縣": [24.8387, 121.0177], "苗栗縣": [24.5602, 120.8214], "臺中市": [24.1477, 120.6736], "彰化縣": [24.0756, 120.544], "南投縣": [23.9609, 120.9719], "雲林縣": [23.7092, 120.4313], "嘉義市": [23.4801, 120.4491], "嘉義縣": [23.4518, 120.2555], "臺南市": [22.9999, 120.2269], "高雄市": [22.6273, 120.3014], "屏東縣": [22.5519, 120.5488], "宜蘭縣": [24.7021, 121.7378], "花蓮縣": [23.9911, 121.6112], "臺東縣": [22.7554, 121.15], "澎湖縣": [23.5712, 119.5793], "金門縣": [24.4494, 118.3767], "連江縣": [26.1602, 119.9517]}
TW_FALLBACK={"基隆市": ["仁愛區", "信義區", "中正區", "中山區", "安樂區", "暖暖區", "七堵區"], "臺北市": ["中正區", "大同區", "中山區", "松山區", "大安區", "萬華區", "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"], "新北市": ["板橋區", "三重區", "中和區", "永和區", "新莊區", "新店區", "土城區", "蘆洲區", "汐止區", "樹林區", "鶯歌區", "三峽區", "淡水區", "瑞芳區", "五股區", "泰山區", "林口區", "深坑區", "石碇區", "坪林區", "三芝區", "石門區", "八里區", "平溪區", "雙溪區", "貢寮區", "金山區", "萬里區", "烏來區"], "桃園市": ["桃園區", "中壢區", "平鎮區", "八德區", "楊梅區", "蘆竹區", "大溪區", "龍潭區", "龜山區", "大園區", "觀音區", "新屋區", "復興區"], "新竹市": ["東區", "北區", "香山區"], "新竹縣": ["竹北市", "竹東鎮", "新埔鎮", "關西鎮", "湖口鄉", "新豐鄉", "芎林鄉", "橫山鄉", "北埔鄉", "寶山鄉", "峨眉鄉", "尖石鄉", "五峰鄉"], "苗栗縣": ["苗栗市", "頭份市", "竹南鎮", "後龍鎮", "通霄鎮", "苑裡鎮", "卓蘭鎮", "造橋鄉", "西湖鄉", "頭屋鄉", "公館鄉", "銅鑼鄉", "三義鄉", "大湖鄉", "獅潭鄉", "三灣鄉", "南庄鄉", "泰安鄉"], "臺中市": ["中區", "東區", "南區", "西區", "北區", "北屯區", "西屯區", "南屯區", "太平區", "大里區", "霧峰區", "烏日區", "豐原區", "后里區", "石岡區", "東勢區", "和平區", "新社區", "潭子區", "大雅區", "神岡區", "大肚區", "沙鹿區", "龍井區", "梧棲區", "清水區", "大甲區", "外埔區", "大安區"], "彰化縣": ["彰化市", "員林市", "鹿港鎮", "和美鎮", "北斗鎮", "溪湖鎮", "田中鎮", "二林鎮", "線西鄉", "伸港鄉", "福興鄉", "秀水鄉", "花壇鄉", "芬園鄉", "大村鄉", "埔鹽鄉", "埔心鄉", "永靖鄉", "社頭鄉", "二水鄉", "田尾鄉", "埤頭鄉", "芳苑鄉", "大城鄉", "竹塘鄉", "溪州鄉"], "南投縣": ["南投市", "埔里鎮", "草屯鎮", "竹山鎮", "集集鎮", "名間鄉", "鹿谷鄉", "中寮鄉", "魚池鄉", "國姓鄉", "水里鄉", "信義鄉", "仁愛鄉"], "雲林縣": ["斗六市", "斗南鎮", "虎尾鎮", "西螺鎮", "土庫鎮", "北港鎮", "古坑鄉", "大埤鄉", "莿桐鄉", "林內鄉", "二崙鄉", "崙背鄉", "麥寮鄉", "東勢鄉", "褒忠鄉", "臺西鄉", "元長鄉", "四湖鄉", "口湖鄉", "水林鄉"], "嘉義市": ["東區", "西區"], "嘉義縣": ["太保市", "朴子市", "布袋鎮", "大林鎮", "民雄鄉", "溪口鄉", "新港鄉", "六腳鄉", "東石鄉", "義竹鄉", "鹿草鄉", "水上鄉", "中埔鄉", "竹崎鄉", "梅山鄉", "番路鄉", "大埔鄉", "阿里山鄉"], "臺南市": ["中西區", "東區", "南區", "北區", "安平區", "安南區", "永康區", "歸仁區", "新化區", "左鎮區", "玉井區", "楠西區", "南化區", "仁德區", "關廟區", "龍崎區", "官田區", "麻豆區", "佳里區", "西港區", "七股區", "將軍區", "學甲區", "北門區", "新營區", "後壁區", "白河區", "東山區", "六甲區", "下營區", "柳營區", "鹽水區", "善化區", "大內區", "山上區", "新市區", "安定區"], "高雄市": ["新興區", "前金區", "苓雅區", "鹽埕區", "鼓山區", "旗津區", "前鎮區", "三民區", "楠梓區", "小港區", "左營區", "仁武區", "大社區", "岡山區", "路竹區", "阿蓮區", "田寮區", "燕巢區", "橋頭區", "梓官區", "彌陀區", "永安區", "湖內區", "鳳山區", "大寮區", "林園區", "鳥松區", "大樹區", "旗山區", "美濃區", "六龜區", "內門區", "杉林區", "甲仙區", "桃源區", "那瑪夏區", "茂林區", "茄萣區"], "屏東縣": ["屏東市", "潮州鎮", "東港鎮", "恆春鎮", "萬丹鄉", "長治鄉", "麟洛鄉", "九如鄉", "里港鄉", "鹽埔鄉", "高樹鄉", "萬巒鄉", "內埔鄉", "竹田鄉", "新埤鄉", "枋寮鄉", "新園鄉", "崁頂鄉", "林邊鄉", "南州鄉", "佳冬鄉", "琉球鄉", "車城鄉", "滿州鄉", "枋山鄉", "三地門鄉", "霧臺鄉", "瑪家鄉", "泰武鄉", "來義鄉", "春日鄉", "獅子鄉", "牡丹鄉"], "宜蘭縣": ["宜蘭市", "羅東鎮", "蘇澳鎮", "頭城鎮", "礁溪鄉", "壯圍鄉", "員山鄉", "冬山鄉", "五結鄉", "三星鄉", "大同鄉", "南澳鄉"], "花蓮縣": ["花蓮市", "鳳林鎮", "玉里鎮", "新城鄉", "吉安鄉", "壽豐鄉", "光復鄉", "豐濱鄉", "瑞穗鄉", "富里鄉", "秀林鄉", "萬榮鄉", "卓溪鄉"], "臺東縣": ["臺東市", "成功鎮", "關山鎮", "卑南鄉", "鹿野鄉", "池上鄉", "東河鄉", "長濱鄉", "太麻里鄉", "大武鄉", "綠島鄉", "海端鄉", "延平鄉", "金峰鄉", "達仁鄉", "蘭嶼鄉"], "澎湖縣": ["馬公市", "湖西鄉", "白沙鄉", "西嶼鄉", "望安鄉", "七美鄉"], "金門縣": ["金城鎮", "金沙鎮", "金湖鎮", "金寧鄉", "烈嶼鄉", "烏坵鄉"], "連江縣": ["南竿鄉", "北竿鄉", "莒光鄉", "東引鄉"]}
VERIFIED_EMERGENCY={"TW": {"police": "110", "ambulance": "119", "fire": "119"}, "JP": {"police": "110", "ambulance": "119", "fire": "119"}, "DE": {"police": "110", "ambulance": "112", "fire": "112"}, "FR": {"police": "17", "ambulance": "15", "fire": "18"}, "ES": {"police": "112", "ambulance": "112", "fire": "112"}}
def get(url,timeout=60):
 req=urllib.request.Request(url,headers={"User-Agent":"realtime-translator-data-updater/1.0"})
 with urllib.request.urlopen(req,timeout=timeout) as r:return r.read()
def flag(code):return "".join(chr(127397+ord(c)) for c in code)
def country_info():
 text=get("https://download.geonames.org/export/dump/countryInfo.txt").decode("utf-8");out={}
 for line in text.splitlines():
  if not line or line.startswith("#"):continue
  p=line.split("\t")
  if len(p)>=17:out[p[0]]={"country":p[4],"capital":p[5],"languages":p[15]}
 return out
def geonames():
 raw=get("https://download.geonames.org/export/dump/cities15000.zip",120);z=zipfile.ZipFile(io.BytesIO(raw));groups=defaultdict(list)
 for line in z.read(z.namelist()[0]).decode("utf-8").splitlines():
  p=line.split("\t")
  if len(p)<19:continue
  try:groups[p[8]].append({"name":p[1],"ascii":p[2],"lat":float(p[4]),"lon":float(p[5]),"pop":int(p[14] or 0)})
  except:pass
 return groups
def texts(n):return {re.sub(r".*}","",c.tag).lower():(c.text or "").strip() for c in n.iter()}
def taiwan():
 result={}
 try:
  root=ET.fromstring(get("https://api.nlsc.gov.tw/other/ListCounty").decode("utf-8"))
  rows=[]
  for n in list(root):
   d=texts(n);name=next((v for k,v in d.items() if "countyname" in k),"");code=next((v for k,v in d.items() if "countycode" in k),"")
   if name and code:rows.append((code,name.replace("台","臺") if name.startswith("台") else name))
  for code,name in rows:
   if name not in TW_CENTERS:continue
   ds=[]
   try:
    tr=ET.fromstring(get(f"https://api.nlsc.gov.tw/other/ListTown1/{code}").decode("utf-8"))
    for n in list(tr):
     d=texts(n);t=next((v for k,v in d.items() if "townname" in k),"")
     if t:ds.append(t)
   except:pass
   if not ds:ds=TW_FALLBACK.get(name,["全市"])
   lat,lon=TW_CENTERS[name];result[name]={"lat":lat,"lon":lon,"districts":ds}
 except Exception as e:print("NLSC fallback",e)
 if len(result)!=22:result={n:{"lat":TW_CENTERS[n][0],"lon":TW_CENTERS[n][1],"districts":ds} for n,ds in TW_FALLBACK.items()}
 return result
def main():
 ci=country_info();groups=geonames();data={}
 for code,info in ci.items():
  if code=="TW":continue
  items=sorted(groups.get(code,[]),key=lambda x:x["pop"],reverse=True)
  if not items:continue
  chosen=items[:5];cap=(info.get("capital") or "").casefold()
  if cap:
   hit=next((x for x in items if x["name"].casefold()==cap or x["ascii"].casefold()==cap),None)
   if hit and all(x["name"]!=hit["name"] for x in chosen):chosen=[hit]+chosen[:4]
  langs=(info.get("languages") or "en").split(",");locale=langs[0] or "en-US";primary=locale.split("-")[0]
  data[code]={"flag":flag(code),"name":ZH.get(code,info["country"]),"en":info["country"],"translation":primary,"voiceLocale":locale,"emergency":VERIFIED_EMERGENCY.get(code,{"police":"","ambulance":"","fire":""}),"cities":{x["name"]:{"lat":x["lat"],"lon":x["lon"],"districts":["全市／全區"]} for x in chosen}}
 data["TW"]={"flag":"🇹🇼","name":"台灣","en":"Taiwan","translation":"zh-TW","voiceLocale":"zh-TW","emergency":VERIFIED_EMERGENCY["TW"],"cities":taiwan()}
 ordered={"TW":data.pop("TW")}
 for k in sorted(data,key=lambda c:data[c]["name"]):ordered[k]=data[k]
 now=datetime.now(timezone.utc);stamp=now.strftime("%Y%m%dT%H%M%SZ")
 json.dump(ordered,open(os.path.join(OUT,"location-data.json"),"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
 meta={"schema":1,"version":stamp,"generatedAt":now.isoformat(),"countryCount":len(ordered),"taiwanCountyCityCount":len(ordered["TW"]["cities"]),"sources":["GeoNames cities15000.zip","GeoNames countryInfo.txt","NLSC ListCounty/ListTown1"]}
 json.dump(meta,open(os.path.join(OUT,"version.json"),"w",encoding="utf-8"),ensure_ascii=False,indent=2);print(meta)
if __name__=="__main__":main()
