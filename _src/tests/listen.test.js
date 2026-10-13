// Listen (TTS) tests: text extraction + sentence chunking + voice choice. Run: node _src/tests/listen.test.js
const L = require("../../assets/listen.js"); let n = 0;
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } n++; };
// Minimal fake DOM: el(tag, {cls, attrs}, ...children|text)
function el(tag, o, ...kids) {
  const e = { tagName: tag.toUpperCase(), cls: (o && o.cls || "").split(" ").filter(Boolean), attrs: (o && o.attrs) || {}, children: [], parentNode: null, txt: "" };
  kids.forEach(k => typeof k === "string" ? e.children.push({ text: k }) : (k.parentNode = e, e.children.push(k)));
  Object.defineProperty(e, "textContent", { get() { return e.children.map(c => c.text != null ? c.text : c.textContent).join(" "); } });
  e.matches = sel => sel.split(",").some(s => { s = s.trim();
    if (s.startsWith(".")) return e.cls.includes(s.slice(1));
    const a = s.match(/^\[([\w-]+)(?:=(\w+))?\]$/); if (a) return a[1] in e.attrs && (a[2] == null || e.attrs[a[1]] === a[2]);
    return e.tagName === s.toUpperCase(); });
  e.querySelectorAll = sel => { const out = []; (function walk(x) { x.children.forEach(c => { if (c.tagName) { if (c.matches(sel)) out.push(c); walk(c); } }); })(e); return out; };
  return e;
}
const root = el("article", null,
  el("nav", { cls: "crumbs" }, el("p", null, "Home / Guides")),
  el("h2", null, "Read the wind"),
  el("p", null, "Deer use their nose first. Hunt with the wind in your face."),
  el("div", { cls: "card" }, el("p", null, "Buy this scent spray today")),
  el("aside", { cls: "dealband" }, el("p", null, "Deal of the day")),
  el("ul", null, el("li", null, "Check the forecast.", el("p", null, "nested")), el("li", null, el("button", null, "Tap me")), el("li", null, "Mind thermals.")),
  el("p", null, el("code", null, "x=1")),
  el("pre", null, el("p", null, "code block")),
  el("p", { cls: "btn" }, "Get the app"),
  el("div", { attrs: { "data-nolisten": "" } }, el("p", null, "hidden")),
  el("h3", null, "Done?"));
const got = L.extract(root).map(x => x.text);
ok(got[0] === "Read the wind.", "heading gets a pause period: " + got[0]);
ok(got.includes("Deer use their nose first. Hunt with the wind in your face."), "paragraph read");
ok(got.some(t => t.startsWith("Check the forecast.")), "list item read");
ok(!got.includes("nested"), "nested p not read twice");
ok(got.includes("Mind thermals."), "second li read");
ok(!got.some(t => /Home|scent spray|Deal of|Tap me|x=1|code block|Get the app|hidden/.test(t)), "skips nav/cards/deals/buttons/code/.btn/data-nolisten: " + JSON.stringify(got));
ok(got[got.length - 1] === "Done?", "heading with punctuation kept");
// chunking
ok(L.chunk("").length === 0, "empty");
ok(JSON.stringify(L.chunk("One. Two! Three?")) === '["One. Two! Three?"]', "short sentences merge");
const long = Array.from({ length: 30 }, (_, i) => "Sentence number " + i + " is here.").join(" ");
const ch = L.chunk(long, 180);
ok(ch.length > 3 && ch.every(c => c.length <= 180), "chunks <= 180");
ok(ch.join(" ") === long, "chunks keep every word in order");
ok(ch.every(c => /[.]$/.test(c)), "chunks end on sentence boundaries");
const run = "word, ".repeat(100).trim();
const rc = L.chunk(run, 120); ok(rc.every(c => c.length <= 120) && rc.join(" ").replace(/\s+/g, " ") === run, "long sentence split at commas/spaces");
const noSpace = "x".repeat(500); ok(L.chunk(noSpace, 180).every(c => c.length <= 180) && L.chunk(noSpace, 180).join("") === noSpace, "hard split");
ok(L.chunk("Use a 6.5 Creedmoor at 200 yd. Done.").join(" ").includes("6.5"), "decimals survive");
// voices
const V = (name, lang, d) => ({ name, lang, default: !!d });
const vs = [V("Fred", "en-GB", 1), V("Samantha", "en-US"), V("Google US English", "en-US"), V("Paulina", "es-MX"), V("Mónica", "es-ES"), V("Google español de Estados Unidos", "es-US")];
ok(L.pickVoice(vs, "en").name === "Google US English", "en natural en-US");
ok(L.pickVoice(vs, "es").lang === "es-US", "es prefers es-US");
ok(L.pickVoice(vs.filter(v => v.lang !== "es-US"), "es").lang === "es-MX", "then es-MX");
ok(L.pickVoice([V("Mónica", "es-ES")], "es").lang === "es-ES", "then es-ES");
ok(L.pickVoice([V("Fred", "en-GB")], "en").name === "Fred", "any en fallback");
ok(L.pickVoice([], "en") === null, "no voices");
ok(/Nothing is sent from this site/.test(L.EN.note) && /no envía nada/.test(L.ES.note), "honest copy");
console.log("listen: " + n + " checks passed");
