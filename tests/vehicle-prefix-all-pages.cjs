const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8765";
const executablePath = process.env.PLAYWRIGHT_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const pageIds = [
  "admission", "application", "license", "introduction", "courses", "standard", "camp_price",
  "semi_medium", "bike", "limited", "paper", "senior", "motorcycle", "training", "price",
  "access", "faq", "school", "company", "facilities", "instructors", "topics", "recruit",
  "students", "teaching", "syuryokentei", "sotsugyoukentei", "privacy", "sitemap"
];
const viewports = [
  { name: "pc", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 }
];
const suffixPatternSource = String.raw`(普通車|準中型車|大型二輪車|普通二輪車|小型二輪車|小型限定)\s*[（(]\s*(AT|MT)\s*[）)]|(普通車|準中型車|大型二輪車|普通二輪車|小型二輪車)\s+(AT|MT)(?=\s|$)`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  const checks = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      for (const id of pageIds) {
        const page = await context.newPage();
        const response = await page.goto(`${baseUrl}/detail.html?page=${id}`, {
          waitUntil: "domcontentloaded",
          timeout: 30000
        });
        await page.waitForTimeout(400);
        assert(response?.ok(), `${viewport.name}/${id}: HTTP ${response?.status()}`);
        const text = await page.locator("body").innerText();
        const matches = [...text.matchAll(new RegExp(suffixPatternSource, "g"))].map((match) => match[0]);
        assert(matches.length === 0, `${viewport.name}/${id}: 後置表記が残っています: ${[...new Set(matches)].join(" / ")}`);
        checks.push(`${viewport.name}/${id}`);
        await page.close();
      }
      await context.close();
    }

    const context = await browser.newContext({ viewport: viewports[0] });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/detail.html?page=bike`, { waitUntil: "domcontentloaded" });
    const labels = await page.locator(".fee-course").allTextContents();
    for (const expected of [
      "MT大型二輪車",
      "MT普通二輪車",
      "AT普通二輪車",
      "MT普通二輪車（小型限定）",
      "AT普通二輪車（小型限定）"
    ]) {
      assert(labels.includes(expected), `bike: 「${expected}」が料金表にありません。`);
    }
    assert(!labels.some((label) => new RegExp(suffixPatternSource).test(label)), `bike: 車種列に後置表記が残っています。`);
    await context.close();
    console.log(JSON.stringify({ ok: true, checks: checks.length, bikeLabels: [...new Set(labels)] }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
