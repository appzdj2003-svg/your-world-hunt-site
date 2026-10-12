// Run: node _src/tests/hawkparse.test.js   (today pinned to Mon 2026-10-12)
const { parse } = require("../../assets/hawkparse.js"), assert = require("assert"), T = "2026-10-12";
const cases = [
 ["Whitetail bow hunt near Andrews, SC, Nov 8-10, 3 of us, camping", { loc: "Andrews, SC", state: "South Carolina", sd: "2026-11-08", d: 3, t: "LOCAL", sp: ["Whitetail"], m: "BOW", party: 3, lt: "CAMPSITES" }],
 ["Elk rifle hunt in Bozeman, Montana Oct 20 to Oct 25 with 2 buddies, cabin, $1500", { loc: "Bozeman, Montana", state: "Montana", sd: "2026-10-20", d: 6, t: "WESTERN", m: "RIFLE", party: 3, lt: "CABINS", budget: 1500 }],
 ["Duck hunt this weekend near Stuttgart, AR with my son", { loc: "Stuttgart, AR", sd: "2026-10-17", d: 2, t: "WATERFOWL", sp: ["Duck"], party: 2 }],
 ["turkey hunt next Friday, shotgun, solo", { sd: "2026-10-16", d: 1, t: "TURKEY", m: "SHOTGUN", party: 1, missing: ["loc"] }],
 ["Hog hunt in Texas 11/14-11/16, 4 hunters, motel", { loc: "Texas", sd: "2026-11-14", d: 3, t: "LOCAL", sp: ["Hog"], party: 4, lt: "HOTELS" }],
 ["Dove shoot near Lubbock, TX on Saturday, me and 2 friends", { loc: "Lubbock, TX", sd: "2026-10-17", t: "CUSTOM", sp: ["Dove"], party: 3 }],
 ["muzzleloader buck hunt Dec 1 - Dec 3 in Ohio, budget 800", { loc: "Ohio", sd: "2026-12-01", d: 3, m: "MUZZLELOADER", t: "LOCAL", budget: 800 }],
 ["Archery elk in Colorado September 5th through 12th, RV", { loc: "Colorado", sd: "2027-09-05", d: 8, m: "BOW", t: "WESTERN", lt: "RV_PARKS" }],
 ["crossbow deer hunt tomorrow", { sd: "2026-10-13", m: "CROSSBOW", t: "LOCAL", missing: ["loc"] }],
 ["Goose hunt near Easton, MD Nov 28 - Dec 2 with a guide, lodge", { loc: "Easton, MD", sd: "2026-11-28", d: 5, t: "WATERFOWL", sp: ["Canada goose"], lt: "HUNTING_LODGES" }],
 ["Mule deer hunt in Wyoming next weekend for 3 days, tent", { loc: "Wyoming", sd: "2026-10-24", d: 2, t: "WESTERN", sp: ["Mule deer"], lt: "CAMPSITES" }],
 ["moose hunt around Thunder Bay, Ontario, oct 30-nov 3, 2 of us", { loc: "Thunder Bay, Ontario", sd: "2026-10-30", t: "CANADA", party: 2 }],
 ["Plains game safari, $8k", { t: "SAFARI", budget: 8000, missing: ["loc", "sd"] }],
 ["bear hunt near Ely, MN with 3 buddies on Nov 2 for 4 days", { loc: "Ely, MN", sd: "2026-11-02", d: 4, t: "LOCAL", sp: ["Bear"], party: 4 }],
 ["coyote calling Friday night by myself", { sd: "2026-10-16", t: "CUSTOM", party: 1 }],
 ["Rut hunt with gun near Macon, GA 11/7, airbnb", { loc: "Macon, GA", sd: "2026-11-07", d: 1, m: "RIFLE", t: "LOCAL", lt: "RENTALS" }],
 ["Spring gobbler hunt Apr 18-19 at Land Between the Lakes", { loc: "Land Between the Lakes", sd: "2027-04-18", d: 2, t: "TURKEY" }],
 ["going hunting", { missing: ["loc", "sd", "t"] }],
 ["teal hunt in Louisiana this weekend, me and a couple buddies, camper", { loc: "Louisiana", t: "WATERFOWL", party: 3, lt: "RV_PARKS" }],
 ["Squirrel and hog hunt next week near Ocala, FL", { loc: "Ocala, FL", sd: "2026-10-19", d: 3, t: "LOCAL", sp: ["Hog", "Squirrel"] }],
];
let pass = 0;
for (const [s, exp] of cases) {
  const r = parse(s, T);
  try { for (const k in exp) assert.deepStrictEqual(Array.isArray(exp[k]) && k === "sp" ? [...r[k]].sort() : r[k], Array.isArray(exp[k]) && k === "sp" ? [...exp[k]].sort() : exp[k], `${k}`); pass++; }
  catch (e) { console.log("FAIL:", s, "\n  field", e.message, "got", JSON.stringify(r)); }
}
console.log(`${pass}/${cases.length} passed`); process.exit(pass === cases.length ? 0 : 1);
