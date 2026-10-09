#!/usr/bin/env python3
"""Static site builder for Your World Hunt. Run: python3 _src/build.py  (writes HTML into the repo root)."""
import json, re, os, html, datetime, urllib.parse, urllib.request, email.utils
from pathlib import Path
import scenes, shopdata, kitdata, items as itemimg

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://hunt.yourworldapps.si/"   # custom domain (CNAME file); the old github.io URL redirects here
PLAY = "https://play.google.com/store/apps/details?id=com.yourworld.hunt"
TODAY = datetime.date.today().isoformat()
CFG = json.loads(re.search(r"/\*CONFIG\*/\s*window\.YW_AFF\s*=\s*(\{.*?\})\s*/\*END\*/", (ROOT/"assets/affiliates.js").read_text(), re.S).group(1))
E = lambda s: html.escape(s, quote=True)
enc = lambda s: urllib.parse.quote(s, safe="")
GUIDES = json.loads((Path(__file__).parent/"guides/guides.json").read_text())
PAGES = []  # (path, priority)

# ---------- affiliate links (static mirror of assets/affiliates.js) ----------
def _raw(u, p):
    p = (p or "").strip().lstrip("?&")
    return u + ("&" if "?" in u else "?") + p if p else u
def _avant(u, m):
    w = CFG["avantlinkWebsiteId"].strip(); m = (m or "").strip()
    return f"https://www.avantlink.com/click.php?tt=cl&mi={enc(m)}&pw={enc(w)}&url={enc(u)}" if w and m else u
def link(r, q):
    Q = enc(q)
    return {
        "amazon": lambda: f"https://www.amazon.com/s?k={Q}&s=review-rank" + (f"&tag={enc(CFG['amazonTag'])}" if CFG["amazonTag"] else ""),
        "basspro": lambda: _avant(f"https://www.basspro.com/SearchDisplay#q={Q}", CFG["avantlinkMerchant"]["basspro"]),
        "cabelas": lambda: _avant(f"https://www.cabelas.com/SearchDisplay#q={Q}", CFG["avantlinkMerchant"]["cabelas"]),
        "sportsmans": lambda: _avant(f"https://www.sportsmans.com/search?q={Q}&sort=topRating-desc", CFG["avantlinkMerchant"]["sportsmans"]),
        "duluth": lambda: _raw(f"https://www.duluthtrading.com/search?q={Q}", CFG["duluthParams"]),
        "walmart": lambda: _raw(f"https://www.walmart.com/search?q={Q}", CFG["walmartParams"]),
        "academy": lambda: _raw(f"https://www.academy.com/search?searchTerm={Q}", CFG["academyParams"]),
    }[r]()
RNAME = {"amazon": "Amazon", "basspro": "Bass Pro", "cabelas": "Cabela's", "sportsmans": "Sportsman's", "duluth": "Duluth", "walmart": "Walmart", "academy": "Academy"}
SORTED = {"amazon", "sportsmans"}   # stores whose search URL sorts by customer rating (verified)
LABEL = {"amazon": "Shop top-rated → Amazon", "sportsmans": "Top-rated → Sportsman's"}
SORT_NOTE = "“Top-rated” buttons open the store's search sorted by customer rating."
def rb(q, apparel=False):
    order = ["amazon", "basspro", "cabelas", "sportsmans", "walmart", "academy"]
    order = (["duluth"] + order) if apparel else (order + ["duluth"])   # Duluth first for clothing/boots (as in the app)
    a = "".join(f'<a class="{"amz" if r=="amazon" else ""}" href="{E(link(r,q))}" data-r="{r}" data-q="{E(q)}" target="_blank" rel="sponsored nofollow noopener">{LABEL.get(r, RNAME[r])}</a>' for r in order)
    return f'<div class="rb" role="group" aria-label="Compare stores for {E(q)}">{a}</div>'

DISCLOSURE = ('<p class="disclosure"><strong>Disclosure:</strong> We may earn a commission from links on this site, at no extra cost to you. '
              '<strong>As an Amazon Associate I earn from qualifying purchases.</strong> Links open each store\'s own search. We never show prices, ratings or reviews, so check details on the retailer\'s site. <span class="sortnote">Shop top-rated → opens the store\'s search sorted by customer rating.</span> '
              '<a href="{p}affiliate-disclosure.html">Details</a></p>')

PLAY_SVG = '<svg viewBox="0 0 28 28" aria-hidden="true"><path fill="#160d05" d="M5 3.5v21l18-10.5z"/></svg>'
def play_btn(cls="primary"): return f'<a class="btn {cls} play-badge" href="{PLAY}" target="_blank" rel="noopener">{PLAY_SVG if cls=="primary" else ""}Get it on Google Play</a>'

NAV = [("index.html", "Home"), ("features.html", "Features"), ("guides/", "Guides"), ("gear/", "Gear Lists"), ("deals.html", "Deals"), ("shop/", "Shop")]

def page(path, title, desc, body, scene="camp", h1=None, kicker=None, lead=None, jsonld=None, og_type="website", prio="0.6", absolute=False, hero_extra=""):
    depth = path.count("/")
    p = SITE if absolute else "../" * depth
    url = SITE + ("" if path == "index.html" else path.replace("index.html", ""))
    cur = path.split("/")[0] + "/" if "/" in path else path
    nav = "".join(f'<a href="{p}{h if h!="index.html" else ""}{"" if h!="index.html" else ""}"{" aria-current=page" if h==cur else ""}{" class=shop" if t=="Shop" else ""}>{t}</a>' for h, t in NAV)
    nav = nav.replace(f'href="{p}"', f'href="{p or "./"}"', 1) if p == "" else nav
    lds = "".join(f'<script type="application/ld+json">{json.dumps(j, ensure_ascii=False)}</script>' for j in (jsonld or []))
    hero = f'''<section class="hero">{scenes.svg(scene, "hs")}<div class="wrap">{f'<span class="kicker">{E(kicker)}</span>' if kicker else ""}<h1>{E(h1 or title)}</h1>{f'<p class="lead">{lead}</p>' if lead else ""}{hero_extra}</div></section>'''
    doc = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}{"" if "Your World Hunt" in title else " | Your World Hunt"}</title>
<meta name="description" content="{E(desc)}"><link rel="canonical" href="{url}">
<meta property="og:type" content="{og_type}"><meta property="og:site_name" content="Your World Hunt"><meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}"><meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}assets/og-image.jpg">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#15130D">
<link rel="icon" href="{p}assets/favicon.png"><link rel="apple-touch-icon" href="{p}assets/icon-192.png">
<link rel="stylesheet" href="{p}assets/site.css"><script src="{p}assets/affiliates.js" defer></script>{lds}
</head><body>
<header class="top"><div class="wrap"><a class="brand" href="{p or './'}"><img src="{p}assets/icon-192.png" width="34" height="34" alt="">Your World Hunt</a><nav class="nav" aria-label="Main">{nav}</nav></div></header>
<main>{hero}<div class="wrap">{body}</div></main>
<footer><div class="wrap"><div class="cols">
<div><h4>Your World Hunt</h4><ul><li><a href="{PLAY}" target="_blank" rel="noopener">Get the app on Google Play</a></li><li><a href="{p}features.html">Features</a></li><li><a href="{p}about.html">About</a></li><li><a href="{p}contact.html">Contact</a></li></ul></div>
<div><h4>Field School</h4><ul>{"".join(f'<li><a href="{p}guides/{g["slug"]}.html">{E(g["short"])}</a></li>' for g in GUIDES)}</ul></div>
<div><h4>Shop</h4><ul><li><a href="{p}shop/">Gear Shop</a></li><li><a href="{p}gear/">Gear lists by hunt</a></li><li><a href="{p}deals.html">Deals &amp; compare</a></li><li><a href="{p}shop/camp-lodging.html">Lodging finder</a></li></ul></div>
<div><h4>Legal</h4><ul><li><a href="{p}privacy.html">Privacy</a></li><li><a href="{p}terms.html">Terms</a></li><li><a href="{p}affiliate-disclosure.html">Affiliate disclosure</a></li></ul></div>
</div><p class="fine">We may earn a commission from links on this site. As an Amazon Associate I earn from qualifying purchases. Guides are general information only. Always check seasons, limits, licenses and land access rules with your state wildlife agency or the official authority where you hunt. &copy; {datetime.date.today().year} Your World Apps. Google Play is a trademark of Google LLC. Retailer names are trademarks of their owners and are used only to identify where a link goes.</p></div></footer>
</body></html>'''
    if 'class="item-' in body and "item-note" not in body:
        doc = doc.replace("</div></main>", ITEM_NOTE + "</div></main>", 1)
    out = ROOT / path
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc)
    if path != "404.html": PAGES.append((url, prio))

def crumbs(p, *items):
    return '<p class="crumbs">' + " / ".join(f'<a href="{p}{h}">{E(t)}</a>' if h is not None else E(t) for t, h in items) + "</p>"

def scene_card(scene, uid): return f'<div class="art">{scenes.svg(scene, uid)}</div>'

def pcard(href, scene, uid, title, sub, cue, tag=None, emoji="", big=False):
    """Picture card: themed scene art with a bold all-caps title, subtitle and cue overlaid at the bottom; whole card is the link."""
    t = f'<span class="tag">{E(tag)}</span>' if tag else ""
    return (f'<a class="pcard{" big" if big else ""}" href="{href}" aria-label="{E(title)}: {E(sub)} ({E(cue.rstrip(" →").lower())})">'
            '<span class="pc-art">' + scenes.svg(scene, uid).replace('class="hero-art"', 'class="pc-svg"') + '</span>'

            f'<span class="pc-text">{t}<span class="pc-title">{(emoji + " ") if emoji else ""}{E(title)}</span>'
            f'<span class="pc-sub">{E(sub)}</span><span class="pc-cue">{E(cue)}</span></span></a>')

DEPT = {d[0]: d for d in shopdata.DEPTS}
KIT = {k[0]: k for k in kitdata.KITS}

# ---------- item illustrations ----------
USED_KEYS, MISSING = {}, {}
def item_img(label, q, size="card", p="../"):
    k = itemimg.key_for(label, q)
    if not k:
        MISSING.setdefault("(no category)", set()).add(label); return ""
    USED_KEYS.setdefault(k, set()).add(label)
    if not (ROOT / "assets/items" / f"{k}.webp").exists():
        MISSING.setdefault(k, set()).add(label); return ""
    w = 400 if size == "card" else 112
    return f'<img class="item-{size}" src="{p}assets/items/{k}.webp" width="{w}" height="{w}" loading="lazy" decoding="async" alt="Illustration of {E(label.lower())}">'
ITEM_NOTE = '<p class="dim item-note">Item images are illustrations, not the exact products sold.</p>'

# ---------- shop ----------
def shopcard(name, q, note, flags="", p="../"):
    return f'<div class="card shopcard">{item_img(name, q, "card", p)}<span class="tag">Category</span><h3>{E(name)}</h3><p>{E(note)}</p>{rb(q, "a" in flags)}</div>'

def search_form(p, placeholder="Search hunting gear… e.g. treestand harness"):
    opts = "".join(f'<option value="{r}">{RNAME[r]}</option>' for r in ["amazon", "basspro", "cabelas", "sportsmans", "duluth", "walmart", "academy"])
    return (f'<form class="shop-search" role="search" action="https://www.amazon.com/s" target="_blank">'
            f'<label class="sr" for="q">Search</label><input id="q" name="k" placeholder="{E(placeholder)}" autocomplete="off" required>'
            f'<input type="hidden" name="s" value="review-rank"><input type="hidden" name="tag" value="{E(CFG["amazonTag"])}"><label class="sr" for="r">Store</label><select id="r" name="r" aria-label="Store">{opts}</select>'
            f'<button type="submit">Search</button></form>')

def row(items, p):
    return '<div class="row">' + "".join(f'<div class="card shopcard">{item_img(n, q, "card", p)}<h3>{E(n)}</h3>{rb(q, "a" in f)}</div>' for n, q, f in items) + "</div>"

def build_shop():
    p = "../"
    tiles = "".join(pcard(f"{d[0]}.html", d[3], "sd"+str(i), d[1], d[4], "SHOP NOW →", emoji=d[2]) for i, d in enumerate(shopdata.DEPTS))
    hunts = "".join(pcard(f"../gear/{h[0]}.html", h[3], "sh"+h[0], h[1], "Kit checklist with store links", "VIEW LIST →", emoji=h[2]) for h in shopdata.HUNTS)
    body = (crumbs(p, ("Home", ""), ("Shop", None)) + DISCLOSURE.format(p=p) + search_form(p) +
        '<p class="dim">The search opens the store you pick in a new tab. Amazon searches carry our Associates tag.</p>'
        f'<h2>Shop top-rated by department</h2><p class="dim" style="font-size:.85rem">Opens the store\'s search sorted by customer rating.</p><div class="grid tight">{tiles}</div>'
        f'<h2>Shop by hunt</h2><div class="grid tight">{hunts}</div>'
        f'<h2>Season essentials</h2><p class="dim">The same featured row as the app\'s Kits &amp; Gear hub.</p>{row(shopdata.SEASON, p)}'
        f'<h2>Restock</h2><p class="dim">The things that run out mid-season.</p>{row(shopdata.RESTOCK, p)}'
        f'<h2>After the harvest</h2>{row(shopdata.HARVEST, p)}'
        '<h2>Compare &amp; deals</h2><p>Every card above has a <b>Compare stores</b> row: one tap opens the same search at Amazon, Bass Pro Shops, Cabela\'s, Sportsman\'s Warehouse, Walmart, Academy and Duluth Trading. '
        f'For sale pages and a hunting deals feed, see <a href="../deals.html">Deals &amp; Compare</a>.</p>')
    page("shop/index.html", "Gear Shop: Hunting Gear by Department", "Shop hunting gear by department or by hunt: optics, boots, tree stands, calls, scent control, archery, trail cams, game processing and more. Compare Amazon, Bass Pro, Cabela's and more in one tap.",
         body, "whitetail", "Gear Shop", "Outfitter's Counter", "Every department a hunter needs, from optics to game bags. Compare stores in one tap. No made-up prices, ratings or hype.", prio="0.9")
    for slug, name, emo, scene, blurb, items in shopdata.DEPTS:
        guides = [g for g in GUIDES if slug in g["depts"]]
        gl = "".join(f'<a class="card" href="../guides/{g["slug"]}.html"><span class="tag">Guide</span><h3>{E(g["title"])}</h3></a>' for g in guides)
        extra = lodging_finder() if slug == "camp-lodging" else ""
        body = (crumbs(p, ("Home", ""), ("Shop", ""), (name, None)) + DISCLOSURE.format(p=p) + search_form(p, f"Search {name.lower()}…") +
                f'<h2>{emo} {E(name)}</h2><div class="grid">{"".join(shopcard(*it) for it in items)}</div>' + extra +
                (f'<h2>Read before you buy</h2><div class="grid">{gl}</div>' if gl else "") +
                '<h2>Other departments</h2><p>' + " · ".join(f'<a href="{d[0]}.html">{E(d[1])}</a>' for d in shopdata.DEPTS if d[0] != slug) + "</p>")
        page(f"shop/{slug}.html", f"{name} for Hunters: Shop & Compare Stores", f"{blurb} Compare Amazon, Bass Pro Shops, Cabela's, Sportsman's Warehouse, Walmart, Academy and Duluth Trading in one tap.",
             body, scene, name, "Gear Shop · Department", E(blurb))

def lodging_finder():
    homes = {"booking": "https://www.booking.com/", "expedia": "https://www.expedia.com/", "vrbo": "https://www.vrbo.com/", "hipcamp": "https://www.hipcamp.com/", "recgov": "https://www.recreation.gov/"}
    names = {"booking": "Booking.com", "expedia": "Expedia", "vrbo": "Vrbo", "hipcamp": "Hipcamp", "recgov": "Recreation.gov"}
    btn = "".join(f'<a class="{"amz" if k=="booking" else ""}" data-l="{k}" data-home="{homes[k]}" href="{homes[k]}" target="_blank" rel="sponsored nofollow noopener">{names[k]}</a>' for k in homes)
    return (f'<h2>⛺ Find lodging near your hunt</h2><div class="panel"><form class="lodging-finder">'
            '<label>Town or area<input name="where" placeholder="e.g. Cody, Wyoming"></label><label>Check-in<input type="date" name="checkin"></label>'
            '<label>Check-out<input type="date" name="checkout"></label><label>Adults<input type="number" name="adults" min="1" max="16" value="2"></label></form>'
            f'<div class="rb" style="margin-top:12px">{btn}</div><p class="dim" style="font-size:.85rem">Each button opens that site\'s own search for your area and dates. We may earn a commission from qualifying bookings. '
            'In the app, Plan a Hunt → Find Lodging does this automatically from your trip\'s base camp.</p></div>')

# ---------- gear kits ----------
BADGES = ["⛺ Base Camp Set", "🗺️ Hunt Plan Drawn", "🎒 Kit Packed", "💰 Funded", "👥 Party Assembled", "🛂 Papers Confirmed"]
def build_gear():
    p = "../"
    cards = "".join(pcard(f"{k[0]}.html", k[3], "gk"+k[0], k[1].replace(" Kit", ""), k[4], "VIEW LIST →", emoji=k[2], big=True) for k in kitdata.KITS)
    body = (crumbs(p, ("Home", ""), ("Gear lists", None)) + DISCLOSURE.format(p=p) +
            '<p>These checklists match the kits in the app\'s <b>Kits &amp; Gear</b> hub, so you can plan here and check items off in the app. Every buyable item has a <b>Compare stores</b> row. Licenses, permits and travel papers have no shop links. Always confirm those with the official agency.</p>'
            f'<div class="grid">{cards}</div>')
    page("gear/index.html", "Hunting Gear Lists by Hunt Type", "Printable hunting gear checklists for whitetail, elk, turkey, waterfowl, plains-game safari, predator, moose and European hunts, with store links.",
         body, "camp", "Gear Lists", "Kits & Gear", "Packing lists by hunt, the same ones you'll find in the Your World Hunt app.", prio="0.8")
    for slug, name, emo, scene, blurb, guide, depts, items in kitdata.KITS:
        allitems = items + kitdata.ESSENTIALS + ([] if slug == "waterfowl" else kitdata.SHARP)
        lis = ""
        for it in allitems:
            label, cat, note, q = it[:4]; ap = len(it) > 4
            lis += f'<li><span class="box" aria-hidden="true"></span>{item_img(label, q, "thumb", p) if q else ""}<div class="txt"><b>{E(label)}</b><span>{E(cat)}{" · " + E(note) if note else ""}</span></div>{rb(q, ap) if q else ""}</li>'
        g = next(x for x in GUIDES if x["slug"] == guide)
        dl = " · ".join(f'<a href="../shop/{d}.html">{E(DEPT[d][1])}</a>' for d in depts)
        badges = "".join(f'<span class="badge{" on" if i==2 else ""}">{b}</span>' for i, b in enumerate(BADGES))
        body = (crumbs(p, ("Home", ""), ("Gear lists", ""), (name, None)) + DISCLOSURE.format(p=p) +
                f'<div class="panel"><p class="stencil" style="margin:0;color:var(--amber)">Expedition readiness</p><div class="badges">{badges}</div>'
                '<p class="dim" style="margin:0">In the app, checking off this kit earns the 🎒 <b>Kit Packed</b> badge on your expedition.</p></div>'
                f'<h2>{emo} The checklist</h2><ul class="check">{lis}</ul>'
                f'<div class="milestone"><div class="medal">🎒</div><div><strong>Kit Packed</strong><span class="dim">Read next: <a href="../guides/{guide}.html">{E(g["title"])}</a>. Shop departments: {dl}.</span></div></div>'
                + (lodging_finder() if slug in ("elk", "safari", "northern", "european") else "") +
                f'<div class="btns">{play_btn()}<a class="btn" href="index.html">All gear lists</a></div>')
        page(f"gear/{slug}.html", f"{name}: Hunting Gear Checklist", f"{blurb} A practical {name.lower()} checklist with compare-stores links. Regulations and paperwork: always confirm with official sources.",
             body, scene, name, "Gear list", E(blurb), prio="0.7")

# ---------- guides ----------
def build_guides():
    p = "../"
    cards = "".join(pcard(f'{g["slug"]}.html', g["scene"], "gi"+str(i), g["title"], g["desc"], "READ GUIDE →", tag="Badge: " + g["badge"], emoji=g["medal"], big=True) for i, g in enumerate(GUIDES))
    body = (crumbs(p, ("Home", ""), ("Guides", None)) +
            '<p>Original, practical articles for hunters at every level. Each one earns a Field School badge. They\'re general advice, not legal advice. <b>Seasons, bag limits, licenses, legal hunting hours, equipment rules and land access are set by your state wildlife agency or the authority where you hunt. Always check with them directly.</b></p>'
            f'<div class="grid">{cards}</div>')
    page("guides/index.html", "Hunting Guides: Field School", "Practical hunting guides: playing the wind for whitetail, first elk hunt checklist, moon and feeding times, public land basics, waterfowl blind gear, spring turkey setup, first plains-game safari and shot distance.",
         body, "camp", "Field School", "Guides", "Earn every badge. Written by hunters for hunters, with no fluff and no made-up regulations.", prio="0.9")
    for i, g in enumerate(GUIDES):
        src = (Path(__file__).parent / "guides" / f'{g["slug"]}.html').read_text()
        words = len(re.sub(r"<[^>]+>", " ", src).split())
        g["words"] = words
        dl = "".join(f'<a class="card" href="../shop/{d}.html"><span class="ic" style="font-size:1.4rem">{DEPT[d][2]}</span><h3>{E(DEPT[d][1])}</h3><p>Shop &amp; compare stores</p></a>' for d in g["depts"])
        nxt = GUIDES[(i + 1) % len(GUIDES)]
        ld = {"@context": "https://schema.org", "@type": "Article", "headline": g["title"], "description": g["desc"], "datePublished": "2026-10-09", "dateModified": TODAY,
              "author": {"@type": "Organization", "name": "Your World Apps"}, "publisher": {"@type": "Organization", "name": "Your World Apps", "logo": {"@type": "ImageObject", "url": SITE + "assets/icon-512.png"}},
              "mainEntityOfPage": SITE + f'guides/{g["slug"]}.html', "image": SITE + "assets/og-image.jpg"}
        body = (crumbs(p, ("Home", ""), ("Guides", ""), (g["short"], None)) +
                f'<article class="article"><p class="meta">Field School · {E(g["badge"])} · about {max(1, round(words/230))} min read · {words} words</p>{src}'
                f'<div class="callout"><p><b>Regulations:</b> this guide is general information. Seasons, limits, licenses, legal methods, hours and access rules vary by state and country and change often. Check your state wildlife agency or the official authority before you hunt.</p></div>'
                f'<div class="milestone"><div class="medal">{g["medal"]}</div><div><strong>Badge earned: {E(g["badge"])}</strong><span class="dim">Next up: <a href="{nxt["slug"]}.html">{E(nxt["title"])}</a></span></div></div></article>'
                f'<h2>Gear for this guide</h2>{DISCLOSURE.format(p=p)}<div class="grid tight">{dl}<a class="card" href="../gear/{g["kit"]}.html"><span class="ic" style="font-size:1.4rem">✅</span><h3>{E(KIT[g["kit"]][1])}</h3><p>Full checklist</p></a></div>'
                f'<div class="panel" style="margin-top:20px"><p class="stencil" style="margin-top:0;color:var(--amber)">Plan it in the app</p><p>{g["app"]}</p>{play_btn()}</div>')
        page(f'guides/{g["slug"]}.html', g["title"], g["desc"], body, g["scene"], g["title"], "Field School · " + g["badge"], E(g["desc"]), jsonld=[ld], og_type="article", prio="0.8")

# ---------- deals ----------
DEAL_PAGES = [("Amazon", "Today's Deals", "https://www.amazon.com/deals" + (f"?tag={enc(CFG['amazonTag'])}" if CFG["amazonTag"] else "")),
              ("Bass Pro Shops", "Bargain Cave", "https://www.basspro.com/shop/en/bargain-cave"),
              ("Cabela's", "Bargain Cave", "https://www.cabelas.com/shop/en/bargain-cave"),
              ("Sportsman's Warehouse", "Deals", "https://www.sportsmans.com/deals"),
              ("Duluth Trading", "Sale", "https://www.duluthtrading.com/sale/"),
              ("Walmart", "Deals", "https://www.walmart.com/shop/deals"),
              ("Academy Sports + Outdoors", "Sale", "https://www.academy.com/c/shops/sale")]
DEAL_WORDS = re.compile(r"(?i)\b(hunt\w*|deer|elk|turkey|duck|goose|decoy|camo|blind|tree ?stand|trail cam\w*|game cam\w*|binocular\w*|rangefinder|spotting scope|scope|bow|archery|arrow|crossbow|knife|knives|headlamp|flashlight|boots?|wool|merino|base ?layer|thermal|rain (jacket|gear)|backpack|tent|sleeping bag|cooler|vacuum sealer|meat grinder|hand warmers?|camping|camp stove|hiking|cabela|bass pro|sportsman|duluth|gps|satellite|garmin|coleman|yeti|carhartt)\b")
DEAL_JUNK = re.compile(r"(?i)\b(cpu|pc case|gpu|basketball|slippers?|witcher|wild hunt|game pass|xbox|playstation|nintendo|steam|string lights|flood lights?|accent lights|door mat|decor|statue|lunch bag|can cooler|security camera|t-shirt|treasure hunt|scavenger|egg hunt|house ?hunt|job|utility knife|kitchen|steak|knife set|knife blades|box cutter|kids'?|snap-off|chef|lego|board game|hobby|pairing|paring|recovery|black light|golf)\b")
def fetch_deals():
    items, seen = [], set()
    for kw in ["hunting", "trail camera", "binoculars", "rangefinder", "camping", "hunting boots", "headlamp", "hand warmers", "hiking boots", "pocket knife", "sleeping bag", "tent"]:
        u = "https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1&q=" + enc(kw)
        try:
            xml = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "YourWorldHuntSiteBuilder/1.0"}), timeout=20).read().decode("utf-8", "replace")
        except Exception as ex:
            print("deals fetch failed", kw, ex); continue
        for it in re.findall(r"<item>(.*?)</item>", xml, re.S):
            t = re.search(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", it, re.S); l = re.search(r"<link>(.*?)</link>", it, re.S); d = re.search(r"<pubDate>(.*?)</pubDate>", it)
            if not (t and l): continue
            title = html.unescape(t.group(1).strip()); href = l.group(1).strip()
            if href in seen or not DEAL_WORDS.search(title) or DEAL_JUNK.search(title): continue
            seen.add(href)
            ts = email.utils.parsedate_to_datetime(d.group(1)).isoformat() if d else None
            items.append({"title": title, "link": href, "posted": ts})
    items.sort(key=lambda x: x["posted"] or "", reverse=True)
    snap = {"source": "Slickdeals RSS", "fetchedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "items": items[:30]}
    (ROOT / "assets/deals.json").write_text(json.dumps(snap, ensure_ascii=False, indent=1))
    print("deals snapshot:", len(snap["items"]))

DEALS_JS = r'''<script>
(function(){
  var box=document.getElementById("deals"),note=document.getElementById("dealsNote");
  var FEED="https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&searchin=first&rss=1&q=hunting";
  function ago(iso){if(!iso)return"";var m=Math.round((Date.now()-new Date(iso))/60000);if(m<60)return m+" min ago";var h=Math.round(m/60);if(h<48)return h+" h ago";return Math.round(h/24)+" days ago";}
  function show(items,label){
    if(!items.length)return false;box.innerHTML="";
    items.slice(0,24).forEach(function(d){var c=document.createElement("a");c.className="card";c.href=d.link;c.target="_blank";c.rel="nofollow noopener";
      var t=document.createElement("h3");t.style.textTransform="none";t.style.letterSpacing="0";t.textContent=d.title;var s=document.createElement("p");s.className="dim";s.textContent="Slickdeals · posted "+ago(d.posted);
      c.appendChild(t);c.appendChild(s);box.appendChild(c);});
    note.textContent=label;return true;}
  function fallback(){box.innerHTML="";note.textContent="The live deals feed isn't available right now. Use the stores' own sale pages below.";document.getElementById("salepages").scrollIntoView&&0;}
  fetch(FEED).then(function(r){if(!r.ok)throw 0;return r.text();}).then(function(x){
    var doc=new DOMParser().parseFromString(x,"text/xml"),out=[];
    doc.querySelectorAll("item").forEach(function(i){out.push({title:i.querySelector("title").textContent,link:i.querySelector("link").textContent,posted:(i.querySelector("pubDate")||{}).textContent});});
    if(!show(out,"Live from Slickdeals. Prices change, so check the deal page."))throw 0;
  }).catch(function(){
    fetch("assets/deals.json",{cache:"no-store"}).then(function(r){return r.json();}).then(function(s){
      var age=(Date.now()-new Date(s.fetchedAt))/36e5;
      if(age>72||!show(s.items,"Deals from Slickdeals, pulled "+ago(s.fetchedAt)+". Prices change and deals expire, so check the deal page."))fallback();
    }).catch(fallback);
  });
})();
</script>'''

SALES = [("Winter clearance", "End-of-season markdowns after hunting seasons close. A good time for clothing, boots and decoys."),
         ("Spring sales events", "Big outdoor retailers usually run spring events ahead of turkey and fishing season. Bass Pro Shops and Cabela's call theirs the Spring Fishing Classic."),
         ("Memorial Day, Father's Day and Fourth of July sales", "Holiday sales across the big-box and outdoor stores. Often a good time for camping gear and coolers."),
         ("Amazon Prime Day", "Amazon's summer members' sale. Optics, trail cameras and electronics often show up."),
         ("Labor Day sales", "Late-summer sales right before many archery seasons open."),
         ("Bass Pro Shops / Cabela's Fall Hunting Classic", "The two stores' fall hunting event, usually with in-store seminars as well as sales."),
         ("Amazon Prime Big Deal Days", "Amazon's fall members' event."),
         ("Black Friday and Cyber Monday", "The biggest sales weekend of the year across almost every store on this site."),
         ("Holiday gift sales", "December gift-guide sales. Good for stocking stuffers like headlamps, knives and hand warmers.")]

def build_deals():
    p = ""
    compare = "".join(shopcard(n, q, note, f, p="") for n, q, note, f in [
        ("Hunting binoculars", "hunting binoculars", "Same search, every store, one tap each.", ""),
        ("Trail camera", "trail camera", "Compare current listings yourself. We never show prices.", ""),
        ("Waterproof hunting boots", "waterproof hunting boots", "Duluth comes first for boots and clothing.", "a"),
        ("Tree stand safety harness", "tree stand safety harness", "", ""),
        ("Turkey calls", "turkey call", "", ""),
        ("Duck decoys", "duck decoys", "", "")])
    sale = "".join(f'<a class="card" href="{E(u)}" target="_blank" rel="sponsored nofollow noopener"><span class="tag">{E(r)}</span><h3>{E(n)}</h3><p>Opens the store\'s own deals page</p></a>' for r, n, u in DEAL_PAGES)
    cal = "".join(f'<li><b>{E(n)}</b><br><span class="dim">{E(d)}</span></li>' for n, d in SALES)
    body = (crumbs(p, ("Home", ""), ("Deals", None)) + DISCLOSURE.format(p=p) +
            '<p>We don\'t invent prices, discounts or ratings. This page helps you <b>compare stores yourself</b> and find real, current deals from the source.</p>'
            f'<h2>Compare stores</h2><p>Every category card on this site has this row. Tap each store to see its current results for the same search.</p>{search_form(p)}<div class="grid">{compare}</div>'
            '<p><a href="shop/">Browse all departments →</a></p>'
            '<h2>Live hunting &amp; outdoor deals</h2><p id="dealsNote" class="dim">Loading deals…</p><div id="deals" class="grid"></div>'
            '<p class="disclosure"><strong>Deals from Slickdeals; prices change.</strong> Deal posts link to Slickdeals, a third-party community deal site. We don\'t control or verify the prices and don\'t earn a commission from those links. Always check the final price at checkout.</p>'
            f'<h2 id="salepages">Today\'s deal pages</h2><p class="dim">Each store\'s own sale or clearance page.</p><div class="grid tight">{sale}</div>'
            f'<h2>Seasonal sales calendar</h2><p>The sale events that usually come around each year. Dates and discounts change every year and differ by store, so watch the stores themselves.</p><ul class="check" style="list-style:none">{cal}</ul>'
            + DEALS_JS)
    page("deals.html", "Hunting Deals & Compare Stores", "Compare hunting gear across Amazon, Bass Pro Shops, Cabela's, Sportsman's Warehouse, Duluth Trading, Walmart and Academy in one tap, plus a hunting deals feed, store sale pages and a seasonal sales calendar.",
         body, "safari", "Deals & Compare", "Trading Post", "Compare stores in one tap, browse real deals from the source, and know when the big sales usually land. No invented prices.", prio="0.8")

# ---------- home / features / legal ----------
SHOTS = [("01", "Hunt map with GPS, wind and your marks"), ("04", "LAND public-land overlay (informational, not a survey)"), ("05", "Layers: satellite, streets, topo and LAND"),
         ("02", "Satellite map with the Sharp Shooter shortcut"), ("06", "Layer sheet with the LAND overlay"), ("03", "Trail cam setup with SpyPoint and Reveal sync")]
def shots(p): return '<div class="shots">' + "".join(f'<figure><picture><source srcset="{p}assets/shots/{n}-hunt.webp" type="image/webp"><img src="{p}assets/shots/{n}-hunt.jpg" width="480" height="853" loading="lazy" alt="Your World Hunt screenshot: {E(c)}"></picture><figcaption>{E(c)}</figcaption></figure>' for n, c in SHOTS) + "</div>"

FEATS = [("🗺️", "Hunting maps", "Satellite, streets and topo maps with GPS, deep zoom, stand and animal marks, boat ramps, breadcrumb tracks and GPS return with bearing and distance."),
         ("🟧", "LAND public land", "A live US public-land overlay (Premium) and offline Land Packs for the US, Canada, Europe, Australia or worldwide. Informational only, not a legal survey or proof of access."),
         ("🌬️", "Weather, wind & pressure", "Wind, barometric pressure trend and basic alerts. Long-press any mark for <b>Weather Here</b>. Weather data by Open-Meteo."),
         ("🌙", "Moon & feeding times", "Moon phase and sun/moon rise and set for free. Deer feeding times with Premium. Use them as a planning input, not a promise."),
         ("📏", "Sharp Shooter rangefinder", "An on-device camera rangefinder and wind hold guide. <b>It's an estimate, not a laser</b>, and not a ballistic calculator. Calibrate it on a known distance."),
         ("🦅", "Plan a Hunt + Ask Hawk", "An expedition planner with scored Hunt Days, lodging search, budget, party and papers checklists. Ask Hawk answers from your own trip data on your phone and never quotes seasons, limits or fees."),
         ("🎒", "Kits & Gear", "Kit checklists for every hunt type, season essentials, restock and after-harvest lists, and My Gear. Free for everyone."),
         ("📷", "Trail cams & Close-Buddy", "SpyPoint and Reveal sync with Hunt AI ID, plus live mutual GPS with your hunting partner (Premium).")]

def build_home():
    p = ""
    feats = "".join(f'<div class="card"><span class="emoji">{e}</span><h3>{t}</h3><p>{d}</p></div>' for e, t, d in FEATS)
    gcards = "".join(pcard(f'guides/{g["slug"]}.html', g["scene"], "hg"+str(i), g["title"], g["desc"], "READ GUIDE →", tag="Badge: " + g["badge"], emoji=g["medal"]) for i, g in enumerate(GUIDES))
    hunts = "".join(pcard(f"gear/{h[0]}.html", h[3], "hh"+h[0], h[1], "Kit checklist with store links", "VIEW LIST →", emoji=h[2]) for h in shopdata.HUNTS)
    badges = "".join(f'<span class="badge on">{b}</span>' for b in BADGES)
    app_ld = {"@context": "https://schema.org", "@type": "SoftwareApplication", "name": "Your World Hunt AI", "alternateName": "Your World Hunt",
              "operatingSystem": "Android", "applicationCategory": "SportsApplication", "url": SITE, "downloadUrl": PLAY, "installUrl": PLAY,
              "image": SITE + "assets/icon-512.png", "screenshot": [SITE + f"assets/shots/{n}-hunt.jpg" for n, _ in SHOTS],
              "description": "Hunting maps with public land, wind, pressure, moon and feeding times, a camera rangefinder estimate, Plan a Hunt with Ask Hawk, and Kits & Gear checklists.",
              "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD", "description": "Free download with optional in-app subscriptions"},
              "publisher": {"@type": "Organization", "name": "Your World Apps"}}
    site_ld = {"@context": "https://schema.org", "@type": "WebSite", "name": "Your World Hunt", "url": SITE}
    body = (f'<h2>Your hunting command center</h2><p>Your World Hunt AI puts the map, the wind, the weather and the plan in one Android app. Mark stands, read public land, watch the pressure trend, plan a trip with Ask Hawk, and pack with built-in gear lists.</p>'
            f'<div class="grid">{feats}</div>{shots(p)}<div class="btns">{play_btn()}<a class="btn" href="features.html">All features</a></div>'
            f'<h2>Plan like an expedition</h2><div class="panel"><p>Every trip in <b>Plan a Hunt</b> earns badges as it comes together:</p><div class="badges">{badges}</div><p class="dim" style="margin:0">🏆 Expedition Ready when all six are lit.</p></div>'
            f'<h2>Field School guides</h2><div class="grid">{gcards}</div>'
            f'<h2>Gear Shop</h2>{DISCLOSURE.format(p=p)}{search_form(p)}<div class="grid tight">{hunts}</div><p><a href="shop/">Shop all departments →</a> · <a href="deals.html">Deals &amp; compare →</a></p>')
    page("index.html", "Your World Hunt: Hunting Maps, Public Land, Wind & Trip Planner", "Your World Hunt AI for Android: hunting maps with public land, wind, pressure, moon and feeding times, a camera rangefinder, Plan a Hunt with Ask Hawk, and gear lists. Free on Google Play.",
         body, "whitetail", "Your World Hunt", "Android · Free on Google Play", "Maps, public land, wind and weather, moon and feeding times, and a trip planner that thinks like an outfitter.",
         jsonld=[app_ld, site_ld], prio="1.0", hero_extra=f'<div class="btns">{play_btn()}<a class="btn" href="guides/">Read the guides</a></div>')

def build_features():
    p = ""
    rows = [("Hunting map", "Free", "GPS, deep zoom, 1 stand plus animal marks and boat ramps (limits apply), GPS return, breadcrumb track, set location by city, ZIP, address or lat/long."),
            ("Weather", "Free", "Wind, barometric pressure trend, basic alerts, moon phase, sun and moon times, Weather Here on any mark."),
            ("Plan a Hunt", "Free (1 expedition)", "Hunt Days scored with moon, sun and a 10-day forecast (days 1–3 forecast, 4–7 trend, 8+ outlook only), Ask Hawk, Find Lodging, kit, budget, journal, and deadline reminders from dates you enter."),
            ("Kits & Gear", "Free", "8 kits with shop links, Shop this kit, season essentials, restock, after-harvest, My Gear, Ask Hawk what to pack."),
            ("Premium", "Subscription", "Unlimited stands, marks and track history, trail cams with Hunt AI ID, deer feeding times, live US LAND overlay, Close-Buddy GPS, GPX export, extended weather and alerts, unlimited expeditions."),
            ("Land Packs", "Add-on", "Offline public-land maps for the US, Canada, Europe, Australia or worldwide."),
            ("Sharp Shooter", "Add-on", "On-device camera rangefinder and wind hold guide. Estimates, not a laser; not a ballistic calculator."),
            ("Expedition Pack / Hunting Party", "Add-on", "Unlimited expeditions, per-person budget split, party sharing, papers checklist, printable trip PDF, Ask Hawk expert itineraries."),
            ("Dog Pack", "Add-on", "Dog profiles, pins and tracks, and harvest logging."),
            ("Military / Veteran", "Optional section", "Links to installation hunting programs, military lodging and ID.me, plus a checklist of license programs to confirm with your state agency.")]
    tbl = "<table><tr><th>Feature</th><th>Access</th><th>What you get</th></tr>" + "".join(f"<tr><td><b>{E(a)}</b></td><td>{E(b)}</td><td>{E(c)}</td></tr>" for a, b, c in rows) + "</table>"
    feats = "".join(f'<div class="card"><span class="emoji">{e}</span><h3>{t}</h3><p>{d}</p></div>' for e, t, d in FEATS)
    body = (crumbs(p, ("Home", ""), ("Features", None)) + f'<div class="grid" style="margin-top:18px">{feats}</div>{shots(p)}<h2>Free, Premium and add-ons</h2>{tbl}'
            '<p class="dim">All subscriptions are billed by Google Play. Current prices and any free trial are shown in Google Play before you confirm. Cancel any time in Google Play → Payments &amp; subscriptions.</p>'
            '<h2>Honest by design</h2><ul><li>Public-land layers are informational guides, not a legal survey and not proof of access.</li><li>Weather, pressure, moon and feeding times are informational.</li>'
            '<li>Sharp Shooter distances are camera-based estimates, not laser readings.</li><li>Ask Hawk never quotes seasons, limits or fees. Confirm those with your state agency.</li>'
            '<li>Marks, tracks, trips and Ask Hawk chats stay on your phone unless you turn on optional sync. See <a href="privacy.html">Privacy</a>.</li></ul>'
            f'<div class="btns">{play_btn()}</div>')
    page("features.html", "Features: Maps, LAND, Weather, Rangefinder, Ask Hawk", "Everything in Your World Hunt AI: hunting maps, LAND public land overlay, wind and pressure, moon and feeding times, Sharp Shooter camera rangefinder estimate, Plan a Hunt with Ask Hawk and Kits & Gear.",
         body, "elk", "Features", "Field kit", "Free core tools, plus Premium and add-ons when you want more.", prio="0.9")

def legal_pages():
    p = ""
    disc_body = (crumbs(p, ("Home", ""), ("Affiliate disclosure", None)) + '<article class="article">'
        '<p><b>We may earn a commission from links on this site.</b> When you buy or book through some links, the retailer or booking site may pay us a small commission. It costs you nothing extra.</p>'
        '<p><b>As an Amazon Associate I earn from qualifying purchases.</b> Amazon links on this site carry our Associates tag.</p>'
        '<h2>Which links</h2><ul><li>Store links in the Gear Shop, gear lists, guides and deals pages: Amazon, Bass Pro Shops, Cabela\'s, Sportsman\'s Warehouse, Duluth Trading, Walmart and Academy Sports + Outdoors. Some of these may be untagged until a partnership is approved; they work the same either way.</li>'
        '<li>Lodging search links: Booking.com, Expedia, Vrbo, Hipcamp and Recreation.gov.</li>'
        '<li>Links to Slickdeals deal posts are not affiliate links from us.</li></ul>'
        '<h2>How we pick</h2><p>Our links open each store\'s own search for a gear <i>category</i>. We don\'t show prices, star ratings, reviews or "best seller" claims, because we can\'t verify them and they change constantly. Compare and decide on the retailer\'s site. Guides are written to be useful whether or not you buy anything.</p>'
        '<p>Links to retailers are marked <code>rel="sponsored"</code> for search engines.</p><p>The Your World Hunt app uses the same approach. Its shop buttons open retailer searches, and Amazon links carry the same tag.</p></article>')
    page("affiliate-disclosure.html", "Affiliate Disclosure", "How Your World Hunt earns from affiliate links: Amazon Associates and other retailer and lodging programs. No fake prices or ratings.", disc_body, "camp", "Affiliate Disclosure", "The fine print, plainly")
    about = (crumbs(p, ("Home", ""), ("About", None)) + '<article class="article">'
        '<p><b>Your World Hunt</b> (full name <b>Your World Hunt AI</b>) is an Android hunting app from <b>Your World Apps</b>, a small independent developer. It started as a hunting map and grew into a full field kit: public land, wind and pressure, moon and feeding times, a camera rangefinder estimate, and Plan a Hunt, an expedition planner with a field guide called Ask Hawk.</p>'
        '<h2>What we believe</h2><ul><li><b>Honest tools.</b> A camera rangefinder is an estimate, a land layer isn\'t a survey, and a moon table isn\'t a guarantee. We say so.</li>'
        '<li><b>Regulations come from the source.</b> We never invent seasons, limits or fees. The app and this site send you to your state agency.</li>'
        '<li><b>Your data stays yours.</b> Marks, tracks, trips and Ask Hawk chats stay on your phone by default.</li>'
        '<li><b>Ethics first.</b> Know your range, know your target, get permission, and respect the animal.</li></ul>'
        '<h2>This website</h2><p>The Field School guides here are original articles written for hunters planning real trips. The Gear Shop and gear lists mirror the kits inside the app, with store links that may earn a commission (see the <a href="affiliate-disclosure.html">affiliate disclosure</a>). That helps keep the core of the app free.</p>'
        f'<p>More apps from the same developer: <a href="https://yourworldapps.si/">Your World Apps</a>.</p><div class="btns">{play_btn()}</div></article>')
    page("about.html", "About Your World Hunt", "About Your World Hunt AI and Your World Apps: honest hunting tools, privacy by default, and regulations from the source.", about, "north", "About", "Base camp")
    contact = (crumbs(p, ("Home", ""), ("Contact", None)) + '<article class="article">'
        f'<p>The best way to reach the developer is through the <b>developer contact on the Google Play listing</b>. Open <a href="{PLAY}" target="_blank" rel="noopener">Your World Hunt on Google Play</a>, scroll to <b>App support</b>, and use the email shown there.</p>'
        '<ul><li><b>Bug or feature request:</b> include your phone model, Android version, the app version (Settings → About) and what you were doing.</li>'
        '<li><b>Subscription and billing:</b> purchases are processed by Google Play. Manage or cancel in Google Play → Payments &amp; subscriptions.</li>'
        '<li><b>Retailers, outfitters and partnerships:</b> use the same Play listing contact. Put "Partnership" in the subject.</li></ul>'
        '<p class="dim">We can\'t answer questions about seasons, limits or legal methods. Please contact your state wildlife agency.</p></article>')
    page("contact.html", "Contact", "How to contact the Your World Hunt developer: app support through the Google Play listing.", contact, "marsh", "Contact", "Radio check")
    terms = (crumbs(p, ("Home", ""), ("Terms", None)) + '<article class="article"><p class="meta">Last updated: ' + TODAY + '</p>'
        '<h2>Information only</h2><p>Guides, gear lists and pages on this site are general information. They are not legal, safety, medical or professional advice. Hunting is regulated, and the rules (seasons, limits, licenses, legal methods and equipment, hours, blaze orange, baiting, land access, firearm transport and import) vary by place and change often. <b>You are responsible for confirming and following the current rules with your state wildlife agency or the official authority, and for getting permission to hunt private land.</b></p>'
        '<h2>Safety</h2><p>Hunting and outdoor travel carry real risks. Use a full-body harness in tree stands, follow firearm and archery safety rules, tell someone your plan, and carry the means to call for help. Sharp Shooter distances in the app are estimates, not laser measurements. Weather, land and moon information is informational.</p>'
        '<h2>Third-party links</h2><p>This site links to retailers, booking sites, Slickdeals and government sites. We don\'t control them, their prices or their availability. Their own terms and privacy policies apply. Some links are affiliate links (see the <a href="affiliate-disclosure.html">disclosure</a>).</p>'
        '<h2>The app</h2><p>Use of the Your World Hunt app is also subject to Google Play\'s terms. In-app subscriptions are billed and managed by Google Play.</p>'
        '<h2>Content</h2><p>Text and artwork on this site are original works of Your World Apps. Trademarks belong to their owners. Retailer names identify where a link goes and don\'t imply endorsement.</p>'
        '<h2>No warranty</h2><p>The site is provided "as is" without warranties of any kind. To the extent the law allows, Your World Apps is not liable for losses arising from use of this site.</p>'
        '<h2>Changes</h2><p>We may update these terms. The date above shows the latest version.</p></article>')
    page("terms.html", "Terms of Use", "Terms of use for the Your World Hunt website: information only, check regulations with official sources, third-party and affiliate links.", terms, "camp", "Terms of Use", "Rules of the trail", prio="0.3")
    # privacy: copy the app's published policy body, plus a website section
    src = (ROOT.parent / "YWHUNT_privacy.html").read_text()
    pol = re.search(r"<body>(.*)</body>", src, re.S).group(1)
    pol = re.sub(r"<h1>.*?</h1>", "", pol, flags=re.S)
    pol = pol.replace("<p>Contact: via Google Play listing</p>", f'<p>Contact: via the developer contact on the <a href="{PLAY}" target="_blank" rel="noopener">Google Play listing</a>.</p>')
    web = ('<h2>This website</h2><ul><li>This site has no accounts, no ads, no analytics and no tracking cookies. It\'s static pages hosted on GitHub Pages. GitHub may log visitors\' IP addresses for security (<a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub privacy statement</a>).</li>'
           '<li>Store, booking and deal links open third-party sites. When you click them, those sites (for example Amazon) may set their own cookies to credit a referral. Their privacy policies apply.</li>'
           '<li>The Deals page asks Slickdeals\' public feed for deal posts from your browser, so Slickdeals sees that request.</li>'
           '<li>Searches you type into the Gear Shop or lodging finder are sent only to the store or site you pick, when you pick it.</li></ul>')
    priv = crumbs(p, ("Home", ""), ("Privacy", None)) + f'<article class="article">{web}<h2>Your World Hunt AI app</h2><p class="dim">The app\'s privacy policy follows. It\'s the same policy linked from Google Play.</p>{pol}</article>'
    page("privacy.html", "Privacy Policy", "Privacy policy for the Your World Hunt AI Android app and this website: data stays on your device by default, no ads, no tracking.", priv, "north", "Privacy Policy", "Your data stays yours", prio="0.4")
    nf = (f'<div style="padding:30px 0"><p>This trail goes nowhere. The page may have moved.</p><div class="btns"><a class="btn primary" href="{SITE}">Back to base camp</a><a class="btn" href="{SITE}guides/">Guides</a><a class="btn" href="{SITE}shop/">Gear Shop</a></div></div>')
    page("404.html", "Page Not Found", "That page is off the map.", nf, "camp", "Off the map", "404", absolute=True)

def seo_files():
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(f"<url><loc>{u}</loc><lastmod>{TODAY}</lastmod><priority>{pr}</priority></url>\n" for u, pr in PAGES) + "</urlset>\n"
    (ROOT / "sitemap.xml").write_text(sm)
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /_src/\n\nSitemap: {SITE}sitemap.xml\n")

if __name__ == "__main__":
    import sys
    if "--no-deals" not in sys.argv: fetch_deals()
    build_guides(); build_shop(); build_gear(); build_deals(); build_home(); build_features(); legal_pages(); seo_files()
    print("pages:", len(PAGES))
    have = sorted(k for k in USED_KEYS if (ROOT / "assets/items" / f"{k}.webp").exists())
    print(f"item images: {len(have)}/{len(USED_KEYS)} categories present")
    import json as _j
    subj = itemimg.subjects()
    (Path(__file__).parent / "item_prompts.json").write_text(_j.dumps(
        [{"key": k, "file": f"_src/items_raw/{k}.png", "prompt": itemimg.STYLE + subj.get(k, k.replace("-", " ")), "items": sorted(USED_KEYS[k]), "done": k in have} for k in sorted(USED_KEYS)], indent=1, ensure_ascii=False))
    if MISSING.get("(no category)"): print("unmapped items:", sorted(MISSING["(no category)"]))
    for g in GUIDES: print(f'  {g["slug"]}: {g["words"]} words')
