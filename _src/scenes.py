"""Inline SVG hero scenes, mirroring the app's TripTheme palettes (TripTheme.kt). No images, all vector."""
import random

THEMES = {  # skyTop, skyBottom, sun, far, near, accent  (straight from TripTheme.kt)
    "whitetail": ("#2A3320", "#D98A3D", "#FFD08A", "#4A4A2A", "#1A1A10", "#C8893A"),
    "elk":       ("#3A2E3E", "#E08A4A", "#FFC98A", "#5A4A44", "#221A16", "#E0A050"),
    "north":     ("#22343A", "#B8C49A", "#F4EED0", "#3A4A34", "#141A12", "#C0503A"),
    "europe":    ("#2A2A3A", "#C8A060", "#FFE6A8", "#4A4636", "#181610", "#D4B060"),
    "safari":    ("#5A1E10", "#F59A3A", "#FFE08A", "#7A4520", "#241208", "#F08A2E"),
    "marsh":     ("#3A4A52", "#F0B888", "#FFF0D0", "#5A6A5A", "#1E2418", "#D8B070"),
    "turkey":    ("#4A2A3A", "#F0A070", "#FFD9A0", "#4A5A2E", "#1C2414", "#D08A5A"),
    "camp":      ("#1E1C16", "#6A5A3A", "#F0E0B0", "#3A3424", "#14120C", "#CDB98A"),
}
W, H = 1200, 420

def _ridge(rnd, base, amp, step, jag=False):
    pts = []
    x = 0
    while x <= W + step:
        y = base - (rnd.uniform(0, amp) if (jag or rnd.random() > .3) else rnd.uniform(0, amp * .4))
        pts.append((x, round(y)))
        x += step * rnd.uniform(.6, 1.4) if jag else step
    if jag:
        return f"M0,{H} " + " ".join(f"L{x:.0f},{y}" for x, y in pts) + f" L{W},{H}Z"
    d = f"M0,{H} L0,{pts[0][1]}"
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        d += f" Q{x0:.0f},{y0} {(x0+x1)/2:.0f},{(y0+y1)/2:.0f}"
    return d + f" L{W},{H}Z"

def _pine(x, base, h, w):
    tiers = 4
    left, right = [], []
    for t in range(1, tiers + 1):
        yy = base - h * .08 - (h * .92) * (1 - t / tiers) 
        ww = w * t / tiers
        right += [(x + ww, yy), (x + ww * .35, yy - h * .04)] if t < tiers else [(x + ww, yy)]
        left = ([(x - ww * .35, yy - h * .04), (x - ww, yy)] if t < tiers else [(x - ww, yy)]) + left
    pts = [(x, base - h)] + right + [(x + w * .12, base - h * .08), (x + w * .12, base), (x - w * .12, base), (x - w * .12, base - h * .08)] + left
    return "M" + " L".join(f"{a:.0f},{b:.0f}" for a, b in pts) + "Z"

def _acacia(x, base, h, w):
    trunk = f"M{x-4},{base} L{x-2},{base-h*.55:.0f} L{x-w*.25:.0f},{base-h*.8:.0f} L{x-w*.22:.0f},{base-h*.84:.0f} L{x},{base-h*.62:.0f} L{x+w*.2:.0f},{base-h*.86:.0f} L{x+w*.24:.0f},{base-h*.82:.0f} L{x+3},{base-h*.55:.0f} L{x+5},{base}Z"
    canopy = f"M{x-w*.55:.0f},{base-h*.84:.0f} Q{x-w*.3:.0f},{base-h*1.02:.0f} {x},{base-h:.0f} Q{x+w*.35:.0f},{base-h*1.03:.0f} {x+w*.6:.0f},{base-h*.86:.0f} Q{x},{base-h*.78:.0f} {x-w*.55:.0f},{base-h*.84:.0f}Z"
    return trunk + " " + canopy

def _hardwood(x, base, h, w, rnd):
    d = f"M{x-4},{base} L{x-3},{base-h*.5:.0f} L{x+3},{base-h*.5:.0f} L{x+4},{base}Z "
    for _ in range(5):
        cx = x + rnd.uniform(-w * .35, w * .35); cy = base - h * rnd.uniform(.6, .9); r = w * rnd.uniform(.22, .34)
        d += f"M{cx-r:.0f},{cy:.0f} a{r:.0f},{r*.85:.0f} 0 1,0 {2*r:.0f},0 a{r:.0f},{r*.85:.0f} 0 1,0 {-2*r:.0f},0 "
    return d

def _bird(x, y, s):
    return f"M{x-s},{y-s*.4:.0f} Q{x-s*.5:.0f},{y-s*.7:.0f} {x},{y} Q{x+s*.5:.0f},{y-s*.7:.0f} {x+s},{y-s*.4:.0f}"

def svg(scene: str, uid: str = "h") -> str:
    sky_t, sky_b, sun, far, near, acc = THEMES[scene]
    rnd = random.Random(scene)
    g = (f'<svg class="hero-art" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">'
         f'<defs><linearGradient id="{uid}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{sky_t}"/><stop offset=".85" stop-color="{sky_b}"/></linearGradient>'
         f'<radialGradient id="{uid}g"><stop offset="0" stop-color="{sun}" stop-opacity=".9"/><stop offset=".35" stop-color="{sun}" stop-opacity=".35"/><stop offset="1" stop-color="{sun}" stop-opacity="0"/></radialGradient></defs>'
         f'<rect width="{W}" height="{H}" fill="url(#{uid}s)"/>')
    sx, sy, sr = {"safari": (760, 300, 70), "camp": (900, 110, 46), "marsh": (420, 300, 60), "north": (300, 250, 40), "elk": (840, 150, 50)}.get(scene, (820, 280, 56))
    g += f'<circle cx="{sx}" cy="{sy}" r="{sr*3.2:.0f}" fill="url(#{uid}g)"/><circle cx="{sx}" cy="{sy}" r="{sr}" fill="{sun}"/>'
    if scene == "camp":
        g += "".join(f'<circle cx="{rnd.uniform(0,W):.0f}" cy="{rnd.uniform(0,230):.0f}" r="{rnd.uniform(.6,1.8):.1f}" fill="#F0E0B0" opacity="{rnd.uniform(.3,.9):.2f}"/>' for _ in range(45))
    if scene == "north":
        g += '<path d="M0,120 C300,40 500,190 800,90 S1100,60 1200,110" stroke="#8FD0A0" stroke-width="26" fill="none" opacity=".2"/>'
    if scene == "elk":
        g += f'<path d="{_ridge(rnd, 210, 130, 90, True)}" fill="{far}" opacity=".9"/>'
        g += f'<path d="{_ridge(rnd, 310, 100, 120, True)}" fill="{near}" opacity=".7"/>'
        n = " ".join(_pine(i * 48 + rnd.uniform(-10, 10), H, rnd.uniform(70, 150), rnd.uniform(18, 26)) for i in range(26))
        g += f'<path d="{n}" fill="{near}"/>'
    elif scene == "safari":
        g += f'<path d="{_ridge(rnd, 330, 40, 200)}" fill="{far}" opacity=".7"/>'
        a = " ".join(_acacia(x, 372, h, w) for x, h, w in [(180, 170, 210), (520, 110, 150), (1010, 200, 250), (1150, 90, 120)])
        g += f'<path d="{a}" fill="{near}"/>'
        g += f'<path d="M0,372 Q300,350 600,368 T1200,360 L1200,420 L0,420Z" fill="{near}"/>'
    elif scene == "whitetail":
        g += f'<path d="{_ridge(rnd, 300, 50, 150)}" fill="{far}"/>'
        t = "".join(_hardwood(x, H - 20, rnd.uniform(160, 260), rnd.uniform(110, 170), rnd) for x in range(40, 1240, 140) if abs(x-660) > 40)
        g += f'<path d="{t}" fill="{near}"/>'
        g += (f'<g stroke="{near}" stroke-width="5" fill="none" stroke-linecap="round"><path d="M640,400 L652,250 M664,400 L672,250"/>'
              + "".join(f'<path d="M{641+i*1.6:.0f},{390-i*22} L{665+i*1.1:.0f},{390-i*22}"/>' for i in range(7))
              + f'<path d="M636,250 L694,250 L694,226 M680,250 L700,205 L700,420"/></g>')
        g += f'<rect y="{H-24}" width="{W}" height="24" fill="{near}"/>'
    elif scene == "marsh":
        g += f'<path d="{_ridge(rnd, 305, 30, 200)}" fill="{far}" opacity=".9"/>'
        g += f'<rect y="322" width="{W}" height="100" fill="{sky_b}" opacity=".5"/>'
        g += f'<ellipse cx="{sx}" cy="345" rx="120" ry="6" fill="{sun}" opacity=".5"/><ellipse cx="{sx}" cy="365" rx="70" ry="4" fill="{sun}" opacity=".35"/>'
        r = ""
        for i in range(150):
            x = rnd.uniform(0, W); h = rnd.uniform(30, 120) * (1.6 if x < 250 or x > 950 else .55)
            r += f"M{x:.0f},{H} Q{x+rnd.uniform(-6,6):.0f},{H-h/2:.0f} {x+rnd.uniform(-14,14):.0f},{H-h:.0f} "
        g += f'<path d="{r}" stroke="{near}" stroke-width="3" fill="none"/>'
        g += f'<path d="M0,402 Q400,388 800,400 T1200,394 L1200,420 L0,420Z" fill="{near}"/>'
        b = " ".join(_bird(x, y, s) for x, y, s in [(700, 120, 16), (735, 140, 14), (765, 160, 13), (672, 142, 14), (645, 163, 12), (960, 80, 10), (985, 92, 9)])
        g += f'<path d="{b}" stroke="{near}" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
    elif scene == "turkey":
        g += f'<path d="{_ridge(rnd, 290, 60, 160)}" fill="{far}"/>'
        g += f'<path d="M0,370 Q300,320 650,360 T1200,340 L1200,420 L0,420Z" fill="{near}"/>'
        o = "".join(_hardwood(x, H - 10, h, w, rnd) for x, h, w in [(120, 260, 230), (260, 200, 160), (1000, 280, 250), (1140, 220, 180)])
        g += f'<path d="{o}" fill="{near}"/>'
        g += (f'<g fill="{near}"><path d="M560,352 A46,42 0 0,1 652,352Z"/><ellipse cx="610" cy="356" rx="30" ry="17"/>'
              f'<path d="M632,352 Q644,332 640,318 Q634,312 630,320 Q634,334 622,348Z"/></g>'
              f'<path d="M600,370 L598,392 M616,370 L618,392" stroke="{near}" stroke-width="4"/>')
    elif scene == "north":
        g += f'<path d="{_ridge(rnd, 275, 50, 220)}" fill="{far}" opacity=".85"/>'
        g += f'<rect y="322" width="{W}" height="40" fill="{sky_b}" opacity=".45"/>'
        n = " ".join(_pine(x, H, rnd.uniform(110, 220), rnd.uniform(9, 14)) for x in (i * 21 + rnd.uniform(-6, 6) for i in range(60)) if not 430 < x < 760)
        g += f'<path d="{n}" fill="{near}"/><rect y="{H-28}" width="{W}" height="28" fill="{near}"/>'
    elif scene == "europe":
        g += f'<path d="{_ridge(rnd, 300, 40, 200)}" fill="{far}"/>'
        n = " ".join(_pine(x, 352, rnd.uniform(60, 110), 14) for x in range(820, 1220, 22))
        g += f'<path d="{n}" fill="{near}"/>'
        g += f'<path d="M0,360 Q400,330 800,355 T1200,345 L1200,420 L0,420Z" fill="{near}"/>'
        g += f'<g stroke="{near}" stroke-width="6"><path d="M425,375 L442,245 M497,375 L480,245 M432,320 L490,320 M436,290 L486,290" fill="none"/></g><path d="M422,252 L500,252 L500,222 L461,198 L422,222Z" fill="{near}"/>'
    else:  # camp
        g += f'<path d="{_ridge(rnd, 290, 70, 150)}" fill="{far}"/>'
        n = " ".join(_pine(x, H, rnd.uniform(80, 140), 16) for x in list(range(0, 380, 34)) + list(range(860, 1240, 34)))
        g += f'<path d="{n}" fill="{near}"/><rect y="380" width="{W}" height="40" fill="{near}"/>'
        g += f'<path d="M520,385 L590,300 L660,385Z" fill="{near}"/><path d="M590,300 L578,385 L602,385Z" fill="{acc}" opacity=".5"/>'
        g += f'<ellipse cx="720" cy="382" rx="40" ry="10" fill="{acc}" opacity=".45"/><path d="M710,382 Q716,360 722,348 Q728,366 734,382Z" fill="#E0702A"/>'
    return g + "</svg>"
