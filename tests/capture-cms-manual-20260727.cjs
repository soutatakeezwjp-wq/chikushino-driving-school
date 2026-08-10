#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = String(
  process.env.CMS_TEST_BASE_URL || "https://chikushino-driving-school.pages.dev"
).replace(/\/+$/, "");
const password = String(process.env.CMS_ADMIN_PASSWORD || "");
const eventId = Number(process.env.CMS_EVENT_ID || 0);
const publishedPostId = Number(process.env.CMS_PUBLISHED_POST_ID || 0);
const publishedSlug = String(process.env.CMS_PUBLISHED_SLUG || "");
const outputDir = process.env.CMS_SCREENSHOT_DIR
  ? path.resolve(process.env.CMS_SCREENSHOT_DIR)
  : path.resolve(__dirname, "../../05_公開後運用/HP更新マニュアル_素材");

if (!password) throw new Error("CMS_ADMIN_PASSWORD is required.");
if (!eventId || !publishedPostId || !publishedSlug) {
  throw new Error("CMS_EVENT_ID, CMS_PUBLISHED_POST_ID, and CMS_PUBLISHED_SLUG are required.");
}

fs.mkdirSync(outputDir, { recursive: true });

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(450);
}

async function savePage(page, filename, options = {}) {
  await page.screenshot({
    path: path.join(outputDir, filename),
    fullPage: Boolean(options.fullPage),
    animations: "disabled"
  });
}

async function saveLocator(locator, filename) {
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({
    path: path.join(outputDir, filename),
    animations: "disabled"
  });
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CMS_BROWSER_EXECUTABLE || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1.5,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo"
  });
  const admin = await context.newPage();

  await admin.goto(`${baseUrl}/admin/`, { waitUntil: "networkidle" });
  await settle(admin);
  await saveLocator(admin.locator("#login-panel"), "01_login_pc.png");
  if (process.env.CMS_CAPTURE_LOGIN_ONLY === "1") {
    process.stdout.write(JSON.stringify({ ok: true, file: path.join(outputDir, "01_login_pc.png") }));
    process.exit(0);
  }

  await admin.locator("#admin-password").fill(password);
  await Promise.all([
    admin.locator("#login-form button[type=submit]").click(),
    admin.locator("#admin-app:not([hidden])").waitFor()
  ]);
  await admin.locator(`[data-edit-event="${eventId}"]`).waitFor();
  await settle(admin);
  await saveLocator(admin.locator("#events-view"), "02_admin_events_pc.png");

  await admin.locator(`[data-edit-event="${eventId}"]`).click();
  await admin.locator("#event-form:not([hidden])").waitFor();
  await settle(admin);
  await saveLocator(admin.locator("#events-view"), "03_event_form_pc.png");
  await admin.locator('[data-cancel="event"]').last().click();

  await admin.locator('[data-view="posts"]').click();
  await admin.locator(`[data-edit-post="${publishedPostId}"]`).waitFor();
  await settle(admin);
  await saveLocator(admin.locator("#posts-view"), "04_posts_list_pc.png");

  await admin.locator(`[data-edit-post="${publishedPostId}"]`).click();
  await admin.locator("#post-form:not([hidden])").waitFor();
  await admin.locator("#image-preview:not([hidden]) img").waitFor();
  await settle(admin);
  await saveLocator(admin.locator("#post-form"), "05_post_form_pc.png");

  const publicPage = await context.newPage();
  await publicPage.goto(`${baseUrl}/detail?page=teaching`, { waitUntil: "domcontentloaded" });
  await publicPage.locator(".schedule-calendar-event").filter({ hasText: "卒業検定（操作例）" }).waitFor();
  await settle(publicPage);
  await saveLocator(publicPage.locator(".schedule-calendar"), "06_public_calendar_pc.png");

  await publicPage.goto(`${baseUrl}/detail?page=topics`, { waitUntil: "domcontentloaded" });
  await publicPage.locator(".cms-topic-card").filter({ hasText: "夏季休校日のお知らせ（操作例）" }).waitFor();
  await settle(publicPage);
  await saveLocator(
    publicPage.locator(".cms-topic-card").filter({ hasText: "夏季休校日のお知らせ（操作例）" }),
    "07_public_topics_pc.png"
  );

  await publicPage.goto(`${baseUrl}/article.html?slug=${encodeURIComponent(publishedSlug)}`, {
    waitUntil: "domcontentloaded"
  });
  await publicPage.locator("#article-content h1").filter({ hasText: "夏季休校日のお知らせ（操作例）" }).waitFor();
  await settle(publicPage);
  await saveLocator(publicPage.locator("#article-content"), "08_public_article_pc.png");

  await admin.setViewportSize({ width: 390, height: 844 });
  await admin.locator('[data-cancel="post"]').last().click();
  await admin.locator('[data-view="posts"]').click();
  await admin.evaluate(() => window.scrollTo(0, 0));
  await settle(admin);
  await savePage(admin, "09_admin_mobile.png");

  await publicPage.setViewportSize({ width: 390, height: 844 });
  await publicPage.goto(`${baseUrl}/detail?page=teaching`, { waitUntil: "domcontentloaded" });
  const mobileEvent = publicPage.locator(".schedule-calendar-event").filter({ hasText: "卒業検定（操作例）" });
  await mobileEvent.waitFor();
  await mobileEvent.scrollIntoViewIfNeeded();
  await publicPage.evaluate(() => window.scrollBy(0, -150));
  await settle(publicPage);
  await savePage(publicPage, "10_public_mobile.png");

  process.stdout.write(JSON.stringify({
    ok: true,
    outputDir,
    files: fs.readdirSync(outputDir).filter((name) => /^\d{2}_.*\.png$/.test(name)).sort()
  }));
  process.exit(0);
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exit(1);
});
