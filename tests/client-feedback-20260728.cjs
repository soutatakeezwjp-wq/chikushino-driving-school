#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = String(process.env.BASE_URL || "http://127.0.0.1:8765").replace(/\/+$/, "");
const executablePath = process.env.PLAYWRIGHT_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const projectRoot = path.resolve(__dirname, "..");
const gasPath = path.resolve(projectRoot, "../../..", "04_電子ブック・申込フォーム/GAS連携/clasp_application_backend/Code.js");

async function visibleOptionLabels(page) {
  return page.locator('[name="optionPlans"]:not([disabled]) + label').allTextContents();
}

async function setVehicle(page, value, checked) {
  const input = page.locator(`[name="desiredVehicles"][value="${value}"]`);
  if (checked) await input.check({ force: true });
  else await input.uncheck({ force: true });
}

async function verifyViewport(viewport) {
  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/detail.html?page=standard`, { waitUntil: "networkidle", timeout: 30000 });
    const optionText = await page.locator(".option-grid").innerText();
    assert.match(optionText, /対象：AT普通車・MT準中型車/);
    assert.match(optionText, /対象：AT普通車・MT普通車・MT準中型車/);
    assert.match(optionText, /入校希望日の2週間前まで/);
    assert.match(optionText, /入校希望日の1週間前まで/);
    assert.equal((optionText.match(/各入校日先着3名/g) || []).length, 2);

    await page.goto(`${baseUrl}/detail.html?page=application`, { waitUntil: "networkidle", timeout: 30000 });
    assert.deepEqual(await visibleOptionLabels(page), []);
    assert.match(await page.locator("#option-plan-help").innerText(), /入校車種を選ぶと/);

    await setVehicle(page, "AT普通車", true);
    assert.deepEqual(await visibleOptionLabels(page), ["コミコミプラン", "スケジュールプラン", "合宿風ハイスピードプラン"]);

    await setVehicle(page, "MT普通車", true);
    assert.deepEqual(await visibleOptionLabels(page), ["スケジュールプラン"]);
    assert.match(await page.locator("#option-plan-help").innerText(), /すべての車種で共通/);

    await setVehicle(page, "AT普通車", false);
    await setVehicle(page, "MT普通車", false);
    await setVehicle(page, "MT準中型車", true);
    assert.deepEqual(await visibleOptionLabels(page), ["コミコミプラン", "スケジュールプラン"]);

    await setVehicle(page, "MT準中型車", false);
    await setVehicle(page, "MT普通二輪車", true);
    assert.deepEqual(await visibleOptionLabels(page), []);
    assert.match(await page.locator("#option-plan-help").innerText(), /利用できるオプションプランはありません/);

    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, `${viewport.width}pxで横スクロールが発生`);
  } finally {
    await context.close();
    await browser.close();
  }
}

(async () => {
  await verifyViewport({ width: 1440, height: 900 });
  await verifyViewport({ width: 390, height: 844 });

  const gas = fs.readFileSync(gasPath, "utf8");
  assert.match(gas, /希望車種・所持免許・プランを確認後、担当者より料金をご案内します。/);
  assert.doesNotMatch(gas, /正式金額は担当者が確認してご案内します。/);
  assert.match(gas, /入校日がお決まりになられましたら、入校希望日の前日までに必要書類をご持参の上、当校受付窓口にてお手続きをお願い致します。/);
  assert.match(gas, /必要書類は郵送でお届けします。ご記入の上、入校希望日の前日までに必要書類をご持参の上、当校受付窓口にてお手続きをお願い致します。/);
  assert.match(gas, /18歳未満の方は申込書裏面の保護者欄にご署名が必要です。/);
  assert.doesNotMatch(gas, /当日その場で記入/);

  const topPage = await chromium.launch({ headless: true, executablePath });
  const topContext = await topPage.newContext({ viewport: { width: 390, height: 844 } });
  const top = await topContext.newPage();
  try {
    await top.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 30000 });
    await top.locator("#open-option-details").click();
    const optionNote = await top.locator(".option-dialog-note").innerText();
    assert.match(optionNote, /自動二輪車にはオプションプランの設定がありません。/);
    assert.doesNotMatch(optionNote, /正式資料/);
  } finally {
    await topContext.close();
    await topPage.close();
  }

  process.stdout.write(JSON.stringify({
    ok: true,
    checks: [
      "オプション対象車種",
      "1週間・2週間前の手続き注記",
      "各入校日先着3名",
      "二輪オプション非表示",
      "料金案内文",
      "今後のご案内",
      "18歳未満の署名案内",
      "正式資料表記の削除",
      "PC",
      "390px"
    ]
  }));
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
