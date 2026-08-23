#!/usr/bin/env python3
import io,json,os,urllib.request,zipfile
from collections import defaultdict
from datetime import datetime,timezone
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),".."))
OUT=os.path.join(ROOT,"data")
def get(url,timeout=90):
    req=urllib.request.Request(url,headers={"User-Agent":"realtime-translator-data-updater/1.0"})
    with urllib.request.urlopen(req,timeout=timeout) as r:return r.read()
def flag(code): return "".join(chr(127397+ord(c)) for c in code)
def main():
    info={}
    for line in get("https://download.geonames.org/export/dump/countryInfo.txt").decode().splitlines():
        if line and not line.startswith("#"):
            p=line.split("\t")
            if len(p)>=17: info[p[0]]={"name":p[4],"lang":p[15]}
    z=zipfile.ZipFile(io.BytesIO(get("https://download.geonames.org/export/dump/cities15000.zip")))
    groups=defaultdict(list)
    for line in z.read(z.namelist()[0]).decode().splitlines():
        p=line.split("\t")
        if len(p)>=19:
            try: groups[p[8]].append({"name":p[1],"lat":float(p[4]),"lon":float(p[5]),"pop":int(p[14] or 0)})
            except: pass
    old=json.load(open(os.path.join(OUT,"location-data.json"),encoding="utf-8"))
    verified={k:v.get("emergency",{}) for k,v in old.items()}
    data={"TW":old["TW"]}
    for code,meta in info.items():
        if code=="TW" or code not in groups: continue
        top=sorted(groups[code],key=lambda x:x["pop"],reverse=True)[:5]
        lang=(meta["lang"] or "en").split(",")[0] or "en"
        data[code]={"flag":flag(code),"name":meta["name"],"en":meta["name"],"translation":lang.split("-")[0],"voiceLocale":lang,
                    "emergency":verified.get(code,{"police":"","ambulance":"","fire":""}),
                    "cities":{x["name"]:{"lat":x["lat"],"lon":x["lon"],"districts":["全市／全區"]} for x in top}}
    json.dump(data,open(os.path.join(OUT,"location-data.json"),"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
    meta={"schema":1,"version":datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"),"generatedAt":datetime.now(timezone.utc).isoformat(),
          "countryCount":len(data),"taiwanCountyCityCount":len(data["TW"]["cities"]),
          "sources":["GeoNames cities15000.zip","GeoNames countryInfo.txt"]}
    json.dump(meta,open(os.path.join(OUT,"version.json"),"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print(meta)
if __name__=="__main__": main()
