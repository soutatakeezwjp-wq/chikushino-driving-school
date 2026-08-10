#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8771";
const executablePath = process.env.PLAYWRIGHT_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function cmsPost({ slug, tag, title }) {
  return {
    slug,
    tag,
    title,
    date: "2026.07.27",
    imageUrl: "/images/current-site/news/news-2025-01-18-13019.png"
  };
}

function wordpressPost({ link, category, title }) {
  return {
    link,
    category,
    title,
    date: "2026.07.13",
    image: ""
  };
}

async function verifyScenario(browser, {
  viewport = { width: 1440, height: 900 },
  cmsPosts,
  wordpressPosts = [],
  expectedTitles,
  expectedImportantTitle = "",
  expectedWordPressRequests = 0
}) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  let wordpressRequests = 0;
  try {
    await page.route("**/api/cms/posts*", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, posts: cmsPosts })
    }));
    await page.route("**/api/wordpress-posts*", (route) => {
      wordpressRequests += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, posts: wordpressPosts })
      });
    });

    const response = await page.goto(`${baseUrl}/index.html`, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    assert.ok(response?.ok(), `index HTTP ${response?.status()}`);
    await page.waitForFunction(
      (count) => document.querySelectorAll(".topics-grid .topic-card").length === count,
      expectedTitles.length
    );

    const cards = page.locator(".topics-grid .topic-card");
    assert.equal(await cards.count(), expectedTitles.length, "記事カード数が公開記事数と一致しません。");
    for (const title of expectedTitles) {
      assert.equal(
        await cards.filter({ hasText: title }).count(),
        1,
        `「${title}」が1枚だけ表示されていません。`
      );
    }
    assert.equal(
      await page.locator(".topics-grid .topic-card[aria-hidden='true']").count(),
      0,
      "CMS記事に横流し用の複製カードが残っています。"
    );
    assert.equal(wordpressRequests, expectedWordPressRequests, "CMS記事があるのにWordPress記事も取得しています。");

    const importantSection = page.locator(".important-news");
    if (expectedImportantTitle) {
      assert.equal(await importantSection.getAttribute("hidden"), null, "重要なお知らせ欄が非表示です。");
      assert.equal(
        (await page.locator(".important-news-title").textContent()).trim(),
        expectedImportantTitle,
        "重要なお知らせ欄が重要記事を参照していません。"
      );
    } else {
      assert.notEqual(await importantSection.getAttribute("hidden"), null, "通常記事を重要なお知らせとして表示しています。");
    }

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, `${viewport.width}pxで横スクロールが発生しています。`);
  } finally {
    await page.close();
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    await verifyScenario(browser, {
      cmsPosts: [cmsPost({ slug: "notice-1", tag: "お知らせ", title: "通常のお知らせ" })],
      wordpressPosts: [wordpressPost({
        link: "https://chikushi-ds.com/archives/notice-1",
        category: "お知らせ",
        title: "通常のお知らせ"
      })],
      expectedTitles: ["通常のお知らせ"]
    });

    await verifyScenario(browser, {
      viewport: { width: 390, height: 844 },
      cmsPosts: [
        cmsPost({ slug: "important-1", tag: "重要", title: "重要なお知らせ" }),
        cmsPost({ slug: "notice-2", tag: "お知らせ", title: "2件目のお知らせ" })
      ],
      expectedTitles: ["重要なお知らせ", "2件目のお知らせ"],
      expectedImportantTitle: "重要なお知らせ"
    });

    await verifyScenario(browser, {
      cmsPosts: [],
      wordpressPosts: [wordpressPost({
        link: "https://chikushi-ds.com/archives/legacy-1",
        category: "お知らせ",
        title: "旧サイトの記事"
      })],
      expectedTitles: [],
      expectedImportantTitle: "",
      expectedWordPressRequests: 0
    });

    process.stdout.write(JSON.stringify({
      ok: true,
      checks: [
        "CMS 1件はカード1枚",
        "重要記事もカード1枚",
        "CMS優先でWordPressと混在しない",
        "CMS空時に旧記事を自動復活させない",
        "390px横スクロールなし"
      ]
    }));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
