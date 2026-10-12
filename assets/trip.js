/* /trip landing: open the trip in the Android app, else show a summary + Get the app. */
(function () {
  const $ = id => document.getElementById(id), T = window.YWTrip;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  document.addEventListener("DOMContentLoaded", async () => {
    const tok = location.hash.slice(1);
    $("play").href = T.PLAY;
    if (!tok) { $("sum").innerHTML = '<p>No trip in this link. <a href="plan.html">Plan an expedition →</a></p>'; return; }
    let t;
    try { t = await T.decode(tok); } catch (e) { $("sum").innerHTML = '<p>This trip link looks incomplete or damaged. Ask for the link again, or <a href="plan.html">plan a new one</a>.</p>'; return; }
    const intent = T.intentUrl(tok), android = /Android/i.test(navigator.userAgent);
    $("openapp").href = android ? intent : "ywhunt://trip#" + tok;
    $("openwrap").hidden = !android;
    if (android) setTimeout(() => { location.href = intent; }, 400);
    const B = window.YW_BUDGET || {}, L = window.YW_LODGING || {}, M = window.YW_METHODS || {}, TY = window.YW_TYPES || {};
    const end = new Date(Date.parse(t.sd + "T12:00:00Z") + (t.d - 1) * 864e5).toISOString().slice(0, 10);
    const row = (k, v) => v ? `<tr><th>${k}</th><td>${v}</td></tr>` : "";
    const total = (t.bu || []).reduce((a, l) => a + l[2], 0);
    $("sum").innerHTML = `<h2>${esc(t.n || "Expedition")}</h2><div class="tblwrap"><table><tbody>` +
      row("Type", TY[t.t] ? esc(TY[t.t].emoji + " " + TY[t.t].title) : esc(t.t)) +
      row("Where", esc(t.loc || "") + (t.la != null ? ` <span class=dim>(${t.la}, ${t.lo})</span>` : "")) +
      row("Dates", `${t.sd} → ${end} (${t.d} day${t.d > 1 ? "s" : ""})`) + row("Species", esc((t.sp || []).join(", "))) +
      row("Method", esc(M[t.m] || "")) + row("Crew", esc((t.cr || []).join(", "))) + row("Lodging", esc(L[t.lt] || "")) +
      row("Budget (your estimates)", (t.bu || []).map(l => `${esc(B[l[0]] || l[1])}: $${l[2]}`).join("<br>") + (total ? `<br><b>Total: $${Math.round(total * 100) / 100}</b>` : "")) +
      row("Notes", esc(t.no || "").replace(/\n/g, "<br>")) + `</tbody></table></div>` +
      (t.g && t.g.length ? `<h3>Gear checklist</h3><ul class="gearsum">${t.g.map(g => `<li>${g[2] ? "☑" : "☐"} ${esc(g[0])}</li>`).join("")}</ul>` : "");
  });
})();
