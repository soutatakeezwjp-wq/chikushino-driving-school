const pages = [
  {
    slug: "top",
    title: "トップページ",
    current: "/",
    target: "/",
    changes: [["写真変更", "photo"], ["動的化", "dynamic"]],
    note: "白いマツダ教習車、新バス、校舎を使ったImageGenヒーロー4案を作成。料金は正式料金ページへ統一する。",
  },
  {
    slug: "admission",
    title: "入校案内",
    current: "?page=admission",
    target: "/detail.html?page=admission",
    changes: [["統合", "merge"], ["構成変更", "dynamic"]],
    note: "入校までと免許交付までを1ページに統合し、必要書類・支払い・検定へつなぐ。",
  },
  {
    slug: "courses",
    title: "コース一覧",
    current: "?page=courses",
    target: "/detail.html?page=courses",
    changes: [["写真変更", "photo"], ["整理", "dynamic"]],
    note: "普通車、準中型、二輪の実車写真から免許を選ぶ入口へ変更する。",
  },
  {
    slug: "standard",
    title: "普通自動車",
    current: "?page=standard",
    target: "/detail.html?page=standard",
    changes: [["料金追加", "price"], ["削除", "delete"]],
    note: "正式料金表、割引、オプション、内訳、その他費用、必要書類を掲載。サブページのシミュレーターは削除。",
  },
  {
    slug: "camp-price",
    title: "ハイスピードプラン",
    current: "?page=camp_price",
    target: "/detail.html?page=standard#options",
    changes: [["統合", "merge"], ["転送", "delete"]],
    note: "独立ページを廃止し、普通車ページのオプション欄へ統合する。",
  },
  {
    slug: "semi-medium",
    title: "準中型車",
    current: "?page=semi_medium",
    target: "/detail.html?page=semi_medium",
    changes: [["料金追加", "price"], ["写真変更", "photo"]],
    note: "5種類の現有免許と料金区分をPC表・スマホカードで表示する。",
  },
  {
    slug: "bike",
    title: "自動二輪",
    current: "?page=bike",
    target: "/detail.html?page=bike",
    changes: [["料金追加", "price"], ["削除", "delete"]],
    note: "大型、普通、小型とAT/MTを整理し、切れる旧図解とサブページのシミュレーターを削除する。",
  },
  {
    slug: "limited",
    title: "限定解除",
    current: "?page=limited",
    target: "/detail.html?page=limited",
    changes: [["料金追加", "price"], ["削除", "delete"]],
    note: "対象免許、必要時限、料金、審査までをHTMLで掲載し、旧図解を削除する。",
  },
  {
    slug: "paper",
    title: "ペーパードライバー",
    current: "?page=paper",
    target: "/detail.html?page=paper",
    changes: [["写真変更", "photo"], ["簡潔化", "dynamic"]],
    note: "実車写真、相談方法、練習内容の3点へ絞る。",
  },
  {
    slug: "senior",
    title: "高齢者講習",
    current: "?page=senior",
    target: "/detail.html?page=senior",
    changes: [["写真変更", "photo"], ["簡潔化", "dynamic"]],
    note: "通知はがき、電話予約、当日の持参物を優先。送迎案内は削除する。",
  },
  {
    slug: "motorcycle",
    title: "原付講習",
    current: "?page=motorcycle",
    target: "/detail.html?page=motorcycle",
    changes: [["写真変更", "photo"], ["簡潔化", "dynamic"]],
    note: "1枚の実写真と電話予約中心の3ステップへ変更する。",
  },
  {
    slug: "price",
    title: "料金プラン",
    current: "?page=price",
    target: "/detail.html?page=price",
    changes: [["統合", "merge"], ["転送", "delete"]],
    note: "料金シミュレーターを削除し、各車種の正式料金を該当サブページに掲載する。",
  },
  {
    slug: "access",
    title: "スクールバス・アクセス",
    current: "?page=access",
    target: "/detail.html?page=access",
    changes: [["写真変更", "photo"], ["整理", "dynamic"]],
    note: "地図、乗降場所、予約方法を先に見せ、新バス写真を補足に使う。",
  },
  {
    slug: "school",
    title: "学校紹介",
    current: "?page=school",
    target: "/detail.html?page=school",
    changes: [["写真変更", "photo"], ["整理", "dynamic"]],
    note: "校舎と学校の方針を実写真で見せ、不自然な制作説明を削除する。",
  },
  {
    slug: "students",
    title: "在校生メニュー",
    current: "?page=students",
    target: "/detail.html?page=students",
    changes: [["動的化", "dynamic"], ["整理", "dynamic"]],
    note: "教習、検定、重要連絡、休校日を一つの入口へまとめる。",
  },
  {
    slug: "teaching",
    title: "教習カレンダー",
    current: "?page=teaching",
    target: "/detail.html?page=teaching",
    changes: [["動的化", "dynamic"], ["削除", "delete"]],
    note: "静的画像を廃止し、本日・今週・今月の日程をGoogle Sheetsから公開する。",
  },
  {
    slug: "syuryokentei",
    title: "修了検定",
    current: "?page=syuryokentei",
    target: "/detail.html?page=syuryokentei",
    changes: [["動的化", "dynamic"], ["整理", "dynamic"]],
    note: "受付、条件、注意事項、最新日程をHTMLで表示する。",
  },
  {
    slug: "sotsugyoukentei",
    title: "卒業検定",
    current: "?page=sotsugyoukentei",
    target: "/detail.html?page=sotsugyoukentei",
    changes: [["動的化", "dynamic"], ["整理", "dynamic"]],
    note: "受付、条件、注意事項、最新日程をHTMLで表示する。",
  },
  {
    slug: "application",
    title: "資料請求・仮申込",
    current: "?page=application",
    target: "/detail.html?page=application",
    changes: [["動的化", "dynamic"], ["統合", "merge"]],
    note: "選択式3ステップ、自動概算、デジタル/郵送、自動メールへ変更する。",
  },
  {
    slug: "topics",
    title: "TOPICS",
    current: "?page=topics",
    target: "/detail.html?page=topics",
    changes: [["動的化", "dynamic"], ["整理", "dynamic"]],
    note: "WordPress RSS依存をやめ、学校用Google Sheetsから公開する。",
  },
  {
    slug: "instructors",
    title: "指導員紹介",
    current: "?page=instructors",
    target: "/detail.html?page=instructors",
    changes: [["写真変更", "photo"], ["照合", "dynamic"]],
    note: "旧Excel実写真と修正版名簿を照合し、氏名、趣味、四輪/二輪担当を表示する。",
  },
  {
    slug: "facilities",
    title: "施設紹介",
    current: "?page=facilities",
    target: "/detail.html?page=facilities",
    changes: [["写真変更", "photo"], ["整理", "dynamic"]],
    note: "校舎、教室、学習設備、四輪/二輪シミュレーターを実写真で分類する。",
  },
  {
    slug: "why",
    title: "通う理由",
    current: "/reasons/",
    target: "/reasons/",
    changes: [["変更なし", "keep"]],
    note: "独立ページの内容は維持し、入口をフッターバナーだけに集約する。",
  },
  {
    slug: "faq",
    title: "よくある質問",
    current: "?page=faq",
    target: "/detail.html?page=faq",
    changes: [["整理", "dynamic"]],
    note: "料金、送迎、入校、教習、検定の目的別に分類する。",
  },
  {
    slug: "recruit",
    title: "採用情報",
    current: "?page=recruit",
    target: "/detail.html?page=recruit",
    changes: [["整理", "dynamic"], ["文言修正", "dynamic"]],
    note: "仕事内容、応募条件、待遇、資格支援の事実だけを掲載する。",
  },
  {
    slug: "introduction",
    title: "友人・知人紹介",
    current: "?page=introduction",
    target: "/detail.html?page=introduction",
    changes: [["整理", "dynamic"]],
    note: "対象、特典、申請手順を短くまとめ、申込フォームへつなぐ。",
  },
  {
    slug: "license",
    title: "免許交付まで",
    current: "?page=license",
    target: "/detail.html?page=admission#license-flow",
    changes: [["統合", "merge"], ["転送", "delete"]],
    note: "入校案内の後半へ統合し、重複ページをなくす。",
  },
  {
    slug: "training",
    title: "各種講習",
    current: "?page=training",
    target: "/detail.html?page=training",
    changes: [["整理", "dynamic"]],
    note: "講習の対象者、予約方法、持参物、所要時間を比較できる一覧にする。",
  },
  {
    slug: "company",
    title: "会社概要",
    current: "?page=company",
    target: "/detail.html?page=company",
    changes: [["整理", "dynamic"]],
    note: "スマホで横スクロールしない可変2列にし、制作説明を削除する。",
  },
  {
    slug: "privacy",
    title: "個人情報保護方針",
    current: "?page=privacy",
    target: "/detail.html?page=privacy",
    changes: [["文言修正", "dynamic"]],
    note: "申込データの利用目的、保存、外部送信先を実装内容に合わせる。",
  },
  {
    slug: "sitemap",
    title: "サイトマップ",
    current: "?page=sitemap",
    target: "/detail.html?page=sitemap",
    changes: [["整理", "dynamic"]],
    note: "統合後の正式URLへ更新し、旧入口や重複リンクを削除する。",
  },
];

const storageKey = "chikushino-0718-visual-plan-status";
const deviceStorageKey = "chikushino-0718-visual-plan-device";
const body = document.body;
const auditGrid = document.querySelector("#audit-grid");
const chapterFilter = document.querySelector("#chapter-filter");
const statusFilter = document.querySelector("#status-filter");
const dialog = document.querySelector("#zoom-dialog");
const dialogImage = document.querySelector("#zoom-image");
const dialogTitle = document.querySelector("#zoom-title");

function readStatuses() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
}

function writeStatuses(statuses) {
  localStorage.setItem(storageKey, JSON.stringify(statuses));
}

function screenshotPath(device, slug) {
  return `./assets/current/${device}/${slug}.jpg`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderAuditCards() {
  const statuses = readStatuses();
  auditGrid.innerHTML = pages
    .map((page) => {
      const status = statuses[page.slug] || "not-started";
      const labels = page.changes
        .map(
          ([label, kind]) =>
            `<span class="status-label" data-kind="${kind}">${escapeHtml(label)}</span>`
        )
        .join("");
      return `
        <article class="audit-card" data-page="${page.slug}" data-status="${status}">
          <header class="audit-card-head">
            <div>
              <h3>${escapeHtml(page.title)}</h3>
              <code>${escapeHtml(page.current)}</code>
            </div>
            <span class="status-label" data-kind="${page.changes[0][1]}">${escapeHtml(page.changes[0][0])}</span>
          </header>
          <div class="audit-shots">
            <button type="button" data-zoom-src="${screenshotPath("desktop", page.slug)}" data-zoom-title="${escapeHtml(page.title)} / PC">
              <img src="${screenshotPath("desktop", page.slug)}" alt="${escapeHtml(page.title)}のPC画面">
              <span class="audit-device-label">PC</span>
            </button>
            <button type="button" data-zoom-src="${screenshotPath("mobile", page.slug)}" data-zoom-title="${escapeHtml(page.title)} / スマホ">
              <img src="${screenshotPath("mobile", page.slug)}" alt="${escapeHtml(page.title)}のスマホ画面">
              <span class="audit-device-label">390px</span>
            </button>
          </div>
          <div class="audit-details">
            <div class="status-labels">${labels}</div>
            <p>${escapeHtml(page.note)}</p>
          </div>
          <footer class="audit-card-foot">
            <select data-status-select="${page.slug}" aria-label="${escapeHtml(page.title)}の確認状態">
              <option value="not-started" ${status === "not-started" ? "selected" : ""}>未着手</option>
              <option value="in-progress" ${status === "in-progress" ? "selected" : ""}>実装中</option>
              <option value="verified" ${status === "verified" ? "selected" : ""}>確認済み</option>
            </select>
            <span class="target-url">変更後: ${escapeHtml(page.target)}</span>
          </footer>
        </article>
      `;
    })
    .join("");
  updateAuditProgress();
  applyStatusFilter();
}

function setDevice(device) {
  body.dataset.device = device;
  localStorage.setItem(deviceStorageKey, device);
  document.querySelectorAll("[data-device-button]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.deviceButton === device));
  });
  document.querySelectorAll(".current-shot").forEach((image) => {
    const path = screenshotPath(device, image.dataset.slug);
    image.src = path;
    const zoomButton = image.parentElement.querySelector("[data-zoom-src]");
    if (zoomButton) zoomButton.dataset.zoomSrc = path;
  });
}

function applyChapterFilter() {
  const value = chapterFilter.value;
  document.querySelectorAll("[data-chapter]").forEach((section) => {
    section.hidden = value !== "all" && section.dataset.chapter !== value;
  });
}

function applyStatusFilter() {
  const value = statusFilter.value;
  document.querySelectorAll(".audit-card").forEach((card) => {
    card.hidden = value !== "all" && card.dataset.status !== value;
  });
}

function updateAuditProgress() {
  const verified = document.querySelectorAll('.audit-card[data-status="verified"]').length;
  const count = document.querySelector("#audit-count");
  const bar = document.querySelector("#audit-progress-bar");
  count.textContent = `${verified} / ${pages.length} 確認済み`;
  bar.style.width = `${(verified / pages.length) * 100}%`;
}

function openZoom(source, title, alt = "") {
  dialogImage.src = source;
  dialogImage.alt = alt || title;
  dialogTitle.textContent = title || "画像プレビュー";
  if (typeof dialog.showModal === "function") dialog.showModal();
}

document.addEventListener("click", (event) => {
  const deviceButton = event.target.closest("[data-device-button]");
  if (deviceButton) {
    setDevice(deviceButton.dataset.deviceButton);
    return;
  }

  const zoomTrigger = event.target.closest(
    "[data-zoom-src], img[data-zoom], img.current-shot"
  );
  if (zoomTrigger) {
    const isImage = zoomTrigger.matches("img");
    openZoom(
      isImage ? zoomTrigger.currentSrc || zoomTrigger.src : zoomTrigger.dataset.zoomSrc,
      isImage ? zoomTrigger.alt : zoomTrigger.dataset.zoomTitle,
      isImage ? zoomTrigger.alt : ""
    );
  }
});

document.addEventListener("change", (event) => {
  const select = event.target.closest("[data-status-select]");
  if (!select) return;
  const statuses = readStatuses();
  statuses[select.dataset.statusSelect] = select.value;
  writeStatuses(statuses);
  const card = select.closest(".audit-card");
  card.dataset.status = select.value;
  updateAuditProgress();
  applyStatusFilter();
});

chapterFilter.addEventListener("change", applyChapterFilter);
statusFilter.addEventListener("change", applyStatusFilter);
document.querySelector("#zoom-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && dialog.open) dialog.close();
});

renderAuditCards();
const storedDevice = localStorage.getItem(deviceStorageKey);
setDevice(
  storedDevice === "mobile" || storedDevice === "desktop"
    ? storedDevice
    : window.matchMedia("(max-width: 620px)").matches
      ? "mobile"
      : "desktop"
);
