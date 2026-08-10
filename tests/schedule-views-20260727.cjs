const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8765";
const executablePath =
  process.env.PLAYWRIGHT_CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const today = new Date();
today.setHours(12, 0, 0, 0);
const eventDate = dateKey(today);
const events = [
  {
    id: 101,
    date: eventDate,
    category: "検定",
    title: "卒業検定",
    note: "9:30〜10:30 集合は受付前です"
  },
  {
    id: 102,
    date: eventDate,
    category: "教習",
    title: "学科教習",
    note: "補足本文B"
  },
  {
    id: 103,
    date: eventDate,
    category: "お知らせ",
    title: "休校案内",
    note: "補足本文C"
  }
];

async function openCalendar(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const responseBody = JSON.stringify({
    ok: true,
    schedule: {
      updatedAt: "2026-07-27T09:00:00+09:00",
      today: events,
      week: events,
      month: events
    }
  });
  await page.route("**/api/cms/events*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: responseBody
  }));
  await page.route("**/api/public-schedule*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: responseBody
  }));
  const response = await page.goto(`${baseUrl}/detail.html?page=teaching`, {
    waitUntil: "domcontentloaded",
    timeout: 30000
  });
  assert(response?.ok(), `${viewport.width}px: HTTP ${response?.status()}`);
  await page.waitForFunction(() => document.querySelectorAll(".schedule-calendar-event").length === 2);
  assert(pageErrors.length === 0, `${viewport.width}px: JavaScript error: ${pageErrors.join(" / ")}`);
  return { context, page };
}

async function assertNoOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  assert(
    metrics.scrollWidth <= metrics.clientWidth + 1,
    `${label}: 横スクロールが発生しています (${metrics.scrollWidth}/${metrics.clientWidth})`
  );
}

async function runViewport(browser, viewport) {
  const { context, page } = await openCalendar(browser, viewport);
  const label = `${viewport.width}px`;
  try {
    assert(await page.locator("[data-calendar-view]").count() === 3, `${label}: 月・週・日ボタンが揃っていません。`);
    assert(await page.locator('[data-calendar-view="month"]').getAttribute("aria-pressed") === "true", `${label}: 初期表示が月ビューではありません。`);
    const monthText = await page.locator("#schedule-calendar-panel").innerText();
    for (const expected of ["検定", "卒業検定", "9:30〜10:30", "教習", "学科教習"]) {
      assert(monthText.includes(expected), `${label}/月: 「${expected}」が表示されていません。`);
    }
    for (const hidden of ["集合は受付前です", "補足本文B", "補足本文C"]) {
      assert(!monthText.includes(hidden), `${label}/月: 補足「${hidden}」が月セルに露出しています。`);
    }
    assert(await page.locator(".schedule-calendar-event").count() === 2, `${label}/月: 月セルに3件以上の予定が展開されています。`);
    assert((await page.locator(".schedule-calendar-more").innerText()).includes("ほか1件"), `${label}/月: 残り件数の導線がありません。`);
    const todayCellHeight = await page.locator(".schedule-calendar-day.is-today").evaluate((element) => element.getBoundingClientRect().height);
    assert(todayCellHeight <= (viewport.width <= 560 ? 112 : 168), `${label}/月: 複数予定で日付セルが肥大化しています (${todayCellHeight}px)。`);
    await assertNoOverflow(page, `${label}/月`);

    await page.locator(".schedule-calendar-event-button").first().click();
    assert(await page.locator("#schedule-detail-dialog").evaluate((dialog) => dialog.open), `${label}: 予定クリックで詳細が開きません。`);
    const eventDetail = await page.locator("#schedule-detail-dialog").innerText();
    assert(eventDetail.includes("卒業検定"), `${label}: 詳細に予定タイトルがありません。`);
    assert(eventDetail.includes("9:30〜10:30"), `${label}: 詳細に時刻がありません。`);
    assert(eventDetail.includes("集合は受付前です"), `${label}: 詳細に補足がありません。`);
    await page.locator("[data-calendar-detail-close]").click();

    await page.locator(`.schedule-calendar-date[data-calendar-date="${eventDate}"]`).click();
    const dateDetail = await page.locator("#schedule-detail-dialog").innerText();
    for (const expected of ["卒業検定", "学科教習", "休校案内", "補足本文B", "補足本文C"]) {
      assert(dateDetail.includes(expected), `${label}/日付詳細: 「${expected}」がありません。`);
    }
    await page.keyboard.press("Escape");

    await page.locator('[data-calendar-view="week"]').click();
    await page.waitForSelector(".schedule-week-view");
    assert(await page.locator('[data-calendar-view="week"]').getAttribute("aria-pressed") === "true", `${label}: 週ビューへ切り替わりません。`);
    const weekText = await page.locator("#schedule-calendar-panel").innerText();
    assert(weekText.includes("卒業検定"), `${label}/週: 予定が表示されていません。`);
    assert(!weekText.includes("集合は受付前です"), `${label}/週: 補足が一覧に露出しています。`);
    await assertNoOverflow(page, `${label}/週`);

    await page.locator('[data-calendar-view="day"]').click();
    await page.waitForSelector(".schedule-day-view");
    assert(await page.locator(".schedule-day-view .schedule-calendar-event").count() === 3, `${label}/日: 当日の予定3件が揃っていません。`);
    const dayText = await page.locator("#schedule-calendar-panel").innerText();
    assert(!dayText.includes("補足本文B"), `${label}/日: 補足が一覧に露出しています。`);
    await assertNoOverflow(page, `${label}/日`);

    await page.locator('[data-calendar-view="month"]').click();
    const nextMonth = page.locator('[data-calendar-move="1"]');
    for (let index = 0; index < 3; index += 1) {
      assert(await nextMonth.isEnabled(), `${label}: ${index + 1}か月先へ進めません。`);
      await nextMonth.click();
    }
    assert(await nextMonth.isDisabled(), `${label}: 3か月先を超えて進めてしまいます。`);
    await assertNoOverflow(page, `${label}/3か月先`);
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    await runViewport(browser, { width: 1440, height: 900 });
    await runViewport(browser, { width: 390, height: 844 });
    console.log(JSON.stringify({
      ok: true,
      checks: [
        "月・週・日ビュー切替",
        "月セルはタイトル・種別・時刻のみ",
        "予定クリック・日付クリック詳細",
        "月セル最大2件＋残り件数",
        "当月から3か月先までのナビ制限",
        "PC 1440px・スマホ390px横スクロールなし"
      ]
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
