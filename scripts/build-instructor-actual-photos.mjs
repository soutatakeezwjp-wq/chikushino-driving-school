import fs from "node:fs/promises";
import path from "node:path";
import sharp from "/Users/takebayashisouta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/lib/index.js";
import {
  SpreadsheetFile,
  Workbook,
} from "/Users/takebayashisouta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const projectRoot =
  "/Users/takebayashisouta/CC/1a_prospects/福岡/筑紫野自動車学校自動化HP";
const photoDir = path.join(
  projectRoot,
  "outputs/20260725-client-review/actual-photos",
);
const outputDir = path.join(projectRoot, "outputs/20260725-client-review");
const shareDir = path.join(
  projectRoot,
  "共有用/2026-07-25_車種表記・指導員確認",
);
const originalShareDir = path.join(shareDir, "全指導員_実写真_元画像");
const thumbnailDir = path.join(outputDir, "actual-photo-thumbnails");

const instructors = [
  ["澤水 信雄", "さわみん", "01_澤水信雄.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image7.jpeg"],
  ["谷川 拓郎", "たっしゃん", "02_谷川拓郎.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image21.jpeg"],
  ["瀬戸 幸之助", "せとさん", "03_瀬戸幸之助.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image13.jpeg"],
  ["重藤 憲紀", "しげちゃん", "04_重藤憲紀.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image11.jpeg"],
  ["佐々木 貴子", "きこ", "05_佐々木貴子.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image3.jpeg"],
  ["中村 正信", "マサやん", "06_中村正信.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image8.jpeg"],
  ["内野 修平", "うちの先生", "07_内野修平.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image12.jpeg"],
  ["下田 真一", "しっしい", "08_下田真一.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image15.jpeg"],
  ["山本 勝介", "山本1号", "09_山本勝介.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image10.jpeg"],
  ["羽立 衣莉奈", "はたち", "10_羽立衣莉奈.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image4.jpeg"],
  ["白地 貞昭", "しらっちゃん", "11_白地貞昭.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image16.jpeg"],
  ["山本 一博", "山本2号", "12_山本一博.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image29.jpeg"],
  ["原口 美穂", "はらぐっちゃん☆", "13_原口美穂.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image2.jpeg"],
  ["宮本 淳一", "みやもっちゃん", "14_宮本淳一.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image9.jpeg"],
  ["後藤 桂子", "けいこ", "15_後藤桂子.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image22.jpeg"],
  ["春田 能孝", "はるしゃん", "16_春田能孝.jpeg", "2026-07-10春田能孝.xlsx", "xl/media/image1.jpeg"],
  ["角 麻美", "すみちゃん", "17_角麻美.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image5.jpeg"],
  ["後藤 良子", "りょうこ", "18_後藤良子.jpeg", "2026-06-19-指導員.xlsx", "xl/media/image6.jpeg"],
  ["幸田 守生", "こうださん", "19_幸田守生.png", "2026-06-19-フロント・バス.xlsx", "xl/media/image5.png"],
];

// Excel側で設定されていた図形回転を、表示用サムネイルへ反映する。
const clockwiseRotationByFilename = new Map([
  ["01_澤水信雄.jpeg", 90],
  ["02_谷川拓郎.jpeg", 90],
  ["03_瀬戸幸之助.jpeg", 90],
  ["04_重藤憲紀.jpeg", 90],
  ["05_佐々木貴子.jpeg", 90],
  ["06_中村正信.jpeg", 90],
  ["13_原口美穂.jpeg", 90],
  ["14_宮本淳一.jpeg", 90],
]);

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(shareDir, { recursive: true });
await fs.mkdir(originalShareDir, { recursive: true });
await fs.mkdir(thumbnailDir, { recursive: true });

for (const [, , filename] of instructors) {
  const sourcePath = path.join(photoDir, filename);
  const copyPath = path.join(originalShareDir, filename);
  await fs.copyFile(sourcePath, copyPath);
  const thumbnailPath = path.join(
    thumbnailDir,
    filename.replace(/\.(?:jpe?g|png)$/i, ".png"),
  );
  await sharp(sourcePath)
    .rotate(clockwiseRotationByFilename.get(filename) ?? 0)
    .resize(640, 440, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png({ compressionLevel: 8 })
    .toFile(thumbnailPath);
}

const workbook = Workbook.create();
const gallery = workbook.worksheets.add("写真一覧");
const sources = workbook.worksheets.add("出典一覧");

gallery.getRange("A1:H2").merge();
gallery.getRange("A1").values = [["筑紫野自動車学校　指導員 実写真一覧（全19名）"]];
gallery.getRange("A1:H2").format = {
  fill: "#5B2A95",
  font: { bold: true, color: "#FFFFFF", size: 22 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
gallery.getRange("A3:H3").merge();
gallery.getRange("A3").values = [[
  "本人確認用の実写真です。AI生成画像ではありません。元画像は同梱フォルダに保存しています。",
]];
gallery.getRange("A3:H3").format = {
  fill: "#F3ECFA",
  font: { color: "#4A3266", size: 11 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
gallery.getRange("A5:H5").values = [[
  "No.",
  "実写真",
  "",
  "氏名・ニックネーム",
  "",
  "出典・同梱ファイル",
  "",
  "",
]];
gallery.getRange("A5:H5").format = {
  fill: "#31204B",
  font: { bold: true, color: "#FFFFFF", size: 10 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
gallery.getRange("A:A").format.columnWidth = 7;
gallery.getRange("B:C").format.columnWidth = 15;
gallery.getRange("D:E").format.columnWidth = 17;
gallery.getRange("F:H").format.columnWidth = 19;

const blockHeight = 6;
const startRow = 5;

for (let index = 0; index < instructors.length; index += 1) {
  const [name, nickname, filename, sourceBook, mediaPath] = instructors[index];
  const blockRow = startRow + index * blockHeight;
  const noRange = gallery.getRangeByIndexes(blockRow, 0, blockHeight, 1);
  const photoRange = gallery.getRangeByIndexes(blockRow, 1, blockHeight, 2);
  const profileRange = gallery.getRangeByIndexes(blockRow, 3, blockHeight, 2);
  const sourceRange = gallery.getRangeByIndexes(blockRow, 5, blockHeight, 3);

  noRange.merge();
  photoRange.merge();
  profileRange.merge();
  sourceRange.merge();
  gallery.getRangeByIndexes(blockRow, 0, blockHeight, 8).format = {
    fill: "#FFFFFF",
    rowHeight: 22,
    verticalAlignment: "center",
    wrapText: true,
    borders: {
      top: { color: "#D9CAE8", style: "continuous", weight: 1 },
      bottom: { color: "#D9CAE8", style: "continuous", weight: 1 },
      left: { color: "#D9CAE8", style: "continuous", weight: 1 },
      right: { color: "#D9CAE8", style: "continuous", weight: 1 },
    },
  };
  noRange.values = [[String(index + 1).padStart(2, "0")]];
  noRange.format = {
    fill: "#F7F2FB",
    font: { bold: true, color: "#5B2A95", size: 12 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  profileRange.values = [[`${name}\n\nニックネーム：${nickname}\n\n実写真／確認済み`]];
  profileRange.format = {
    fill: "#FAF7FC",
    font: { bold: true, color: "#2F1857", size: 11 },
    horizontalAlignment: "left",
    verticalAlignment: "center",
    wrapText: true,
  };
  sourceRange.values = [[
    `元Excel：${sourceBook}\nExcel内画像：${mediaPath}\n同梱ファイル：${filename}`,
  ]];
  sourceRange.format = {
    font: { color: "#655775", size: 9 },
    horizontalAlignment: "left",
    verticalAlignment: "center",
    wrapText: true,
  };

  const thumbnailPath = path.join(
    thumbnailDir,
    filename.replace(/\.(?:jpe?g|png)$/i, ".png"),
  );
  const imageBytes = await fs.readFile(thumbnailPath);
  gallery.images.add({
    dataUrl: `data:image/png;base64,${imageBytes.toString("base64")}`,
    anchor: {
      from: { row: blockRow, col: 1 },
      extent: { widthPx: 205, heightPx: 128 },
    },
  });
}

sources.getRange("A1:H2").merge();
sources.getRange("A1").values = [["実写真 出典・対応表"]];
sources.getRange("A1:H2").format = {
  fill: "#5B2A95",
  font: { bold: true, color: "#FFFFFF", size: 20 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sources.getRange("A4:H4").values = [[
  "No.",
  "氏名",
  "ニックネーム",
  "元Excel",
  "Excel内画像",
  "同梱ファイル",
  "種別",
  "確認状態",
]];
sources.getRange("A4:H4").format = {
  fill: "#31204B",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sources.getRange(`A5:H${4 + instructors.length}`).values = instructors.map(
  ([name, nickname, filename, sourceBook, mediaPath], index) => [
    index + 1,
    name,
    nickname,
    sourceBook,
    mediaPath,
    filename,
    "実写真",
    "確認済み",
  ],
);
sources.getRange(`A5:H${4 + instructors.length}`).format = {
  verticalAlignment: "center",
  wrapText: true,
  borders: {
    bottom: { color: "#E8E0EF", style: "continuous", weight: 1 },
  },
};
sources.getRange(`H5:H${4 + instructors.length}`).format = {
  fill: "#EAF7EF",
  font: { bold: true, color: "#237A45" },
  horizontalAlignment: "center",
};
sources.getRange("A:A").format.columnWidth = 7;
sources.getRange("B:B").format.columnWidth = 18;
sources.getRange("C:C").format.columnWidth = 20;
sources.getRange("D:D").format.columnWidth = 31;
sources.getRange("E:E").format.columnWidth = 24;
sources.getRange("F:F").format.columnWidth = 24;
sources.getRange("G:G").format.columnWidth = 12;
sources.getRange("H:H").format.columnWidth = 14;
sources.getRange(`A4:H${4 + instructors.length}`).format.rowHeight = 25;

const outputPath = path.join(outputDir, "全指導員_実写真一覧.xlsx");
const sharePath = path.join(shareDir, "全指導員_実写真一覧.xlsx");
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
await fs.copyFile(outputPath, sharePath);

const preview = await workbook.render({
  sheetName: "写真一覧",
  range: `A1:H${startRow + instructors.length * blockHeight}`,
  scale: 1,
  format: "png",
});
await fs.writeFile(
  path.join(outputDir, "全指導員_実写真一覧_preview.png"),
  new Uint8Array(await preview.arrayBuffer()),
);

console.log(JSON.stringify({
  outputPath,
  sharePath,
  originals: originalShareDir,
  count: instructors.length,
}, null, 2));
