const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const detailHtml = fs.readFileSync(path.join(root, "detail.html"), "utf8");
const redesignJs = fs.readFileSync(path.join(root, "assets/redesign-0718.js"), "utf8");

function fail(message) {
  throw new Error(message);
}

const topCards = [...indexHtml.matchAll(
  /<a class="instructor-card"[^>]*><img[^>]+src="([^"]+)"[^>]*><span class="instructor-nameplate"><small>([^<]+)<\/small>/g
)].map((match) => ({ image: match[1], nickname: match[2] }));

const detailCards = [...redesignJs.matchAll(
  /\{ name: "[^"]+", nickname: "([^"]+)", hobby: "[^"]+", image: "([^"]+)"/g
)].map((match) => ({ nickname: match[1], image: match[2] }));

const legacyStart = detailHtml.indexOf("    instructors: {");
const legacyEnd = detailHtml.indexOf("    facilities: {", legacyStart);
if (legacyStart < 0 || legacyEnd < 0) fail("detail.htmlの指導員初期表示データを検出できません。");

const legacyCards = [...detailHtml.slice(legacyStart, legacyEnd).matchAll(
  /\["(images\/instructors-anime[^"]+)", "[^"]+", "([^"]+)", "[^"]*"\]/g
)].map((match) => ({ image: match[1], nickname: match[2] }));

if (topCards.length !== 17) fail(`トップの指導員数が17名ではありません: ${topCards.length}`);
if (detailCards.length !== 19) fail(`詳細の指導員数が19名ではありません: ${detailCards.length}`);
if (legacyCards.length !== detailCards.length) {
  fail(`詳細の初期表示と最終表示の人数が異なります: ${legacyCards.length}/${detailCards.length}`);
}

function assertSameImage(card, targetCards, location) {
  const target = targetCards.find((candidate) => candidate.nickname === card.nickname);
  if (!target) fail(`${location}に${card.nickname}がいません。`);
  if (target.image !== card.image) {
    fail(`${card.nickname}の画像が一致しません: ${card.image} / ${target.image}`);
  }
}

topCards.forEach((card) => assertSameImage(card, detailCards, "詳細ページ"));
legacyCards.forEach((card) => assertSameImage(card, detailCards, "詳細ページの最終表示"));

for (const card of detailCards) {
  const imagePath = path.join(root, card.image);
  if (!fs.existsSync(imagePath) || fs.statSync(imagePath).size === 0) {
    fail(`${card.nickname}の画像ファイルがありません: ${card.image}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  topCards: topCards.length,
  detailCards: detailCards.length,
  sharedCards: topCards.length,
  mismatches: 0
}, null, 2));
