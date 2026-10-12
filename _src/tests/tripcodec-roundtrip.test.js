// Run: node _src/tests/tripcodec-roundtrip.test.js — app (Kotlin WebTripLink.encode, 0.1.90) -> site tripcodec.js -> back.
const assert = require("assert"), C = require("../../assets/tripcodec.js");
const APP = "v1.jVFNT8JAEP0rmzl4sZ-ECumtUkGNlERqeiAclnZYGvqV7pbGEH6Uv8E_5myJxpPxtm_ezL73Zs5wAt81QLYp-MCbBgyo6BWFLOzSoySoCCZB_PA6XyUvhGUD_gY0S2DGK55xJupaImwNKGr9T9Bl3a6uWIKq4FXGltQlsMRKsTCXqs1TZbAopPmCgz-eWN5kqmfBN13HtUbjibaU0U8jZ3RHNdP1qJkKLhEl1dePq3jxFlExbbWd57wc5LXZWXD_FK2J2nVEbSAOFhrFXEh2w4o8xUoiJZt6lrelITF0JTzDVued51hkYLhbg1JiWr9Ldst6zMVB_aIdPVmRY1giKsYVUwdkgksmFVc5hf_80JYl-Odho__Yyd_7OOo7LPXSGrqZYwClg4NSjfRtu-97a99LS9Qnu8V9J9DmV0Gzvwqa5Y-gmX0LXi5f";   // made by WebTripLinkEncode090Test (app/build/tmp/app-trip-token.txt)
(async () => {
  const t = await C.decode(APP);
  assert.strictEqual(t.src, "app"); assert.strictEqual(t.t, "WATERFOWL"); assert.strictEqual(t.m, "SHOTGUN"); assert.strictEqual(t.lt, "CABINS");
  assert.strictEqual(t.sd, "2026-10-15"); assert.strictEqual(t.d, 11); assert.deepStrictEqual(t.cr, ["Jim"]); assert.strictEqual(t.no, "Meet at the gas station ñ");
  assert.deepStrictEqual(t.ds, { n: "Audubon Wetland Management District", la: 47.578, lo: -101.2471, k: "WMD", pv: 0, u: "https://www.fws.gov/refuge/audubon-wetland-management-district" });
  assert.strictEqual(t.bu[0][2], 85.5); assert.deepStrictEqual(t.g[0], ["Waders", "Field", 1]);
  const again = await C.decode(await C.encode(t)); assert.deepStrictEqual(again, t);   // site re-encode is lossless
  console.log("tripcodec round-trip: app -> site -> site passed");
})().catch(e => { console.error(e); process.exit(1); });
