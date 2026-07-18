const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8765";
const outputDir = path.resolve(__dirname, "../review/0718-qa");
const pageIds = [
  "admission", "application", "license", "introduction", "courses", "standard", "camp_price",
  "semi_medium", "bike", "limited", "paper", "senior", "motorcycle", "training", "price",
  "access", "faq", "school", "company", "facilities", "instructors", "topics", "recruit",
  "students", "teaching", "syuryokentei", "sotsugyoukentei", "privacy", "sitemap"
];
const targets = [
  { id: "top", url: `${baseUrl}/index.html` },
  ...pageIds.map((id) => ({ id, url: `${baseUrl}/detail.html?page=${id}` })),
  { id: "reasons", url: `${baseUrl}/reasons/` }
];
const viewports = [
  { name: "pc", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 }
];

async function settlePageAssets(page) {
  await page.evaluate(async () => {
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    Array.from(document.images).forEach((image) => { image.loading = "eager"; });
    const step = Math.max(320, Math.floor(window.innerHeight * 0.75));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await pause(35);
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await pause(120);
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(350);
}

async function inspect(page) {
  return page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth;
    const viewportWidth = document.documentElement.clientWidth;
    const brokenImages = Array.from(document.images)
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src);
    const priceSimulatorElements = document.querySelectorAll("#price-simulator, #simulateButton, .price-simulator, .simulator-widget, [data-price-simulator]").length;
    const overflowElements = Array.from(document.querySelectorAll("body *"))
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.position === "fixed" || style.display === "none") return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.right > window.innerWidth + 2 || rect.left < -2);
      })
      .slice(0, 20)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: String(element.className || "").slice(0, 120),
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right)
      }));
    return {
      title: document.title,
      documentWidth,
      viewportWidth,
      horizontalOverflow: documentWidth > viewportWidth + 1,
      brokenImages,
      priceSimulatorElements,
      overflowElements
    };
  });
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      for (const target of targets) {
        const page = await context.newPage();
        if (/^http:\/\/(127\.0\.0\.1|localhost)/.test(baseUrl)) {
          await page.route("**/api/wordpress-posts*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ posts: [] }) }));
          await page.route("**/api/public-schedule*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, schedule: { updatedAt: new Date().toISOString(), today: [], week: [], month: [] } }) }));
          await page.route("**/api/application*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, service: "application", configured: false, turnstileSiteKey: "" }) }));
        }
        const consoleErrors = [];
        const pageErrors = [];
        page.on("console", (message) => {
          if (message.type() === "error" && !message.text().includes("public-schedule")) consoleErrors.push(message.text());
        });
        page.on("pageerror", (error) => pageErrors.push(error.message));
        const response = await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(650);
        await settlePageAssets(page);
        const audit = await inspect(page);
        const screenshot = path.join(outputDir, `${viewport.name}-${target.id}.jpg`);
        await page.screenshot({ path: screenshot, fullPage: true, type: "jpeg", quality: 68 });
        results.push({
          viewport: viewport.name,
          page: target.id,
          url: target.url,
          status: response?.status() || 0,
          ...audit,
          consoleErrors,
          pageErrors,
          screenshot: path.relative(path.resolve(__dirname, ".."), screenshot)
        });
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    total: results.length,
    failures: results.filter((result) => result.status >= 400 || result.horizontalOverflow || result.brokenImages.length || result.priceSimulatorElements || result.consoleErrors.length || result.pageErrors.length),
    results
  };
  fs.writeFileSync(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ total: report.total, failures: report.failures.length, failureSummary: report.failures.map((item) => ({ viewport: item.viewport, page: item.page, status: item.status, overflow: item.horizontalOverflow, broken: item.brokenImages.length, simulator: item.priceSimulatorElements, console: item.consoleErrors, errors: item.pageErrors })) }, null, 2));
  process.exitCode = report.failures.length ? 1 : 0;
})();
