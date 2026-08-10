const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const detail = fs.readFileSync(path.join(root, "detail.html"), "utf8");
const calendarCode = fs.readFileSync(path.join(root, "assets/redesign-0718.js"), "utf8");
const calendar = JSON.parse(fs.readFileSync(path.join(root, "data/calendar-review-2026-08.json"), "utf8"));

for (const html of [index, detail]) {
  assert.match(html, />免許証交付まで</);
  assert.match(html, />施設紹介</);
  assert.match(html, />指導員紹介</);
  assert.doesNotMatch(html, />免許交付まで</);
  assert.doesNotMatch(html, />設備紹介</);
  assert.doesNotMatch(html, />教官紹介</);
}

assert.match(index, /<p class="price-guide">表示金額は税込です。<br>上記は代表的な料金例です。現有免許やオプション等により料金が変わります。<\/p>/);
assert.doesNotMatch(index, /<div class="price-plan-head">[\s\S]*?<p>上記は代表的な料金例です。/);
assert.ok(index.includes("車種別の料金表を見る"));
assert.ok(detail.includes("車種別の料金表を見る"));

assert.equal(calendar.events.length, 46);
assert.equal(new Set(calendar.events.map((event) => event.eventDate)).size, 31);
assert.equal(calendar.events.filter((event) => event.title === "休校日").length, 7);
assert.ok(calendar.events.some((event) => event.eventDate === "2026-08-01" && event.title === "卒業検定"));
assert.ok(calendar.events.some((event) => event.eventDate === "2026-08-01" && event.title === "学科" && event.details.includes("9時限")));
assert.ok(calendar.events.some((event) => event.eventDate === "2026-08-31" && event.title === "学科"));

assert.ok(calendarCode.includes("eventCategoryClass"));
assert.ok(calendarCode.includes("is-closed"));
assert.ok(calendarCode.includes("is-exam"));
assert.ok(calendarCode.includes("is-lesson"));
assert.ok(!calendarCode.includes("fetchReviewSchedule"));
assert.ok(!calendarCode.includes("/data/calendar-review-2026-08.json"));
assert.ok(calendarCode.includes('item.category === "学科" ? "時間割" : "補足"'));
assert.ok(calendarCode.includes("license-bike-desktop-v3-20260730.webp"));
assert.ok(calendarCode.includes("license-bike-mobile-v3-20260730.webp"));

console.log("client-feedback-20260729: ok");
