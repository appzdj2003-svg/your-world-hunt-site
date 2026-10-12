"""Build assets/spots.json (hunting destinations) + assets/places.json (offline geocoder).
Sources (all official/public): USFWS FWS_NWRS_HQ_HuntFishCentroids (fws.json), USFS EDW Proclaimed
Forest Boundaries (centroid of largest ring, nfc.json), Census 2023 Gazetteer (places/counties),
private lodges hand-verified on their own websites (priv.json; address geocoded by Census geocoder)."""
import json, csv, math, pathlib, urllib.request, urllib.parse
R = pathlib.Path(__file__).resolve().parent; S = R / "spots"; OUT = R.parent / "assets"
FIX = {"USMOI", "PR", "VI", "CNMI", "GU", "AS"}

def gaz(fn):
    with open(S / fn, encoding="utf-8") as f:
        rd = csv.reader(f, delimiter="\t"); h = [x.strip() for x in next(rd)]
        for r in rd: yield dict(zip(h, [x.strip() for x in r]))

counties = list(gaz("2023_Gaz_counties_national.txt"))
st = {}
for c in counties:
    a = float(c["ALAND_SQMI"]); s = st.setdefault(c["USPS"], [0, 0, 0]); s[0] += a; s[1] += a * float(c["INTPTLAT"]); s[2] += a * float(c["INTPTLONG"])
states = {k: [round(v[1] / v[0], 3), round(v[2] / v[0], 3)] for k, v in st.items() if k not in ("PR",)}
SUF = (" city", " town", " village", " borough", " municipality", " CDP", " city and borough", " (balance)")
places = {}
for p in gaz("2023_Gaz_place_national.txt"):
    if p["USPS"] == "PR": continue
    n = p["NAME"]
    for s_ in sorted(SUF, key=len, reverse=True):
        if n.endswith(s_): n = n[: -len(s_)]; break
    if p["LSAD"] == "57" and float(p["ALAND_SQMI"]) < 2: continue  # tiny CDPs
    places.setdefault(p["USPS"], {})[n] = [round(float(p["INTPTLAT"]), 3), round(float(p["INTPTLONG"]), 3)]

def near_state(la, lo):
    return min(counties, key=lambda c: (float(c["INTPTLAT"]) - la) ** 2 + ((float(c["INTPTLONG"]) - lo) * math.cos(math.radians(la))) ** 2)["USPS"]

spots = []
for f in json.load(open(S / "fws.json"))["features"]:
    a, g = f["attributes"], f["geometry"]
    if a["State"] in FIX: continue
    tags = [t for k, ts in (("Waterfowl", ["duck", "goose"]), ("BigGame", ["big"]), ("Turkey", ["turkey"]), ("UplandBird", ["upland"]),
                            ("MigratoryB", ["dove"]), ("SmallGame", ["small"])) if a[k] == "yes" for t in ts]
    if not tags: continue
    spots.append({"n": a["OrgName"].strip(), "k": "WMD" if a["OrgType"] == "WMD" else "NWR", "s": a["State"], "la": round(g["y"], 4), "lo": round(g["x"], 4),
                  "tg": tags, "u": (a["UrlHunting"] or a["UrlStation"] or "").strip(), "pv": 0})
for n, la, lo in json.load(open(S / "nfc.json")):
    spots.append({"n": n, "k": "NF", "s": near_state(la, lo), "la": la, "lo": lo, "tg": [], "u": "https://www.fs.usda.gov/visit/know-before-you-go/hunting", "pv": 0})

cache_f = S / "geocache.json"; cache = json.loads(cache_f.read_text()) if cache_f.exists() else {}
def census(addr):
    if addr in cache: return cache[addr]
    q = urllib.parse.urlencode({"address": addr, "benchmark": "Public_AR_Current", "format": "json"})
    try:
        m = json.load(urllib.request.urlopen("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?" + q, timeout=30))["result"]["addressMatches"]
        cache[addr] = [round(m[0]["coordinates"]["y"], 5), round(m[0]["coordinates"]["x"], 5)] if m else None
    except Exception: return None
    return cache[addr]
for n, s, town, addr, url, tags in json.load(open(S / "priv.json")):
    pt = census(addr) if addr else None; acc = "address"
    if not pt:
        acc = "town"; pt = places[s].get(town)
        if not pt:  # unincorporated: GeoNames via Open-Meteo, matched on state
            k = "gn:" + town + "," + s
            if k not in cache:
                r = json.load(urllib.request.urlopen("https://geocoding-api.open-meteo.com/v1/search?count=10&name=" + urllib.parse.quote(town), timeout=30)).get("results", [])
                h = [x for x in r if x.get("country_code") == "US" and x.get("admin1", "").startswith({"LA": "Louisiana"}.get(s, "?"))]
                cache[k] = [round(h[0]["latitude"], 4), round(h[0]["longitude"], 4)] if h else None
            pt = cache[k]
        if not pt: continue
    spots.append({"n": n, "k": "PRIV", "s": s, "la": pt[0], "lo": pt[1], "tg": tags, "u": url, "pv": 1, "at": town, "acc": acc})
cache_f.write_text(json.dumps(cache))
OUT.joinpath("spots.json").write_text(json.dumps({"states": states, "spots": spots}, separators=(",", ":")))
OUT.joinpath("places.json").write_text(json.dumps(places, separators=(",", ":")))
print(len(spots), "spots;", sum(x["pv"] for x in spots), "private;", len(states), "states;", sum(map(len, places.values())), "places")
