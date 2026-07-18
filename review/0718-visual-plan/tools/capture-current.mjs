import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4178";
const outputRoot = path.resolve(
  process.cwd(),
  "review/0718-visual-plan/assets/current"
);

const pages = [
  ["top", "/"],
  ["admission", "/detail.html?page=admission"],
  ["courses", "/detail.html?page=courses"],
  ["standard", "/detail.html?page=standard"],
  ["camp-price", "/detail.html?page=camp_price"],
  ["semi-medium", "/detail.html?page=semi_medium"],
  ["bike", "/detail.html?page=bike"],
  ["limited", "/detail.html?page=limited"],
  ["paper", "/detail.html?page=paper"],
  ["senior", "/detail.html?page=senior"],
  ["motorcycle", "/detail.html?page=motorcycle"],
  ["price", "/detail.html?page=price"],
  ["access", "/detail.html?page=access"],
  ["school", "/detail.html?page=school"],
  ["students", "/detail.html?page=students"],
  ["teaching", "/detail.html?page=teaching"],
  ["syuryokentei", "/detail.html?page=syuryokentei"],
  ["sotsugyoukentei", "/detail.html?page=sotsugyoukentei"],
  ["application", "/detail.html?page=application"],
  ["topics", "/detail.html?page=topics"],
  ["instructors", "/detail.html?page=instructors"],
  ["facilities", "/detail.html?page=facilities"],
  ["why", "/reasons/"],
  ["faq", "/detail.html?page=faq"],
  ["recruit", "/detail.html?page=recruit"],
  ["introduction", "/detail.html?page=introduction"],
  ["license", "/detail.html?page=license"],
  ["training", "/detail.html?page=training"],
  ["company", "/detail.html?page=company"],
  ["privacy", "/detail.html?page=privacy"],
  ["sitemap", "/detail.html?page=sitemap"],
];

const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

await Promise.all(
  Object.keys(viewports).map((name) =>
    fs.mkdir(path.join(outputRoot, name), { recursive: true })
  )
);

const browser = await chromium.launch({ headless: true });

for (const [viewportName, viewport] of Object.entries(viewports)) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });

  for (const [slug, pathname] of pages) {
    const page = await context.newPage();
    await page.goto(`${baseUrl}${pathname}`, {
      waitUntil: "networkidle",
      timeout: 45_000,
    });
    await page.evaluate(() => document.fonts?.ready);
    await page.screenshot({
      path: path.join(outputRoot, viewportName, `${slug}.jpg`),
      type: "jpeg",
      quality: 76,
      fullPage: false,
    });
    await page.close();
  }

  await context.close();
}

await browser.close();
console.log(`Captured ${pages.length * Object.keys(viewports).length} screenshots.`);
