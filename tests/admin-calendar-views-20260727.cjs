#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const baseUrl = String(process.env.BASE_URL || "http://127.0.0.1:8765").replace(/\/+$/, "");
const executablePath = process.env.PLAYWRIGHT_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function jstDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date).reduce((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDate(dateKey, amount) {
  const date = new Date(`${dateKey}T12:00:00+09:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return jstDateKey(date);
}

async function hasNoHorizontalScroll(page, label) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, `${label}で横スクロールが発生`);
}

(async () => {
  const today = jstDateKey();
  const tomorrow = addDate(today, 1);
  let nextId = 10;
  let events = [
    { id: 1, eventDate: today, category: "検定", title: "卒業検定", details: "受付は9:45までです" },
    { id: 2, eventDate: today, category: "教習", title: "高齢者講習", details: "正面玄関へお越しください" },
    { id: 3, eventDate: today, category: "その他", title: "説明会", details: "補足は月表示に出さない" },
    { id: 4, eventDate: tomorrow, category: "休校", title: "休校日", details: "終日休校です" }
  ];
  const calls = [];

  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo"
  });
  const page = await context.newPage();

  await page.route("**/api/cms/admin/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();
    const body = request.postDataJSON?.() || {};
    calls.push({ pathname, method, body });

    if (pathname.endsWith("/session")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, token: "test-token" })
      });
    }
    if (pathname.endsWith("/posts")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, posts: [] })
      });
    }
    if (pathname.endsWith("/events") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, events })
      });
    }
    if (pathname.endsWith("/events") && method === "POST") {
      events.push({ id: nextId++, ...body });
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, id: nextId - 1 })
      });
    }
    const eventMatch = pathname.match(/\/events\/(\d+)$/);
    if (eventMatch && method === "PUT") {
      const id = Number(eventMatch[1]);
      events = events.map((item) => item.id === id ? { id, ...body } : item);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true })
      });
    }
    if (eventMatch && method === "DELETE") {
      const id = Number(eventMatch[1]);
      events = events.filter((item) => item.id !== id);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true })
      });
    }
    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "NOT_FOUND" })
    });
  });

  try {
    const response = await page.goto(`${baseUrl}/admin/`, { waitUntil: "domcontentloaded" });
    assert.ok(response?.ok(), `admin HTTP ${response?.status()}`);
    await page.locator("#admin-password").fill("1111");
    await page.locator("#login-form button[type=submit]").click();
    await page.locator("#admin-app:not([hidden])").waitFor();
    await page.locator('[data-edit-event="1"]').waitFor();

    assert.equal(await page.locator("[data-calendar-view]").count(), 3, "月・週・日の切替が3つある");
    assert.equal(await page.locator('[data-calendar-view="month"]').getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator(".calendar-day").count() >= 35, true, "月間の日付セルが表示される");
    assert.equal(await page.locator(".calendar-more-button").filter({ hasText: "ほか1件" }).count(), 1, "3件目を省略表示する");
    const monthText = await page.locator("#event-calendar").innerText();
    assert.ok(!monthText.includes("受付は9:45までです"), "月ビューに補足を表示しない");
    assert.ok(!monthText.includes("補足は月表示に出さない"), "月ビューに補足を表示しない");

    await page.locator('[data-edit-event="1"]').click();
    await page.locator("#event-form:not([hidden])").waitFor();
    assert.equal(await page.locator('#event-form [name="details"]').inputValue(), "受付は9:45までです", "予定クリック後に補足を確認できる");
    assert.equal(await page.locator("#event-delete-button").isVisible(), true, "編集画面から削除できる");
    await page.locator('[data-cancel="event"]').last().click();

    await page.locator(`[data-calendar-date="${tomorrow}"]`).first().click();
    await page.locator("#event-form:not([hidden])").waitFor();
    assert.equal(await page.locator('#event-form [name="eventDate"]').inputValue(), tomorrow, "日付クリックで選択日を入力する");
    await page.locator('#event-form [name="title"]').fill("追加テスト");
    await page.locator('#event-form [name="details"]').fill("保存できることを確認");
    await page.locator('#event-form button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector("#event-form").hidden);
    assert.ok(calls.some((call) => call.pathname.endsWith("/events") && call.method === "POST" && call.body.title === "追加テスト"), "予定追加APIを呼び出す");

    await page.locator('[data-edit-event="1"]').click();
    await page.locator('#event-form [name="title"]').fill("卒業検定（変更）");
    await page.locator('#event-form button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector("#event-form").hidden);
    assert.ok(calls.some((call) => call.pathname.endsWith("/events/1") && call.method === "PUT" && call.body.title === "卒業検定（変更）"), "予定編集APIを呼び出す");

    await page.locator('[data-edit-event="2"]').click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#event-delete-button").click();
    await page.waitForFunction(() => document.querySelector("#event-form").hidden);
    assert.ok(calls.some((call) => call.pathname.endsWith("/events/2") && call.method === "DELETE"), "予定削除APIを呼び出す");

    await page.locator('[data-calendar-view="week"]').click();
    assert.equal(await page.locator(".calendar-week-grid .calendar-period-day").count(), 7, "週ビューに7日を表示する");
    assert.equal(await page.locator('[data-calendar-view="week"]').getAttribute("aria-pressed"), "true");

    await page.locator('[data-calendar-view="day"]').click();
    assert.equal(await page.locator(".calendar-day-view .calendar-period-day").count(), 1, "日ビューに1日を表示する");
    assert.equal(await page.locator('[data-calendar-view="day"]').getAttribute("aria-pressed"), "true");

    await page.setViewportSize({ width: 390, height: 844 });
    for (const view of ["month", "week", "day"]) {
      await page.locator(`[data-calendar-view="${view}"]`).click();
      await hasNoHorizontalScroll(page, `管理画面${view}ビュー390px`);
    }

    process.stdout.write(JSON.stringify({
      ok: true,
      checks: ["管理画面の月・週・日", "日付から追加", "予定から編集・削除", "月表示の補足非表示", "390px横スクロールなし"]
    }));
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
})().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
