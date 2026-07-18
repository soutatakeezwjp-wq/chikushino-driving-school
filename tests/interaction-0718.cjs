const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8765";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function openPage(context, path) {
  const page = await context.newPage();
  await page.route("**/api/wordpress-posts*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ posts: [] })
  }));
  await page.route("**/api/public-schedule*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      schedule: {
        updatedAt: "2026-07-18T00:00:00.000Z",
        today: [{ date: "7月18日", title: "教習予定", note: "受付確認" }],
        week: [],
        month: []
      }
    })
  }));
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(500);
  return page;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const checks = [];
  try {
    const top = await openPage(context, "/index.html");
    assert(await top.locator("#price-simulator, #simulateButton").count() === 0, "トップに料金シミュレーターが残っています。");
    assert(await top.locator('a[href="detail.html?page=price"]').count() >= 3, "正式料金ページへの導線が不足しています。");
    checks.push("official-fee-links");
    await top.close();

    const standard = await openPage(context, "/detail.html?page=standard");
    assert(await standard.locator("#price-simulator, .simulator").count() === 0, "サブページに料金シミュレーターが残っています。");
    await standard.locator('[data-fee-view="breakdown"]').click();
    assert(await standard.locator("#fee-detail-modal").getAttribute("aria-hidden") === "false", "料金内訳モーダルが開きません。");
    assert(await standard.locator(".r-modal-row").count() > 3, "料金内訳が不足しています。");
    assert(await standard.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "料金モーダルで横スクロールが発生しています。");
    await standard.keyboard.press("Escape");
    assert(await standard.locator("#fee-detail-modal").getAttribute("aria-hidden") === "true", "料金内訳モーダルを閉じられません。");
    checks.push("fee-modal");
    await standard.close();

    const application = await openPage(context, "/detail.html?page=application");
    let submittedPayload = null;
    await application.route("**/api/application", async (route) => {
      submittedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, applicationId: "TEST-0718" })
      });
    });
    await application.fill('[name="familyName"]', "テスト");
    await application.fill('[name="givenName"]', "太郎");
    await application.fill('[name="familyKana"]', "テスト");
    await application.fill('[name="givenKana"]', "タロウ");
    await application.fill('[name="birthdate"]', "2000-01-01");
    await application.fill('[name="email"]', "test@example.com");
    await application.fill('[name="phone"]', "09012345678");
    await application.fill('[name="postalCode"]', "818-0025");
    await application.fill('[name="address"]', "福岡県筑紫野市筑紫120番地1");
    assert(await application.locator("#application-quote").count() === 0, "申込フォームに不要な料金シミュレーション表示が残っています。");
    await application.check('[name="privacyConsent"]');
    await application.locator('button[type="submit"]').click();
    await application.waitForSelector("#application-status.is-success");
    assert(submittedPayload?.estimatedPrice === 322850, "送信データの概算料金が一致しません。");
    assert(submittedPayload?.priceCourse === "ordinary_at", "送信データの料金コースが一致しません。");
    assert(submittedPayload?.materialDelivery === "デジタル送付を希望", "資料受取方法がGASと一致しません。");
    checks.push("application-flow");
    await application.close();

    const instructors = await openPage(context, "/detail.html?page=instructors");
    assert(await instructors.locator(".instructor-card").count() === 9, "指導員が9名表示されていません。");
    const brokenInstructors = await instructors.locator(".instructor-card img").evaluateAll((images) => images.filter((image) => image.complete && image.naturalWidth === 0).length);
    assert(brokenInstructors === 0, "指導員画像に読み込み失敗があります。");
    checks.push("instructors");
    await instructors.close();

    const schedule = await openPage(context, "/detail.html?page=teaching");
    await schedule.waitForFunction(() => document.querySelector("#schedule-panels")?.textContent?.includes("教習予定"));
    assert((await schedule.locator("#schedule-panels").textContent()).includes("受付確認"), "公開日程APIの内容が表示されません。");
    assert(await schedule.locator(".schedule-group").count() === 3, "本日・今週・今月が縦に3区分表示されていません。");
    assert(await schedule.locator(".schedule-group > h3").allTextContents().then((items) => items.join("/") === "本日/今週/今月"), "日程の表示順が本日・今週・今月になっていません。");
    checks.push("public-schedule");
    await schedule.close();

    console.log(JSON.stringify({ ok: true, checks }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
