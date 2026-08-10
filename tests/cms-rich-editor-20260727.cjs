#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseUrl = String(process.env.BASE_URL || "http://127.0.0.1:8771").replace(/\/+$/, "");
const executablePath = process.env.PLAYWRIGHT_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const pixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  let savedPost = null;

  await page.addInitScript(() => sessionStorage.setItem("cdsCmsToken", "1111"));
  await page.route("**/api/cms/admin/session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true })
  }));
  await page.route("**/api/cms/admin/events", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, events: [] })
  }));
  await page.route("**/api/cms/admin/posts", async (route) => {
    if (route.request().method() === "POST") {
      savedPost = route.request().postDataJSON();
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, id: 99, slug: "rich-editor-test" })
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, posts: [] })
    });
  });
  await page.route("**/api/cms/admin/media", (route) => route.fulfill({
    status: 201,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, url: "/cms-media/rich-editor-image" })
  }));
  await page.route("**/cms-media/rich-editor-image", (route) => route.fulfill({
    status: 200,
    contentType: "image/png",
    body: pixelPng
  }));

  await page.goto(`${baseUrl}/admin/`, { waitUntil: "domcontentloaded" });
  await page.locator("#admin-app:not([hidden])").waitFor();
  await page.locator('[data-view="posts"]').click();
  await page.locator('[data-new="post"]').click();
  await page.locator("#post-form:not([hidden])").waitFor();

  assert.equal((await page.locator(".image-picker span").textContent()).trim(), "トップ画像");
  assert.equal(await page.locator("#rich-bold-button").isVisible(), true);
  assert.equal(await page.locator("#post-inline-image").count(), 1);
  assert.equal(await page.locator('#post-form [name="summary"]').count(), 0);

  await page.locator('#post-form [name="title"]').fill("リッチ本文の動作確認");
  await page.locator("#body-editor p").first().fill("画像の前に太字があります");
  await page.evaluate(() => {
    const paragraph = document.querySelector("#body-editor p");
    const textNode = paragraph.firstChild;
    const range = document.createRange();
    range.setStart(textNode, 5);
    range.setEnd(textNode, 7);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await page.locator("#rich-bold-button").click();

  await page.locator("#post-inline-image").setInputFiles({
    name: "inline.png",
    mimeType: "image/png",
    buffer: pixelPng
  });
  await page.locator('#body-editor figure[data-inline-image="/cms-media/rich-editor-image"]').waitFor();
  await page.locator("#body-editor p").last().fill("画像の後にも文章があります");
  await page.locator('#post-form button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector("#post-form")?.hidden === true);

  assert.ok(savedPost, "記事保存APIが呼び出されていません。");
  assert.equal(savedPost.summary, "");
  const richBody = JSON.parse(savedPost.body);
  assert.equal(richBody.format, "rich-v1");
  assert.deepEqual(richBody.blocks.map((block) => block.type), ["text", "image", "text"]);
  assert.equal(richBody.blocks[0].runs.some((run) => run.bold && run.text === "太字"), true);
  assert.equal(richBody.blocks[1].url, "/cms-media/rich-editor-image");
  assert.equal(richBody.blocks[2].runs.map((run) => run.text).join(""), "画像の後にも文章があります");

  await page.route("**/api/cms/posts/rich-editor-test", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      post: {
        tag: "お知らせ",
        title: "リッチ本文の動作確認",
        summary: "",
        publishedDate: "2026.07.27",
        imageUrl: "",
        body: savedPost.body
      }
    })
  }));
  await page.goto(`${baseUrl}/article.html?slug=rich-editor-test`, { waitUntil: "domcontentloaded" });
  await page.locator(".article-inline-image img").waitFor();
  assert.deepEqual(
    await page.locator(".article-body > *").evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ["P", "FIGURE", "P"]
  );
  assert.equal((await page.locator(".article-body strong").textContent()).trim(), "太字");

  await page.setViewportSize({ width: 390, height: 844 });
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, "390pxで記事詳細に横スクロールがあります。");

  await context.close();
  await browser.close();
  process.stdout.write(JSON.stringify({
    ok: true,
    checks: [
      "トップ画像表記",
      "短い説明欄なし",
      "太字",
      "本文画像",
      "文字→画像→文字の保存順",
      "公開記事表示",
      "390px横スクロールなし"
    ]
  }));
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
