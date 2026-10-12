/* Your World Hunt web trip link codec, v1. Spec: your-world-ai-hunt/docs/web-trip-link.md
   JSON (compact keys) -> UTF-8 -> deflate-raw (RFC 1951) -> base64url (no padding) -> "v1.<data>" */
(function (root) {
  const TYPES = ["LOCAL","WESTERN","CANADA","EUROPE","SAFARI","WATERFOWL","TURKEY","CUSTOM"];
  const METHODS = ["RIFLE","SHOTGUN","BOW","CROSSBOW","MUZZLELOADER","OTHER"];
  const LODGING = ["CAMPSITES","HOTELS","CABINS","RV_PARKS","RENTALS","HUNTING_LODGES","MILITARY"];
  const BUDGET = ["TAGS","TRAVEL","LODGING","DAY_RATES","TROPHY_FEES","MEAT","TAXIDERMY","SHIPPING","TIPS","OTHER"];
  const MAX_DAYS = 30;
  function b64u(bytes) { let s = ""; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return (typeof btoa === "function" ? btoa(s) : Buffer.from(s, "binary").toString("base64")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function unb64u(str) { str = str.replace(/-/g, "+").replace(/_/g, "/"); while (str.length % 4) str += "=";
    const s = typeof atob === "function" ? atob(str) : Buffer.from(str, "base64").toString("binary");
    const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
  async function pipe(bytes, Stream) { const r = new Blob([bytes]).stream().pipeThrough(new Stream("deflate-raw"));
    return new Uint8Array(await new Response(r).arrayBuffer()); }
  /** Drop empty values so links stay short. */
  function clean(t) { const o = {}; for (const k in t) { const v = t[k];
    if (v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length)) continue; o[k] = v; } return o; }
  function validate(t) {
    if (!t || t.v !== 1) throw new Error("Unsupported trip version");
    if (!TYPES.includes(t.t)) t.t = "CUSTOM";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.sd || "")) throw new Error("Missing start date");
    t.d = Math.min(MAX_DAYS, Math.max(1, parseInt(t.d, 10) || 1));
    if (t.m && !METHODS.includes(t.m)) t.m = "OTHER";
    if (t.lt && !LODGING.includes(t.lt)) delete t.lt;
    if (t.bu) t.bu = t.bu.filter(l => BUDGET.includes(l[0]));
    return t;
  }
  async function encode(trip) { const json = JSON.stringify(clean(validate(Object.assign({}, trip))));
    return "v1." + b64u(await pipe(new TextEncoder().encode(json), CompressionStream)); }
  async function decode(token) {
    token = String(token || "").replace(/^#/, "").trim();
    if (!token.startsWith("v1.")) throw new Error("Not a v1 trip link");
    const bytes = await pipe(unb64u(token.slice(3)), DecompressionStream);
    return validate(JSON.parse(new TextDecoder().decode(bytes)));
  }
  const api = { encode, decode, TYPES, METHODS, LODGING, BUDGET, MAX_DAYS,
    WEB: "https://hunt.yourworldapps.si/trip", PKG: "com.yourworld.hunt",
    PLAY: "https://play.google.com/store/apps/details?id=com.yourworld.hunt&referrer=" + encodeURIComponent("utm_source=web_planner&utm_medium=trip_link&utm_campaign=send_to_phone") };
  api.webUrl = tok => api.WEB + "#" + tok;
  api.intentUrl = tok => "intent://trip#" + tok + "#Intent;scheme=ywhunt;package=" + api.PKG + ";S.browser_fallback_url=" + encodeURIComponent(api.PLAY) + ";end";
  if (typeof module !== "undefined") module.exports = api; else root.YWTrip = api;
})(this);
