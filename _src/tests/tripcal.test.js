// Run: TZ=America/Chicago node _src/tests/tripcal.test.js — calendar link + .ics (matches app TripCalendar091Test).
process.env.TZ = process.env.TZ || "America/Chicago";
const assert = require("assert"), C = require("../../assets/tripcal.js");
const t = { n: "ND Ducks, Opener; week", sd: "2026-11-07", d: 3, loc: "Audubon WMD, ND", la: 47.578, lo: -101.2471, no: "Meet at the gas station",
  ds: { n: "Betty's Hunting Lodge", la: 46.53189, lo: -100.1239, k: "PRIV", pv: 1, u: "https://www.bettyshuntinglodge.com/" } };
const now = new Date(2026, 9, 12, 12).getTime(), loc = ms => { const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };
const f = C.fires(t, [{ k: "week" }, { k: "day" }, { k: "custom", v: 3 }, { k: "wake", v: 90 }], now);
assert.deepStrictEqual(f.slice(0, 3).map(x => loc(x.at)), ["10/31 9:00", "11/4 9:00", "11/6 9:00"]);
const sr = C.sunrise("2026-11-07", 47.578, -101.2471); const srl = new Date(sr);   // NOAA formula; Open-Meteo gives 08:11 CDT on Oct 20 vs ours 08:09, so Nov 7 ~7:37 CST
assert.ok(srl.getHours() === 7 && srl.getMinutes() >= 30 && srl.getMinutes() <= 45, "sunrise " + srl);
assert.strictEqual(f[3].at, sr - 90 * 6e4);
assert.strictEqual(C.fires(t, [{ k: "week" }], new Date(2026, 10, 5).getTime()).length, 0);   // past reminders dropped
const g = new URL(C.google(t)); assert.strictEqual(g.searchParams.get("dates"), "20261107/20261110"); assert.match(g.searchParams.get("details"), /Private land/);
assert.match(g.searchParams.get("location"), /^Betty's Hunting Lodge · 47\.57800,-101\.24710$/);
const ics = C.ics(t, [{ k: "day" }, { k: "wake", v: 90 }], now);
assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n") && ics.endsWith("END:VCALENDAR\r\n"));
assert.ok(ics.includes("DTSTART;VALUE=DATE:20261107\r\n") && ics.includes("DTEND;VALUE=DATE:20261110\r\n"));
assert.strictEqual((ics.match(/BEGIN:VALARM/g) || []).length, 2); assert.ok(ics.includes("TRIGGER;VALUE=DATE-TIME:20261106T150000Z"));
assert.ok(ics.includes("SUMMARY:ND Ducks\\, Opener\\; week"));
for (const l of ics.split("\r\n")) assert.ok(Buffer.byteLength(l) <= 75, l);
assert.strictEqual(C.fileName(t), "nd-ducks-opener-week.ics");
console.log("tripcal: all calendar tests passed");
