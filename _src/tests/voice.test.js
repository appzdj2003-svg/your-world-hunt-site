// Run: node _src/tests/voice.test.js — voice.js with a fake SpeechRecognition and a tiny DOM stub.
const assert = require("assert"), fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../../assets/voice.js"), "utf8");
function setup(SR, ua = "Mozilla/5.0 (Linux; Android 14) Chrome/129") {
  global.navigator = { userAgent: ua };
  const els = {}, made = [];
  const mk = (id, tag = "INPUT") => els[id] = { id, tagName: tag, value: "", clicks: 0, focused: 0, click() { this.clicks++; }, focus() { this.focused++; } };
  const input = mk("qtext"), go = mk("qgo", "BUTTON");
  const btn = { dataset: { voiceFor: "qtext", voiceSubmit: "qgo" }, cls: new Set(), attrs: {}, h: null,
    classList: { add: c => btn.cls.add(c), remove: c => btn.cls.delete(c) }, setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(_, f) { this.h = f; }, closest: () => ({ insertAdjacentElement: (_, n) => { els[n.id] = n; } }), parentNode: null };
  global.window = SR ? { SpeechRecognition: SR } : {};
  global.document = { documentElement: { lang: "en" }, getElementById: id => els[id], querySelectorAll: () => [btn],
    createElement: () => { const n = { setAttribute() {} }; made.push(n); return n; } };
  eval(src); return { btn, input, go, els };
}
let last; class FakeSR { constructor() { last = this; } start() { this.started = true; } stop() { this.onend(); } }
// supported: interim then final -> field updates, listening class, auto-submit
let t = setup(FakeSR); t.btn.h();
assert.ok(last.started && last.lang === "en-US" && last.interimResults); assert.ok(t.btn.cls.has("listening"));
last.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: "duck hunt in north dakota" }], { isFinal: false })] });
assert.strictEqual(t.input.value, "duck hunt in north dakota"); assert.strictEqual(t.go.clicks, 0);
last.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: "duck hunt in North Dakota this Saturday" }], { isFinal: true })] });
last.onend(); assert.strictEqual(t.input.value, "duck hunt in North Dakota this Saturday"); assert.strictEqual(t.go.clicks, 1); assert.ok(!t.btn.cls.has("listening"));
// permission denied -> message, no submit
t = setup(FakeSR); t.btn.h(); last.onerror({ error: "not-allowed" }); last.onend();
assert.match(t.els["qtext-vmsg"].textContent, /blocked/); assert.strictEqual(t.go.clicks, 0);
// unsupported -> graceful message, button still present
t = setup(null); t.btn.h(); assert.strictEqual(t.els["qtext-vmsg"].textContent, "Voice input isn't supported in this browser. In a Tesla, tap the box, then press the steering-wheel mic and speak; otherwise type your trip.");
// Tesla: hint + focus, no recognizer started (supported, unsupported, and both Tesla UA strings)
const TH = "In a Tesla, tap the box, then press the steering-wheel mic and speak.";
for (const ua of ["Mozilla/5.0 (X11; GNU/Linux) AppleWebKit/537.36 Chrome/109 Safari/537.36 Tesla/2024.20", "Mozilla/5.0 (X11; Linux) QtCarBrowser Safari/537.36"])
  for (const S of [FakeSR, null]) { last = null; t = setup(S, ua); t.btn.h();
    assert.strictEqual(t.els["qtext-vmsg"].textContent, TH); assert.strictEqual(t.input.focused, 1); assert.strictEqual(last, null); assert.ok(!t.btn.cls.has("listening")); }
// non-Tesla unchanged: recognizer starts, unsupported message unchanged
last = null; t = setup(FakeSR, "Mozilla/5.0 (Windows NT 10.0) Chrome/129"); t.btn.h(); assert.ok(last && last.started); assert.strictEqual(t.input.focused, 0);
t = setup(null, "Mozilla/5.0 (iPhone) Safari/605"); t.btn.h(); assert.strictEqual(t.els["qtext-vmsg"].textContent, "Voice input isn't supported in this browser. In a Tesla, tap the box, then press the steering-wheel mic and speak; otherwise type your trip.");
console.log("All voice input tests passed");
