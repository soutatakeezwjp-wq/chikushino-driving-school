#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const gasPath = path.resolve(
  projectRoot,
  "../../..",
  "04_電子ブック・申込フォーム/GAS連携/clasp_application_backend/Code.js"
);

const adminHtml = fs.readFileSync(path.join(projectRoot, "admin/index.html"), "utf8");
const worker = fs.readFileSync(path.join(projectRoot, "_worker.js"), "utf8");
const index = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const topics = fs.readFileSync(path.join(projectRoot, "assets/redesign-0718.js"), "utf8");
const detail = fs.readFileSync(path.join(projectRoot, "detail.html"), "utf8");
const seed = fs.readFileSync(path.join(projectRoot, "migrations/0002_seed_latest_six_posts.sql"), "utf8");
const gas = fs.readFileSync(gasPath, "utf8");

assert.doesNotMatch(adminHtml, /一覧に表示する短い説明/);
assert.match(adminHtml, /文章を書く →「画像を挿入」→ その下へ文章を書く/);
assert.match(worker, /DELETE FROM cms_posts/);
assert.match(worker, /result\.meta\?\.changes/);
assert.match(index, /現在公開中のお知らせはありません/);
assert.doesNotMatch(index.match(/async function setupTopics\(\)[\s\S]*?setupTopics\(\);/)?.[0] || "", /wordpress-posts/);
assert.doesNotMatch(topics.match(/function renderTopics\(\)[\s\S]*?function renderStudents/)?.[0] || "", /wordpress-posts/);
assert.equal((seed.match(/legacy-\d{4}-/g) || []).length, 6);

assert.match(detail, /入力いただいたメールアドレス宛にメールが届きますので、ご確認お願いします。10秒ほどお時間かかる場合がございます\\n受付ID：/);
assert.match(detail, /submissionInProgress/);
assert.match(gas, /notification_delivery_claimed/);
assert.match(gas, /mail !== applicantEmail/);
assert.match(gas, /EMAIL_LOGO_URL/);
assert.match(gas, /EMAIL_MASCOTS_URL/);
assert.match(gas, /EMAIL_TEMPLATE_VERSION = "2026-07-29-brand-v2"/);
assert.match(gas, /letter-spacing:\.02em;">筑紫野自動車学校/);
assert.match(gas, /受付完了のお知らせ/);
assert.match(gas, /学校向け・新しい受付のお知らせ/);

process.stdout.write(JSON.stringify({
  ok: true,
  checks: [
    "短い説明欄削除",
    "文字・画像の自由配置案内",
    "削除API結果確認",
    "WordPress自動復活なし",
    "初期6記事",
    "完了画面文言",
    "メール送信一回制御",
    "申込者と学校通知先の重複除外",
    "ロゴ・キャラクター・学校名付きメール"
  ]
}));
