const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8788";
const executablePath = process.env.PLAYWRIGHT_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const targetPages = ["admission", "standard", "semi_medium", "bike", "limited", "paper", "price"];
const viewports = [
  { name: "pc", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
  { name: "mobile-small", width: 375, height: 812 }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function openPage(context, id) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(`${baseUrl}/detail.html?page=${id}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000
  });
  await page.waitForTimeout(500);
  assert(response?.ok(), `${id}: HTTP ${response?.status()}`);
  assert(errors.length === 0, `${id}: JavaScript error: ${errors.join(" / ")}`);
  return page;
}

async function assertViewport(page, id, viewport) {
  const audit = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    brokenImages: Array.from(document.images)
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src)
  }));
  assert(audit.scrollWidth <= audit.clientWidth + 1, `${viewport.name}/${id}: 横スクロールが発生しています (${audit.scrollWidth}/${audit.clientWidth})`);
  assert(audit.brokenImages.length === 0, `${viewport.name}/${id}: 画像切れ ${audit.brokenImages.join(", ")}`);
}

async function checkAdmission(page, viewport) {
  const text = await page.locator(".redesign-0718").innerText();
  const expectedFlows = [
    ["必要書類を準備", "入校手続き来校", "写真撮影・視力検査", "入校日を決定", "入校受付完了"],
    ["入校式", "適性検査・学科1", "第1段階 技能教習（場内）・学科教習", "修了検定", "仮免学科試験", "第2段階 技能教習（路上）・学科教習", "卒業検定", "卒業証明書", "本免学科試験", "運転免許証交付"],
    ["AT普通車課程", "AT卒業検定", "MT技能教習", "技能審査", "卒業証明書", "本免学科試験", "運転免許証交付"],
    ["入校式", "適性検査", "第1段階 技能・学科教習", "第2段階 技能・学科教習", "卒業検定", "卒業証明書", "免許センター", "運転免許証交付"]
  ];
  const expectedTimes = [
    "8:30〜9:20", "9:30〜10:20", "10:30〜11:20", "11:30〜12:20",
    "12:30〜13:20", "13:30〜14:20", "14:30〜15:20", "15:30〜16:20",
    "16:30〜17:20", "17:40〜18:30", "18:40〜19:30", "19:40〜20:30"
  ];
  assert(!text.includes("仮申込・来校予約"), `${viewport.name}/admission: 削除対象の旧工程が残っています。`);
  assert(!text.includes("入校説明・教習開始"), `${viewport.name}/admission: 削除対象の旧最終工程が残っています。`);
  assert(await page.locator("#entry-flow .flow-artwork").count() === 1, `${viewport.name}/admission: 5段階フロー画像がありません。`);
  assert(await page.locator("#license-flow .flow-artwork").count() === 3, `${viewport.name}/admission: 免許交付画像が3種類ではありません。`);
  assert(await page.locator("#lesson-time .time-cell").count() === 0, `${viewport.name}/admission: 削除対象の教習時間カードが残っています。`);
  assert(await page.locator("#lesson-time .plan-guide-card").count() === 0, `${viewport.name}/admission: 削除対象のプランカードが残っています。`);
  assert(await page.locator("#lesson-time .lesson-time-figure img").count() === 1, `${viewport.name}/admission: 指定された教習時間図がありません。`);
  const lessonImage = page.locator("#lesson-time .lesson-time-figure img");
  await lessonImage.evaluate((image) => image.complete || new Promise((resolve) => image.addEventListener("load", resolve, { once: true })));
  assert(await lessonImage.evaluate((image) => image.naturalWidth > 0 && image.currentSrc.endsWith("/images/detail-pages/admission/lesson-times-official.png")), `${viewport.name}/admission: 教習時間図が指定画像ではありません。`);
  const actualTimes = await page.locator(".lesson-time-text li").evaluateAll((items) => items.map((item) => item.textContent.replace(/^\d+時限\s*/, "").trim()));
  assert(JSON.stringify(actualTimes) === JSON.stringify(expectedTimes), `${viewport.name}/admission: 教習時間がExcelと一致しません。`);
  assert(text.includes("現有免許により学科教習時限が異なります。"), `${viewport.name}/admission: 自動二輪の注記がありません。`);
  assert(await page.locator(".visually-hidden h3", { hasText: "自動二輪の免許証交付まで" }).count() === 1, `${viewport.name}/admission: 自動二輪の正式見出しがありません。`);
  for (const keyword of [
    "入校申込書", "住民票", "発行から6か月以内", "マイナ免許証",
    "外国籍の方", "国籍を記載した住民票", "在留カード",
    "学生証の提示で学生料金", "カラーコンタクト", "交通系ICカード",
    "お申込手続き後、入校日前日まで", "教習ローン", "QRコード決済",
    "17歳6か月以上", "身体に障がいをお持ちの方", "深視力"
  ]) {
    assert(text.includes(keyword), `${viewport.name}/admission: 「${keyword}」がありません。`);
  }
  const actualFlows = await page.locator(".visually-hidden ol").evaluateAll((lists) =>
    lists.map((list) => Array.from(list.querySelectorAll("li strong"), (item) => item.textContent.trim()))
  );
  assert(JSON.stringify(actualFlows) === JSON.stringify(expectedFlows), `${viewport.name}/admission: 工程の順番または文言がExcelと一致しません。`);
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll(".flow-artwork img"));
    return images.length === 4 && images.every((image) => image.complete && image.naturalWidth > 0 && image.currentSrc);
  }, { timeout: 15000 });
  const imageSources = await page.locator(".flow-artwork img").evaluateAll((images) => images.map((image) => image.currentSrc));
  const expectedSuffix = viewport.width <= 560 ? "-mobile.webp" : "-desktop.webp";
  assert(imageSources.every((source) => source.endsWith(expectedSuffix)), `${viewport.name}/admission: 端末専用画像へ切り替わっていません。`);
}

async function checkFeePage(page, id, viewport) {
  const root = page.locator(".redesign-0718");
  assert(await root.locator('a[href$=".pdf"]').count() === 0, `${viewport.name}/${id}: PDFボタンが残っています。`);
  assert(await root.locator(".plan-guide-card").count() === 2, `${viewport.name}/${id}: 教習プランがデイ・フリーの2種類ではありません。`);
  assert(await root.locator("text=限定解除・移行").count() === 0, `${viewport.name}/${id}: 個別料金ページに限定解除欄が残っています。`);
  const expectedNotices = id === "bike" ? 6 : 7;
  assert(await root.locator(".r-notice > div").count() === expectedNotices, `${viewport.name}/${id}: 注意事項が${expectedNotices}項目ではありません。`);
  assert(await root.locator(".separate-fee-note").count() === (id === "bike" ? 0 : 1), `${viewport.name}/${id}: 仮免手数料の表示が正しくありません。`);
  if (id === "bike") {
    const groupTitles = await root.locator(".fee-vehicle-heading h3").allTextContents();
    assert(JSON.stringify(groupTitles) === JSON.stringify(["大型二輪車", "普通二輪車", "普通二輪車（小型限定）"]), `${viewport.name}/${id}: 車種区分が正しくありません。`);
    assert(await root.locator(".fee-category-nav a").count() === 3, `${viewport.name}/${id}: 車種ナビが3区分ではありません。`);
    assert(await root.locator("#large-motorcycle-fees [data-fee-row]").count() === 10, `${viewport.name}/${id}: 大型二輪車の料金行が5件ではありません。`);
    assert(await root.locator("#standard-motorcycle-fees [data-fee-row]").count() === 8, `${viewport.name}/${id}: 普通二輪車の料金行が4件ではありません。`);
    assert(await root.locator("#small-motorcycle-fees [data-fee-row]").count() === 8, `${viewport.name}/${id}: 小型限定の料金行が4件ではありません。`);
  }

  await root.locator('[data-fee-view="breakdown"]').click();
  const modalText = await root.locator("#fee-modal-content").innerText();
  assert(!modalText.includes("限定解除"), `${viewport.name}/${id}: 通常料金モーダルに限定解除料金が混ざっています。`);
  if (id === "bike") {
    const comparison = root.locator(".r-motorcycle-comparison");
    assert(await comparison.count() === 1, `${viewport.name}/bike: 二輪料金内訳が比較表になっていません。`);
    assert(await comparison.locator(".r-motorcycle-comparison-row").count() === 12, `${viewport.name}/bike: 二輪料金内訳の項目数が正しくありません。`);
    const vehicleLabels = await comparison.locator(".r-motorcycle-fee-amount").evaluateAll((items) => items.map((item) => item.dataset.vehicle));
    assert(vehicleLabels.includes("大型二輪車") && vehicleLabels.includes("普通・小型二輪車"), `${viewport.name}/bike: 二輪料金内訳の車種見出しがありません。`);
    assert(modalText.includes("教科書代（免許なし・原付）") && modalText.includes("教科書代（免許あり）"), `${viewport.name}/bike: 教科書代の適用条件が明記されていません。`);
    const skillRow = comparison.locator(".r-motorcycle-comparison-row").first();
    assert((await skillRow.locator(".r-motorcycle-fee-amount").allTextContents()).join("|").includes("5,060円") && (await skillRow.locator(".r-motorcycle-fee-amount").allTextContents()).join("|").includes("4,510円"), `${viewport.name}/bike: 大型・普通二輪の技能料金が同じ行で比較できません。`);
  }
  await page.keyboard.press("Escape");

  if (id === "bike") {
    await root.locator('[data-fee-view="other"]').click();
    const comparison = root.locator(".r-motorcycle-comparison");
    assert(await comparison.count() === 1, `${viewport.name}/bike: その他費用が比較表になっていません。`);
    const extensionRow = comparison.locator(".r-motorcycle-comparison-row").first();
    const extensionAmounts = (await extensionRow.locator(".r-motorcycle-fee-amount").allTextContents()).join("|");
    assert(extensionAmounts.includes("5,060円") && extensionAmounts.includes("4,510円"), `${viewport.name}/bike: 大型・普通二輪の延長料金が同じ行で比較できません。`);
    await page.keyboard.press("Escape");
  }
}

async function checkVisibleFeeLabels(page, id, viewport) {
  const text = await page.locator("body").innerText();
  assert(!text.includes("適用日"), `${viewport.name}/${id}: 適用日が表示されています。`);
  assert(!text.includes("正式"), `${viewport.name}/${id}: 利用者向け画面に「正式」表記が残っています。`);
  assert(await page.locator('a[href$=".pdf"]:visible').count() === 0, `${viewport.name}/${id}: PDFボタンが残っています。`);
}

async function checkLimited(page, viewport) {
  const root = page.locator(".redesign-0718");
  assert(await root.locator(".fee-mobile-card").count() + await root.locator(".fee-table tbody tr").count() > 0, `${viewport.name}/limited: 限定解除料金がありません。`);
  const standardRowText = await root.locator('[data-fee-row="standard-mt-license-change-from-at"]').first().innerText();
  assert(standardRowText.includes("MT普通車") && standardRowText.includes("AT普通車"), `${viewport.name}/limited: 普通車の車種・現有免許表記がExcelと一致しません。`);
  assert(await root.locator('[data-fee-scope="license"]').count() === 6, `${viewport.name}/limited: 限定解除専用モーダルの導線が6件ではありません。`);
  assert(await root.locator('a[href$=".pdf"]').count() === 0, `${viewport.name}/limited: PDFボタンが残っています。`);
  const buttons = root.locator('[data-fee-scope="license"][data-fee-view="breakdown"]');
  for (let index = 0; index < await buttons.count(); index += 1) {
    await buttons.nth(index).click();
    const modalText = await root.locator("#fee-detail-modal").innerText();
    assert(modalText.includes("限定解除"), `${viewport.name}/limited: 限定解除専用の料金内訳が開きません。`);
    await page.keyboard.press("Escape");
  }
}

async function checkPaper(page, viewport) {
  const text = await page.locator(".redesign-0718").innerText();
  for (const keyword of [
    "ペーパードライバー講習等", "ペーパーライダー講習", "運転免許試験の受験講習",
    "外国免許からの切替講習", "1回（50分）講習", "7,000円", "13,500円",
    "20,000円", "26,500円", "33,000円", "有効期限は初回講習日から6か月間",
    "高速道路を利用する場合、通行料金は別途必要"
  ]) {
    assert(text.includes(keyword), `${viewport.name}/paper: 「${keyword}」がありません。`);
  }
  assert(await page.locator(".paper-type-grid article").count() === 4, `${viewport.name}/paper: 講習4種類が揃っていません。`);
  assert(await page.locator(".paper-rate-grid > div").count() === 4, `${viewport.name}/paper: 複数回料金が4種類ではありません。`);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  const checks = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      for (const id of targetPages) {
        const page = await openPage(context, id);
        await assertViewport(page, id, viewport);
        if (id === "admission") await checkAdmission(page, viewport);
        if (["standard", "semi_medium", "bike", "limited", "price"].includes(id)) await checkVisibleFeeLabels(page, id, viewport);
        if (["standard", "semi_medium", "bike"].includes(id)) await checkFeePage(page, id, viewport);
        if (id === "limited") await checkLimited(page, viewport);
        if (id === "paper") await checkPaper(page, viewport);
        checks.push(`${viewport.name}/${id}`);
        await page.close();
      }
      await context.close();
    }
    console.log(JSON.stringify({ ok: true, checks }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
