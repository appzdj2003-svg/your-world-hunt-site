/* Plan an Expedition (web). Mirrors the app's Plan a Hunt Trip model; see tripcodec.js. */
(function () {
  const $ = id => document.getElementById(id), T = window.YWTrip, KITS = window.YW_KITS || {}, TYPEINFO = window.YW_TYPES || {};
  const LS = "ywhunt.webTrip.v1";
  let geo = null, gear = [];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const amz = q => "https://www.amazon.com/s?k=" + encodeURIComponent(q) + "&s=review-rank&tag=yourworldapps-20";

  function fillSelect(el, list, labels) { el.innerHTML = list.map(v => `<option value="${v}">${esc(labels[v] || v)}</option>`).join(""); }
  function speciesChips() {
    const info = TYPEINFO[$("t").value] || { sp: [] }, cur = new Set(readSpecies());
    $("spchips").innerHTML = info.sp.map(s => `<label class="chip"><input type="checkbox" value="${esc(s)}"${cur.has(s) ? " checked" : ""}> ${esc(s)}</label>`).join("");
  }
  function readSpecies() {
    const a = [...document.querySelectorAll("#spchips input:checked")].map(i => i.value);
    $("spx").value.split(",").map(s => s.trim()).filter(Boolean).forEach(s => a.includes(s) || a.push(s));
    return a;
  }
  function loadKit(keepChecked) {
    const kit = KITS[$("t").value] || KITS.CUSTOM || [], was = new Map(gear.map(g => [g[0], g[2]]));
    const custom = gear.filter(g => g[3]);
    gear = kit.map(([label, cat, q]) => [label, cat, keepChecked && was.get(label) ? 1 : 0, 0, q]).concat(custom);
    renderGear();
  }
  function renderGear() {
    $("gearlist").innerHTML = gear.map((g, i) => `<li><label><input type="checkbox" data-i="${i}"${g[2] ? " checked" : ""}> <b>${esc(g[0])}</b> <span class="dim">${esc(g[1])}</span></label>` +
      (g[4] ? ` <a class="amzlink" href="${esc(amz(g[4]))}" target="_blank" rel="sponsored nofollow noopener">Amazon →</a>` : "") + `</li>`).join("");
  }
  function budgetRows(lines) {
    $("budget").innerHTML = T.BUDGET.map(c => { const l = (lines || []).find(x => x[0] === c);
      return `<label>${esc(window.YW_BUDGET[c])}<input type="number" min="0" step="1" inputmode="decimal" data-c="${c}" value="${l ? l[2] : ""}" placeholder="0"></label>`; }).join("");
  }
  function collect() {
    const bu = [...document.querySelectorAll("#budget input")].filter(i => +i.value > 0).map(i => [i.dataset.c, window.YW_BUDGET[i.dataset.c], Math.round(+i.value * 100) / 100]);
    const t = { v: 1, src: "web", n: $("n").value.trim() || ((TYPEINFO[$("t").value] || {}).title || "Expedition"), t: $("t").value, sp: readSpecies(),
      loc: $("loc").value.trim(), sd: $("sd").value, d: +$("d").value || 1, m: $("m").value || null,
      cr: $("cr").value.split(",").map(s => s.trim()).filter(Boolean).slice(0, 20), lt: $("lt").value || null, bu,
      g: gear.map(g => [g[0], g[1], g[2] ? 1 : 0]), no: $("no").value.trim().slice(0, 1500) };
    if (geo && geo.label === t.loc) { t.la = +geo.lat.toFixed(5); t.lo = +geo.lon.toFixed(5); }
    return t;
  }
  function apply(t) {
    $("n").value = t.n || ""; $("t").value = t.t; speciesChips();
    const known = new Set((TYPEINFO[t.t] || { sp: [] }).sp);
    document.querySelectorAll("#spchips input").forEach(i => i.checked = (t.sp || []).includes(i.value));
    $("spx").value = (t.sp || []).filter(s => !known.has(s)).join(", ");
    $("loc").value = t.loc || ""; geo = t.la != null ? { label: t.loc, lat: t.la, lon: t.lo } : null; showGeo();
    $("sd").value = t.sd; $("d").value = t.d; $("m").value = t.m || ""; $("cr").value = (t.cr || []).join(", "); $("lt").value = t.lt || "";
    budgetRows(t.bu); $("no").value = t.no || "";
    const kit = KITS[t.t] || [], q = new Map(kit.map(k => [k[0], k[2]]));
    gear = (t.g || []).map(g => [g[0], g[1], g[2], q.has(g[0]) ? 0 : 1, q.get(g[0])]); if (!gear.length) loadKit(false); else renderGear();
  }
  function showGeo() { $("geoinfo").textContent = geo ? `📍 ${geo.label} (${geo.lat.toFixed(4)}, ${geo.lon.toFixed(4)})` : "No coordinates yet. Search a place to score best days."; }
  async function search() {
    const q = $("loc").value.trim(); if (q.length < 2) return;
    $("georesults").innerHTML = "<li class=dim>Searching…</li>";
    try {
      const r = await fetch("https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=" + encodeURIComponent(q)).then(r => r.json());
      const res = r.results || [];
      $("georesults").innerHTML = res.length ? res.map((x, i) => `<li><button type="button" class="btn" data-i="${i}">${esc([x.name, x.admin1, x.country].filter(Boolean).join(", "))}</button></li>`).join("") : "<li class=dim>No matches. Try a nearby town.</li>";
      $("georesults").onclick = e => { const b = e.target.closest("button"); if (!b) return; const x = res[+b.dataset.i];
        geo = { label: [x.name, x.admin1, x.country].filter(Boolean).join(", "), lat: x.latitude, lon: x.longitude }; $("loc").value = geo.label; $("georesults").innerHTML = ""; showGeo(); save(); };
    } catch (e) { $("georesults").innerHTML = "<li class=dim>Place search is unavailable right now. You can still type a place name.</li>"; }
  }

  /* ---- Best days (estimate). Same point scale as the app's TripLogic; the app also adds solunar feeding-window alignment, which the web does not. ---- */
  function moon(dateStr) {
    const ms = Date.parse(dateStr + "T12:00:00Z"), syn = 29.530588853, age = (((ms - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % syn + syn) % syn;
    const ph = age / syn, illum = Math.round((1 - Math.cos(2 * Math.PI * ph)) / 2 * 100), near = Math.min(ph, Math.abs(ph - 0.5), 1 - ph);
    const fav = (near <= 0.08 || illum <= 12 || illum >= 88) ? "Good" : (near <= 0.16 || illum <= 28 || illum >= 72) ? "Fair" : "Poor";
    const name = ph < 0.03 || ph > 0.97 ? "New moon" : ph < 0.22 ? "Waxing crescent" : ph < 0.28 ? "First quarter" : ph < 0.47 ? "Waxing gibbous" : ph < 0.53 ? "Full moon" : ph < 0.72 ? "Waning gibbous" : ph < 0.78 ? "Last quarter" : "Waning crescent";
    return { fav, illum, name, pts: { Good: 40, Fair: 26, Poor: 12 }[fav] };
  }
  const windPts = k => k < 5 ? 9 : k <= 20 ? 15 : k <= 32 ? 9 : 2, presPts = t => ({ RISING: 15, STEADY: 10, FALLING: 7 }[t]), rainPts = p => p <= 40 ? 10 : p <= 70 ? 5 : 0;
  const stars = s => s >= 85 ? 5 : s >= 70 ? 4 : s >= 50 ? 3 : s >= 30 ? 2 : 1;
  async function bestDays() {
    const t = collect(), out = $("days");
    if (!t.sd) { out.innerHTML = "<p class=dim>Pick a start date first.</p>"; return; }
    let fc = {};
    if (geo) try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&hourly=pressure_msl&timezone=auto&forecast_days=16`;
      const r = await fetch(u).then(r => r.json());
      (r.daily.time || []).forEach((d, i) => fc[d] = { tmax: r.daily.temperature_2m_max[i], tmin: r.daily.temperature_2m_min[i], rain: r.daily.precipitation_probability_max[i], wind: r.daily.wind_speed_10m_max[i] });
      const ht = r.hourly.time, hp = r.hourly.pressure_msl;
      Object.keys(fc).forEach(d => { const a = hp[ht.indexOf(d + "T06:00")], b = hp[ht.indexOf(d + "T18:00")];
        if (a != null && b != null) fc[d].trend = b - a >= 1 ? "RISING" : b - a <= -1 ? "FALLING" : "STEADY"; });
    } catch (e) { fc = {}; }
    const rows = [];
    for (let i = 0; i < t.d; i++) {
      const dt = new Date(Date.parse(t.sd + "T12:00:00Z") + i * 864e5).toISOString().slice(0, 10), mo = moon(dt), f = fc[dt];
      let pts = mo.pts, max = 40; const why = [`${mo.name} (${mo.illum}% lit), moon rating ${mo.fav}`];
      if (f) {
        why.push(`Temps ${Math.round(f.tmin * 9 / 5 + 32)}–${Math.round(f.tmax * 9 / 5 + 32)}°F`);
        if (f.wind != null) { pts += windPts(f.wind); max += 15; why.push(`Max wind ${Math.round(f.wind * 0.621)} mph`); }
        if (f.trend) { pts += presPts(f.trend); max += 15; why.push(`Pressure ${f.trend.toLowerCase()} through the day`); }
        if (f.rain != null) { pts += rainPts(f.rain); max += 10; why.push(`Rain chance ${f.rain}%`); }
      } else why.push(geo ? "Beyond the 16-day forecast: moon only" : "No place picked: moon only");
      const s = Math.round(pts * 100 / max);
      rows.push(`<tr><td>Day ${i + 1}<br><span class=dim>${dt}</span></td><td class="stars">${"★".repeat(stars(s))}${"☆".repeat(5 - stars(s))}</td><td>${why.map(esc).join(" · ")}</td></tr>`);
    }
    out.innerHTML = `<div class="tblwrap"><table><thead><tr><th>Day</th><th>Estimate</th><th>Why</th></tr></thead><tbody>${rows.join("")}</tbody></table></div><p class="dim">Estimate only, from the Open-Meteo forecast (up to 16 days out) and moon phase. The app adds solunar feeding windows, so its stars can differ. Always check the latest forecast before you go.</p>`;
  }

  /* ---- Save / send ---- */
  function save() { try { localStorage.setItem(LS, JSON.stringify(collect())); } catch (e) {} }
  async function send() {
    const t = collect();
    if (!t.sd) { alert("Pick a start date first."); return; }
    save();
    let tok; try { tok = await T.encode(t); } catch (e) { alert("This browser can't build the link (needs a recent Chrome, Edge, Firefox or Safari)."); return; }
    const url = T.webUrl(tok);
    $("sendbox").hidden = false; $("tlink").value = url; $("open").href = url;
    $("tlen").textContent = url.length > 1800 ? `Long link (${url.length} characters). If the QR won't scan, uncheck some gear or shorten notes.` : `${url.length} characters`;
    try { const q = qrcode(0, "L"); q.addData(url); q.make(); $("qr").innerHTML = q.createSvgTag({ cellSize: 4, margin: 4, scalable: true }); }
    catch (e) { $("qr").innerHTML = "<p class=dim>Too much for a QR code. Use Copy link or Open on this phone instead.</p>"; }
    $("sendbox").scrollIntoView({ behavior: "smooth" });
  }

  document.addEventListener("DOMContentLoaded", () => {
    fillSelect($("t"), T.TYPES, Object.fromEntries(Object.entries(TYPEINFO).map(([k, v]) => [k, v.emoji + " " + v.title])));
    $("sd").value = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
    let saved = null; try { saved = JSON.parse(localStorage.getItem(LS) || "null"); } catch (e) {}
    if (saved && saved.v === 1) apply(saved); else { budgetRows([]); speciesChips(); loadKit(false); showGeo(); }
    $("t").onchange = () => { speciesChips(); loadKit(true); save(); };
    $("gosearch").onclick = search; $("loc").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); search(); } };
    $("gearlist").onchange = e => { const i = e.target.dataset.i; if (i != null) { gear[i][2] = e.target.checked ? 1 : 0; save(); } };
    $("addgear").onclick = () => { const v = $("newgear").value.trim(); if (v) { gear.push([v, "Custom", 1, 1, null]); $("newgear").value = ""; renderGear(); save(); } };
    $("plan").addEventListener("input", save);
    $("score").onclick = bestDays; $("send").onclick = send; $("print").onclick = () => window.print();
    $("copy").onclick = async () => { try { await navigator.clipboard.writeText($("tlink").value); $("copy").textContent = "Copied ✓"; } catch (e) { $("tlink").select(); } };
    $("reset").onclick = () => { if (confirm("Clear this plan?")) { localStorage.removeItem(LS); location.reload(); } };
  });
})();
