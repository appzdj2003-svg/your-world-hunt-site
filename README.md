# Your World Hunt — website

Static content site for the Android app **Your World Hunt AI** (`com.yourworld.hunt`), served free by GitHub Pages:
**https://appzdj2003-svg.github.io/your-world-hunt-site/**

- Home, Features, 8 Field School guides, Gear Shop (12 departments + compare-stores buttons), 9 gear lists,
  Deals & Compare, About, Contact, Privacy, Affiliate disclosure, Terms, 404, `sitemap.xml`, `robots.txt`.
- All hero art is inline SVG drawn from the app's own `TripTheme.kt` palettes (no stock photos). Screenshots are the app's own.

## Edit / rebuild
Source lives in `_src/` (Jekyll ignores `_` folders, so it isn't published). After editing:

```
python3 _src/build.py          # rebuild all pages + refresh the Slickdeals deals snapshot
python3 _src/build.py --no-deals
```
Then commit and push; Pages redeploys in a minute or two.

## Affiliate IDs — ONE file
`assets/affiliates.js` holds every ID (Amazon tag `yourworldapps-20` is live; AvantLink Bass Pro / Cabela's /
Sportsman's, Duluth, Walmart, Academy, Booking.com, Expedia, Vrbo, Hipcamp, Recreation.gov are empty placeholders).
Fill one in, push, and every matching link is tagged site-wide (browser rewrites links on load; the next build also bakes
it into the static HTML). Disclosure text appears on every shop page and in the footer.

**Amazon PA-API (live prices)** is OFF. It needs 3 qualifying sales first, and its keys must never be in this public repo.
See the documented hook (`window.ywPaapi`) in `assets/affiliates.js`: a small server-side proxy + `amazonPaapi.enabled`.

## Deals feed
Slickdeals' RSS has no CORS headers, so browsers can't read it directly. The page tries live first, then uses
`assets/deals.json` (snapshot written by the build; shown only if < 72 h old), then falls back to the stores' own
sale pages. Re-run the build to refresh the snapshot. (A scheduled GitHub Action could automate this, but pushing
workflow files needs a token with the `workflow` scope.)

## Custom domain later (CNAME-ready, not active)
To serve this at `yourworldapps.si` or a subdomain such as `hunt.yourworldapps.si`:
1. At the domain's DNS host:
   - subdomain: add a `CNAME` record `hunt` → `appzdj2003-svg.github.io`
   - apex `yourworldapps.si`: add `A` records 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
     (and optionally AAAA 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153)
2. Repo → Settings → Pages → Custom domain → enter the domain (this creates a `CNAME` file), wait for DNS, tick **Enforce HTTPS**.
3. In `_src/build.py` change `SITE = "https://hunt.yourworldapps.si/"` and rebuild so canonical URLs, Open Graph,
   JSON-LD, `sitemap.xml`, `robots.txt` and the 404 page point at the new domain. Update the AvantLink/Impact/CJ profile URLs.
Note: `robots.txt` only takes effect at a domain root, i.e. once a custom domain is used.
