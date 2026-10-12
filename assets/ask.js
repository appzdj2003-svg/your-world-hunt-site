/* Ask Hawk: client-side. Trip sentences go to the Trip Planner; questions get an answer from curated, sourced Q&A (askdata.js). Nothing is sent anywhere. */
(function () {
  const W = typeof window !== "undefined" ? window : global, E = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" })[c]);
  const QA = () => W.YW_ASK || [];
  const isQuestion = q => /\?\s*$|^(what|how|when|where|why|is|are|can|should|do|does|which|who)\b/i.test(String(q).trim());
  const words = s => s.toLowerCase().replace(/[^a-z0-9 -]/g, " ").split(/\s+/).filter(Boolean);
  function score(q, item) { const t = " " + q.toLowerCase() + " ", w = words(q); let n = 0;
    for (const k of item.k) n += k.includes(" ") ? (t.includes(k) ? 3 : 0) : (w.some(x => x === k || (k.length > 4 && x.startsWith(k))) ? 2 : 0);
    for (const x of words(item.q)) if (x.length > 3 && w.includes(x)) n += 1; return n; }
  function best(q) { return QA().map(x => [score(q, x), x]).filter(x => x[0] >= 2).sort((a, b) => b[0] - a[0]).map(x => x[1]); }
  /** "trip" when it reads like a hunt plan (HawkParse found a place, date or hunt type and it isn't a question), else "question". */
  function kind(q) { if (isQuestion(q)) return "question"; const P = W.HawkParse; if (!P) return "trip"; const r = P.parse(q); return (r.loc || r.sd || r.t) ? "trip" : "question"; }
  function answerHtml(q, prefix) {
    const r = best(q); prefix = prefix || "";
    if (!r.length) return `<p>Hawk doesn't have a sourced answer for that yet. Try the <a href="${prefix}guides/">hunting guides</a>, or describe a hunt (like “duck hunt in North Dakota Oct 15-25, cabin”) and Hawk will plan it.</p>`;
    const a = r[0], ext = /^https?:/.test(a.u), href = ext ? a.u : prefix + a.u;
    return `<p>${a.a}</p><p class="dim fine">Source: <a href="${E(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${E(a.t)}</a></p>` +
      (r.length > 1 ? `<div class="chips">${r.slice(1, 3).map(x => `<button type="button" class="chipbtn asksug">${E(x.q)}</button>`).join("")}</div>` : "");
  }
  const api = { isQuestion, best, kind, answerHtml, score };
  if (typeof module !== "undefined") module.exports = api; W.YWAsk = api;
  if (typeof document === "undefined") return;
  const log = document.getElementById("asklog"); if (!log) return;   // library mode on plan.html
  const add = (cls, html) => { const d = document.createElement("div"); d.className = "msg " + cls; d.innerHTML = html; log.appendChild(d); d.scrollIntoView({ block: "nearest", behavior: "smooth" }); };
  function ask(q) { q = q.trim(); if (!q) return; add("me", `<p>${E(q)}</p>`);
    if (kind(q) === "trip") return add("bot", `<b>🦅 Hawk</b><p>Sounds like a hunt. Hawk will fill in the Trip Planner so you can check it and send it to your phone.</p><a class="btn primary" href="plan.html?q=${encodeURIComponent(q)}">Open the Trip Planner →</a>`);
    add("bot", `<b>🦅 Hawk</b>${answerHtml(q)}`); }
  document.getElementById("askf").onsubmit = e => { e.preventDefault(); ask(document.getElementById("askq").value); document.getElementById("askq").value = ""; };
  document.addEventListener("click", e => { if (e.target.classList.contains("asksug")) ask(e.target.textContent); });
  const q0 = new URLSearchParams(location.search).get("q"); if (q0) ask(q0.slice(0, 300));
})();
