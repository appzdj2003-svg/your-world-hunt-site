// Run: node _src/tests/ask.test.js — Ask Hawk routing + sourced answers.
const assert = require("assert"); global.window = global;
require("../../assets/askdata.js"); global.HawkParse = require("../../assets/hawkparse.js"); const A = require("../../assets/ask.js");
const Q = [["Do I need a duck stamp?", "Do I need a Federal Duck Stamp?"], ["can I hunt on a national wildlife refuge", "Can I hunt on a National Wildlife Refuge?"],
  ["how far is an ethical shot?", "How far is an ethical shot?"], ["tree stand harness tips?", "How do I stay safe in a tree stand?"], ["does barometric pressure matter for deer?", "Does barometric pressure affect deer movement?"]];
for (const [q, want] of Q) { assert.strictEqual(A.kind(q), "question", q); assert.strictEqual(A.best(q)[0].q, want, q); }
for (const q of ["I want to duck hunt in north dakota, Oct 15-25, 2 of us, cabin camping", "Elk rifle hunt in Bozeman, Montana Oct 20-25", "turkey hunt next Friday"]) assert.strictEqual(A.kind(q), "trip", q);
assert.match(A.answerHtml("what is the meaning of life?"), /doesn't have a sourced answer/);
for (const x of window.YW_ASK) { assert.ok(/^(https:\/\/www\.fws\.gov\/|guides\/[a-z0-9-]+\.html$)/.test(x.u), x.u); if (!x.u.startsWith("http")) assert.ok(require("fs").existsSync(__dirname + "/../../" + x.u), x.u); }
console.log("ask: " + (Q.length + 5) + " checks passed, " + window.YW_ASK.length + " sourced answers");
