"""Plan an Expedition (/plan.html) + trip link landing (/trip.html). Field names/enums mirror the app's
data/trip/TripModels.kt + Lodging.kt + Models.kt(HarvestMethod). Link spec: your-world-ai-hunt/docs/web-trip-link.md"""
import json
import kitdata

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
    gear = {t: [[i[0], i[1], i[3]] for i in kitdata.ESSENTIALS + list(kits[s][7])] for t, s in KIT_FOR.items()}
    d = {"YW_TYPES": {k: {"title": a, "emoji": b, "sp": c} for k, (a, b, c) in TYPES.items()}, "YW_KITS": gear,
         "YW_METHODS": METHODS, "YW_LODGING": LODGING, "YW_BUDGET": {k: v.split(" ", 1)[1] for k, v in BUDGET.items()}}
    return "<script>" + "".join(f"window.{k}={json.dumps(v, ensure_ascii=False)};" for k, v in d.items()) + "</script>"

def opts(d, blank): return (f'<option value="">{blank}</option>' if blank else "") + "".join(f'<option value="{k}">{v}</option>' for k, v in d.items())

def build(page, PAGES, DISCLOSURE, play_btn):
    js = data_js() + '<script src="assets/tripcodec.js"></script><script src="assets/vendor/qrcode.js"></script><script src="assets/plan.js"></script>'
    body = (DISCLOSURE.format(p="") +
     '<p class="lead2">Plan your hunt here, then send it to the <b>Your World Hunt</b> app on your Android phone with a QR code or link. Free for everyone, no account needed. '
     'Your plan is saved in this browser only. <span class="dim">The free app includes 1 trip; Premium unlocks unlimited.</span></p>'
     '<form id="plan" class="planform" onsubmit="return false">'
     '<fieldset><legend>1 · The expedition</legend><div class="g2"><label>Trip name<input id="n" maxlength="80" placeholder="e.g. November rut week"></label>'
     '<label>Hunt type<select id="t"></select></label></div>'
     '<label>Species</label><div id="spchips" class="chips"></div><label>Other species (comma separated)<input id="spx" maxlength="200"></label>'
     f'<div class="g2"><label>Weapon / method<select id="m">{opts(METHODS, "Not set")}</select></label><label>Crew (names, comma separated, not counting you)<input id="cr" maxlength="300"></label></div></fieldset>'
     '<fieldset><legend>2 · Where &amp; when</legend><label>Destination (town, park or area)<span class="row"><input id="loc" maxlength="120" placeholder="e.g. Bozeman"><button type="button" class="btn" id="gosearch">Find place</button></span></label>'
     '<ul id="georesults" class="georesults"></ul><p id="geoinfo" class="dim"></p>'
     '<div class="g2"><label>Start date<input type="date" id="sd" required></label><label>Days (1–30)<input type="number" id="d" min="1" max="30" value="3"></label></div></fieldset>'
     f'<fieldset><legend>3 · Lodging &amp; budget</legend><label>Lodging<select id="lt">{opts(LODGING, "Not decided")}</select></label>'
     '<p class="dim">Budget: enter your own estimates in USD (leave blank to skip).</p><div id="budget" class="g3"></div></fieldset>'
     '<fieldset><legend>4 · Gear checklist</legend><p class="dim">Starts from our kit list for this hunt type. Amazon links open a search sorted by customer rating.</p><ul id="gearlist" class="gearlist"></ul>'
     '<span class="row"><input id="newgear" maxlength="80" placeholder="Add your own item"><button type="button" class="btn" id="addgear">Add</button></span></fieldset>'
     '<fieldset><legend>5 · Notes</legend><textarea id="no" rows="4" maxlength="1500" placeholder="Access, regs to check, meeting point…"></textarea></fieldset>'
     '<div class="btns noprint"><button type="button" class="btn" id="score">Score best days</button><button type="button" class="btn primary" id="send">📲 Send to my phone</button>'
     '<button type="button" class="btn" id="print">🖨️ Print</button><button type="button" class="btn" id="reset">Clear</button></div></form>'
     '<h2>Best days (estimate)</h2><div id="days"><p class="dim">Tap “Score best days”. Uses the free Open-Meteo forecast plus moon phase.</p></div>'
     '<section id="sendbox" class="card sendbox noprint" hidden><h2>Send to your phone</h2><div class="sendgrid"><div id="qr" class="qr"></div><div>'
     '<p><b>Scan with your Android phone camera.</b> It opens Your World Hunt with this trip ready to import, or Google Play if the app isn\'t installed.</p>'
     '<label>Trip link<input id="tlink" readonly></label><p id="tlen" class="dim"></p><div class="btns"><button type="button" class="btn primary" id="copy">Copy link</button><a class="btn" id="open" href="#">Open on this phone</a></div>'
     '<p class="dim">No camera handy? Copy the link and text or email it to yourself. The link is too long to type, so send it rather than retyping it. '
     'Opening trips from the website needs the app\'s next update (0.1.89); until then the link shows the plan in your browser.</p>'
     f'</div></div></section><div class="upsell noprint"><p><b>Hunt it with the app:</b> GPS return, wind, pressure, moon and directions at your stands.</p>{play_btn()}</div>' + js)
    page("plan.html", "Plan an Expedition", "Free hunt trip planner: pick a destination, dates, species, crew, budget and gear, score the best days, then send the plan to the Your World Hunt app.",
         body, "camp", "Plan an Expedition", "Free trip planner", "Plan the hunt on the web. Send it to your phone with one scan.", prio="0.8")
    tbody = ('<div id="openwrap" class="btns" hidden><a class="btn primary" id="openapp" href="#">Open in Your World Hunt</a></div>'
             '<div id="sum"><p class="dim">Loading trip…</p></div>'
             '<div class="upsell"><p><b>Don\'t have the app?</b> Get Your World Hunt free on Google Play, then open this link again to import the trip. '
             'The free app includes 1 trip; Premium unlocks unlimited.</p><a class="btn primary play-badge" id="play" href="#" target="_blank" rel="noopener">Get it on Google Play</a></div>'
             '<p class="dim">Importing from a link needs app version 0.1.89 or newer. <a href="plan.html">Plan your own expedition →</a></p>'
             + data_js() + '<script src="assets/tripcodec.js"></script><script src="assets/trip.js"></script>')
    page("trip.html", "Shared hunt trip", "A hunt trip plan shared from the Your World Hunt planner.", tbody, "camp", "Hunt trip", "Shared expedition", None, prio="0.1")
    PAGES.pop()  # keep the landing out of the sitemap
