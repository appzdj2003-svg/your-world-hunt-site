/* /trip landing: open the trip in the Android app, else show a summary card + Get the app. */
(function () {
  const $ = id => document.getElementById(id), T = window.YWTrip;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const nice = s => new Date(Date.parse(s + "T12:00:00Z")).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  document.addEventListener("DOMContentLoaded", async () => {
    const tok = location.hash.slice(1); $("play").href = T.PLAY;
    if (!tok) { $("sum").innerHTML = '<div class="empty">🧭 No trip in this link. <a href="plan.html">Plan a trip →</a></div>'; return; }
    let t;
    try { t = await T.decode(tok); } catch (e) { $("sum").innerHTML = '<div class="empty">⚠️ This trip link looks incomplete or damaged. Ask for the link again, or <a href="plan.html">plan a new trip</a>.</div>'; return; }
    const android = /Android/i.test(navigator.userAgent), intent = T.intentUrl(tok);
    if (android) { $("openapp").href = intent; $("openapp").hidden = false; setTimeout(() => { location.href = intent; }, 400); }
    const B = window.YW_BUDGET || {}, L = window.YW_LODGING || {}, M = window.YW_METHODS || {}, TY = window.YW_TYPES || {}, x = TY[t.t] || { emoji: "🧭", title: t.t };
    const end = new Date(Date.parse(t.sd + "T12:00:00Z") + (t.d - 1) * 864e5).toISOString().slice(0, 10);
    const fact = (ic, k, v) => v ? `<div class="fact"><span class="ic">${ic}</span><span><small>${k}</small>${v}</span></div>` : "";
    const total = (t.bu || []).reduce((a, l) => a + l[2], 0), packed = (t.g || []).filter(g => g[2]).length;
    $("sum").innerHTML = `<div class="tc-head"><span class="tc-emoji">${x.emoji}</span><div><p class="wz-k">${esc(x.title)}</p><h2>${esc(t.n || "Expedition")}</h2>
      <p class="dim">${nice(t.sd)} → ${nice(end)} · ${t.d} day${t.d > 1 ? "s" : ""}</p></div></div><div class="facts">` +
      fact("📍", "Where", esc(t.loc || "") + (t.la != null ? `<br><span class="dim">${t.la}, ${t.lo}</span>` : "")) + fact("🦌", "Species", esc((t.sp || []).join(", "))) +
      fact("🎯", "Method", esc(M[t.m] || "")) + fact("👥", "Crew", (t.cr || []).length ? esc(["You"].concat(t.cr).join(", ")) : "") + fact("🏕️", "Lodging", esc(L[t.lt] || "")) +
      fact("💵", "Budget (their estimates)", total ? `$${(Math.round(total * 100) / 100).toLocaleString()}<br><span class="dim">${(t.bu || []).map(l => esc(B[l[0]] || l[1]) + " $" + l[2]).join(" · ")}</span>` : "") + `</div>` +
      (t.no ? `<div class="tc-notes"><small>Notes</small><p>${esc(t.no).replace(/\n/g, "<br>")}</p></div>` : "") +
      (t.g && t.g.length ? `<details class="tc-gear"><summary>🎒 Gear checklist · ${packed}/${t.g.length} packed</summary><ul>${t.g.map(g => `<li class="${g[2] ? "on" : ""}">${g[2] ? "✓" : "○"} ${esc(g[0])}</li>`).join("")}</ul></details>` : "");
  });
})();
