"""Which Field School guides get built. Shared by build.py and og_pages.py.

UNRELEASED: guides about app features that haven't shipped yet. Their sources are NOT in this public repo;
they live in a local drafts folder and are only built when YW_PREVIEW_DRAFTS points at it (local preview
copy of the site, never pushed). A normal build skips them entirely: no page, no index card, no footer link,
no sitemap entry, no og image. To publish one: move its HTML into guides/ and guides_es/, its entries into
guides.json / guides_es.json, and remove the slug from UNRELEASED."""
import json, os
from pathlib import Path
S = Path(__file__).resolve().parent
UNRELEASED = set()   # e.g. {"some-guide-slug"}
DRAFTS = os.environ.get("YW_PREVIEW_DRAFTS")   # e.g. /workspace/hunt-guides/drafts (local preview only)

def load():
    en = json.loads((S / "guides/guides.json").read_text()); es = json.loads((S / "guides_es/guides_es.json").read_text())
    if DRAFTS:
        d = Path(DRAFTS)
        en += [g for g in json.loads((d / "guides.json").read_text()) if g["slug"] in UNRELEASED]
        es.update({k: v for k, v in json.loads((d / "guides_es.json").read_text()).items() if k in UNRELEASED})
    return [g for g in en if g["slug"] not in UNRELEASED or DRAFTS], es

def src(slug, lang):
    if slug in UNRELEASED:
        if not DRAFTS: raise RuntimeError(f"{slug} is UNRELEASED; set YW_PREVIEW_DRAFTS for a local preview build")
        return Path(DRAFTS) / lang / f"{slug}.html"
    return S / ("guides" if lang == "en" else "guides_es") / f"{slug}.html"
