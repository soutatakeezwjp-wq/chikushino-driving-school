#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseUrl = String(process.env.BASE_URL || "http://127.0.0.1:8766").replace(/\/+$/, "");
const executablePath = process.env.PLAYWRIGHT_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const taxText = "表示金額は税込です";

const feePages = [
  ["standard", 3],
  ["semi_medium", 3],
  ["bike", 4],
  ["limited", 4],
  ["camp_price", 1],
  ["paper", 1]
];

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, `${label}で横スクロールが発生`);
}

async function verify(viewport) {
  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 30000 });
    assert.match(await page.locator(".price-plan-panel .price-guide").innerText(), new RegExp(taxText));
    assert.match(await page.locator(".sim-result .sim-tax-note").innerText(), new RegExp(taxText));
    assert.match(await page.locator(".option-details-dialog .option-dialog-note").innerText(), new RegExp(taxText));
    assert.match(await page.locator("#sim-status-note").innerText(), new RegExp(taxText));
    await assertNoHorizontalOverflow(page, `トップ ${viewport.width}px`);

    for (const [pageId, expectedCount] of feePages) {
      await page.goto(`${baseUrl}/detail.html?page=${pageId}`, { waitUntil: "networkidle", timeout: 30000 });
      const notes = page.locator(".redesign-0718 .fee-tax-note");
      assert.equal(await notes.count(), expectedCount, `${pageId}の税込注記数`);
      for (const text of await notes.allTextContents()) assert.match(text, new RegExp(taxText));
      await assertNoHorizontalOverflow(page, `${pageId} ${viewport.width}px`);
    }

    await page.goto(`${baseUrl}/detail.html?page=standard`, { waitUntil: "networkidle", timeout: 30000 });
    await page.locator("[data-fee-view='breakdown']").first().click();
    assert.match(await page.locator("#fee-modal-content .fee-tax-note").innerText(), new RegExp(taxText));

    await page.goto(`${baseUrl}/detail.html?page=training`, { waitUntil: "networkidle", timeout: 30000 });
    const trainingFee = page.locator(".card", { hasText: "講習費用" });
    assert.match(await trainingFee.innerText(), new RegExp(taxText));
    await assertNoHorizontalOverflow(page, `training ${viewport.width}px`);
  } finally {
    await context.close();
    await browser.close();
  }
}

(async () => {
  await verify({ width: 1440, height: 900 });
  await verify({ width: 390, height: 844 });
  process.stdout.write(JSON.stringify({
    ok: true,
    checks: ["全料金表", "卒業生割引", "オプション", "料金内訳", "講習料金", "PC", "390px"]
  }));
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
