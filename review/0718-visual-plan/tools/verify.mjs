import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const baseUrl =
  process.env.REVIEW_URL ||
  "http://127.0.0.1:4178/review/0718-visual-plan/";

const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
  await page.evaluate(() => document.fonts?.ready);

  const auditCount = await page.locator(".audit-card").count();
  const brokenImages = await page.locator("img").evaluateAll((images) =>
    images
      .filter(
        (image) =>
          image.getAttribute("src") &&
          (!image.complete || image.naturalWidth === 0)
      )
      .map((image) => image.getAttribute("src"))
  );
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  await page.screenshot({
    path: `/tmp/chikushino-visual-plan-home-${viewport.name}.png`,
    fullPage: false,
  });
  await page.locator("#chapter-02").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `/tmp/chikushino-visual-plan-chapter-${viewport.name}.png`,
    fullPage: false,
  });

  if (viewport.name === "desktop") {
    await page.getByRole("button", { name: "スマホ", exact: true }).click();
    const pressed = await page
      .getByRole("button", { name: "スマホ", exact: true })
      .getAttribute("aria-pressed");
    if (pressed !== "true") errors.push("Device toggle did not switch to mobile.");
    await page.selectOption("#chapter-filter", "08");
    const visibleChapters = await page.locator(".chapter:not([hidden])").count();
    if (visibleChapters !== 1) errors.push("Chapter filter did not isolate one chapter.");
    await page.selectOption("#chapter-filter", "all");
    await page.locator(".current-shot").first().click();
    if (!(await page.locator("#zoom-dialog").evaluate((dialog) => dialog.open))) {
      errors.push("Image zoom dialog did not open.");
    }
    await page.locator("#zoom-close").click();
    await page.locator("#all-pages").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "/tmp/chikushino-visual-plan-audit-desktop.png",
      fullPage: false,
    });
  }

  results.push({
    viewport: viewport.name,
    auditCount,
    brokenImages,
    overflow,
    errors,
  });
  await page.close();
}

await browser.close();

for (const result of results) {
  console.log(JSON.stringify(result));
  if (
    result.auditCount !== 31 ||
    result.brokenImages.length ||
    result.overflow.scrollWidth > result.overflow.clientWidth ||
    result.errors.length
  ) {
    process.exitCode = 1;
  }
}
