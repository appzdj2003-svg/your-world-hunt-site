/* Hawk Quick Plan: rule-based (no AI, no server) parser that turns one sentence into Trip Planner fields.
   parse(text, todayISO?) -> {loc, name, state, sd, d, t, sp[], m, party, lt, budget, understood[], missing[]} */
(function (root) {
  const DAY = 864e5, MON = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, a: 1, an: 1, couple: 2 };
  const DOW = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const STATES = { AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming" };
  // first match sets the hunt type; every match adds a species
  const GAME = [
    [/\bmule ?deer\b/, "WESTERN", "Mule deer"], [/\belk\b/, "WESTERN", "Elk"], [/\b(pronghorn|antelope)\b/, "WESTERN", "Pronghorn"],
    [/\bmoose\b/, "CANADA", "Moose"], [/\bcaribou\b/, "CANADA", "Caribou"],
    [/\b(whitetails?|deer|bucks?|rut)\b/, "LOCAL", "Whitetail"],
    [/\b(turkeys?|gobblers?)\b/, "TURKEY", "Turkey"],
    [/\b(ducks?|waterfowl|mallards?|teal)\b/, "WATERFOWL", "Duck"], [/\b(geese|goose)\b/, "WATERFOWL", "Canada goose"],
    [/\b(hogs?|pigs?|boars?|feral swine)\b/, "LOCAL", "Hog"], [/\bbears?\b/, "LOCAL", "Bear"],
    [/\b(pheasants?|ringnecks?|roosters?|quail|grouse|chukars?|partridges?|huns|upland)\b/, "CUSTOM", "Pheasant"],
    [/\bdoves?\b/, "CUSTOM", "Dove"], [/\b(coyotes?|predators?)\b/, "CUSTOM", "Coyote"], [/\bsquirrels?\b/, "LOCAL", "Squirrel"],
    [/\b(safari|kudu|impala|plains game)\b/, "SAFARI", "Kudu"], [/\b(red stag|stag|roe deer)\b/, "EUROPE", "Red stag"],
  ];
  const METHOD = [[/\bcross ?bows?\b/, "CROSSBOW"], [/\b(muzzle ?loaders?|black ?powder|smoke ?pole)\b/, "MUZZLELOADER"], [/\bshot ?guns?\b/, "SHOTGUN"],
    [/\b(bows?|archery|compound|recurve|longbow)\b/, "BOW"], [/\b(rifles?|guns?|firearms?|centerfire)\b/, "RIFLE"]];
  const LODGE = [[/\b(rv|camper|travel trailer)\b/, "RV_PARKS"], [/\bcabins?\b/, "CABINS"], [/\b(hotels?|motels?)\b/, "HOTELS"],
    [/\b(lodges?|outfitters?|guided)\b/, "HUNTING_LODGES"], [/\b(airbnb|vrbo|rental)\b/, "RENTALS"], [/\b(camping|camp out|tents?|campsites?|campground)\b/, "CAMPSITES"]];
  const iso = ms => new Date(ms).toISOString().slice(0, 10), U = (y, m, d) => Date.UTC(y, m, d, 12);
  const num = w => (w = String(w).toLowerCase().replace(/^a couple$/, "couple"), /^\d+$/.test(w) ? +w : NUM[w]);

  function dates(s, t0) {
    const y0 = new Date(t0).getUTCFullYear(), dow0 = new Date(t0).getUTCDay();
    const fut = (m, d) => { let ms = U(y0, m, d); if (ms < t0 - 2 * DAY) ms = U(y0 + 1, m, d); return ms; };
    const mon = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
    let r, m;
    if ((m = s.match(new RegExp(`\\b${mon}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*(?:-|–|to|thru|through|until)\\s*(?:${mon}\\s+)?(\\d{1,2})(?:st|nd|rd|th)?)?\\b`)))) {
      const a = fut(MON.indexOf(m[1]), +m[2]), ya = new Date(a).getUTCFullYear(); let b = a;
      if (m[4]) { const mb = m[3] ? MON.indexOf(m[3]) : new Date(a).getUTCMonth(); b = U(ya, mb, +m[4]); if (b < a) b = U(ya + 1, mb, +m[4]); }
      r = [a, b];
    } else if ((m = s.match(/\b(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?(?:\s*(?:-|–|to|through)\s*(?:(\d{1,2})\/)?(\d{1,2})(?:\/\d{2,4})?)?/))) {
      const a = fut(+m[1] - 1, +m[2]); let b = a; if (m[4]) b = U(new Date(a).getUTCFullYear(), (m[3] ? +m[3] : +m[1]) - 1, +m[4]); r = [a, b < a ? a : b];
    } else if ((m = s.match(/\b(this|next)\s+weekend\b/))) {
      const sat = t0 + ((6 - dow0 + 7) % 7) * DAY + (m[1] === "next" ? 7 * DAY : 0); r = [sat, sat + DAY];
    } else if ((m = s.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/))) {
      const a = t0 + ((DOW.indexOf(m[1]) - dow0 + 7) % 7 || 7) * DAY; r = [a, a];   // the coming <day> ("next Friday" too)
    } else if (/\btomorrow\b/.test(s)) r = [t0 + DAY, t0 + DAY];
    else if (/\btoday\b/.test(s)) r = [t0, t0];
    else if (/\bnext\s+week\b/.test(s)) { const m1 = t0 + ((8 - dow0) % 7 || 7) * DAY; r = [m1, m1 + 2 * DAY]; }
    const dm = s.match(/\b(\d+|two|three|four|five|six|seven|ten)[ -]days?\b/) || s.match(/\bfor\s+(a|one|two)\s+weeks?\b/);
    if (dm && r && r[0] === r[1]) r[1] = r[0] + ((/week/.test(dm[0]) ? 7 * num(dm[1]) : num(dm[1])) - 1) * DAY;
    if (!r) return null;
    return { sd: iso(r[0]), d: Math.max(1, Math.min(30, Math.round((r[1] - r[0]) / DAY) + 1)) };
  }
  const WHO = "(?:buddies|buddy|friends?|guys|others|hunters|brothers?|sons?|kids?|people|pals)";
  function party(s) {
    let m;
    if (/\b(solo|alone|by myself|just me)\b/.test(s)) return 1;
    if ((m = s.match(/\b(\d+|two|three|four|five|six|seven|eight|nine|ten)\s+of\s+us\b/))) return num(m[1]);
    if ((m = s.match(new RegExp(`\\b(?:me|i)\\s+and\\s+(\\d+|a couple|a|one|two|three|four|five|six|couple)\\s+(?:of\\s+)?(?:my\\s+)?${WHO}\\b`)))) return 1 + num(m[1]);
    if ((m = s.match(new RegExp(`\\bwith\\s+(\\d+|a couple|a|one|two|three|four|five|six|couple)\\s+(?:of\\s+)?(?:my\\s+)?${WHO}\\b`)))) return 1 + num(m[1]);
    if ((m = s.match(/\b(\d+|two|three|four|five|six|seven|eight)\s+(?:hunters|people|guys)\b/))) return num(m[1]);
    if (/\b(me and my|with my)\s+(son|dad|father|brother|wife|husband|buddy|friend|daughter|uncle|partner)\b/.test(s)) return 2;
    return null;
  }
  const STOP = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*$|\d|^(this|next|weekend|tomorrow|today|with|camping|for|on|from|and|me|staying|in|the)$|\$/i;
  function place(raw) {
    const m = raw.match(/\b(?:near|in|around|outside(?: of)?|at|by|close to)\s+([A-Z][^.;]*)/);
    if (!m) return null;
    const out = [];
    for (const seg of m[1].split(",").map(x => x.trim())) {
      const w = seg.split(/\s+/), keep = [];
      for (let i = 0; i < w.length; i++) { const x = w[i]; if (/^(the|of)$/.test(x) && keep.length && /^[A-Z]/.test(w[i + 1] || "")) { keep.push(x); continue; } if (STOP.test(x) || !/^[A-Z][\w'.-]*$/.test(x)) break; keep.push(x); }
      if (!keep.length) break; out.push(keep.join(" ")); if (keep.length < w.length || out.length >= 2) break;
    }
    if (!out.length) return null;
    const last = out[out.length - 1]; let state = null;
    if (out.length > 1) state = STATES[last.toUpperCase()] || (Object.values(STATES).includes(last) ? last : null);
    return { loc: out.join(", "), name: out[0], state };
  }
  function parse(text, today) {
    const raw = String(text || "").trim(), s = raw.toLowerCase();
    const t0 = today ? Date.parse(today + "T12:00:00Z") : (d => U(d.getFullYear(), d.getMonth(), d.getDate()))(new Date());
    const r = { sp: [], understood: [], missing: [] };
    let p = place(raw);
    if (!p || (!p.state && !STATES[p.name.toUpperCase()] && !Object.values(STATES).includes(p.name))) {   // a bare state name anywhere ("North Dakota, duck hunting")
      const nm = Object.values(STATES).sort((a, b) => b.length - a.length).find(n => new RegExp(`\\b${n}\\b`, "i").test(raw));
      if (nm) p = p ? Object.assign(p, { state: nm, loc: p.loc + ", " + nm }) : { loc: nm, name: nm, state: nm };
    } else if (!p.state) { const n = STATES[p.name.toUpperCase()] || p.name; if (Object.values(STATES).includes(n)) p.state = n; }
    if (p) { Object.assign(r, p); r.st = Object.keys(STATES).find(k => STATES[k] === r.state) || null; }
    const dt = dates(s, t0); if (dt) Object.assign(r, dt);
    for (const [re, t, sp] of GAME) if (re.test(s)) { r.t = r.t || t; if (!r.sp.includes(sp)) r.sp.push(sp); }
    if (r.sp.includes("Mule deer")) r.sp = r.sp.filter(x => x !== "Whitetail");
    for (const [re, m] of METHOD) if (re.test(s)) { r.m = m; break; }
    for (const [re, l] of LODGE) if (re.test(s)) { r.lt = l; break; }
    const pa = party(s); if (pa) r.party = Math.min(21, pa);
    const b = s.match(/\$\s?(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/) || s.match(/\bbudget(?: of| is)?\s+(\d[\d,]*)\s*(k)?\b/);
    if (b) r.budget = parseFloat(b[1].replace(/,/g, "")) * (b[2] ? 1000 : 1);
    ["loc", "sd", "t"].forEach(k => (r[k] == null ? r.missing : r.understood).push(k));
    ["m", "party", "lt", "budget"].forEach(k => { if (r[k] != null) r.understood.push(k); });
    return r;
  }
  const api = { parse, STATES };
  if (typeof module !== "undefined") module.exports = api; else root.HawkParse = api;
})(this);
