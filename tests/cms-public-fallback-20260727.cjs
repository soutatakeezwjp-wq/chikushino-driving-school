#!/usr/bin/env node
"use strict";

const { chromium } = require("playwright");
const assert = require("node:assert/strict");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8765";
const executablePath = process.env.PLAYWRIGHT_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function verify(viewport) {
  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  let wordpressRequests = 0;
  try {
    await page.route("**/api/cms/posts*", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, posts: [] })
    }));
    await page.route("**/api/wordpress-posts*", (route) => {
      wordpressRequests += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, posts: [{ title: "表示してはいけない旧記事" }] })
      });
    });

    const response = await page.goto(`${baseUrl}/detail.html?page=topics`, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    assert.ok(response?.ok(), `topics HTTP ${response?.status()}`);
    await page.waitForSelector(".r-notice");
    assert.match(await page.locator("#cms-topic-grid").innerText(), /公開中のお知らせはありません/);
    assert.equal(await page.locator(".cms-topic-card").count(), 0);
    assert.equal(wordpressRequests, 0);

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, `${viewport.width}pxで横スクロールが発生`);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

(async () => {
  await verify({ width: 1440, height: 900 });
  await verify({ width: 390, height: 844 });
  process.stdout.write(JSON.stringify({ ok: true, checks: ["CMS空時は空表示-PC", "CMS空時は空表示-mobile", "WordPress自動復活なし"] }));
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
