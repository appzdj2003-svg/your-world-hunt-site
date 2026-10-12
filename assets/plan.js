/* Trip Planner wizard (web). Data model = app's Plan a Hunt Trip; link format v1 via tripcodec.js. Vanilla JS. */
(function () {
  const $ = id => document.getElementById(id), T = window.YWTrip, KITS = window.YW_KITS || {}, TY = window.YW_TYPES || {};
  const MET = window.YW_METHODS || {}, LOD = window.YW_LODGING || {}, BUD = window.YW_BUDGET || {};
  const LS = "ywhunt.webTrip.v1", STEPS = 6, DAY = 864e5;
  const MICON = { RIFLE: "🎯", SHOTGUN: "💥", BOW: "🏹", CROSSBOW: "🏹", MUZZLELOADER: "🔥", OTHER: "🧰" };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const amz = q => "https://www.amazon.com/s?k=" + encodeURIComponent(q) + "&s=review-rank&tag=yourworldapps-20";
  const iso = ms => new Date(ms).toISOString().slice(0, 10), dms = s => Date.parse(s + "T12:00:00Z");
  const nice = s => new Date(dms(s)).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  const today = () => { const d = new Date(); return iso(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12)); };

  let st = { v: 1, src: "web", n: "", t: "LOCAL", sp: [], loc: "", la: null, lo: null, sd: iso(dms(today()) + 7 * DAY), d: 3, m: "", cr: [], lt: "", bu: {}, g: [], no: "" };
  let step = 0, scored = null, scoreKey = "";

  /* ---------- persistence ---------- */
  let saveT;
  function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(LS, JSON.stringify(Object.assign({ step }, st))); flash(); } catch (e) {} }, 250); renderSummary(); }
  function flash() { const s = $("saved"); s.textContent = "✓ Autosaved in this browser"; s.classList.add("on"); setTimeout(() => s.classList.remove("on"), 1200); }
  function load() {
    try { const o = JSON.parse(localStorage.getItem(LS) || "null"); if (!o || o.v !== 1) return;
      if (Array.isArray(o.bu)) { const m = {}; o.bu.forEach(l => m[l[0]] = l[2]); o.bu = m; }   // older saves
      if (o.g && o.g.length && o.g[0].length < 5) { const q = new Map((KITS[o.t] || []).map(k => [k[0], k[2]])); o.g = o.g.map(g => [g[0], g[1], g[2], q.has(g[0]) ? 0 : 1, q.get(g[0]) || null]); }
      if (o.g) { const im = new Map((KITS[o.t] || []).map(k => [k[0], k[3]])); o.g.forEach(g => { if (g.length < 6) g[5] = im.get(g[0]) || null; }); }
      step = Math.min(STEPS - 1, +o.step || 0); delete o.step; st = Object.assign(st, o);
    } catch (e) {}
  }
  /** Same v1 schema as before (see docs/web-trip-link.md). */
  function collect() {
    const t = { v: 1, src: "web", n: st.n.trim() || ((TY[st.t] || {}).title || "Expedition"), t: st.t, sp: st.sp, loc: st.loc.trim(), sd: st.sd, d: st.d, m: st.m || null,
      cr: st.cr.map(s => s.trim()).filter(Boolean).slice(0, 20), lt: st.lt || null,
      bu: T.BUDGET.filter(c => +st.bu[c] > 0).map(c => [c, BUD[c], Math.round(+st.bu[c] * 100) / 100]),
      g: st.g.map(g => [g[0], g[1], g[2] ? 1 : 0]), no: st.no.trim().slice(0, 1500) };
    if (st.la != null) { t.la = +(+st.la).toFixed(5); t.lo = +(+st.lo).toFixed(5); }
    if (st.ds && st.ds.la != null) t.ds = { n: st.ds.n, la: st.ds.la, lo: st.ds.lo, k: st.ds.k, pv: st.ds.pv, u: st.ds.u };   // destination pin for app directions
    return t;
  }

  /* ---------- clear (X) buttons in every text field ---------- */
  function addClear(el) {
    if (el.dataset.clr || el.readOnly || !/^(text|search|)$/.test(el.type === "textarea" ? "" : el.type || "")) return;
    el.dataset.clr = 1;
    const w = document.createElement("span"); w.className = "clr-wrap" + (el.tagName === "TEXTAREA" ? " ta" : "");
    el.parentNode.insertBefore(w, el); w.appendChild(el);
    const b = document.createElement("button"); b.type = "button"; b.className = "clr-x"; b.setAttribute("aria-label", "Clear"); b.title = "Clear"; b.innerHTML = "&times;"; w.appendChild(b);
    const sync = () => { b.hidden = !el.value; }; el.addEventListener("input", sync); sync(); el._clrSync = sync;
    b.onclick = () => {
      el.value = ""; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); sync(); el.focus();
      if (el.id === "hawkq") { hk = null; hkEdit = false; const r = $("hawkreview"); r.innerHTML = ""; r.hidden = true; hkBar(); }
      if (el.id === "loc") $("georesults").innerHTML = "";
      if (el.id === "hkloc") { const m = $("hklocmsg"); if (m) m.textContent = ""; }
    };
  }
  function clearAll(root) { (root || document).querySelectorAll("#wz input, #wz textarea, #hawk input, #hawk textarea, #hawkreview input").forEach(addClear); }
  setInterval(() => document.querySelectorAll("[data-clr]").forEach(e => e._clrSync && e._clrSync()), 600);   // values set by code
  new MutationObserver(() => clearAll()).observe(document.body, { childList: true, subtree: true });
  setTimeout(clearAll, 0);
  /* ---------- editing a Hawk chip: return to the Hawk summary ---------- */
  let hkEdit = false;
  function hkBar() {
    let b = $("hkback");
    if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "hkback"; b.className = "btn primary big hkback"; b.textContent = "✓ Save & back to Hawk";
      b.onclick = () => backToHawk(); const f = document.querySelector(".wz-foot"); f.parentNode.insertBefore(b, f); }
    b.hidden = !(hkEdit && hk);
  }
  function hkLocChanged() {   // place changed outside the sentence: spots recompute from the new pin
    if (!hk) return; hk.center = null; hk.locOk = st.la != null || !!st.loc;
    hk.r = Object.assign({}, hk.r, { name: null, st: null, state: null, loc: st.loc });
  }
  function hkClear(f) {   // X on a Hawk chip: unset that field
    const r = hk.r;
    if (f === "loc") { st.loc = ""; st.la = st.lo = null; st.ds = null; hk.locOk = false; hk.center = null; Object.assign(r, { loc: null, name: null, state: null, st: null }); $("loc").value = ""; }
    if (f === "sd") r.sd = null;
    if (f === "t") { r.t = null; r.sp = []; st.sp = []; hk.center = null; }
    if (f === "m") st.m = "";
    if (f === "party") { st.cr = []; r.party = null; }
    if (f === "lt") st.lt = "";
    if (f === "bu") { st.bu = {}; r.budget = null; }
    scored = null; refreshAll(); hawkReview();
    const q = $("hawkreview").querySelector(`[data-hkclr="${f}"]`) || $("hawkreview").querySelector(".hchip.need .hc-main"); if (q) q.focus({ preventScroll: true });
  }
  function backToHawk(placeChanged) {
    if (!hk) return; hkEdit = false;
    if (placeChanged || (hk.loc0 !== st.loc + "|" + st.la)) hkLocChanged();
    const es = hk.editStep;   // only the step that was edited fills its chip back in
    if (es === 1 && st.sd) hk.r.sd = st.sd; if (es === 2 && st.t) hk.r.t = st.t; if (es === 3 && hk.r.party === null) hk.r.party = 1 + st.cr.length;
    hawkReview(); hkBar();
    $("hawkreview").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  /* ---------- wizard ---------- */
  function go(i, focus) {
    step = Math.max(0, Math.min(STEPS - 1, i));
    document.querySelectorAll(".wz-step").forEach(s => { const on = +s.dataset.step === step; s.hidden = !on; s.classList.toggle("in", on); });
    document.querySelectorAll(".wz-dot").forEach((b, j) => { b.classList.toggle("cur", j === step); b.classList.toggle("done", j < step); b.setAttribute("aria-current", j === step ? "step" : "false"); });
    $("wzfill").style.width = ((step + 1) / STEPS * 100) + "%";
    $("back").disabled = step === 0; $("next").hidden = step === STEPS - 1;
    if (step === 5) bestDays();
    hkBar();
    if (focus) { $("h" + step).focus({ preventScroll: true }); $("wz").scrollIntoView({ behavior: "smooth", block: "start" }); }
    save();
  }

  /* ---------- step 1: where ---------- */
  function renderGeo() {
    $("geoinfo").innerHTML = st.la != null
      ? `<span class="big" aria-hidden="true">📍</span><div><b>${esc(st.loc || "My location")}</b><br><span class="dim">${(+st.la).toFixed(4)}, ${(+st.lo).toFixed(4)} · forecast ready</span></div><button type="button" class="btn link" id="clrgeo">Change</button>`
      : st.loc ? `<span class="big" aria-hidden="true">✏️</span><div><b>${esc(st.loc)}</b><br><span class="dim">No coordinates, so best days will use the moon only. Search to add the forecast.</span></div>`
      : `<span class="big" aria-hidden="true">🗺️</span><div class="dim">No place yet. You can skip this step and add it later.</div>`;
    const c = $("clrgeo"); if (c) c.onclick = () => { st.la = st.lo = null; st.ds = null; st.loc = ""; $("loc").value = ""; renderGeo(); save(); $("loc").focus(); };
  }
  async function search() {
    const q = $("loc").value.trim(); if (q.length < 2) { $("georesults").innerHTML = '<p class="dim">Type at least 2 letters.</p>'; return; }
    $("georesults").innerHTML = '<div class="skel"></div><div class="skel"></div>';
    try {
      const r = await fetch("https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=" + encodeURIComponent(q)).then(r => { if (!r.ok) throw 0; return r.json(); });
      const res = r.results || [];
      $("georesults").innerHTML = res.length ? res.map((x, i) => `<button type="button" class="result" data-i="${i}"><b>${esc(x.name)}</b><span class="dim">${esc([x.admin1, x.country].filter(Boolean).join(", "))}</span></button>`).join("")
        : '<p class="empty">🤷 No matches. Try a nearby town or a simpler name.</p>';
      $("georesults").onclick = e => { const b = e.target.closest(".result"); if (!b) return; const x = res[+b.dataset.i];
        st.loc = [x.name, x.admin1, x.country].filter(Boolean).join(", "); st.la = x.latitude; st.lo = x.longitude; $("loc").value = st.loc; $("georesults").innerHTML = ""; st.ds = null; renderGeo(); save(); if (hkEdit) backToHawk(true); };
    } catch (e) { $("georesults").innerHTML = '<p class="empty">⚠️ Place search isn\'t reachable right now. Your typed name is kept; try again later for the forecast.</p>'; }
  }
  function myLoc() {
    if (!navigator.geolocation) { $("georesults").innerHTML = '<p class="empty">Your browser can\'t share location. Search instead.</p>'; return; }
    $("georesults").innerHTML = '<p class="dim">📡 Finding you…</p>';
    navigator.geolocation.getCurrentPosition(p => { st.la = p.coords.latitude; st.lo = p.coords.longitude; if (!$("loc").value.trim()) st.loc = "My location"; else st.loc = $("loc").value.trim();
      $("georesults").innerHTML = ""; st.ds = null; renderGeo(); save(); if (hkEdit) backToHawk(true); },
      () => { $("georesults").innerHTML = '<p class="empty">Location was blocked or unavailable. Search for a place instead.</p>'; }, { timeout: 10000 });
  }

  /* ---------- step 2: when ---------- */
  function renderDates() {
    $("sd").value = st.sd; $("ed").value = iso(dms(st.sd) + (st.d - 1) * DAY); $("ed").min = st.sd; $("ed").max = iso(dms(st.sd) + 29 * DAY);
    $("dayscount").textContent = `🗓️ ${st.d} day${st.d > 1 ? "s" : ""} · ${nice(st.sd)} → ${nice($("ed").value)}`;
  }
  function setRange(sd, ed) { const d = Math.round((dms(ed) - dms(sd)) / DAY) + 1; st.sd = sd; st.d = Math.max(1, Math.min(30, d)); scored = null; renderDates(); save(); }

  /* ---------- step 3: hunt ---------- */
  function renderHunt() {
    $("types").innerHTML = T.TYPES.map(k => { const x = TY[k] || { title: k, emoji: "🧭", tag: "" };
      return `<button type="button" role="radio" aria-checked="${st.t === k}" class="tcard${st.t === k ? " on" : ""}" data-t="${k}"><span class="ico">${x.emoji}</span><b>${esc(x.title)}</b><small>${esc(x.tag)}</small></button>`; }).join("");
    const sugg = (TY[st.t] || { sp: [] }).sp, all = sugg.concat(st.sp.filter(s => !sugg.includes(s)));
    $("spchips").innerHTML = all.map(s => `<button type="button" class="chipbtn${st.sp.includes(s) ? " on" : ""}" aria-pressed="${st.sp.includes(s)}" data-s="${esc(s)}">${st.sp.includes(s) ? "✓ " : ""}${esc(s)}</button>`).join("");
    $("methods").innerHTML = T.METHODS.map(k => `<button type="button" role="radio" aria-checked="${st.m === k}" class="tcard${st.m === k ? " on" : ""}" data-m="${k}"><span class="ico">${MICON[k]}</span><b>${esc(MET[k])}</b></button>`).join("");
  }
  function setType(k) {
    st.t = k; const was = new Map(st.g.map(g => [g[0], g[2]])), custom = st.g.filter(g => g[3]);
    st.g = (KITS[k] || []).map(([l, c, q, im]) => [l, c, was.get(l) ? 1 : 0, 0, q, im]).concat(custom);
    renderHunt(); renderGear(); save();
  }

  /* ---------- step 4: crew & stay ---------- */
  function renderCrew() {
    $("party").textContent = 1 + st.cr.length; $("minus").disabled = !st.cr.length; $("plus").disabled = st.cr.length >= 20;
    $("crewnames").innerHTML = st.cr.map((n, i) => `<label class="lbl">Hunter ${i + 2}<input data-c="${i}" value="${esc(n)}" maxlength="40" placeholder="Name"></label>`).join("");
    $("lodging").innerHTML = T.LODGING.map(k => `<button type="button" class="chipbtn${st.lt === k ? " on" : ""}" aria-pressed="${st.lt === k}" data-l="${k}">${esc(LOD[k])}</button>`).join("");
    $("budget").innerHTML = T.BUDGET.map(c => `<label class="lbl">${esc(BUD[c])}<span class="money"><span>$</span><input type="number" min="0" step="1" inputmode="decimal" data-b="${c}" value="${st.bu[c] || ""}" placeholder="0"></span></label>`).join("");
    budTotal();
  }
  function budTotal() { const t = T.BUDGET.reduce((a, c) => a + (+st.bu[c] || 0), 0), p = 1 + st.cr.length;
    $("budtotal").textContent = t ? `Total $${t.toLocaleString()} · about $${Math.round(t / p).toLocaleString()} per hunter` : "Leave blank to skip."; }

  /* ---------- step 5: gear ---------- */
  function renderGear() {
    const cats = [...new Set(st.g.map(g => g[1]))];
    $("gearlist").innerHTML = cats.map(c => `<div class="kitsec"><h3>${esc(c)}</h3><div class="itemgrid">` + st.g.map((g, i) => g[1] !== c ? "" :
      `<div class="icard${g[2] ? " on" : ""}"><label><input type="checkbox" data-i="${i}"${g[2] ? " checked" : ""}><span class="ipic">${g[5] ? `<img src="assets/items/${esc(g[5])}.webp" width="400" height="400" loading="lazy" decoding="async" alt="Illustration of ${esc(g[0].toLowerCase())}">` : '<span class="noimg" aria-hidden="true">🎒</span>'}<span class="tick" aria-hidden="true">✓</span></span><span class="iname">${esc(g[0])}</span></label>` +
      (g[4] ? `<a class="amz" href="${esc(amz(g[4]))}" target="_blank" rel="sponsored nofollow noopener" aria-label="Shop ${esc(g[0])} on Amazon">Amazon ↗</a>` : "") +
      (g[3] ? `<button type="button" class="x" data-del="${i}" aria-label="Remove ${esc(g[0])}">✕</button>` : "") + `</div>`).join("") + `</div></div>`).join("") || '<p class="empty">No gear yet.</p>';
    const n = st.g.filter(g => g[2]).length; $("packed").innerHTML = `🎒 ${n} of ${st.g.length} packed <span class="meter"><span style="width:${st.g.length ? n / st.g.length * 100 : 0}%"></span></span>`;
  }

  /* ---------- step 6: best days (estimate; same point scale as app TripLogic, without solunar) ---------- */
  function moon(ds) {
    const syn = 29.530588853, age = (((dms(ds) - Date.UTC(2000, 0, 6, 18, 14)) / DAY) % syn + syn) % syn, ph = age / syn;
    const illum = Math.round((1 - Math.cos(2 * Math.PI * ph)) / 2 * 100), near = Math.min(ph, Math.abs(ph - 0.5), 1 - ph);
    const fav = (near <= 0.08 || illum <= 12 || illum >= 88) ? "Good" : (near <= 0.16 || illum <= 28 || illum >= 72) ? "Fair" : "Poor";
    const ic = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"][Math.round(ph * 8) % 8];
    const name = ph < 0.03 || ph > 0.97 ? "New moon" : ph < 0.22 ? "Waxing crescent" : ph < 0.28 ? "First quarter" : ph < 0.47 ? "Waxing gibbous" : ph < 0.53 ? "Full moon" : ph < 0.72 ? "Waning gibbous" : ph < 0.78 ? "Last quarter" : "Waning crescent";
    return { fav, illum, name, ic, pts: { Good: 40, Fair: 26, Poor: 12 }[fav] };
  }
  const windPts = k => k < 5 ? 9 : k <= 20 ? 15 : k <= 32 ? 9 : 2, presPts = t => ({ RISING: 15, STEADY: 10, FALLING: 7 }[t]), rainPts = p => p <= 40 ? 10 : p <= 70 ? 5 : 0;
  const stars = s => s >= 85 ? 5 : s >= 70 ? 4 : s >= 50 ? 3 : s >= 30 ? 2 : 1;
  const wx = c => c == null ? "" : c === 0 ? "☀️" : c <= 2 ? "🌤️" : c === 3 ? "☁️" : c <= 48 ? "🌫️" : c <= 67 ? "🌧️" : c <= 77 ? "❄️" : c <= 82 ? "🌦️" : c <= 86 ? "🌨️" : "⛈️";
  async function bestDays() {
    const key = [st.sd, st.d, st.la, st.lo].join("|"); if (scored && key === scoreKey) return;
    const out = $("days"); out.innerHTML = Array.from({ length: Math.min(st.d, 4) }, () => '<div class="day skel tall"></div>').join("");
    let fc = {}, err = false;
    if (st.la != null) try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${st.la}&longitude=${st.lo}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&hourly=pressure_msl&timezone=auto&forecast_days=16`;
      const r = await fetch(u).then(r => { if (!r.ok) throw 0; return r.json(); });
      r.daily.time.forEach((d, i) => fc[d] = { code: r.daily.weather_code[i], tmax: r.daily.temperature_2m_max[i], tmin: r.daily.temperature_2m_min[i], rain: r.daily.precipitation_probability_max[i], wind: r.daily.wind_speed_10m_max[i] });
      const ht = r.hourly.time, hp = r.hourly.pressure_msl;
      Object.keys(fc).forEach(d => { const a = hp[ht.indexOf(d + "T06:00")], b = hp[ht.indexOf(d + "T18:00")]; if (a != null && b != null) fc[d].trend = b - a >= 1 ? "RISING" : b - a <= -1 ? "FALLING" : "STEADY"; });
    } catch (e) { err = true; }
    const days = [];
    for (let i = 0; i < st.d; i++) {
      const ds = iso(dms(st.sd) + i * DAY), mo = moon(ds), f = fc[ds]; let pts = mo.pts, max = 40; const why = [`${mo.name}, ${mo.illum}% lit (moon ${mo.fav.toLowerCase()})`];
      if (f) {
        if (f.wind != null) { pts += windPts(f.wind); max += 15; why.push(`Wind up to ${Math.round(f.wind * 0.621)} mph`); }
        if (f.trend) { pts += presPts(f.trend); max += 15; why.push(`Pressure ${f.trend.toLowerCase()}`); }
        if (f.rain != null) { pts += rainPts(f.rain); max += 10; why.push(`${f.rain}% rain chance`); }
      }
      const s = Math.round(pts * 100 / max); days.push({ ds, i, s, mo, f, why, full: !!f });
    }
    const pool = days.some(d => d.full) ? days.filter(d => d.full) : days, best = pool.reduce((a, b) => b.s > a.s ? b : a, pool[0]);
    scored = days; scoreKey = key; st._best = best ? best.ds : null;
    const note = st.la == null ? '<p class="empty">🗺️ No place picked, so this uses the moon only. <button type="button" class="btn link" data-go="0">Add a place</button></p>'
      : err ? '<p class="empty">⚠️ The forecast couldn\'t load right now, so this uses the moon only. Try again later.</p>'
      : days.some(d => !d.full) ? '<p class="dim">Days beyond the 16-day forecast use the moon only.</p>' : "";
    out.innerHTML = note + '<div class="dayrow">' + days.map(d => `<article class="day${d === best ? " best" : ""}">${d === best ? '<span class="bestbadge">Best bet · estimate</span>' : ""}
      <p class="dname">Day ${d.i + 1} · ${nice(d.ds)}</p><div class="dicons"><span title="Weather">${d.f ? wx(d.f.code) : ""}</span><span title="${esc(d.mo.name)}">${d.mo.ic}</span></div>
      ${d.f ? `<p class="temp">${Math.round(d.f.tmax * 9 / 5 + 32)}° <span class="dim">/ ${Math.round(d.f.tmin * 9 / 5 + 32)}°F</span></p>` : '<p class="temp dim">No forecast yet</p>'}
      <p class="stars" aria-label="${stars(d.s)} of 5 stars, estimate">${"★".repeat(stars(d.s))}<span>${"☆".repeat(5 - stars(d.s))}</span></p><ul>${d.why.map(w => `<li>${esc(w)}</li>`).join("")}</ul></article>`).join("") + '</div>';
    renderSummary();
  }

  async function send() {
    const t = collect();
    let tok; try { tok = await T.encode(t); } catch (e) { $("sendbox").hidden = false; $("sendbox").innerHTML = '<p class="empty">⚠️ This browser can\'t build the link. Try a recent Chrome, Edge, Firefox or Safari.</p>'; return; }
    const url = T.webUrl(tok); $("sendbox").hidden = false; $("tlink").value = url; $("open").href = url;
    $("tlen").textContent = url.length > 1800 ? `Long link (${url.length} characters). If the QR won't scan, untick some gear or shorten notes.` : "";
    try { const q = qrcode(0, "L"); q.addData(url); q.make(); $("qr").innerHTML = q.createSvgTag({ cellSize: 4, margin: 4, scalable: true }); }
    catch (e) { $("qr").innerHTML = '<p class="empty">Too much for a QR code. Use Copy link instead.</p>'; }
    $("sendbox").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* ---------- summary ---------- */
  function renderSummary() {
    const x = TY[st.t] || {}, ed = iso(dms(st.sd) + (st.d - 1) * DAY), n = st.g.filter(g => g[2]).length, bt = T.BUDGET.reduce((a, c) => a + (+st.bu[c] || 0), 0);
    const row = (ic, k, v, s) => `<li><button type="button" data-go="${s}"><span class="ic">${ic}</span><span><small>${k}</small>${v || '<i class="dim">Not set</i>'}</span></button></li>`;
    $("sum").innerHTML = `<p class="sumtitle">${x.emoji || "🧭"} ${esc(st.n.trim() || x.title || "Expedition")}</p><ul class="sumlist">` +
      row("📍", "Where", esc(st.loc), 0) + row("📅", "When", `${nice(st.sd)} → ${nice(ed)} · ${st.d}d`, 1) +
      row("🎯", "Hunt", esc([x.title, st.sp.join(", "), MET[st.m]].filter(Boolean).join(" · ")), 2) +
      row("🏕️", "Crew & stay", `${1 + st.cr.length} hunter${st.cr.length ? "s" : ""}${st.lt ? " · " + esc(LOD[st.lt]) : ""}${bt ? ` · $${bt.toLocaleString()} budget` : ""}`, 3) +
      row("🎒", "Gear", `${n}/${st.g.length} packed`, 4) + row("⭐", "Best day (estimate)", st._best ? nice(st._best) : "", 5) + "</ul>";
    $("sumshort").textContent = `${st.loc ? st.loc.split(",")[0] + " · " : ""}${st.d}d · ${n}/${st.g.length} gear`;
  }


  /* ---------- Hawk Quick Plan (rule-based, see hawkparse.js) ---------- */
  let hk = null;
  async function geocode(name, state) {
    const r = await fetch("https://geocoding-api.open-meteo.com/v1/search?count=10&language=en&format=json&name=" + encodeURIComponent(name)).then(r => { if (!r.ok) throw 0; return r.json(); });
    const res = r.results || []; return (state && res.find(x => x.admin1 === state)) || (state ? null : res[0]) || null;
  }
  function refreshAll() { $("loc").value = st.loc; scored = null; renderGeo(); renderDates(); renderHunt(); renderCrew(); renderGear(); save(); }
  async function hawkRun(text) {
    text = (text || $("hawkq").value).trim(); if (!text) { $("hawkq").focus(); return; }
    const box = $("hawkreview"); box.hidden = false; box.innerHTML = '<p class="dim">🦅 Hawk is reading your trip…</p><div class="skel"></div>';
    const r = window.HawkParse.parse(text); hk = { r, locOk: false };
    if (r.t) setType(r.t);
    if (r.sp.length) st.sp = r.sp.slice();
    st.m = r.m || ""; st.lt = r.lt || "";   // a new sentence replaces the old answers
    st.cr = Array.from({ length: (r.party || 1) - 1 }, (_, i) => "Hunter " + (i + 2));
    st.bu = r.budget ? { OTHER: r.budget } : {};
    if (r.sd) { st.sd = r.sd; st.d = r.d; }
    if (r.loc) {
      st.loc = r.loc; st.la = st.lo = null; st.ds = null;
      if (!(r.st && r.name === r.state)) try { const g = await geocode(r.name, r.state) || (r.state ? null : await geocode(r.loc)); if (g) { st.loc = [g.name, g.admin1, g.country].filter(Boolean).join(", "); st.la = g.latitude; st.lo = g.longitude; hk.locOk = true; } } catch (e) { hk.geoErr = true; }
    }
    if (r.loc && !hk.locOk && r.st && r.name === r.state) {   // a state alone: use its centroid
      try { if (!SP) SP = await fetch("assets/spots.json").then(x => x.json()); const c = SP.states[r.st]; if (c) { st.loc = r.state; st.la = c[0]; st.lo = c[1]; hk.locOk = true; } } catch (e) {}
    }
    refreshAll(); hawkReview();
  }
  function hawkReview() {
    const r = hk.r, x = TY[st.t] || {}, ed = iso(dms(st.sd) + (st.d - 1) * DAY);
    const NS = '<i class="dim">Not set</i>';
    const chip = (ic, k, v, s, ok, f) => `<div class="hchip${ok ? "" : " need"}"><button type="button" class="hc-main" data-go="${s}" aria-label="Edit ${k}"><span>${ic}</span><span><small>${k}</small>${ok ? v : NS}</span><span class="ed" aria-hidden="true">✎</span></button>` +
      (ok && f ? `<button type="button" class="hc-x" data-hkclr="${f}" aria-label="Clear ${k}" title="Clear ${k}">&times;</button>` : "") + `</div>`;
    const needLoc = !hk.locOk, needDate = !r.sd, needType = !r.t;
    let ask = "";
    if (needLoc) ask += `<div class="ask"><p><b>Where's the hunt?</b> ${r.loc ? `Hawk couldn't find “${esc(r.loc)}” on the map.` : "Hawk didn't catch a place."}</p><div class="addrow"><input id="hkloc" placeholder="Town, park or area (e.g. Gunnison, CO)" value="${esc(r.loc || "")}" aria-label="Where's the hunt"><button type="button" class="btn" id="hklocgo">Find</button></div><p class="dim" id="hklocmsg"></p></div>`;
    if (needDate) ask += `<div class="ask"><p><b>When are you going?</b></p><div class="daterange"><label>First day<input type="date" id="hksd" value="${st.sd}"></label><span class="arrow">→</span><label>Last day<input type="date" id="hked" value="${ed}"></label></div></div>`;
    if (needType) ask += `<div class="ask"><p><b>What are you hunting?</b></p><div class="chips">${T.TYPES.map(k => `<button type="button" class="chipbtn" data-hkt="${k}">${(TY[k] || {}).emoji || ""} ${esc((TY[k] || {}).title || k)}</button>`).join("")}</div></div>`;
    $("hawkreview").innerHTML = `<p class="hk-said">🦅 Here's what Hawk understood. Tap any chip to change it.</p><div class="hchips">` +
      chip("📍", "Where", esc(st.loc), 0, !needLoc && !!st.loc, "loc") + chip("📅", "When", `${nice(st.sd)} → ${nice(ed)} · ${st.d}d`, 1, !needDate, "sd") +
      chip(x.emoji || "🎯", "Hunt", esc(x.title || "") + (st.sp.length ? " · " + esc(st.sp.join(", ")) : ""), 2, !needType, "t") +
      (st.m ? chip("🏹", "Method", esc(MET[st.m]), 2, true, "m") : "") + chip("👥", "Hunters", String(1 + st.cr.length), 3, r.party !== null, "party") +
      chip("🏕️", "Stay", esc(LOD[st.lt] || ""), 3, !!st.lt, "lt") + (r.budget ? chip("💵", "Budget", "$" + r.budget.toLocaleString(), 3, true, "bu") : "") + `</div>` +
      (ask ? `<div class="asks"><p class="wz-k">Hawk needs a little more</p>${ask}</div>` : "") +
      `<div id="hkspots" class="spots"></div><div class="btns"><button type="button" class="btn primary big" id="hkdone">${ask ? "Continue anyway → Best days" : "Looks good → Best days & send"}</button><button type="button" class="btn link" data-go="0">Walk through every step</button></div>`;
    const lg = $("hklocgo"); if (lg) { const f = async () => { const v = $("hkloc").value.trim(); if (!v) return; $("hklocmsg").textContent = "Searching…";
      const p = window.HawkParse.parse("in " + v.replace(/^./, c => c.toUpperCase())); let g = null;
      try { g = await geocode(p.name || v, p.state) || await geocode(v.split(",")[0]); } catch (e) {}
      if (g) { st.loc = [g.name, g.admin1, g.country].filter(Boolean).join(", "); st.la = g.latitude; st.lo = g.longitude; hk.locOk = true; st.ds = null; hkLocChanged(); refreshAll(); hawkReview(); }
      else $("hklocmsg").textContent = "Still couldn't find it. Try the nearest town."; };
      lg.onclick = f; $("hkloc").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); f(); } }; }
    const hs = $("hksd"); if (hs) { const f = () => { const a = $("hksd").value, b = $("hked").value; if (a && b && b >= a) { hk.r.sd = a; setRange(a, b); } }; hs.onchange = f; $("hked").onchange = f; }
    $("hawkreview").querySelectorAll("[data-hkt]").forEach(b => b.onclick = () => { hk.r.t = b.dataset.hkt; setType(b.dataset.hkt); hawkReview(); });
    $("hkdone").onclick = () => go(5, true);
    $("hawkreview").querySelectorAll("[data-hkclr]").forEach(b => b.onclick = () => hkClear(b.dataset.hkclr));
    renderSpots();
  }
  /* ---------- Top spots near the area (static, official-source dataset: assets/spots.json) ---------- */
  let SP = null, PL = null, spR = 50, spF = "both";
  const SPTAG = { "Duck": ["duck"], "Canada goose": ["goose"], "Whitetail": ["big", "deer"], "Mule deer": ["big", "deer"], "Elk": ["big"], "Pronghorn": ["big"], "Moose": ["big"],
    "Caribou": ["big"], "Bear": ["big"], "Hog": ["big", "hog"], "Turkey": ["turkey"], "Pheasant": ["upland"], "Dove": ["dove"], "Squirrel": ["small"], "Coyote": ["small"] };
  const TGL = { duck: "ducks", goose: "geese", big: "big game", deer: "deer", hog: "hogs", turkey: "turkey", upland: "upland birds", dove: "doves", small: "small game" };
  const KIND = { NWR: "National Wildlife Refuge", WMD: "Wetland Management District (WPAs)", NF: "National Forest", PRIV: "Private lodge / outfitter" };
  const mi = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 7917.5 * Math.asin(Math.sqrt(x)); };
  async function spotCenter() {
    const r = hk.r, ab = r.st;
    if (!SP) SP = await fetch("assets/spots.json").then(x => x.json());
    if (ab && r.name && r.name !== r.state) {
      if (!PL) PL = await fetch("assets/places.json").then(x => x.json()).catch(() => ({}));
      const c = (PL[ab] || {})[r.name]; if (c) return { la: c[0], lo: c[1], label: r.name + ", " + ab };
    }
    if (ab && r.name === r.state && SP.states[ab]) return { la: SP.states[ab][0], lo: SP.states[ab][1], label: r.state, stateOnly: ab };
    if (st.la != null) return { la: +st.la, lo: +st.lo, label: (st.loc || "").split(",")[0] };
    if (ab && SP.states[ab]) return { la: SP.states[ab][0], lo: SP.states[ab][1], label: r.state, stateOnly: ab };
    return null;
  }
  async function renderSpots() {
    const box = $("hkspots"); if (!box || !hk) return;
    let c; try { c = hk.center || (hk.center = await spotCenter()); } catch (e) { box.innerHTML = '<p class="dim">Top spots couldn\'t load. Check your connection.</p>'; return; }
    if (!c) { box.innerHTML = ""; return; }
    const want = [...new Set(st.sp.flatMap(x => SPTAG[x] || []))];
    const all = SP.spots.map(x => Object.assign({}, x, { mi: mi(c.la, c.lo, x.la, x.lo), hit: want.filter(t => x.tg.includes(t)).length }))
      .filter(x => spF === "both" || (spF === "pub" ? !x.pv : x.pv))
      .filter(x => !want.length || x.hit || x.k === "NF");
    const inR = x => x.mi <= spR || (c.stateOnly && spR >= 100 && x.s.split("/").includes(c.stateOnly));
    const list = all.filter(inR).sort((a, b) => (b.hit > 0) - (a.hit > 0) || a.mi - b.mi).slice(0, 25);
    const wider = [10, 25, 50, 100, 200].find(r => r > spR && all.some(x => x.mi <= r || (c.stateOnly && r >= 100 && x.s.split("/").includes(c.stateOnly))));
    const chips = [10, 25, 50, 100, 200].map(r => `<button type="button" class="chip${r === spR ? " on" : ""}" data-spr="${r}" aria-pressed="${r === spR}">${r} mi</button>`).join("");
    const flt = [["pub", "Public"], ["priv", "Private / guided"], ["both", "Both"]].map(([k, l]) => `<button type="button" class="chip${k === spF ? " on" : ""}" data-spf="${k}" aria-pressed="${k === spF}">${l}</button>`).join("");
    const what = want.length ? st.sp.join(", ").toLowerCase() : "hunting";
    const item = x => {
      const sel = st.ds && st.ds.n === x.n, tags = x.tg.map(t => TGL[t]).filter(Boolean);
      const dir = `https://www.google.com/maps/dir/?api=1&destination=${x.la},${x.lo}`;
      return `<li class="spot${x.pv ? " priv" : ""}${sel ? " sel" : ""}"><div class="spot-h"><b>${esc(x.n)}</b><span class="dist">${x.mi < 1 ? "<1" : Math.round(x.mi)} mi</span></div>` +
        `<p class="dim">${KIND[x.k]} · ${esc(x.s)}${x.pv ? " · " + esc(x.at) : ""}</p>` +
        (x.pv ? `<p class="privnote">🔒 Private land. Booking or permission required.</p>` : "") +
        (tags.length ? `<p class="tags">${x.pv ? "Lists" : "Refuge lists hunting for"}: ${tags.join(", ")}</p>` : x.k === "NF" ? `<p class="tags">Most National Forest land is open to hunting under state rules.</p>` : "") +
        `<div class="spot-a"><button type="button" class="btn ${sel ? "" : "primary"} sm" data-spadd="${esc(x.n)}">${sel ? "✓ In trip" : "Add to trip"}</button>` +
        `<a class="btn sm" href="${dir}" target="_blank" rel="noopener">🧭 Directions</a>` +
        `<a class="btn link sm" href="${esc(x.u)}" target="_blank" rel="noopener">${x.pv ? "Official website" : "Check regulations"} ↗</a></div></li>`;
    };
    box.innerHTML = `<div class="spots-card"><p class="wz-k">🎯 Top spots near ${esc(c.label)}</p><p class="dim">Places listed for ${esc(what)}, nearest first.</p>` +
      `<div class="chiprow" role="group" aria-label="Radius">${chips}</div><div class="chiprow" role="group" aria-label="Land type">${flt}</div>` +
      (list.length ? `<ul class="spotlist">${list.map(item).join("")}</ul>` :
        `<p class="empty">No listed spots within ${spR} miles.${wider ? ` <button type="button" class="btn link" data-spr="${wider}">Widen to ${wider} mi →</button>` : ""}</p>`) +
      `<p class="dim fine">Public spots: U.S. Fish &amp; Wildlife Service refuge hunt data and U.S. Forest Service boundaries. Private spots link to each business's own website; we don't rate or price them. ` +
      `Pins are the refuge, forest or business location, not a specific parking spot. Seasons, permits and open areas change: always check the refuge and your state wildlife agency before you go.</p></div>`;
    box.querySelectorAll("[data-spr]").forEach(b => b.onclick = () => { spR = +b.dataset.spr; renderSpots(); });
    box.querySelectorAll("[data-spf]").forEach(b => b.onclick = () => { spF = b.dataset.spf; renderSpots(); });
    box.querySelectorAll("[data-spadd]").forEach(b => b.onclick = () => {
      const x = list.find(y => y.n === b.dataset.spadd); if (!x) return;
      st.ds = { n: x.n, la: x.la, lo: x.lo, k: x.k, pv: x.pv, u: x.u }; st.loc = x.n + ", " + x.s; st.la = x.la; st.lo = x.lo; hk.locOk = true;
      scored = null; $("loc").value = st.loc; renderGeo(); save(); renderSpots();
      const chip = $("hawkreview").querySelector(".hchips"); if (chip) hawkReview();
    });
  }
  function hawkMic() {
    if (/Tesla/i.test(navigator.userAgent)) { const t = $("hawktesla"); if (t) t.hidden = false; return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
    const btn = $("hawkmic"); btn.hidden = false;
    btn.onclick = () => { const rec = new SR(); rec.lang = navigator.language || "en-US"; rec.interimResults = true; btn.classList.add("live"); btn.setAttribute("aria-label", "Listening…");
      rec.onresult = e => { $("hawkq").value = [...e.results].map(x => x[0].transcript).join(" "); };
      rec.onend = () => { btn.classList.remove("live"); btn.setAttribute("aria-label", "Speak your trip"); if ($("hawkq").value.trim()) hawkRun(); };
      rec.onerror = () => btn.classList.remove("live"); rec.start(); };
  }

  /* ---------- wire up ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    load(); if (!st.g.length) st.g = (KITS[st.t] || []).map(([l, c, q, im]) => [l, c, 0, 0, q, im]);
    $("loc").value = st.loc; $("n").value = st.n; $("no").value = st.no; $("sd").min = today();
    renderGeo(); renderDates(); renderHunt(); renderCrew(); renderGear(); go(step);
    document.addEventListener("click", e => { const g = e.target.closest("[data-go]"); if (g) { hkEdit = !!(hk && g.closest("#hawkreview .hchips")); if (hk && hkEdit) { hk.loc0 = st.loc + "|" + st.la; hk.editStep = +g.dataset.go; } go(+g.dataset.go, true); document.body.classList.remove("sheet-open"); $("sumtoggle").setAttribute("aria-expanded", "false"); } });
    $("next").onclick = () => go(step + 1, true); $("back").onclick = () => go(step - 1, true);
    $("reset").onclick = () => { if (confirm("Start over? This clears the plan saved in this browser.")) { localStorage.removeItem(LS); location.reload(); } };
    $("sumtoggle").onclick = () => { const o = document.body.classList.toggle("sheet-open"); $("sumtoggle").setAttribute("aria-expanded", String(o)); };
    $("gosearch").onclick = search; $("myloc").onclick = myLoc;
    $("loc").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); search(); } };
    $("loc").oninput = () => { if (st.la == null) { st.loc = $("loc").value; renderGeo(); save(); } };
    $("sd").onchange = () => { if ($("sd").value) setRange($("sd").value, iso(dms($("sd").value) + (st.d - 1) * DAY)); };
    $("ed").onchange = () => { if ($("ed").value && $("ed").value >= st.sd) setRange(st.sd, $("ed").value); else renderDates(); };
    $("quick").onclick = e => { const b = e.target.closest("[data-q]"); if (!b) return; const t0 = dms(today()), q = b.dataset.q;
      if (q === "wknd") { const dow = new Date(t0).getUTCDay(), sat = t0 + ((6 - dow + 7) % 7) * DAY; setRange(iso(sat), iso(sat + DAY)); }
      else if (q === "opener") setRange(iso(t0 + 14 * DAY), iso(t0 + 16 * DAY)); else setRange(iso(t0), iso(t0 + (+q - 1) * DAY)); };
    $("types").onclick = e => { const b = e.target.closest("[data-t]"); if (b) setType(b.dataset.t); };
    $("methods").onclick = e => { const b = e.target.closest("[data-m]"); if (b) { st.m = st.m === b.dataset.m ? "" : b.dataset.m; renderHunt(); save(); } };
    $("spchips").onclick = e => { const b = e.target.closest("[data-s]"); if (!b) return; const s = b.dataset.s; st.sp = st.sp.includes(s) ? st.sp.filter(x => x !== s) : st.sp.concat(s); renderHunt(); save(); };
    const addSp = () => { const v = $("spx").value.trim(); if (v && !st.sp.includes(v)) { st.sp.push(v); renderHunt(); save(); } $("spx").value = ""; };
    $("addsp").onclick = addSp; $("spx").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); addSp(); } };
    $("plus").onclick = () => { st.cr.push(""); renderCrew(); save(); const ins = $("crewnames").querySelectorAll("input"); ins[ins.length - 1].focus(); };
    $("minus").onclick = () => { st.cr.pop(); renderCrew(); save(); };
    $("crewnames").oninput = e => { const i = e.target.dataset.c; if (i != null) { st.cr[i] = e.target.value; save(); } };
    $("lodging").onclick = e => { const b = e.target.closest("[data-l]"); if (b) { st.lt = st.lt === b.dataset.l ? "" : b.dataset.l; renderCrew(); save(); } };
    $("budget").oninput = e => { const c = e.target.dataset.b; if (c) { st.bu[c] = e.target.value; budTotal(); save(); } };
    $("gearlist").onchange = e => { const i = e.target.dataset.i; if (i != null) { st.g[i][2] = e.target.checked ? 1 : 0; renderGear(); save(); } };
    $("gearlist").onclick = e => { const d = e.target.closest("[data-del]"); if (d) { st.g.splice(+d.dataset.del, 1); renderGear(); save(); } };
    const addG = () => { const v = $("newgear").value.trim(); if (v) { st.g.push([v, "Custom", 1, 1, null, null]); renderGear(); save(); } $("newgear").value = ""; };
    $("addgear").onclick = addG; $("newgear").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); addG(); } };
    $("n").oninput = () => { st.n = $("n").value; save(); }; $("no").oninput = () => { st.no = $("no").value; save(); };
    hawkMic(); $("hawkgo").onclick = () => hawkRun(); $("hawkq").onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); hawkRun(); } };
    document.querySelector(".hawk-ex").onclick = e => { const b = e.target.closest("[data-ex]"); if (b) { $("hawkq").value = b.dataset.ex; hawkRun(); } };
    $("send").onclick = send; $("print").onclick = () => window.print();
    $("copy").onclick = async () => { try { await navigator.clipboard.writeText($("tlink").value); $("copy").textContent = "Copied ✓"; setTimeout(() => $("copy").textContent = "Copy link", 1800); } catch (e) { $("tlink").select(); } };
  });
})();
