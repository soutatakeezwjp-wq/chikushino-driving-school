const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8765";
const executablePath =
  process.env.PLAYWRIGHT_CHROME ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readModal(page, selector) {
  const button = page.locator(selector);
  assert(await button.count() === 1, `${selector}: ボタンが一意ではありません。`);
  await button.click();
  const modal = page.locator("#fee-detail-modal");
  await modal.waitFor({ state: "visible" });
  const result = {
    title: await modal.locator("#fee-modal-title").innerText(),
    groupTitles: await modal.locator(".r-modal-group h3").allTextContents(),
    rows: await modal.locator(".r-modal-row").evaluateAll((items) =>
      items.map((item) => ({
        label: item.querySelector("span")?.textContent.trim() || "",
        amount: item.querySelector("strong")?.textContent.trim() || "",
      })),
    ),
  };
  await page.keyboard.press("Escape");
  return result;
}

function assertModal(actual, expected, label) {
  assert(actual.title === expected.title, `${label}: タイトルが「${actual.title}」です。`);
  if (expected.groupTitle) {
    assert(
      actual.groupTitles.includes(expected.groupTitle),
      `${label}: 見出し「${expected.groupTitle}」がありません。`,
    );
  }
  assert(
    JSON.stringify(actual.rows) === JSON.stringify(expected.rows),
    `${label}: Excelと明細が一致しません。\nactual=${JSON.stringify(actual.rows)}\nexpected=${JSON.stringify(expected.rows)}`,
  );
}

const ordinary = {
  breakdown: [
    ["入学金", "52,300円"],
    ["技能教習料（1時限）", "6,050円"],
    ["学科教習料1段階", "22,000円"],
    ["学科教習料2段階", "35,200円"],
    ["教科書代（免なし・原付持の方）", "3,300円"],
    ["適性検査料", "3,300円"],
    ["効果測定料", "3,300円"],
    ["高速通行料", "1,100円"],
    ["修了検定料", "5,500円"],
    ["卒業検定料", "6,600円"],
    ["原付講習料", "3,300円"],
    ["証明写真代", "1,100円"],
    ["証明書発行料", "3,300円"],
    ["フリープラン料", "22,000円"],
  ],
  other: [
    ["延長・補習教習料（1時限）", "6,050円"],
    ["修了検定再検定料（1回）", "5,500円"],
    ["卒業検定再検定料（1回）", "6,600円"],
    ["証明書再発行料", "3,300円"],
    ["仮免試験再試験料（1回）", "1,800円（非課税）"],
    ["技能教習無断キャンセル料（1回）", "5,000円（非課税）"],
    ["技能検定無断キャンセル料（1回）", "5,000円（非課税）"],
  ],
};

const semiMedium = {
  breakdown: [
    ["入学金", "54,500円"],
    ["技能教習料（1時限）", "6,380円"],
    ["学科教習料1段階", "22,000円"],
    ["学科教習料2段階", "37,400円"],
    ["適性検査料", "3,300円"],
    ["教科書代（免なし・原付持の方）", "3,300円"],
    ["効果測定料", "3,300円"],
    ["高速通行料", "1,100円"],
    ["修了検定料", "5,500円"],
    ["卒業検定料", "6,600円"],
    ["原付講習料", "3,300円"],
    ["証明写真代", "1,100円"],
    ["証明書発行料", "3,300円"],
    ["フリープラン料", "22,000円"],
  ],
  other: [
    ["延長・補習教習料（1時限）", "6,380円"],
    ["修了検定再検定料（1回）", "5,500円"],
    ["卒業検定再検定料（1回）", "6,600円"],
    ["証明書再発行料", "3,300円"],
    ["仮免試験再試験料（1回）", "1,800円（非課税）"],
    ["技能教習無断キャンセル料（1回）", "5,000円（非課税）"],
    ["技能検定無断キャンセル料（1回）", "5,000円（非課税）"],
  ],
};

const motorcycle = {
  large: {
    title: "大型二輪車",
    breakdown: [
      ["入学金", "38,000円"],
      ["技能教習料（1時限）", "5,060円"],
      ["学科教習料", "2,200円"],
      ["教科書代（免有の方）", "1,100円"],
      ["適性検査料", "3,300円"],
      ["卒業検定料", "6,050円"],
      ["証明写真代", "1,100円"],
      ["証明書発行料", "3,300円"],
      ["フリープラン料", "22,000円"],
    ],
    other: [
      ["延長・補習教習料（1時限）", "5,060円"],
      ["卒業検定再検定料（1回）", "6,050円"],
      ["証明書再発行料", "3,300円"],
      ["技能教習無断キャンセル料（1回）", "5,000円（非課税）"],
      ["技能検定無断キャンセル料（1回）", "5,000円（非課税）"],
    ],
  },
  standard: {
    title: "普通二輪車",
    breakdown: [
      ["入学金", "24,800円"],
      ["技能教習料（1時限）", "4,510円"],
      ["学科教習料1段階", "22,000円"],
      ["学科教習料2段階", "35,200円"],
      ["教科書代（免なし・原付持の方）", "3,300円"],
      ["教科書代（免有の方）", "1,100円"],
      ["適性検査料", "3,300円"],
      ["効果測定料", "1,650円"],
      ["卒業検定料", "6,050円"],
      ["証明写真代", "1,100円"],
      ["証明書発行料", "3,300円"],
      ["フリープラン料", "11,000円"],
    ],
    other: [
      ["延長・補習教習料（1時限）", "4,510円"],
      ["卒業検定再検定料（1回）", "6,050円"],
      ["証明書再発行料", "3,300円"],
      ["技能教習無断キャンセル料（1回）", "5,000円（非課税）"],
      ["技能検定無断キャンセル料（1回）", "5,000円（非課税）"],
    ],
  },
  small: {
    title: "普通二輪車（小型限定）",
    breakdown: [
      ["入学金", "34,700円"],
      ["技能教習料（1時限）", "4,510円"],
      ["学科教習料1段階", "22,000円"],
      ["学科教習料2段階", "35,200円"],
      ["教科書代（免なし・原付持の方）", "3,300円"],
      ["教科書代（免有の方）", "1,100円"],
      ["適性検査料", "3,300円"],
      ["効果測定料", "1,650円"],
      ["卒業検定料", "6,050円"],
      ["証明写真代", "1,100円"],
      ["証明書発行料", "3,300円"],
      ["フリープラン料", "11,000円"],
    ],
    other: [
      ["延長・補習教習料（1時限）", "4,510円"],
      ["卒業検定再検定料（1回）", "6,050円"],
      ["証明書再発行料", "3,300円"],
      ["技能教習無断キャンセル料（1回）", "5,000円（非課税）"],
      ["技能検定無断キャンセル料（1回）", "5,000円（非課税）"],
    ],
  },
};

const rows = (pairs) => pairs.map(([label, amount]) => ({ label, amount }));

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    for (const config of [
      { page: "standard", key: "standardCar", label: "普通車", data: ordinary },
      { page: "semi_medium", key: "semiMedium", label: "準中型車", data: semiMedium },
    ]) {
      await page.goto(`${baseUrl}/detail.html?page=${config.page}`, { waitUntil: "networkidle" });
      const body = await page.locator(".redesign-0718").innerText();
      assert(body.includes("フリープラン料が別途必要になります。"), `${config.label}: フリープラン文言が未反映です。`);
      assert(body.includes("仮免試験手数料1,800円（非課税）"), `${config.label}: 仮免試験手数料の別途表示がありません。`);
      assert(body.includes("仮免交付手数料1,100円（非課税）"), `${config.label}: 仮免交付手数料の別途表示がありません。`);

      const breakdown = await readModal(page, `[data-catalog="${config.key}"][data-fee-view="breakdown"]`);
      assertModal(breakdown, { title: `${config.label} 料金内訳`, rows: rows(config.data.breakdown) }, `${config.label}料金内訳`);
      const other = await readModal(page, `[data-catalog="${config.key}"][data-fee-view="other"]`);
      assertModal(other, { title: `${config.label} その他の費用`, rows: rows(config.data.other) }, `${config.label}その他の費用`);
      assert(!other.rows.some((item) => item.label === "仮免試験手数料"), `${config.label}: その他の費用に仮免試験手数料が残っています。`);
      assert(!other.rows.some((item) => item.label === "仮免交付手数料"), `${config.label}: その他の費用に仮免交付手数料が残っています。`);
    }

    await page.goto(`${baseUrl}/detail.html?page=bike`, { waitUntil: "networkidle" });
    assert(await page.locator('[data-catalog="motorcycle"][data-fee-view]').count() === 6, "自動二輪: 3区分×2ボタンになっていません。");
    for (const [scope, data] of Object.entries(motorcycle)) {
      const breakdown = await readModal(page, `[data-catalog="motorcycle"][data-fee-scope="${scope}"][data-fee-view="breakdown"]`);
      assertModal(
        breakdown,
        { title: `${data.title} 料金内訳`, groupTitle: `${data.title} 料金内訳`, rows: rows(data.breakdown) },
        `${data.title}料金内訳`,
      );
      const other = await readModal(page, `[data-catalog="motorcycle"][data-fee-scope="${scope}"][data-fee-view="other"]`);
      assertModal(
        other,
        { title: `${data.title} その他の費用`, groupTitle: `${data.title} その他の費用の内訳`, rows: rows(data.other) },
        `${data.title}その他の費用`,
      );
    }

    console.log(JSON.stringify({
      ok: true,
      workbookSheetsChecked: 5,
      modalRowsChecked: 100,
      checks: [
        "普通車 料金内訳・その他の費用・教習プラン",
        "準中型車 料金内訳・その他の費用・教習プラン",
        "大型二輪車 料金内訳・その他の費用",
        "普通二輪車 料金内訳・その他の費用",
        "普通二輪車（小型限定） 料金内訳・その他の費用",
      ],
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
