"""Plan an Expedition (/plan.html) + trip link landing (/trip.html). Field names/enums mirror the app's
data/trip/TripModels.kt + Lodging.kt + Models.kt(HarvestMethod). Link spec: your-world-ai-hunt/docs/web-trip-link.md"""
import json
import kitdata, pathlib
import items as itemimg
ITEMS = pathlib.Path(__file__).resolve().parent.parent / 'assets/items'
def _img(label, q):
    k = itemimg.key_for(label, q)
    return k if k and (ITEMS / f'{k}.webp').exists() else None

TAG = {"LOCAL": "Home ground stands, leases and hardwood ridges.", "WESTERN": "High country, bugles at dawn, big western game.", "CANADA": "Boreal bush, moose country and big-bodied bucks.",
 "EUROPE": "Stag, boar and high seats in ancient forests.", "SAFARI": "Plains game at sunset.", "WATERFOWL": "Cupped wings over the decoys at first light.",
 "TURKEY": "Gobbles off the roost on a spring morning.", "CUSTOM": "Your ground, your quarry, your rules."}  # TripType.tagline
TYPES = {  # TripType: (title, emoji, suggestedSpecies) -- copied from TripModels.kt
 "LOCAL": ("Whitetail Timber", "🌲", ["Whitetail", "Hog", "Coyote", "Squirrel", "Bear"]),
 "WESTERN": ("Elk Mountains", "🏔️", ["Elk", "Mule deer", "Pronghorn", "Black bear", "Mountain lion", "Moose"]),
 "CANADA": ("Northern Wilds", "🍁", ["Moose", "Whitetail", "Black bear", "Caribou", "Waterfowl"]),
 "EUROPE": ("Old-World Estate", "🏰", ["Red stag", "Roe deer", "Wild boar", "Fallow deer", "Chamois"]),
 "SAFARI": ("Savanna Safari", "🦁", ["Kudu", "Impala", "Gemsbok", "Blue wildebeest", "Warthog", "Zebra", "Eland", "Nyala"]),
 "WATERFOWL": ("Marsh Sunrise", "🦆", ["Mallard", "Wood duck", "Teal", "Canada goose", "Snow goose", "Pintail"]),
 "TURKEY": ("Spring Gobbler", "🦃", ["Eastern turkey", "Rio Grande", "Merriam's", "Osceola"]),
 "CUSTOM": ("Custom Expedition", "🧭", ["Deer", "Elk", "Hog", "Bird", "Predator"]),
}
KIT_FOR = {"LOCAL": "whitetail", "WESTERN": "elk", "CANADA": "northern", "EUROPE": "european", "SAFARI": "safari", "WATERFOWL": "waterfowl", "TURKEY": "turkey", "CUSTOM": "day-hunt"}
METHODS = {"RIFLE": "Rifle", "SHOTGUN": "Shotgun", "BOW": "Bow", "CROSSBOW": "Crossbow", "MUZZLELOADER": "Muzzleloader", "OTHER": "Other"}
LODGING = {"CAMPSITES": "⛺ Campsites", "HOTELS": "🏨 Hotels / Motels", "CABINS": "🛖 Cabins & Lodges", "RV_PARKS": "🚐 RV Parks", "RENTALS": "🏡 Vacation Rentals",
           "HUNTING_LODGES": "🦌 Hunting Lodges / Outfitter camps", "MILITARY": "🎖️ Military Lodging & FamCamps"}
BUDGET = {"TAGS": "🎫 Tags & licenses", "TRAVEL": "✈️ Travel", "LODGING": "🏕️ Lodging / outfitter", "DAY_RATES": "📅 Day rates", "TROPHY_FEES": "🏆 Trophy fees",
          "MEAT": "🥩 Meat processing", "TAXIDERMY": "🦌 Taxidermy", "SHIPPING": "📦 Shipping", "TIPS": "💵 Tips", "OTHER": "🧾 Other"}

def data_js():
    kits = {k[0]: k for k in kitdata.KITS}
    gear = {t: [[i[0], i[1], i[3], _img(i[0], i[3])] for i in kitdata.ESSENTIALS + list(kits[s][7])] for t, s in KIT_FOR.items()}
    d = {"YW_TYPES": {k: {"title": a, "emoji": b, "sp": c, "tag": TAG[k]} for k, (a, b, c) in TYPES.items()}, "YW_KITS": gear,
         "YW_METHODS": METHODS, "YW_LODGING": LODGING, "YW_BUDGET": {k: v.split(" ", 1)[1] for k, v in BUDGET.items()}}
    return "<script>" + "".join(f"window.{k}={json.dumps(v, ensure_ascii=False)};" for k, v in d.items()) + "</script>"


def build(page, PAGES, DISCLOSURE, play_btn):
    js = data_js() + '<script src="assets/hawkparse.js"></script><script src="assets/tripcodec.js"></script><script src="assets/vendor/qrcode.js"></script><script src="assets/plan.js"></script>'
    steps = [("where", "📍", "Where"), ("when", "📅", "When"), ("hunt", "🎯", "Hunt"), ("crew", "🏕️", "Crew & stay"), ("gear", "🎒", "Gear"), ("send", "📲", "Best days & send")]
    nav = "".join(f'<li><button type="button" class="wz-dot" data-go="{i}" aria-label="Step {i+1}: {l}"><span class="n">{i+1}</span><span class="l">{l}</span></button></li>' for i, (_, e, l) in enumerate(steps))
    def step(i, title, sub, inner):
        return f'<section class="wz-step" data-step="{i}" aria-labelledby="h{i}" hidden><p class="wz-k">Step {i+1} of 6</p><h2 id="h{i}" tabindex="-1">{title}</h2><p class="wz-sub">{sub}</p>{inner}</section>'
    hawk = ('<section class="hawk" id="hawk" aria-labelledby="hawkh"><div class="hawk-head"><span class="hawk-ico" aria-hidden="true">🦅</span><div><p class="wz-k">Ask Hawk</p>'
     '<h2 id="hawkh">Hawk Quick Plan</h2><p class="dim">Tell Hawk your trip in one sentence and it fills in the planner. Simple rule-based reading in your browser, not a full AI, so check what it understood.</p></div></div>'
     '<form id="hawkform" class="hawk-in" onsubmit="return false"><label class="sr" for="hawkq">Describe your trip</label><textarea id="hawkq" rows="2" maxlength="300" placeholder="Whitetail bow hunt near Andrews, SC, Nov 8-10, 3 of us, camping"></textarea>'
     '<div class="hawk-btns"><button type="button" class="round mic" id="hawkmic" hidden aria-label="Speak your trip">🎙️</button><button type="button" class="btn primary" id="hawkgo">Plan it →</button></div></form>'
     '<div class="chips hawk-ex" aria-label="Examples">' + "".join(f'<button type="button" class="chipbtn" data-ex="{x}">{x}</button>' for x in [
       "Whitetail bow hunt near Andrews, SC, Nov 8-10, 3 of us, camping", "Duck hunt this weekend near Stuttgart, AR with my son",
       "Elk rifle hunt in Bozeman, Montana Oct 20-25, me and 2 buddies, cabin, $1500", "Turkey hunt next Friday near Macon, GA, solo, shotgun"]) + '</div>'
     '<div id="hawkreview" class="hawk-review" hidden aria-live="polite"></div></section>')
    body = (hawk +
     '<div class="wz" id="wz"><div class="wz-top"><div class="wz-bar"><span id="wzfill"></span></div><ol class="wz-nav">' + nav + '</ol></div>'
     '<div class="wz-layout"><div class="wz-main" id="plan">'
     + step(0, "Where are you hunting?", "Search a town, park or area. We use it for the forecast. Nothing leaves your browser except the search.",
        '<div class="bigsearch"><span aria-hidden="true">🔎</span><input id="loc" type="search" autocomplete="off" maxlength="120" placeholder="e.g. Bozeman, Montana" aria-label="Destination"><button type="button" class="btn primary" id="gosearch">Search</button></div>'
        '<button type="button" class="btn ghost" id="myloc">📍 Use my location</button><div id="georesults" class="georesults" aria-live="polite"></div><div id="geoinfo" class="pickcard" aria-live="polite"></div>')
     + step(1, "When are you going?", "Pick your first and last day (up to 30 days).",
        '<div class="quick" id="quick"><button type="button" class="chipbtn" data-q="wknd">This weekend</button><button type="button" class="chipbtn" data-q="3">Next 3 days</button><button type="button" class="chipbtn" data-q="7">A week</button><button type="button" class="chipbtn" data-q="opener">2 weeks out</button></div>'
        '<div class="daterange"><label>First day<input type="date" id="sd"></label><span class="arrow" aria-hidden="true">→</span><label>Last day<input type="date" id="ed"></label></div><p class="pill" id="dayscount" aria-live="polite"></p>')
     + step(2, "What are you hunting?", "Tap a hunt type, then your species and method.",
        '<h3>Hunt type</h3><div class="cards" id="types" role="radiogroup" aria-label="Hunt type"></div><h3>Species</h3><div class="chips" id="spchips"></div>'
        '<div class="addrow"><input id="spx" maxlength="40" placeholder="Add another species" aria-label="Add another species"><button type="button" class="btn" id="addsp">Add</button></div>'
        '<h3>Weapon / method</h3><div class="cards small" id="methods" role="radiogroup" aria-label="Weapon or method"></div>')
     + step(3, "Who's coming and where will you stay?", "Add your hunting party and pick a lodging style.",
        '<div class="stepper"><span><b>Hunters</b><small>including you</small></span><button type="button" class="round" id="minus" aria-label="One fewer hunter">−</button><output id="party" aria-live="polite">1</output><button type="button" class="round" id="plus" aria-label="One more hunter">+</button></div>'
        '<div id="crewnames" class="crewnames"></div><h3>Lodging</h3><div class="chips" id="lodging"></div>'
        '<details class="budget"><summary>💵 Budget (optional, your own estimates)</summary><div id="budget" class="g3"></div><p class="pill" id="budtotal"></p></details>')
     + step(4, "Pack your kit", "Starts from our checklist for this hunt type. Tick what you have; Amazon links open a search sorted by customer rating.",
        DISCLOSURE.format(p="") + '<p class="pill" id="packed"></p><p class="dim item-note">Item images are illustrations, not the exact products sold.</p><div id="gearlist" class="kit"></div><div class="addrow"><input id="newgear" maxlength="80" placeholder="Add your own item" aria-label="Add your own gear item"><button type="button" class="btn" id="addgear">Add</button></div>')
     + step(5, "Best days &amp; send to phone", "Day-by-day estimate from the free Open-Meteo forecast and moon phase. The app adds solunar feeding windows, so its stars can differ.",
        '<label class="lbl">Trip name<input id="n" maxlength="80" placeholder="e.g. November rut week"></label><div id="days" class="days" aria-live="polite"></div>'
        '<label class="lbl">Notes<textarea id="no" rows="3" maxlength="1500" placeholder="Access, regs to check, meeting point…"></textarea></label>'
        '<div class="btns"><button type="button" class="btn primary big" id="send">📲 Send to my phone</button><button type="button" class="btn" id="print">🖨️ Print</button></div>'
        '<section id="sendbox" class="sendbox" hidden aria-live="polite"><div id="qr" class="qr" aria-label="QR code for the trip link"></div><div>'
        '<p><b>Scan with your Android camera.</b> It opens Your World Hunt with this trip, or Google Play if the app isn\'t installed.</p>'
        '<label class="lbl">Trip link<input id="tlink" readonly></label><p id="tlen" class="dim"></p><div class="btns"><button type="button" class="btn primary" id="copy">Copy link</button><a class="btn" id="open" href="#">Open on this phone</a></div>'
        '<p class="dim">No camera? Text or email the link to yourself (it\'s too long to type). Opening trips in the app needs app update 0.1.89; until then the link shows the plan in your browser. '
        'The free app includes 1 trip; Premium unlocks unlimited.</p></div></section>')
     + '<div class="wz-foot"><button type="button" class="btn" id="back">← Back</button><button type="button" class="btn link" id="reset">Start over</button><button type="button" class="btn primary" id="next">Next →</button></div></div>'
     '<aside class="wz-sum" id="sumwrap" aria-label="Trip summary"><button type="button" class="sumtoggle" id="sumtoggle" aria-expanded="false"><span>🧭 Trip summary</span><span id="sumshort" class="dim"></span><span class="chev" aria-hidden="true">▴</span></button>'
     '<div class="sumbody" id="sum"></div><p class="saved" id="saved" aria-live="polite">Autosaved in this browser</p></aside></div></div>'
     f'<div class="upsell noprint"><p><b>Hunt it with the app:</b> GPS return, wind, pressure, moon and directions at your stands.</p>{play_btn()}</div>' + js)
    page("plan.html", "Trip Planner", "Free hunt trip planner: pick a destination, dates, species, crew, lodging and gear, see estimated best days, then send the plan to the Your World Hunt app.",
         body, "camp", "Trip Planner", "Free · no account", "Plan the hunt in six quick steps, then send it to your phone with one scan.", prio="0.8")
    import pathlib
    for f in ("plan.html",):
        fp = pathlib.Path(__file__).resolve().parent.parent / f; fp.write_text(fp.read_text().replace("<body>", '<body class="planpage">', 1))
    tbody = ('<div class="tripcard" id="sum"><p class="dim">Loading trip…</p></div>'
             '<div class="tripact"><a class="btn primary big" id="openapp" href="#" hidden>📲 Open in Your World Hunt</a><a class="btn big play-badge" id="play" href="#" target="_blank" rel="noopener">Get it free on Google Play</a>'
             '<a class="btn" href="plan.html">Plan your own trip</a></div>'
             '<p class="dim tripnote">Importing from a link needs app version 0.1.89 or newer. The free app includes 1 trip; Premium unlocks unlimited.</p>'
             + data_js() + '<script src="assets/tripcodec.js"></script><script src="assets/trip.js"></script>')
    page("trip.html", "Shared hunt trip", "A hunt trip plan shared from the Your World Hunt trip planner.", tbody, "camp", "Hunt trip", "Shared expedition", None, prio="0.1")
    PAGES.pop()  # keep the landing out of the sitemap
