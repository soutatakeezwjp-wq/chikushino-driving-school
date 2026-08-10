const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8765";
const executablePath =
  process.env.PLAYWRIGHT_CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function assertIncludes(text, expected, label) {
  if (!text.includes(expected)) {
    throw new Error(`${label}: 「${expected}」が見つかりません`);
  }
}

function assertExcludes(text, unexpected, label) {
  if (text.includes(unexpected)) {
    throw new Error(`${label}: 「${unexpected}」が残っています`);
  }
}

async function openModal(page, selector) {
  await page.locator(selector).click();
  const modal = page.locator("#fee-detail-modal");
  await modal.waitFor({ state: "visible" });
  return modal.innerText();
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.goto(`${baseUrl}/detail.html?page=bike`, { waitUntil: "networkidle" });
    const bikePage = await page.locator("body").innerText();

    [
      "大型二輪車",
      "普通二輪車",
      "普通二輪車（小型限定）",
      "MT大型二輪車",
      "MT普通二輪車",
      "AT普通二輪車",
      "MT普通二輪車（小型限定）",
      "AT普通二輪車（小型限定）",
    ].forEach((text) => assertIncludes(bikePage, text, "自動二輪ページ"));

    const breakdowns = [
      {
        scope: "large",
        expected: [
          "大型二輪車 料金内訳",
          "入学金",
          "38,000円",
          "技能教習料（1時限）",
          "5,060円",
          "教科書代（免有の方）",
          "1,100円",
          "フリープラン料",
          "22,000円",
        ],
      },
      {
        scope: "standard",
        expected: [
          "普通二輪車 料金内訳",
          "入学金",
          "24,800円",
          "技能教習料（1時限）",
          "4,510円",
          "教科書代（免なし・原付持の方）",
          "3,300円",
          "フリープラン料",
          "11,000円",
        ],
      },
      {
        scope: "small",
        expected: [
          "普通二輪車（小型限定） 料金内訳",
          "入学金",
          "34,700円",
          "技能教習料（1時限）",
          "4,510円",
          "フリープラン料",
          "11,000円",
        ],
      },
    ];

    for (const item of breakdowns) {
      const text = await openModal(
        page,
        `[data-catalog="motorcycle"][data-fee-scope="${item.scope}"][data-fee-view="breakdown"]`,
      );
      item.expected.forEach((expected) =>
        assertIncludes(text, expected, `${item.scope}料金内訳`),
      );
      await page.locator("#fee-detail-modal [data-modal-close]").last().click();
    }

    const otherLarge = await openModal(
      page,
      '[data-catalog="motorcycle"][data-fee-scope="large"][data-fee-view="other"]',
    );
    [
      "延長・補習教習料（1時限）",
      "5,060円",
      "卒業検定再検定料（1回）",
      "6,050円",
      "技能教習無断キャンセル料（1回）",
      "5,000円（非課税）",
    ].forEach((text) => assertIncludes(otherLarge, text, "大型二輪その他費用"));
    await page.locator("#fee-detail-modal [data-modal-close]").last().click();

    for (const pageName of ["standard", "semi_medium"]) {
      await page.goto(`${baseUrl}/detail.html?page=${pageName}`, {
        waitUntil: "networkidle",
      });
      const body = await page.locator("body").innerText();
      assertIncludes(body, "仮免試験手数料", `${pageName}ページ`);
      assertIncludes(body, "仮免交付手数料", `${pageName}ページ`);
      assertIncludes(
        body,
        "フリープラン料が別途必要になります。",
        `${pageName}ページ`,
      );

      const other = await openModal(
        page,
        `[data-catalog="${pageName === "standard" ? "standardCar" : "semiMedium"}"][data-fee-view="other"]`,
      );
      assertExcludes(other, "仮免試験手数料", `${pageName}その他費用`);
      assertExcludes(other, "仮免交付手数料", `${pageName}その他費用`);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          checks: "車種表記・二輪3区分・料金内訳・その他費用・仮免費用分離",
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
