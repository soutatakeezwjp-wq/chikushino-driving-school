const assert = require("node:assert/strict");
const master = require("../data/price-master.js");
const jsonMaster = require("../data/price-master.json");

assert.deepEqual(master, jsonMaster, "price-master.js と price-master.json が一致しません。");

const { standardCar, semiMedium, motorcycle } = master.catalog;

function checkRows(label, rows, expected) {
  assert.equal(rows.length, expected.length, `${label}: 行数`);
  const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
  for (const [id, skillHours, academicHours, prices] of expected) {
    const row = byId[id];
    assert.ok(row, `${label}: ${id} がありません。`);
    assert.equal(row.skillHours, skillHours, `${label}/${id}: 技能時限`);
    assert.equal(row.academicHours, academicHours, `${label}/${id}: 学科時限`);
    assert.deepEqual([
      row.prices.day.student,
      row.prices.day.general,
      row.prices.free.student,
      row.prices.free.general
    ], prices, `${label}/${id}: 料金`);
  }
}

function checkAmounts(label, rows, expected) {
  assert.equal(rows.length, Object.keys(expected).length, `${label}: 項目数`);
  const byId = Object.fromEntries(rows.map((row) => [row.id, row.amount]));
  for (const [id, amount] of Object.entries(expected)) {
    assert.equal(byId[id], amount, `${label}/${id}`);
  }
}

checkRows("普通車", standardCar.mainFeeRows, [
  ["standard-at-none", 31, 26, [322850, 327850, 344850, 349850]],
  ["standard-at-moped", 31, 26, [319550, 324550, 341550, 346550]],
  ["standard-at-motorcycle", 29, 2, [249150, 254150, 271150, 276150]],
  ["standard-mt-transition-at-graduation-certificate", 4, 0, [36300, 36300, 36300, 36300]]
]);
checkRows("普通車限定解除", standardCar.licenseChangeRows, [
  ["standard-mt-license-change-from-at", 4, null, [62150, 67150, 67650, 72650]]
]);
checkAmounts("普通車内訳", standardCar.feeBreakdown, {
  enrollment: 52300,
  "skill-lesson": 6050,
  "academic-stage-1": 22000,
  "academic-stage-2": 35200,
  textbook: 3300,
  "aptitude-test": 3300,
  "effect-measurement": 3300,
  expressway: 1100,
  "completion-exam": 5500,
  "graduation-exam": 6600,
  "moped-lesson": 3300,
  "id-photo": 1100,
  "certificate-issuance": 3300,
  "free-plan": 22000
});
checkAmounts("普通車その他費用", standardCar.otherFees, {
  "extension-lesson": 6050,
  "completion-reexam": 5500,
  "graduation-reexam": 6600,
  "certificate-reissue": 3300,
  "provisional-retest": 1800,
  "skill-lesson-no-show": 5000,
  "skill-test-no-show": 5000
});
checkAmounts("普通車限定解除内訳", standardCar.licenseChangeFeeBreakdown, {
  enrollment: 28650,
  "skill-lesson": 6050,
  "aptitude-test": 3300,
  "id-photo": 1100,
  "graduation-exam": 6600,
  "certificate-issuance": 3300,
  "free-plan": 5500
});
checkAmounts("普通車限定解除その他費用", standardCar.licenseChangeOtherFees, {
  "extension-lesson": 6050,
  "graduation-reexam": 6600,
  "certificate-reissue": 3300,
  "skill-lesson-no-show": 5000,
  "skill-test-no-show": 5000
});

checkRows("準中型車", semiMedium.mainFeeRows, [
  ["semi-medium-mt-none", 41, 27, [401280, 406280, 423280, 428280]],
  ["semi-medium-mt-moped", 41, 27, [397980, 402980, 419980, 424980]],
  ["semi-medium-mt-motorcycle", 39, 3, [326920, 331920, 348920, 353920]],
  ["semi-medium-mt-at-ordinary-car", 17, 1, [177760, 182760, 188760, 193760]],
  ["semi-medium-mt-mt-ordinary-car", 13, 1, [152240, 157240, 163240, 168240]]
]);
checkRows("準中型車限定解除", semiMedium.licenseChangeRows, [
  ["semi-medium-from-at-5t-limited", 8, null, [95480, 100480, 100980, 105980]],
  ["semi-medium-from-mt-5t-limited", 4, null, [69960, 74960, 75460, 80460]]
]);
checkAmounts("準中型車内訳", semiMedium.feeBreakdown, {
  enrollment: 54500,
  "skill-lesson": 6380,
  "academic-stage-1": 22000,
  "academic-stage-2": 37400,
  "aptitude-test": 3300,
  textbook: 3300,
  "effect-measurement": 3300,
  expressway: 1100,
  "completion-exam": 5500,
  "graduation-exam": 6600,
  "moped-lesson": 3300,
  "id-photo": 1100,
  "certificate-issuance": 3300,
  "free-plan": 22000
});
checkAmounts("準中型車その他費用", semiMedium.otherFees, {
  "extension-lesson": 6380,
  "completion-reexam": 5500,
  "graduation-reexam": 6600,
  "certificate-reissue": 3300,
  "provisional-retest": 1800,
  "skill-lesson-no-show": 5000,
  "skill-test-no-show": 5000
});
checkAmounts("準中型車限定解除内訳", semiMedium.licenseChangeFeeBreakdown, {
  enrollment: 35140,
  "skill-lesson": 6380,
  "aptitude-test": 3300,
  "id-photo": 1100,
  "graduation-exam": 6600,
  "certificate-issuance": 3300,
  "free-plan": 5500
});
checkAmounts("準中型車限定解除その他費用", semiMedium.licenseChangeOtherFees, {
  "extension-lesson": 6380,
  "graduation-reexam": 6600,
  "certificate-reissue": 3300,
  "skill-lesson-no-show": 5000,
  "skill-test-no-show": 5000
});

checkRows("自動二輪車", motorcycle.mainFeeRows, [
  ["large-mt-from-ordinary-car", 31, 1, [206910, 211910, 228910, 233910]],
  ["large-mt-from-at-small-motorcycle", 24, null, [169290, 174290, 180290, 185290]],
  ["large-mt-from-mt-small-motorcycle", 20, null, [149050, 154050, 160050, 165050]],
  ["large-mt-from-at-standard-motorcycle", 16, null, [128810, 133810, 139810, 144810]],
  ["large-mt-from-mt-standard-motorcycle", 12, null, [108570, 113570, 119570, 124570]],
  ["standard-motorcycle-mt-none-or-moped", 19, 26, [181390, 186390, 192390, 197390]],
  ["standard-motorcycle-mt-from-ordinary-car", 17, 1, [113520, 118520, 124520, 129520]],
  ["standard-motorcycle-at-none-or-moped", 15, 26, [163350, 168350, 174350, 179350]],
  ["standard-motorcycle-at-from-ordinary-car", 13, 1, [95480, 100480, 106480, 111480]],
  ["small-motorcycle-mt-none-or-moped", 12, 26, [159720, 164720, 170720, 175720]],
  ["small-motorcycle-mt-from-ordinary-car", 10, 1, [91850, 96850, 102850, 107850]],
  ["small-motorcycle-at-none-or-moped", 9, 26, [146190, 151190, 151690, 156690]],
  ["small-motorcycle-at-from-ordinary-car", 8, 1, [82830, 87830, 88330, 93330]]
]);
checkRows("自動二輪車限定解除", motorcycle.licenseChangeRows, [
  ["standard-motorcycle-mt-from-at-small", 8, null, [74030, 79030, 79530, 84530]],
  ["standard-motorcycle-mt-from-mt-small", 5, null, [60500, 65500, 66000, 71000]],
  ["standard-motorcycle-mt-from-at-standard", 5, null, [60500, 65500, 66000, 71000]],
  ["standard-motorcycle-at-from-at-small", 5, null, [60500, 65500, 66000, 71000]],
  ["standard-motorcycle-at-from-mt-small", 3, null, [51480, 56480, 56980, 61980]],
  ["small-motorcycle-mt-from-at-small", 4, null, [55990, 60990, 61490, 66490]]
]);
checkAmounts("自動二輪車内訳", motorcycle.feeBreakdown, {
  enrollment: 38000,
  "large-skill-lesson": 5060,
  "standard-skill-lesson": 4510,
  "academic-stage-1": 22000,
  "academic-stage-2": 35200,
  "textbook-no-license-or-moped": 3300,
  "textbook-license-holder": 1100,
  "aptitude-test": 3300,
  "effect-measurement": 1650,
  "graduation-exam": 6050,
  "id-photo": 1100,
  "certificate-issuance": 3300,
  "free-plan": 22000
});
checkAmounts("自動二輪車その他費用", motorcycle.otherFees, {
  "large-extension-lesson": 5060,
  "standard-extension-lesson": 4510,
  "graduation-reexam": 6050,
  "certificate-reissue": 3300,
  "skill-lesson-no-show": 5000,
  "skill-test-no-show": 5000
});
checkAmounts("自動二輪車限定解除内訳", motorcycle.licenseChangeFeeBreakdown, {
  enrollment: 29200,
  "skill-lesson": 4510,
  "aptitude-test": 3300,
  "graduation-exam": 6050,
  "id-photo": 1100,
  "certificate-issuance": 3300,
  "free-plan": 5500
});
checkAmounts("自動二輪車限定解除その他費用", motorcycle.licenseChangeOtherFees, {
  "extension-lesson": 4510,
  "graduation-reexam": 6050,
  "certificate-reissue": 3300,
  "skill-lesson-no-show": 5000,
  "skill-test-no-show": 5000
});

assert.deepEqual(standardCar.notices, [
  "高速教習は原則、実車で行います。",
  "医師・看護師等の資格をお持ちの方は窓口へお申し出ください。学科教習が3時限免除になります。（免なし・原付持の方）",
  "当校を卒業された方は卒業生割引がございます。",
  "割引や特典の併用はできない場合がございます。",
  "途中退校（転校）の場合は当校規定により残金の精算をいたします。",
  "教習時間は時期等により変更になる場合がございます。",
  "予告なく教習料金を改定する場合がございます。"
]);
assert.deepEqual(semiMedium.notices, standardCar.notices);
assert.deepEqual(motorcycle.notices, standardCar.notices.slice(1));

console.log("公式料金PDFとの照合: 料金31行・内訳97項目・注意事項20項目、差異0件");
