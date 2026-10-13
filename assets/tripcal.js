/* Add a trip to a calendar: Google Calendar link + .ics with VALARM reminders. Client-side only, nothing is sent anywhere.
   Mirrors the app's TripCalendar.kt (0.1.91): "before" reminders fire 9:00 AM local, wake-up = minutes before sunrise (5:00 AM if no place). */
(function (root) {
  const DAY = 864e5, p2 = n => String(n).padStart(2, "0");
  const ymd = s => s.replace(/-/g, "");
  const addDays = (s, n) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const localMs = (s, h, m) => { const [y, mo, d] = s.split("-").map(Number); return new Date(y, mo - 1, d, h, m || 0).getTime(); };
  const utc = ms => { const d = new Date(ms); return `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}Z`; };
  /** NOAA sunrise (UTC ms) for a date at lat/lon; null in polar day/night. */
  function sunrise(s, lat, lon) {
    const r = Math.PI / 180, [y, mo, d] = s.split("-").map(Number), N = Math.floor((Date.UTC(y, mo - 1, d) - Date.UTC(y, 0, 0)) / DAY);
    const g = 2 * Math.PI / 365 * (N - 1), eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const c = Math.cos(90.833 * r) / (Math.cos(lat * r) * Math.cos(dec)) - Math.tan(lat * r) * Math.tan(dec); if (c > 1 || c < -1) return null;
    const ha = Math.acos(c) / r; return Date.UTC(y, mo - 1, d) + (720 - 4 * (lon + ha) - eq) * 6e4;
  }
  const name = t => (t.n || "").trim() || "Hunt trip";
  function lines(t) {
    const ds = t.ds, out = [];
    if (ds && ds.pv) out.push("Private land: booking or landowner permission required before you hunt.");
    if (ds && ds.u) out.push((ds.pv ? "Website: " : "Regulations: ") + ds.u);
    if (t.la != null) out.push(`Directions: https://www.google.com/maps/dir/?api=1&destination=${(+t.la).toFixed(5)},${(+t.lo).toFixed(5)}`);
    if (t.no) out.push(t.no.trim());
    out.push("Seasons and rules: check your state wildlife agency before you go.", "Planned at hunt.yourworldapps.si");
    return out;
  }
  const where = t => [(t.ds && t.ds.n) || t.loc || "", t.la != null ? `${(+t.la).toFixed(5)},${(+t.lo).toFixed(5)}` : ""].filter(Boolean).join(" · ");
  /** reminders: [{k:"week"|"day"|"wake"|"custom", v}] -> [{at, title}] (future only) */
  function fires(t, rem, now) {
    const sd = t.sd, nm = name(t), sr = t.la != null ? sunrise(sd, +t.la, +t.lo) : null;
    return rem.map(r => r.k === "week" ? { at: localMs(addDays(sd, -7), 9), title: `${nm} is a week away` } :
      r.k === "day" ? { at: localMs(addDays(sd, -1), 9), title: `${nm} starts tomorrow` } :
      r.k === "custom" ? { at: localMs(addDays(sd, -Math.max(1, Math.min(60, r.v | 0))), 9), title: `${nm} in ${Math.max(1, r.v | 0)} day${(r.v | 0) === 1 ? "" : "s"}` } :
      { at: sr != null ? sr - (r.v || 90) * 6e4 : localMs(sd, 5), title: `Wake up: ${nm}` }).filter(f => f.at > (now || Date.now())).sort((a, b) => a.at - b.at);
  }
  function google(t) {
    const q = new URLSearchParams({ action: "TEMPLATE", text: name(t), dates: `${ymd(t.sd)}/${ymd(addDays(t.sd, t.d))}`, details: lines(t).join("\n"), location: where(t) });
    return "https://calendar.google.com/calendar/render?" + q.toString();
  }
  const esc = s => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r/g, "").replace(/\n/g, "\\n");
  function fold(l) { const out = []; let cur = "", n = 0; for (const ch of l) { const w = new TextEncoder().encode(ch).length; if (n + w > (out.length ? 74 : 75)) { out.push(cur); cur = ""; n = 0; } cur += ch; n += w; } out.push(cur); return out.join("\r\n "); }
  function ics(t, rem, now) {
    now = now || Date.now(); const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Your World Apps//Your World Hunt web//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
      `UID:web-${ymd(t.sd)}-${Math.abs([...name(t) + where(t)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7))}@hunt.yourworldapps.si`, "DTSTAMP:" + utc(now),
      "DTSTART;VALUE=DATE:" + ymd(t.sd), "DTEND;VALUE=DATE:" + ymd(addDays(t.sd, t.d)), "SUMMARY:" + esc(name(t))];
    if (where(t)) L.push("LOCATION:" + esc(where(t))); if (t.la != null) L.push(`GEO:${(+t.la).toFixed(5)};${(+t.lo).toFixed(5)}`);
    L.push("DESCRIPTION:" + esc(lines(t).join("\n")));
    for (const f of fires(t, rem, now)) L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc(f.title), "TRIGGER;VALUE=DATE-TIME:" + utc(f.at), "END:VALARM");
    L.push("END:VEVENT", "END:VCALENDAR"); return L.map(fold).join("\r\n") + "\r\n";
  }
  const fileName = t => (name(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "hunt-trip") + ".ics";
  const api = { google, ics, fires, sunrise, fileName };
  if (typeof module !== "undefined") module.exports = api; else root.YWCal = api;
})(this);
