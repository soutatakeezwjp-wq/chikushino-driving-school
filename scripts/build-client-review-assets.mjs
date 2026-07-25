import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SpreadsheetFile,
  Workbook,
} from "/Users/takebayashisouta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";
import {
  publicBase,
  referenceSources,
  reviewCategories,
  reviewItems,
  reviewStatuses,
} from "./client-review-data.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const worktreeRoot = path.resolve(scriptDir, "..");
const projectRoot =
  "/Users/takebayashisouta/CC/1a_prospects/福岡/筑紫野自動車学校自動化HP";
const outputDir = path.join(projectRoot, "outputs/20260725-client-review");
const shareDir = path.join(
  projectRoot,
  "共有用/2026-07-25_車種表記・指導員確認",
);
const referenceDir = path.join(shareDir, "参考資料");
const reviewDir = path.join(
  worktreeRoot,
  "review/client-before-after-20260725",
);
const publicReviewUrl = `${publicBase}/review/client-before-after-20260725/`;

await Promise.all([
  fs.mkdir(outputDir, { recursive: true }),
  fs.mkdir(shareDir, { recursive: true }),
  fs.mkdir(referenceDir, { recursive: true }),
  fs.mkdir(reviewDir, { recursive: true }),
]);

const statusColors = {
  実装済み: { fill: "#E8F6ED", font: "#1D6B3B" },
  要パートナー確認: { fill: "#FFF3D9", font: "#8A5B00" },
  要送信テスト: { fill: "#FFE7E2", font: "#A23824" },
  要運用確認: { fill: "#E8F0FF", font: "#315C9E" },
};

const priorityColors = {
  高: { fill: "#FDE7EA", font: "#A7283C" },
  中: { fill: "#FFF3D9", font: "#8A5B00" },
  低: { fill: "#EEF1F5", font: "#5F6670" },
};

const countBy = (items, key) =>
  Object.fromEntries(
    [...new Set(items.map((item) => item[key]))].map((value) => [
      value,
      items.filter((item) => item[key] === value).length,
    ]),
  );

const categoryCounts = countBy(reviewItems, "category");
const statusCounts = countBy(reviewItems, "status");
const priorityCounts = countBy(reviewItems, "priority");

const workbook = Workbook.create();
const summary = workbook.worksheets.add("概要");
const checklist = workbook.worksheets.add("確認一覧");
const categories = workbook.worksheets.add("カテゴリ集計");
const references = workbook.worksheets.add("参照資料");
const guide = workbook.worksheets.add("確認手順");

summary.getRange("A1:J2").merge();
summary.getRange("A1").values = [["筑紫野自動車学校　先方修正依頼・確認台帳"]];
summary.getRange("A1:J2").format = {
  fill: "#5B2A95",
  font: { bold: true, color: "#FFFFFF", size: 22 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
summary.getRange("A3:J3").merge();
summary.getRange("A3").values = [[
  "Excel・Google Docs・会議メモ・画面指示を63件へ分解し、実装状態と確認先を一覧化しています。",
]];
summary.getRange("A3:J3").format = {
  fill: "#F3ECFA",
  font: { color: "#4A3266", size: 11 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};

const summaryCards = [
  ["総依頼数", reviewItems.length, "#31204B"],
  ["実装済み", statusCounts["実装済み"] ?? 0, "#237A45"],
  ["要パートナー確認", statusCounts["要パートナー確認"] ?? 0, "#A66A00"],
  ["要送信テスト", statusCounts["要送信テスト"] ?? 0, "#B84732"],
  ["要運用確認", statusCounts["要運用確認"] ?? 0, "#315C9E"],
];

for (let index = 0; index < summaryCards.length; index += 1) {
  const [label, value, color] = summaryCards[index];
  const startColumn = index * 2;
  const labelRange = summary.getRangeByIndexes(5, startColumn, 1, 2);
  const valueRange = summary.getRangeByIndexes(6, startColumn, 2, 2);
  labelRange.merge();
  valueRange.merge();
  labelRange.values = [[label]];
  valueRange.values = [[value]];
  labelRange.format = {
    fill: "#F7F2FB",
    font: { bold: true, color: "#5B2A95", size: 10 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  valueRange.format = {
    fill: "#FFFFFF",
    font: { bold: true, color, size: 24 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    borders: {
      bottom: { color: "#D9CAE8", style: "continuous", weight: 1 },
      left: { color: "#D9CAE8", style: "continuous", weight: 1 },
      right: { color: "#D9CAE8", style: "continuous", weight: 1 },
    },
  };
}

summary.getRange("A10:J10").merge();
summary.getRange("A10").values = [["確認の優先順"]];
summary.getRange("A10:J10").format = {
  fill: "#31204B",
  font: { bold: true, color: "#FFFFFF", size: 12 },
  horizontalAlignment: "left",
  verticalAlignment: "center",
};
const priorityGuide = [
  ["1", "要パートナー確認", "顔写真・本人性など、パートナー目線で判断が必要な項目"],
  ["2", "要送信テスト", "実メール・PDF添付など、画面だけでは完了判定できない項目"],
  ["3", "要運用確認", "管理画面・学校側運用・処理ログなど、実運用の確認が必要な項目"],
  ["4", "実装済み", "公開画面で確認できる項目。URLから表示と文言を照合"],
  ["5", "確認結果を記入", "確認一覧の「パートナー確認」と「コメント」列へ入力"],
];
for (let index = 0; index < priorityGuide.length; index += 1) {
  const row = 11 + index;
  const [order, label, description] = priorityGuide[index];
  summary.getRange(`B${row}:C${row}`).merge();
  summary.getRange(`D${row}:J${row}`).merge();
  summary.getRange(`A${row}`).values = [[order]];
  summary.getRange(`B${row}`).values = [[label]];
  summary.getRange(`D${row}`).values = [[description]];
}
summary.getRange("A11:J15").format = {
  rowHeight: 30,
  wrapText: true,
  verticalAlignment: "center",
  borders: {
    bottom: { color: "#E8E0EF", style: "continuous", weight: 1 },
  },
};
summary.getRange("A:A").format.columnWidth = 7;
summary.getRange("B:C").format.columnWidth = 14;
summary.getRange("D:J").format.columnWidth = 16;

const checklistHeaders = [
  "No.",
  "管理ID",
  "カテゴリ",
  "優先度",
  "先方から確認・修正を求められたこと",
  "今回の対応内容",
  "公開確認URL",
  "実装状態",
  "パートナー確認",
  "コメント",
  "根拠・確認箇所",
];
checklist.getRange("A1:K2").merge();
checklist.getRange("A1").values = [["先方修正依頼　全63件確認一覧"]];
checklist.getRange("A1:K2").format = {
  fill: "#5B2A95",
  font: { bold: true, color: "#FFFFFF", size: 21 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
checklist.getRange("A3:K3").merge();
checklist.getRange("A3").values = [[
  "確認後は「パートナー確認」を選び、差し戻しがある場合だけコメントを入力してください。",
]];
checklist.getRange("A3:K3").format = {
  fill: "#FFF7E8",
  font: { bold: true, color: "#7D5312", size: 10 },
  horizontalAlignment: "left",
  verticalAlignment: "center",
};
checklist.getRange("A5:K5").values = [checklistHeaders];
checklist.getRange("A5:K5").format = {
  fill: "#31204B",
  font: { bold: true, color: "#FFFFFF", size: 9 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
};

const checklistRows = reviewItems.map((item, index) => [
  index + 1,
  item.id,
  item.category,
  item.priority,
  item.request,
  item.implementation,
  `${publicBase}${item.url}`,
  item.status,
  "未確認",
  "",
  `${item.source}／${item.evidence}`,
]);
checklist.getRange(`A6:K${5 + checklistRows.length}`).values = checklistRows;
checklist.getRange(`A6:K${5 + checklistRows.length}`).format = {
  rowHeight: 64,
  verticalAlignment: "top",
  wrapText: true,
  font: { color: "#382D44", size: 9 },
  borders: {
    bottom: { color: "#E8E0EF", style: "continuous", weight: 1 },
  },
};
checklist.getRange(`A6:D${5 + checklistRows.length}`).format.verticalAlignment =
  "center";
checklist.getRange(`H6:I${5 + checklistRows.length}`).format.verticalAlignment =
  "center";
checklist.getRange(`I6:I${5 + checklistRows.length}`).dataValidation = {
  rule: { type: "list", values: ["未確認", "OK", "要修正", "対象外"] },
};

for (let index = 0; index < reviewItems.length; index += 1) {
  const row = 6 + index;
  const item = reviewItems[index];
  const statusStyle = statusColors[item.status] ?? statusColors["実装済み"];
  const priorityStyle = priorityColors[item.priority] ?? priorityColors["中"];
  checklist.getRange(`D${row}`).format = {
    fill: priorityStyle.fill,
    font: { bold: true, color: priorityStyle.font, size: 9 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  checklist.getRange(`H${row}`).format = {
    fill: statusStyle.fill,
    font: { bold: true, color: statusStyle.font, size: 9 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  checklist.getRange(`I${row}`).format = {
    fill: "#F7F2FB",
    font: { bold: true, color: "#5B2A95", size: 9 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
}

checklist.getRange("A:A").format.columnWidth = 6;
checklist.getRange("B:B").format.columnWidth = 14;
checklist.getRange("C:C").format.columnWidth = 20;
checklist.getRange("D:D").format.columnWidth = 9;
checklist.getRange("E:E").format.columnWidth = 41;
checklist.getRange("F:F").format.columnWidth = 41;
checklist.getRange("G:G").format.columnWidth = 36;
checklist.getRange("H:H").format.columnWidth = 18;
checklist.getRange("I:I").format.columnWidth = 18;
checklist.getRange("J:J").format.columnWidth = 30;
checklist.getRange("K:K").format.columnWidth = 30;
checklist.freezePanes.freezeRows(5);
checklist.freezePanes.freezeColumns(4);
checklist.tables.add(
  `A5:K${5 + checklistRows.length}`,
  true,
  "ClientReviewChecklist",
);

categories.getRange("A1:F2").merge();
categories.getRange("A1").values = [["カテゴリ・状態別 集計"]];
categories.getRange("A1:F2").format = {
  fill: "#5B2A95",
  font: { bold: true, color: "#FFFFFF", size: 20 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
categories.getRange("A4:F4").values = [[
  "カテゴリ",
  "総数",
  "実装済み",
  "要パートナー確認",
  "要送信テスト",
  "要運用確認",
]];
categories.getRange("A4:F4").format = {
  fill: "#31204B",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
const categoryRows = reviewCategories.map((category) => {
  const rows = reviewItems.filter((item) => item.category === category);
  return [
    category,
    categoryCounts[category],
    rows.filter((item) => item.status === "実装済み").length,
    rows.filter((item) => item.status === "要パートナー確認").length,
    rows.filter((item) => item.status === "要送信テスト").length,
    rows.filter((item) => item.status === "要運用確認").length,
  ];
});
categories.getRange(`A5:F${4 + categoryRows.length}`).values = categoryRows;
categories.getRange(`A5:F${4 + categoryRows.length}`).format = {
  rowHeight: 27,
  verticalAlignment: "center",
  borders: {
    bottom: { color: "#E8E0EF", style: "continuous", weight: 1 },
  },
};
categories.getRange(`B5:F${4 + categoryRows.length}`).format = {
  horizontalAlignment: "center",
};
categories.getRange("A:A").format.columnWidth = 28;
categories.getRange("B:F").format.columnWidth = 18;

references.getRange("A1:D2").merge();
references.getRange("A1").values = [["参照資料と用途"]];
references.getRange("A1:D2").format = {
  fill: "#5B2A95",
  font: { bold: true, color: "#FFFFFF", size: 20 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
references.getRange("A4:D4").values = [[
  "No.",
  "参照ファイル",
  "確認に使う内容",
  "同梱場所",
]];
references.getRange("A4:D4").format = {
  fill: "#31204B",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
references.getRange(`A5:D${4 + referenceSources.length}`).values =
  referenceSources.map((source, index) => [
    index + 1,
    source.file,
    source.role,
    "参考資料/",
  ]);
references.getRange(`A5:D${4 + referenceSources.length}`).format = {
  rowHeight: 43,
  verticalAlignment: "center",
  wrapText: true,
  borders: {
    bottom: { color: "#E8E0EF", style: "continuous", weight: 1 },
  },
};
references.getRange("A:A").format.columnWidth = 7;
references.getRange("B:B").format.columnWidth = 42;
references.getRange("C:C").format.columnWidth = 65;
references.getRange("D:D").format.columnWidth = 20;

guide.getRange("A1:H2").merge();
guide.getRange("A1").values = [["ビジネスパートナー向け確認手順"]];
guide.getRange("A1:H2").format = {
  fill: "#5B2A95",
  font: { bold: true, color: "#FFFFFF", size: 20 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
guide.getRange("A4:H9").values = [
  ["STEP 1", "このExcelの「概要」で未確認数を確認", "", "", "", "", "", ""],
  ["STEP 2", "「確認一覧」を状態・カテゴリで絞り込み", "", "", "", "", "", ""],
  ["STEP 3", "公開URLを開き、先方要望と対応結果を見比べる", "", "", "", "", "", ""],
  ["STEP 4", "顔写真は「全指導員_実写真一覧.xlsx」とサイトを照合", "", "", "", "", "", ""],
  ["STEP 5", "確認結果を「OK／要修正／対象外」から選ぶ", "", "", "", "", "", ""],
  ["STEP 6", "差し戻し理由はコメント列へ具体的に記入", "", "", "", "", "", ""],
];
guide.getRange("A4:H9").format = {
  rowHeight: 34,
  wrapText: true,
  verticalAlignment: "center",
  borders: {
    bottom: { color: "#E8E0EF", style: "continuous", weight: 1 },
  },
};
guide.getRange("A:A").format = {
  columnWidth: 13,
  fill: "#F3ECFA",
  font: { bold: true, color: "#5B2A95" },
  horizontalAlignment: "center",
};
guide.getRange("B:H").format.columnWidth = 18;
guide.getRange("B:B").format.columnWidth = 65;

const outputPath = path.join(outputDir, "01_先方修正依頼_確認一覧.xlsx");
const sharePath = path.join(shareDir, "01_先方修正依頼_確認一覧.xlsx");
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
await fs.copyFile(outputPath, sharePath);

const summaryPreview = await workbook.render({
  sheetName: "概要",
  range: "A1:J15",
  scale: 1.25,
  format: "png",
});
await fs.writeFile(
  path.join(outputDir, "01_先方修正依頼_確認一覧_概要.png"),
  new Uint8Array(await summaryPreview.arrayBuffer()),
);
const checklistPreview = await workbook.render({
  sheetName: "確認一覧",
  range: "A1:K15",
  scale: 0.8,
  format: "png",
});
await fs.writeFile(
  path.join(outputDir, "01_先方修正依頼_確認一覧_冒頭.png"),
  new Uint8Array(await checklistPreview.arrayBuffer()),
);

const referenceCandidates = [
  [
    "/Users/takebayashisouta/Downloads/2026-07-23修正1.xlsx",
    "2026-07-23修正1.xlsx",
  ],
  [
    "/Users/takebayashisouta/Downloads/2026.7.23教習・講習（普通自動車） (1).xls",
    "2026.7.23教習・講習（普通自動車）_追加版.xls",
  ],
  [
    "/Users/takebayashisouta/Downloads/2026-07-23指導員紹介修正.xlsx",
    "2026-07-23指導員紹介修正.xlsx",
  ],
  [
    "/Users/takebayashisouta/Downloads/2026-07-18指導員紹介(修正) (1).xlsx",
    "2026-07-18指導員紹介(修正).xlsx",
  ],
  [
    "/Users/takebayashisouta/Downloads/2026-06-17-ニックネーム・趣味.xlsx",
    "2026-06-17-ニックネーム・趣味.xlsx",
  ],
  [
    "/Users/takebayashisouta/Downloads/2026-07-24修正3.xlsx",
    "2026-07-24修正3.xlsx",
  ],
  [
    "/Users/takebayashisouta/Downloads/普通車料金.pdf",
    "普通車料金.pdf",
  ],
  ["/Users/takebayashisouta/Downloads/準中型.pdf", "準中型.pdf"],
  ["/Users/takebayashisouta/Downloads/自動二輪車.pdf", "自動二輪車.pdf"],
  [
    "/Users/takebayashisouta/Downloads/2026-07-11入校前に準備すること.pdf",
    "2026-07-11入校前に準備すること.pdf",
  ],
  [
    "/Users/takebayashisouta/Downloads/2026-07-11入校資格（普通車・準中型車）.pdf",
    "2026-07-11入校資格（普通車・準中型車）.pdf",
  ],
  [
    path.join(
      projectRoot,
      "03_HP実装/00_CURRENT_STATUS/trusted-read-20260718-final/document-text.md",
    ),
    "GoogleDocs修正履歴.md",
  ],
];

const copiedReferences = [];
for (const [source, destination] of referenceCandidates) {
  try {
    await fs.copyFile(source, path.join(referenceDir, destination));
    copiedReferences.push(destination);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const unresolved = reviewItems.filter((item) => item.status !== "実装済み");
const guideMarkdown = `# ビジネスパートナー確認ガイド

## このフォルダの目的

先方から届いた修正依頼を、実装結果と一緒に短時間で確認するための共有一式です。
GitHubだけを読む必要はありません。まず確認ExcelとBefore / Afterページを見てください。

## 最初に開くもの

1. \`01_先方修正依頼_確認一覧.xlsx\`
2. \`全指導員_実写真一覧.xlsx\`
3. [クライアント向けBefore / After](${publicReviewUrl})

## 現在の整理結果

- 全依頼：${reviewItems.length}件
- 実装済み：${statusCounts["実装済み"] ?? 0}件
- 要パートナー確認：${statusCounts["要パートナー確認"] ?? 0}件
- 要送信テスト：${statusCounts["要送信テスト"] ?? 0}件
- 要運用確認：${statusCounts["要運用確認"] ?? 0}件

## 確認順

1. Excelを「実装状態」で絞り込む
2. 「要パートナー確認」を先に見る
3. Before / Afterページの公開URLを開く
4. OKならExcelの「パートナー確認」を\`OK\`へ変更
5. 修正が必要なら\`要修正\`を選び、コメントへ理由を書く

## Fableへ渡すもの

- \`02_Fable投入プロンプト.md\`
- \`01_先方修正依頼_確認一覧.xlsx\`
- \`全指導員_実写真一覧.xlsx\`
- \`参考資料/\`
- 最新ソースZIP

## 注意

- 「要送信テスト」は実際のメール受信・PDF添付まで確認して完了です。
- 「要運用確認」は学校担当者が管理画面を操作して確認する項目です。
- 指導員は全19名の実写真を一覧化済みです。AI画像との最終一致判断は別途行います。
`;
await fs.writeFile(
  path.join(shareDir, "00_ビジネスパートナー確認ガイド.md"),
  guideMarkdown,
);

const fablePrompt = `# Claude Fable 確認依頼プロンプト

あなたはWeb制作の第三者レビュアーです。
添付されたGitHubソース、修正依頼Excel、Google Docs修正履歴、指導員実写真一覧を照合してください。

## ゴール

先方から「どこをどう直してほしい」と言われたかに対し、現行サイトで意図どおり実装できているかを確認します。

## 優先順位

1. 先方Excel内の赤字・矢印・囲み指示
2. Google Docsの修正履歴
3. 公式料金PDF・入校案内PDF
4. 現行サイト

## 必ず確認すること

- 全${reviewItems.length}件を確認Excelの管理ID単位で判定する
- 先方の要望と実装内容を勝手に要約し直さず、一対一で比較する
- PCとスマホの両方を確認する
- スマホで横スクロール、文字切れ、番号重なりがないか確認する
- 料金・車種表記・割引・内訳が公式資料と一致するか確認する
- 指導員は全19名の実写真を本人確認の基準にする
- 「要送信テスト」「要運用確認」は画面だけで完了扱いにしない

## 出力形式

| 管理ID | 判定 | 確認した内容 | 差分 | 推奨対応 |
|---|---|---|---|---|

判定は \`OK\`、\`要修正\`、\`実機確認待ち\` の3種類にしてください。
最後に、重大度順で「公開前に必ず直す項目」を最大10件へまとめてください。

## 現在、実機確認が残る項目

${unresolved
  .map(
    (item) =>
      `- ${item.id} [${item.status}] ${item.request}`,
  )
  .join("\n")}
`;
await fs.writeFile(
  path.join(shareDir, "02_Fable投入プロンプト.md"),
  fablePrompt,
);

await fs.writeFile(
  path.join(shareDir, "03_クライアント向けBeforeAfter_URL.txt"),
  `クライアント向けBefore / After確認URL\n${publicReviewUrl}\n\n公開サイト\n${publicBase}/\n`,
);

const reviewPayload = {
  generatedAt: new Date().toISOString(),
  publicBase,
  publicReviewUrl,
  counts: {
    total: reviewItems.length,
    statuses: statusCounts,
    priorities: priorityCounts,
    categories: categoryCounts,
  },
  categories: reviewCategories,
  statuses: reviewStatuses,
  sources: referenceSources,
  items: reviewItems.map((item, index) => ({
    no: index + 1,
    ...item,
    fullUrl: `${publicBase}${item.url}`,
  })),
};
await fs.writeFile(
  path.join(reviewDir, "review-data.js"),
  `window.CLIENT_REVIEW_DATA = ${JSON.stringify(reviewPayload, null, 2)};\n`,
);
await fs.writeFile(
  path.join(reviewDir, "review-data.json"),
  `${JSON.stringify(reviewPayload, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      outputPath,
      sharePath,
      publicReviewUrl,
      count: reviewItems.length,
      copiedReferences,
      statusCounts,
    },
    null,
    2,
  ),
);
