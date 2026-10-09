/* Your World Hunt — ONE place for every affiliate ID on this site.
 *
 * Fill in an ID below (inside the quotes), commit, and every matching link on the site is tagged:
 *   - in the browser right away (this script rewrites links on page load), and
 *   - in the static HTML the next time `python3 _src/build.py` runs (the build reads this same block).
 * Empty "" = plain, untagged retailer search link. Keep the JSON between the CONFIG markers valid.
 * Mirrors the app's AffiliateConfig.kt (same retailers, same AvantLink deep-link format).
 */
/*CONFIG*/
window.YW_AFF = {
  "amazonTag": "yourworldapps-20",
  "avantlinkWebsiteId": "",
  "avantlinkMerchant": { "basspro": "", "cabelas": "", "sportsmans": "" },
  "duluthParams": "",
  "walmartParams": "",
  "academyParams": "",
  "bookingAid": "",
  "expediaParams": "",
  "vrboParams": "",
  "hipcampParams": "",
  "recgovParams": "",
  "amazonPaapi": { "enabled": false, "proxyUrl": "" }
}
/*END*/;

(function () {
  var A = window.YW_AFF, e = encodeURIComponent;
  function raw(u, p) { p = (p || "").trim().replace(/^[?&]/, ""); return p ? u + (u.indexOf("?") < 0 ? "?" : "&") + p : u; }
  function avant(u, m) { var w = (A.avantlinkWebsiteId || "").trim(); m = (m || "").trim();
    return w && m ? "https://www.avantlink.com/click.php?tt=cl&mi=" + e(m) + "&pw=" + e(w) + "&url=" + e(u) : u; }
  var R = {
    amazon: function (q) { var u = "https://www.amazon.com/s?k=" + e(q); return A.amazonTag ? u + "&tag=" + e(A.amazonTag) : u; },
    basspro: function (q) { return avant("https://www.basspro.com/SearchDisplay#q=" + e(q), A.avantlinkMerchant.basspro); },
    cabelas: function (q) { return avant("https://www.cabelas.com/SearchDisplay#q=" + e(q), A.avantlinkMerchant.cabelas); },
    sportsmans: function (q) { return avant("https://www.sportsmans.com/search?q=" + e(q), A.avantlinkMerchant.sportsmans); },
    duluth: function (q) { return raw("https://www.duluthtrading.com/search?q=" + e(q), A.duluthParams); },
    walmart: function (q) { return raw("https://www.walmart.com/search?q=" + e(q), A.walmartParams); },
    academy: function (q) { return raw("https://www.academy.com/search?searchTerm=" + e(q), A.academyParams); },
    booking: function (q, d) { var u = "https://www.booking.com/searchresults.html?ss=" + e(q);
      if (d && d.in) u += "&checkin=" + d.in + "&checkout=" + d.out; if (d && d.n) u += "&group_adults=" + d.n;
      return A.bookingAid ? u + "&aid=" + e(A.bookingAid) : u; },
    expedia: function (q, d) { var u = "https://www.expedia.com/Hotel-Search?destination=" + e(q);
      if (d && d.in) u += "&startDate=" + d.in + "&endDate=" + d.out; if (d && d.n) u += "&adults=" + d.n; return raw(u, A.expediaParams); },
    vrbo: function (q, d) { var u = "https://www.vrbo.com/search?destination=" + e(q);
      if (d && d.in) u += "&startDate=" + d.in + "&endDate=" + d.out; if (d && d.n) u += "&adults=" + d.n; return raw(u, A.vrboParams); },
    hipcamp: function (q) { return raw("https://www.hipcamp.com/en-US/search?q=" + e(q), A.hipcampParams); },
    recgov: function (q) { return raw("https://www.recreation.gov/search?q=" + e(q), A.recgovParams); }
  };
  /* ---- Amazon PA-API hook (OFF) -------------------------------------------------------------
   * Amazon's Product Advertising API (live prices/images) unlocks only after the Associates account
   * has 3 qualifying sales, and its secret keys must NEVER be put in this public site. When eligible:
   *   1. run a tiny server-side proxy (e.g. a free Cloudflare Worker) that signs PA-API SearchItems
   *      requests with the keys and returns JSON [{asin,title,url,price,image}] for ?q=<query>;
   *   2. set amazonPaapi.enabled = true and amazonPaapi.proxyUrl = "https://<worker>/search".
   * Cards with data-paapi="<query>" then show Amazon's own current price + "Price from Amazon, as of
   * <time>; may change" (Amazon's required wording). Until then nothing is fetched and no price shows.
   */
  window.ywPaapi = function (q) {
    var P = A.amazonPaapi || {};
    if (!P.enabled || !P.proxyUrl) return Promise.resolve(null);
    return fetch(P.proxyUrl + "?q=" + e(q)).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  };
  window.ywLink = function (r, q, d) { return R[r] ? R[r](q, d) : "#"; };
  function retag(root) {
    (root || document).querySelectorAll("a[data-r][data-q]").forEach(function (a) { a.href = window.ywLink(a.dataset.r, a.dataset.q); });
  }
  document.addEventListener("DOMContentLoaded", function () {
    retag();
    document.querySelectorAll("form.shop-search").forEach(function (f) {
      f.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var q = (f.k.value || "").trim() || "hunting gear";
        if (!/hunt|deer|elk|turkey|duck|goose|bow|archery/i.test(q) && f.dataset.hint !== "off") q += " hunting";
        window.open(window.ywLink(f.r ? f.r.value : "amazon", q), "_blank", "noopener");
      });
    });
    document.querySelectorAll("form.lodging-finder").forEach(function (f) {
      function upd() {
        var q = (f.where.value || "").trim(), d = { in: f.checkin.value, out: f.checkout.value, n: f.adults.value };
        if (!d.in || !d.out) d = { n: d.n };
        f.querySelectorAll("a[data-l]").forEach(function (a) {
          a.href = q ? window.ywLink(a.dataset.l, q, d) : a.dataset.home;
        });
      }
      f.addEventListener("input", upd); f.addEventListener("submit", function (ev) { ev.preventDefault(); upd(); }); upd();
    });
  });
})();
