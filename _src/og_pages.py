"""Per-page 1200x630 share images (assets/og/*.png) for the guides (EN + /es/) and gear lists.
Same art as og_image.py: dusk gradient, amber glow, the app icon, site palette. Page title only, no prices or trial wording.
Run: python3 _src/og_pages.py   (then python3 _src/build.py wires og:image/twitter:image to them)"""
import json, pathlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import kitdata, guide_index, article2026 as A26, article2026_es as A26ES
S = pathlib.Path(__file__).resolve().parent; R = S.parent; OUT = R / "assets/og"; W, H = 1200, 630
G = "/usr/share/fonts/truetype/sand-box/google/"
def F(path, size, w):
    f = ImageFont.truetype(G + path, size)
    try: f.set_variation_by_name(w)
    except Exception: pass
    return f
ANT = "Antonio/Antonio-VariableFont_wght.ttf"; NOTO = "Noto Sans/NotoSans-VariableFont_wdth,wght.ttf"

def base():
    im = Image.new("RGB", (W, H), "#15130D"); d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H; d.line([(0, y), (W, y)], fill=(int(21 + 30 * (1 - t)), int(19 + 18 * (1 - t)), int(13 + 6 * (1 - t))))
    glow = Image.new("RGB", (W, H), 0); g = ImageDraw.Draw(glow); g.ellipse((780, 110, 1180, 510), fill=(200, 137, 58)); glow = glow.filter(ImageFilter.GaussianBlur(110))
    im = Image.blend(im, Image.composite(glow, im, glow.convert("L")), 0.35)
    ic = Image.open(R / "assets/icon-512.png").convert("RGBA").resize((280, 280), Image.LANCZOS)
    m = Image.new("L", ic.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 279, 279), 58, fill=255)
    im.paste(ic, (860, 175), Image.composite(ic.split()[3], m, m))
    ImageDraw.Draw(im).rounded_rectangle((858, 173, 1142, 457), 60, outline="#C8893A", width=4)
    return im

def wrap(d, text, f, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= maxw or not cur: cur = t
        else: lines.append(cur); cur = w
    return lines + [cur]

def card(title, kicker, sub, out):
    im = base(); d = ImageDraw.Draw(im); X, MAXW = 70, 730
    k = F(NOTO, 24, "SemiBold"); kw = d.textlength(kicker.upper(), font=k)
    d.rounded_rectangle((X, 58, X + kw + 36, 58 + 46), 23, fill="#C8893A"); d.text((X + 18, 66), kicker.upper(), font=k, fill="#15130D")
    for size in (92, 84, 76, 68, 62, 56, 52, 48):   # largest size whose block fits between the chip and the brand line
        T = F(ANT, size, "Bold"); lines = wrap(d, title.upper(), T, MAXW); lh = int(size * 1.12)
        if all(d.textlength(l, font=T) <= MAXW for l in lines) and len(lines) * lh <= 300: break
    block = len(lines) * lh + 36 + (52 if sub else 0); y = 128 + max(0, (390 - block) // 2)
    for l in lines: d.text((X, y), l, font=T, fill="#F1E7CF"); y += lh
    d.rectangle((X + 2, y + 16, X + 240, y + 22), fill="#C8893A")
    if sub:
        s = F(NOTO, 30, "Medium"); d.text((X, y + 36), wrap(d, sub, s, MAXW)[0], font=s, fill="#CDB98A")
    b = F(ANT, 44, "Bold"); d.text((X, 540), "YOUR WORLD", font=b, fill="#F1E7CF")
    d.text((X + d.textlength("YOUR WORLD ", font=b), 540), "HUNT", font=b, fill="#E0702A")
    d.text((860, 553), "hunt.yourworldapps.si", font=F(NOTO, 26, "Regular"), fill="#B3A47E")
    OUT.mkdir(parents=True, exist_ok=True); im.save(OUT / out, optimize=True); return out

def all_cards():
    made = []
    guides, es = guide_index.load()   # skips UNRELEASED guides unless YW_PREVIEW_DRAFTS is set
    for g in guides: made.append(card(g["title"], "Field School guide", "Badge: " + g["badge"], f'guide-{g["slug"]}.png'))
    made.append(card(A26.TITLE, "Season checklist", "Sept to Dec: what to look for in each category", f"guide-{A26.SLUG}.png"))
    for g in guides:
        e = es[g["slug"]]; made.append(card(e["title"], "Guía · Escuela de campo", "Insignia: " + e["badge"], f'es-guide-{g["slug"]}.png'))
    made.append(card(A26ES.TITLE, "Lista de temporada", "Sept. a dic.: qué buscar en cada categoría", f"es-guide-{A26ES.SLUG}.png"))
    for slug, name, emo, scene, blurb, *_ in kitdata.KITS: made.append(card(name, "Gear list", "Hunting gear checklist", f"gear-{slug}.png"))
    return made

if __name__ == "__main__":
    m = all_cards(); print(len(m), "images in", OUT)
