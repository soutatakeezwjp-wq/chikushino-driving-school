const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const beforeUrl = process.env.BEFORE_URL || "http://127.0.0.1:8789";
const afterUrl = process.env.AFTER_URL || "http://127.0.0.1:8788";
const captureState = process.env.CAPTURE_STATE || "both";
const executablePath = process.env.PLAYWRIGHT_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outputDir = path.resolve(__dirname, "../review/0723-before-after/screenshots");
const pages = ["admission", "standard", "semi_medium", "bike", "limited", "paper"];
const viewports = [
  { name: "pc", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 }
];

async function capture(browser, baseUrl, state, pageId, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/detail.html?page=${pageId}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000
  });
  await page.waitForTimeout(600);
  await page.evaluate(async () => {
    const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
    document.querySelectorAll("img").forEach((image) => { image.loading = "eager"; });
    for (const image of Array.from(document.images)) {
      image.scrollIntoView({ block: "center" });
      if (!image.complete) {
        await Promise.race([
          new Promise((resolve) => {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", resolve, { once: true });
          }),
          wait(10000)
        ]);
      }
      if (image.decode) {
        await image.decode().catch(() => {});
      }
      await wait(80);
    }
  });
  await page.evaluate(async () => {
    const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
    const step = Math.max(420, Math.floor(window.innerHeight * 0.72));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await wait(55);
    }
    window.scrollTo(0, 0);
    await wait(220);
  });
  await page.screenshot({
    path: path.join(outputDir, `${state}-${viewport.name}-${pageId}.jpg`),
    fullPage: true,
    type: "jpeg",
    quality: 72
  });
  await context.close();
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    for (const viewport of viewports) {
      for (const pageId of pages) {
        if (captureState !== "after") {
          await capture(browser, beforeUrl, "before", pageId, viewport);
        }
        if (captureState !== "before") {
          await capture(browser, afterUrl, "after", pageId, viewport);
        }
      }
    }
  } finally {
    await browser.close();
  }
  const stateCount = captureState === "both" ? 2 : 1;
  console.log(JSON.stringify({ ok: true, screenshots: pages.length * viewports.length * stateCount, outputDir }, null, 2));
})().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
