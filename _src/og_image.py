"""Make assets/og-hunt-2026.png (1200x630): title + tagline only, site palette, app icon. No prices/claims."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import pathlib
R = pathlib.Path(__file__).resolve().parent.parent; W, H = 1200, 630
im = Image.new("RGB", (W, H), "#15130D"); d = ImageDraw.Draw(im)
for y in range(H):   # warm dusk gradient
    t = y / H; d.line([(0, y), (W, y)], fill=(int(21 + 30 * (1 - t)), int(19 + 18 * (1 - t)), int(13 + 6 * (1 - t))))
glow = Image.new("RGB", (W, H), 0); g = ImageDraw.Draw(glow); g.ellipse((700, 60, 1180, 540), fill=(200, 137, 58)); glow = glow.filter(ImageFilter.GaussianBlur(120))
im = Image.blend(im, Image.composite(glow, im, glow.convert("L")), 0.35); d = ImageDraw.Draw(im)
ic = Image.open(R / "assets/icon-512.png").convert("RGBA").resize((340, 340), Image.LANCZOS)
m = Image.new("L", ic.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 339, 339), 70, fill=255)
im.paste(ic, (800, 145), Image.composite(ic.split()[3], m, m) if ic.mode == "RGBA" else m)
d.rounded_rectangle((798, 143, 1142, 487), 72, outline="#C8893A", width=4)
T = ImageFont.truetype("/usr/share/fonts/truetype/sand-box/google/Antonio/Antonio-VariableFont_wght.ttf", 118); S = ImageFont.truetype("/usr/share/fonts/truetype/sand-box/google/Noto Sans/NotoSans-VariableFont_wdth,wght.ttf", 40); U = ImageFont.truetype("/usr/share/fonts/truetype/sand-box/google/Noto Sans/NotoSans-VariableFont_wdth,wght.ttf", 28)
for f, w in ((T, "Bold"), (S, "Medium"), (U, "Regular")):
    try: f.set_variation_by_name(w)
    except Exception: pass
d.text((70, 150), "YOUR WORLD", font=T, fill="#F1E7CF"); d.text((70, 275), "HUNT", font=T, fill="#E0702A")
d.rectangle((72, 425, 330, 432), fill="#C8893A")
d.text((70, 448), "Hunting maps, wind, moon", font=S, fill="#CDB98A"); d.text((70, 498), "and trip planning", font=S, fill="#CDB98A")
d.text((70, 572), "hunt.yourworldapps.si", font=U, fill="#B3A47E")
im.save(R / "assets/og-hunt-2026.png", optimize=True); print("ok")
