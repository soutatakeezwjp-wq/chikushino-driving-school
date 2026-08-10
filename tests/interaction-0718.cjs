const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8765";
const executablePath = process.env.PLAYWRIGHT_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

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
  await page.route("**/api/cms/events*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      schedule: {
        updatedAt: "2026-07-18T00:00:00.000Z",
        today: [{ date: "2026-07-18", title: "教習予定", note: "受付確認" }],
        week: [],
        month: []
      }
    })
  }));
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(500);
  return page;
}

async function selectChoice(page, selector) {
  await page.locator(selector).evaluate((input) => {
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const checks = [];
  try {
    const top = await openPage(context, "/index.html");
    assert(await top.locator("#price-simulator").count() === 1, "トップの料金シミュレーターが表示されていません。");
    assert(await top.locator("#sim-course option").count() === 8, "料金シミュレーターの免許区分が8種類ではありません。");
    assert((await top.locator("#sim-course").textContent()).includes("MT大型二輪車"), "MT大型二輪車が料金シミュレーターにありません。");
    const courseValues = await top.locator("#sim-course option").evaluateAll((options) => options.map((option) => option.value));
    for (const value of courseValues) {
      await top.selectOption("#sim-course", value);
      assert(await top.locator("#sim-license option").count() > 0, `${value}の現有免許選択肢がありません。`);
      const total = Number((await top.locator("#sim-total-price").textContent()).replace(/\D/g, ""));
      assert(total > 0, `${value}の料金を計算できません。`);
    }
    assert((await top.locator("#sim-apply").getAttribute("href")).includes("estimatedPrice="), "シミュレーター結果が仮申込へ引き継がれません。");
    assert((await top.locator("#sim-status-note").textContent()).includes("割引は含まれていません"), "シミュレーターに割引未適用の案内がありません。");
    assert((await top.locator("#sim-discount-link").getAttribute("href")).includes("#discount-guide"), "割引案内への導線がありません。");
    await top.locator("#open-option-details").click();
    assert(await top.locator("#option-details-dialog").evaluate((dialog) => dialog.open), "オプション詳細が開きません。");
    assert(await top.locator("#option-details-body tr").count() >= 3, "オプション詳細が不足しています。");
    const optionDetails = await top.locator("#option-details-body").textContent();
    assert(["コミコミプラン", "スケジュールプラン", "合宿風ハイスピードプラン"].every((label) => optionDetails.includes(label)), "3種類のオプション説明が揃っていません。");
    await top.locator("[data-dialog-close]").click();
    assert(await top.locator('a[href="detail.html?page=price"]').count() >= 3, "料金ページへの導線が不足しています。");
    checks.push("home-fee-simulator");
    await top.close();

    const standard = await openPage(context, "/detail.html?page=standard");
    assert(await standard.locator("#price-simulator, .simulator").count() === 0, "サブページに料金シミュレーターが残っています。");
    assert(await standard.locator("#discount-guide picture").count() === 1, "普通車の割引案内が表示されていません。");
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
    let submissionCount = 0;
    await application.route("**/api/application", async (route) => {
      submissionCount += 1;
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
    await selectChoice(application, '[name="gender"][value="男性"]');
    await application.fill('[name="birthdate"]', "2000-01-01");
    await application.fill('[name="email"]', "test@example.com");
    await application.fill('[name="phone"]', "09012345678");
    await application.fill('[name="postalCode"]', "818-0025");
    await application.fill('[name="address"]', "福岡県筑紫野市筑紫120番地1");
    await selectChoice(application, '[name="occupation"][value="大学生"]');
    assert(await application.locator(".application-section").count() === 4, "フォームの01・02が統合されていません。");
    assert(await application.locator(".application-section-no").allTextContents().then((values) => values.join(",")) === "01,02,03,04", "フォームのセクション番号が正しくありません。");
    assert(await application.locator('[name="desiredEntryDate"]').getAttribute("required") !== null, "入校希望日が必須ではありません。");
    await application.fill('[name="desiredEntryDate"]', "2026-08-06");
    await selectChoice(application, '[name="desiredVehicles"][value="AT普通車"]');
    assert(await application.locator('[name="optionPlans"]:not([disabled])').count() === 3, "AT普通車で3つのオプションが表示されていません。");
    await selectChoice(application, '[name="desiredVehicles"][value="MT普通車"]');
    assert(await application.locator('[name="optionPlans"]:not([disabled])').count() === 1, "AT普通車・MT普通車の共通オプションが1つに絞られていません。");
    await selectChoice(application, '[name="currentLicenses"][value="持っていない"]');
    await selectChoice(application, '[name="lessonPlan"][value="デイプラン"]');
    await selectChoice(application, '[name="optionPlans"][value="スケジュールプラン"]');
    await selectChoice(application, '[name="paymentMethod"][value="未定"]');
    await selectChoice(application, '[name="howKnown"][value="インターネット"]');
    await selectChoice(application, '[name="admissionMotives"][value="自宅から近い"]');
    const expectedCounts = { occupation: 10, desiredVehicles: 10, currentLicenses: 21, lessonPlan: 2, optionPlans: 3, paymentMethod: 4, howKnown: 7, admissionMotives: 8 };
    for (const [name, count] of Object.entries(expectedCounts)) {
      assert(await application.locator(`[name="${name}"]`).count() === count, `${name}の選択肢数が従来フォームと一致しません。`);
    }
    assert(await application.locator('[name="preferredContactMethod"], [name="materialDelivery"]').count() === 0, "従来カンプにない追加項目が残っています。");
    await application.check('[name="privacyConsent"]', { force: true });
    await application.locator('button[type="submit"]').click();
    await application.waitForSelector("#application-status.is-success");
    const successMessage = await application.locator("#application-status").textContent();
    assert(successMessage.includes("入力いただいたメールアドレス宛にメールが届きますので、ご確認お願いします。"), "メール確認の完了案内がありません。");
    assert(successMessage.includes("10秒ほどお時間かかる場合がございます"), "メール到着時間の案内がありません。");
    assert(successMessage.includes("受付ID：TEST-0718"), "完了案内に受付IDがありません。");
    assert(submissionCount === 1, "フォームから申込APIが複数回呼ばれています。");
    assert(submittedPayload?.desiredVehicles?.length === 2, "希望車種が配列で送信されていません。");
    assert(submittedPayload?.currentLicenses?.[0] === "持っていない", "現有免許が配列で送信されていません。");
    assert(submittedPayload?.optionPlans?.[0] === "スケジュールプラン", "対象車種に合うオプションが配列で送信されていません。");
    assert(submittedPayload?.howKnown?.[0] === "インターネット", "認知経路が配列で送信されていません。");
    assert(submittedPayload?.admissionMotives?.[0] === "自宅から近い", "入校動機が配列で送信されていません。");
    assert(submittedPayload?.desiredEntryDate === "2026-08-06", "入校希望日が送信されていません。");
    assert(submittedPayload?.formVersion === "2026-07-28.1", "フォームバージョンが更新されていません。");
    checks.push("application-flow");
    await application.close();

    const materialRequest = await openPage(context, "/detail.html?page=application&purpose=%E8%B3%87%E6%96%99%E8%AB%8B%E6%B1%82");
    assert(await materialRequest.locator('[name="purpose"]').getAttribute("value") === "資料請求", "資料請求フォームとして判別されていません。");
    assert(await materialRequest.locator('[name="desiredEntryDate"]').getAttribute("required") === null, "資料請求の検討日が任意になっていません。");
    assert((await materialRequest.locator("#desired-entry-date-help").textContent()).includes("未定の場合は空欄"), "資料請求の日程案内が更新されていません。");
    checks.push("material-request-optional-date");
    await materialRequest.close();

    const instructors = await openPage(context, "/detail.html?page=instructors");
    assert(await instructors.locator(".instructor-card").count() === 19, "指導員が19名表示されていません。");
    assert(await instructors.locator('[aria-label="四輪担当"]').count() === 19, "四輪担当アイコンの人数がExcelと一致しません。");
    assert(await instructors.locator('[aria-label="二輪担当"]').count() === 7, "二輪担当アイコンの人数がExcelと一致しません。");
    const brokenInstructors = await instructors.locator(".instructor-card img").evaluateAll((images) => images.filter((image) => image.complete && image.naturalWidth === 0).length);
    assert(brokenInstructors === 0, "指導員画像に読み込み失敗があります。");
    checks.push("instructors");
    await instructors.close();

    const schedule = await openPage(context, "/detail.html?page=teaching");
    await schedule.waitForFunction(() => document.querySelector(".schedule-calendar-event")?.textContent?.includes("教習予定"));
    assert(!(await schedule.locator("#schedule-calendar-panel").textContent()).includes("受付確認"), "予定の補足が月間カレンダーに露出しています。");
    assert(await schedule.locator("[data-calendar-view]").count() === 3, "月・週・日の表示切替が揃っていません。");
    await schedule.locator(".schedule-calendar-event-button").click();
    assert((await schedule.locator("#schedule-detail-dialog").textContent()).includes("受付確認"), "予定の詳細に補足が表示されません。");
    await schedule.locator("[data-calendar-detail-close]").click();
    assert(await schedule.locator(".schedule-calendar-weekdays span").count() === 7, "曜日見出しが7日分表示されていません。");
    assert(await schedule.locator(".schedule-calendar-day:not(.is-outside)").count() >= 28, "1か月分の日付が表示されていません。");
    const firstMonthLabel = await schedule.locator("#schedule-month-label").textContent();
    const nextMonth = schedule.locator('[data-calendar-move="1"]');
    assert(await nextMonth.isEnabled(), "次月ボタンが利用できません。");
    await nextMonth.click();
    await schedule.waitForFunction((label) => document.querySelector("#schedule-month-label")?.textContent !== label, firstMonthLabel);
    assert((await schedule.locator(".schedule-calendar-empty").textContent()).includes("予定は受付へご確認ください"), "予定がない月の案内が表示されません。");
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
