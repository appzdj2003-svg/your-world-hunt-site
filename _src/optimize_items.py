#!/usr/bin/env python3
"""Convert generated item art in _src/items_raw/<key>.(png|jpg|jpeg|webp) to assets/items/<key>.webp (400px, < 40 KB).
Then run: python3 _src/build.py --no-deals   (cards pick up any image that exists; others render without one)."""
from pathlib import Path
from PIL import Image
R = Path(__file__).resolve().parent; OUT = R.parent / "assets/items"; OUT.mkdir(parents=True, exist_ok=True)
for f in sorted((R / "items_raw").glob("*")):
    if f.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp"): continue
    im = Image.open(f).convert("RGB"); s = min(im.size)
    im = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width + s) // 2, (im.height + s) // 2)).resize((400, 400), Image.LANCZOS)
    dst = OUT / f"{f.stem}.webp"
    for q in (80, 72, 64, 56, 48, 40, 32):
        im.save(dst, "WEBP", quality=q, method=6)
        if dst.stat().st_size < 40_000: break
    print(f"{dst.name}: {dst.stat().st_size // 1024} KB (q={q})")
