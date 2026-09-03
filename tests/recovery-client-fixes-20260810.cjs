#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

const index = read("index.html");
const detail = read("detail.html");
const redesign = read("assets/redesign-0718.js");
const worker = read("_worker.js");
const routes = JSON.parse(read("_routes.json"));
const wrangler = read("wrangler.toml");
const combined = [index, detail, redesign, worker].join("\n");

assert.doesNotMatch(combined, /^(?:<<<<<<<|=======|>>>>>>>)/m, "マージ競合マーカーが残っています");

for (const html of [index, detail]) {
  assert.match(html, />免許証交付まで</);
  assert.match(html, />施設紹介</);
  assert.match(html, />指導員紹介</);
  assert.doesNotMatch(html, />免許交付まで</);
  assert.doesNotMatch(html, />設備紹介</);
  assert.doesNotMatch(html, />教官紹介</);
}

assert.match(index, /表示金額は税込です。<br>上記は代表的な料金例です。/);
assert.match(index, /車種別の料金表を見る/);
assert.match(index, /対面学科・オンデマンド学科/);
assert.doesNotMatch(index, /正式資料/);

assert.match(detail, /入校希望日の2週間前まで/);
assert.match(detail, /入校希望日の1週間前まで/);
assert.ok((detail.match(/各入校日先着3名/g) || []).length >= 2);
assert.match(redesign, /option-plan-help/);
assert.match(redesign, /applicationOptionEligibility/);
assert.match(worker, /OPTION_PLAN_ELIGIBILITY/);
assert.match(redesign, /lesson-times-imagegen-v3\.webp/);
assert.match(redesign, /license-bike-desktop-v3-20260730\.webp/);
assert.match(redesign, /license-bike-mobile-v3-20260730\.webp/);

// 2026-09 学校の指示でページ名を「友人・知人紹介」へ変更
assert.match(detail, /友人・知人紹介/);
assert.match(detail, /referral=1/);
assert.match(redesign, /isReferralApplication/);
assert.match(worker, /introducerName/);

assert.match(detail, /completion-test-guide\.webp/);
assert.match(detail, /graduation-test-guide\.webp/);
for (const asset of [
  "images/exam-guides/completion-test-guide.webp",
  "images/exam-guides/graduation-test-guide.webp",
  "images/referral/referral-discount-mobile-20260802.webp",
  "images/referral/referral-discount-pc-20260802.webp",
  "images/detail-pages/admission/lesson-times-imagegen-v3.webp",
  "images/detail-pages/flows-20260724/license-bike-desktop-v3-20260730.webp",
  "images/detail-pages/flows-20260724/license-bike-mobile-v3-20260730.webp"
]) {
  assert.ok(exists(asset), `必要な画像がありません: ${asset}`);
  assert.ok(fs.statSync(path.join(root, asset)).size > 0, `画像が空です: ${asset}`);
}

assert.match(detail, /送迎バス/);
assert.match(redesign, /送迎バス予約/);
// 2026-09 友人・知人紹介フォームの追加で、必須項目が用件ごとに分岐した。
// 入校申し込み側の必須項目が欠けていないことを確認する。
assert.match(worker, /\["purpose", "name", "gender", "birthdate", "phone", "email", "postalCode", "address", "occupation", "privacyConsent"\]/);
// 紹介フォーム側の必須項目
assert.match(worker, /\["purpose", "name", "phone", "email", "friendName", "privacyConsent"\]/);

for (const route of [
  "/api/application",
  "/api/public-schedule",
  "/api/wordpress-posts",
  "/api/cms/*",
  "/cms-media/*"
]) {
  assert.ok(routes.include.includes(route), `_routes.json に ${route} がありません`);
}
assert.match(wrangler, /\[\[env\.preview\.d1_databases\]\]/);
assert.match(wrangler, /chikushino-school-content-preview/);

console.log(JSON.stringify({
  ok: true,
  checks: [
    "7月30日の文言・料金・プラン条件",
    "8月の紹介割引・指導員・検定案内",
    "教習時間画像・二輪フロー画像",
    "フォームとWorkerの選択条件",
    "CMS・APIルーティング"
  ]
}, null, 2));
