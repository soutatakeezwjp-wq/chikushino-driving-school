(function () {
  "use strict";

  const master = window.CDS_PRICE_MASTER;
  const main = document.querySelector(".subpage-main");
  if (!main) return;

  const pageId = main.dataset.page || "";
  const mobileNav = main.querySelector(".subpage-mobile-nav")?.outerHTML || "";
  const yen = (amount) => Number.isFinite(Number(amount)) ? `${Number(amount).toLocaleString("ja-JP")}円` : "要確認";
  const unitLabels = {
    per_period: "／1時限",
    per_attempt: "／1回",
    per_occurrence: "／1回",
    per_issuance: "／交付1回"
  };

  document.body.classList.add("has-0718-redesign");
  if (["paper", "senior", "motorcycle"].includes(pageId)) {
    document.body.classList.add("is-concise-course-page");
  }

  function safeText(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeVehicleLabel(value) {
    const original = String(value ?? "").trim();
    if (!original || original === "MT移行（AT解除）" || original.includes("卒業証明書")) return original;
    const transmissionMatch = original.match(/\b(AT|MT)\b/i)
      || original.match(/[（(](AT|MT)[）)]/i);
    if (!transmissionMatch) return original;

    const transmission = (transmissionMatch[1] || transmissionMatch[0]).replace(/[（）()]/g, "").toUpperCase();
    let vehicle = original
      .replace(/\b(AT|MT)\b/ig, "")
      .replace(/[（(]\s*[）)]/g, "")
      .replace(/\s+/g, "")
      .trim();

    const aliases = {
      普通自動車: "普通車",
      準中型自動車: "準中型車",
      大型自動二輪車: "大型二輪車",
      普通自動二輪車: "普通二輪車",
      普通自動二輪車小型限定: "普通二輪車（小型限定）",
      普通二輪車小型限定: "普通二輪車（小型限定）",
      小型二輪車: "普通二輪車（小型限定）",
      小型限定: "普通二輪車（小型限定）"
    };
    vehicle = aliases[vehicle] || vehicle;
    return `${transmission}${vehicle}`;
  }

  function setPage(html) {
    main.innerHTML = `${mobileNav}<div class="redesign-0718">${html}</div>`;
    document.querySelectorAll(".subpage-side .subpage-actions").forEach((node) => node.remove());
  }

  function sectionHeader(eyebrow, title, lead = "") {
    return `<span class="r-eyebrow">${eyebrow}</span><h2 class="r-heading">${title}</h2>${lead ? `<p class="r-lead">${lead}</p>` : ""}`;
  }

  function taxNote(extra = "") {
    return `<p class="r-note fee-tax-note">表示金額は税込です。${extra ? ` ${safeText(extra)}` : ""}</p>`;
  }

  function courseLabel(row) {
    if (row.id?.startsWith("standard-at-")) return "AT普通車";
    if (row.id === "standard-mt-transition-at-graduation-certificate") return "MT移行（AT解除）";
    if (row.id === "standard-mt-license-change-from-at") return "MT普通車";
    if (row.id?.startsWith("semi-medium-from-")) return "MT準中型車";
    return normalizeVehicleLabel(`${row.transmission || ""}${row.course || ""}`);
  }

  function feeTable(rows) {
    if (!rows?.length) return "";
    const desktopRows = rows.map((row) => `
      <tr data-fee-row="${safeText(row.id)}">
        <td class="fee-course">${courseLabel(row)}</td>
        <td>${safeText(normalizeVehicleLabel(row.currentLicenseLabel))}</td>
        <td>${row.skillHours ?? "-"}時限</td>
        <td>${row.academicHours == null ? "-" : `${row.academicHours}時限`}</td>
        <td class="fee-amount">${yen(row.prices?.day?.student)}</td>
        <td class="fee-amount">${yen(row.prices?.day?.general)}</td>
        <td class="fee-amount">${yen(row.prices?.free?.student)}</td>
        <td class="fee-amount">${yen(row.prices?.free?.general)}</td>
      </tr>`).join("");
    const mobileRows = rows.map((row) => `
      <article class="fee-mobile-card" data-fee-row="${safeText(row.id)}">
        <h3>${courseLabel(row)}</h3>
        <dl>
          <div><dt>現在お持ちの免許</dt><dd>${safeText(normalizeVehicleLabel(row.currentLicenseLabel))}</dd></div>
          <div><dt>技能 / 学科</dt><dd>${row.skillHours ?? "-"} / ${row.academicHours == null ? "-" : row.academicHours} 時限</dd></div>
          <div><dt>デイ・学生</dt><dd class="fee-amount">${yen(row.prices?.day?.student)}</dd></div>
          <div><dt>デイ・一般</dt><dd class="fee-amount">${yen(row.prices?.day?.general)}</dd></div>
          <div><dt>フリー・学生</dt><dd class="fee-amount">${yen(row.prices?.free?.student)}</dd></div>
          <div><dt>フリー・一般</dt><dd class="fee-amount">${yen(row.prices?.free?.general)}</dd></div>
        </dl>
      </article>`).join("");
    return `
      <div class="fee-table-wrap">
        <table class="fee-table">
          <thead><tr><th>車種</th><th>現有免許</th><th>技能</th><th>学科</th><th>デイ<br>学生</th><th>デイ<br>一般</th><th>フリー<br>学生</th><th>フリー<br>一般</th></tr></thead>
          <tbody>${desktopRows}</tbody>
        </table>
      </div>
      <div class="fee-mobile-list">${mobileRows}</div>
      ${taxNote()}`;
  }

  function motorcycleFeeTables(rows, catalogKey) {
    const groups = [
      {
        id: "large-motorcycle-fees",
        scope: "large",
        label: "大型二輪車",
        description: "MT大型二輪免許を取得する方"
      },
      {
        id: "standard-motorcycle-fees",
        scope: "standard",
        label: "普通二輪車",
        description: "AT普通二輪免許・MT普通二輪免許を取得する方"
      },
      {
        id: "small-motorcycle-fees",
        scope: "small",
        label: "普通二輪車（小型限定）",
        description: "125cc以下の小型限定免許（MT・AT）を取得する方"
      }
    ];
    const navigation = `<nav class="fee-category-nav" aria-label="自動二輪車の料金区分">${groups.map((group) => `<a href="#${group.id}">${group.label}</a>`).join("")}</nav>`;
    const tables = groups.map((group, index) => {
      const groupRows = rows.filter((row) => {
        if (group.id === "large-motorcycle-fees") return row.course === "大型二輪車";
        if (group.id === "standard-motorcycle-fees") return row.course === "普通二輪車";
        return row.course === "普通二輪車小型限定";
      });
      return `<section class="fee-vehicle-group" id="${group.id}">
        <header class="fee-vehicle-heading"><span>${String(index + 1).padStart(2, "0")}</span><div><h3>${group.label}</h3><p>${group.description}</p></div></header>
        ${feeTable(groupRows)}
        ${feeButtons(catalogKey, group.scope, group.label)}
      </section>`;
    }).join("");
    return `${navigation}<div class="fee-vehicle-groups">${tables}</div>`;
  }

  const optionPlanPresentation = {
    komikomi: {
      target: "AT普通車・MT準中型車",
      notes: []
    },
    "camp-style-high-speed": {
      target: "AT普通車",
      notes: [
        "入校希望日の2週間前までにお手続きが必要です。",
        "各入校日先着3名のため、お受けできない場合があります。"
      ]
    },
    schedule: {
      target: "AT普通車・MT普通車・MT準中型車",
      notes: [
        "入校希望日の1週間前までにお手続きが必要です。",
        "各入校日先着3名のため、お受けできない場合があります。"
      ]
    }
  };

  function optionCards(options = []) {
    if (!options.length) return "";
    return `<div class="option-grid">${options.map((option) => {
      const spring = option.pricesBySeason?.aprToNov;
      const winter = option.pricesBySeason?.decToMar;
      const price = spring === winter ? yen(spring) : `4〜11月 ${yen(spring)} / 12〜3月 ${yen(winter)}`;
      const presentation = optionPlanPresentation[option.id] || {};
      const notes = (presentation.notes || []).map((note) => `<li>${safeText(note)}</li>`).join("");
      return `<article class="option-item">
        <h3>${safeText(option.label)}</h3>
        <p>${safeText(option.description)}</p>
        <strong class="option-price">${price}</strong>
        ${notes ? `<ul class="option-notes">${notes}</ul>` : ""}
      </article>`;
    }).join("")}</div>${taxNote()}`;
  }

  function planGuide() {
    const plans = [
      {
        title: "デイプラン",
        hours: master.dimensions.plans.day.hours,
        fit: "平日や日中に通える方",
        detail: "基本料金で通える標準プランです。教習予約はデイプランの時間帯で行います。"
      },
      {
        title: "フリープラン",
        hours: master.dimensions.plans.free.hours,
        fit: "学校・仕事のあとにも通いたい方",
        detail: "フリープラン料が別途必要になります。"
      }
    ];
    return `<div class="plan-guide-grid">${plans.map((plan) => `<article class="plan-guide-card"><h3>${safeText(plan.title)}</h3><strong>${safeText(plan.hours)}</strong><dl><div><dt>おすすめ</dt><dd>${safeText(plan.fit)}</dd></div><div><dt>内容</dt><dd>${safeText(plan.detail)}</dd></div></dl></article>`).join("")}</div>`;
  }

  function modalAmount(item) {
    if (!item) return "―";
    return `${yen(item.amount)}${item.tax === "exempt" ? "（非課税）" : ""}`;
  }

  function modalItemLabel(item) {
    if (item.id === "textbook") return "教科書代（免なし・原付持の方）";
    if (item.id === "textbook-no-license-or-moped") return "教科書代（免なし・原付持の方）";
    if (item.id === "textbook-license-holder") return "教科書代（免有の方）";
    const unitSuffix = {
      per_period: "（1時限）",
      per_attempt: "（1回）",
      per_occurrence: "（1回）"
    }[item.unit] || "";
    return unitSuffix && !String(item.label).includes(unitSuffix)
      ? `${item.label}${unitSuffix}`
      : item.label;
  }

  function modalItems(items = []) {
    return items.map((item) => `<div class="r-modal-row"><span>${safeText(modalItemLabel(item))}</span><strong>${modalAmount(item)}</strong></div>`).join("");
  }

  function modalShell() {
    return `<div class="r-modal" id="fee-detail-modal" hidden aria-hidden="true"><div class="r-modal-backdrop" data-modal-close></div><section class="r-modal-panel" role="dialog" aria-modal="true" aria-labelledby="fee-modal-title"><button class="r-modal-close" type="button" data-modal-close aria-label="閉じる">×</button><h2 id="fee-modal-title"></h2><div id="fee-modal-content"></div></section></div>`;
  }

  const motorcycleFeeScopes = {
    large: {
      breakdown: [
        { id: "large-admission", label: "入学金", amount: 38000, tax: "included" },
        { id: "large-skill-lesson", label: "技能教習料", amount: 5060, tax: "included", unit: "per_period" },
        { id: "large-academic", label: "学科教習料", amount: 2200, tax: "included" },
        { id: "large-textbook", label: "教科書代（免有の方）", amount: 1100, tax: "included" },
        { id: "large-aptitude", label: "適性検査料", amount: 3300, tax: "included" },
        { id: "large-graduation-test", label: "卒業検定料", amount: 6050, tax: "included" },
        { id: "large-photo", label: "証明写真代", amount: 1100, tax: "included" },
        { id: "large-certificate", label: "証明書発行料", amount: 3300, tax: "included" },
        { id: "large-free-plan", label: "フリープラン料", amount: 22000, tax: "included" }
      ],
      other: [
        { id: "large-extension", label: "延長・補習教習料", amount: 5060, tax: "included", unit: "per_period" },
        { id: "large-retest", label: "卒業検定再検定料", amount: 6050, tax: "included", unit: "per_attempt" },
        { id: "large-certificate-reissue", label: "証明書再発行料", amount: 3300, tax: "included" },
        { id: "large-lesson-cancel", label: "技能教習無断キャンセル料", amount: 5000, tax: "exempt", unit: "per_attempt" },
        { id: "large-test-cancel", label: "技能検定無断キャンセル料", amount: 5000, tax: "exempt", unit: "per_attempt" }
      ]
    },
    standard: {
      breakdown: [
        { id: "standard-admission", label: "入学金", amount: 24800, tax: "included" },
        { id: "standard-skill-lesson", label: "技能教習料", amount: 4510, tax: "included", unit: "per_period" },
        { id: "standard-academic-stage-1", label: "学科教習料1段階", amount: 22000, tax: "included" },
        { id: "standard-academic-stage-2", label: "学科教習料2段階", amount: 35200, tax: "included" },
        { id: "standard-textbook-none", label: "教科書代（免なし・原付持の方）", amount: 3300, tax: "included" },
        { id: "standard-textbook-holder", label: "教科書代（免有の方）", amount: 1100, tax: "included" },
        { id: "standard-aptitude", label: "適性検査料", amount: 3300, tax: "included" },
        { id: "standard-effect", label: "効果測定料", amount: 1650, tax: "included" },
        { id: "standard-graduation-test", label: "卒業検定料", amount: 6050, tax: "included" },
        { id: "standard-photo", label: "証明写真代", amount: 1100, tax: "included" },
        { id: "standard-certificate", label: "証明書発行料", amount: 3300, tax: "included" },
        { id: "standard-free-plan", label: "フリープラン料", amount: 11000, tax: "included" }
      ],
      other: [
        { id: "standard-extension", label: "延長・補習教習料", amount: 4510, tax: "included", unit: "per_period" },
        { id: "standard-retest", label: "卒業検定再検定料", amount: 6050, tax: "included", unit: "per_attempt" },
        { id: "standard-certificate-reissue", label: "証明書再発行料", amount: 3300, tax: "included" },
        { id: "standard-lesson-cancel", label: "技能教習無断キャンセル料", amount: 5000, tax: "exempt", unit: "per_attempt" },
        { id: "standard-test-cancel", label: "技能検定無断キャンセル料", amount: 5000, tax: "exempt", unit: "per_attempt" }
      ]
    },
    small: {
      breakdown: [
        { id: "small-admission", label: "入学金", amount: 34700, tax: "included" },
        { id: "small-skill-lesson", label: "技能教習料", amount: 4510, tax: "included", unit: "per_period" },
        { id: "small-academic-stage-1", label: "学科教習料1段階", amount: 22000, tax: "included" },
        { id: "small-academic-stage-2", label: "学科教習料2段階", amount: 35200, tax: "included" },
        { id: "small-textbook-none", label: "教科書代（免なし・原付持の方）", amount: 3300, tax: "included" },
        { id: "small-textbook-holder", label: "教科書代（免有の方）", amount: 1100, tax: "included" },
        { id: "small-aptitude", label: "適性検査料", amount: 3300, tax: "included" },
        { id: "small-effect", label: "効果測定料", amount: 1650, tax: "included" },
        { id: "small-graduation-test", label: "卒業検定料", amount: 6050, tax: "included" },
        { id: "small-photo", label: "証明写真代", amount: 1100, tax: "included" },
        { id: "small-certificate", label: "証明書発行料", amount: 3300, tax: "included" },
        { id: "small-free-plan", label: "フリープラン料", amount: 11000, tax: "included" }
      ],
      other: [
        { id: "small-extension", label: "延長・補習教習料", amount: 4510, tax: "included", unit: "per_period" },
        { id: "small-retest", label: "卒業検定再検定料", amount: 6050, tax: "included", unit: "per_attempt" },
        { id: "small-certificate-reissue", label: "証明書再発行料", amount: 3300, tax: "included" },
        { id: "small-lesson-cancel", label: "技能教習無断キャンセル料", amount: 5000, tax: "exempt", unit: "per_attempt" },
        { id: "small-test-cancel", label: "技能検定無断キャンセル料", amount: 5000, tax: "exempt", unit: "per_attempt" }
      ]
    }
  };

  function motorcycleComparisonRows(config, isBreakdown) {
    const source = isBreakdown ? (config.feeBreakdown || []) : (config.otherFees || []);
    const largeId = isBreakdown ? "large-skill-lesson" : "large-extension-lesson";
    const standardId = isBreakdown ? "standard-skill-lesson" : "standard-extension-lesson";
    const shared = source.filter((item) => ![largeId, standardId].includes(item.id));
    return [
      {
        label: isBreakdown ? "技能教習料" : "延長・補習教習料",
        large: source.find((item) => item.id === largeId),
        standard: source.find((item) => item.id === standardId)
      },
      ...shared.map((item) => ({
        label: modalItemLabel(item),
        large: item,
        standard: item
      }))
    ];
  }

  function motorcycleComparisonTable(config, isBreakdown) {
    const rows = motorcycleComparisonRows(config, isBreakdown);
    return `
      <div class="r-motorcycle-comparison" role="table" aria-label="大型二輪車と普通・小型二輪車の料金比較">
        <div class="r-motorcycle-comparison-header" role="row">
          <span role="columnheader">費用項目</span>
          <strong role="columnheader">大型二輪車</strong>
          <strong role="columnheader">普通・小型二輪車</strong>
        </div>
        ${rows.map((row) => `
          <div class="r-motorcycle-comparison-row" role="row">
            <span class="r-motorcycle-fee-label" role="rowheader">${safeText(row.label)}</span>
            <strong class="r-motorcycle-fee-amount" role="cell" data-vehicle="大型二輪車">${modalAmount(row.large)}</strong>
            <strong class="r-motorcycle-fee-amount" role="cell" data-vehicle="普通・小型二輪車">${modalAmount(row.standard)}</strong>
          </div>
        `).join("")}
      </div>`;
  }

  function modalSections(config, isBreakdown, scope) {
    if (scope === "license") {
      return [{
        title: "限定解除",
        items: isBreakdown
          ? (config.licenseChangeFeeBreakdown || [])
          : (config.licenseChangeOtherFees || [])
      }];
    }
    if (motorcycleFeeScopes[scope]) {
      const scopeLabels = {
        large: "大型二輪車",
        standard: "普通二輪車",
        small: "普通二輪車（小型限定）"
      };
      return [{
        title: `${scopeLabels[scope]} ${isBreakdown ? "料金内訳" : "その他の費用の内訳"}`,
        items: isBreakdown
          ? motorcycleFeeScopes[scope].breakdown
          : motorcycleFeeScopes[scope].other
      }];
    }
    return [{
      title: "",
      items: isBreakdown
        ? (config.feeBreakdown || [])
        : (config.otherFees || [])
    }];
  }

  function setupModal(configs) {
    const modal = main.querySelector("#fee-detail-modal");
    if (!modal) return;
    const title = modal.querySelector("#fee-modal-title");
    const content = modal.querySelector("#fee-modal-content");
    const panel = modal.querySelector(".r-modal-panel");
    let lastTrigger = null;

    function close() {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-modal-open");
      lastTrigger?.focus();
    }

    main.querySelectorAll("[data-fee-view]").forEach((button) => {
      button.addEventListener("click", () => {
        const config = configs[button.dataset.catalog];
        if (!config) return;
        const isBreakdown = button.dataset.feeView === "breakdown";
        const scope = button.dataset.feeScope || "normal";
        const sections = modalSections(config, isBreakdown, scope);
        const isMotorcycleComparison = scope === "normal" && config.label === "自動二輪車";
        lastTrigger = button;
        title.textContent = `${button.dataset.feeLabel || config.label} ${isBreakdown ? "料金内訳" : "その他の費用"}`;
        content.innerHTML = `${isMotorcycleComparison
          ? motorcycleComparisonTable(config, isBreakdown)
          : sections.map((section) => `<section class="r-modal-group">${section.title ? `<h3>${safeText(section.title)}</h3>` : ""}<div class="r-modal-list">${modalItems(section.items)}</div></section>`).join("")
        }${taxNote("なお、「非課税」と記載した項目は対象外です。")}`;
        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("is-modal-open");
        panel.scrollTop = 0;
        modal.querySelector(".r-modal-close")?.focus();
      });
    });
    modal.querySelectorAll("[data-modal-close]").forEach((node) => node.addEventListener("click", close));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) close();
    });
  }

  const feePageMap = {
    standard: { key: "standardCar", title: "普通自動車 料金表", lead: "現在お持ちの免許と通える時間帯から、教習料金を確認できます。" },
    semi_medium: { key: "semiMedium", title: "準中型車 料金表", lead: "現有免許によって必要時限と料金が変わります。該当する免許区分をご確認ください。" },
    bike: { key: "motorcycle", title: "自動二輪車 料金表", lead: "大型・普通・小型、AT・MTごとの料金を、現在お持ちの免許別に確認できます。" }
  };

  function feeButtons(key, scope = "normal", label = "") {
    return `<div class="r-actions"><button class="r-button is-primary" type="button" data-fee-view="breakdown" data-fee-scope="${scope}" data-fee-label="${safeText(label)}" data-catalog="${key}">料金内訳を見る</button><button class="r-button" type="button" data-fee-view="other" data-fee-scope="${scope}" data-fee-label="${safeText(label)}" data-catalog="${key}">その他の費用を見る</button></div>`;
  }

  function separateFeeNotice(catalog) {
    if (!(catalog.separateFees || []).length) return "";
    return `<p class="separate-fee-note">仮免試験手数料1,800円（非課税）　仮免交付手数料1,100円（非課税）が別途必要になります。</p>`;
  }

  const discountGuides = {
    standard: {
      slug: "ordinary",
      alt: "普通自動車の卒業生割引と複数人入校割引",
      text: "卒業生割引は教習料金合計11万円以上で2万円、11万円未満で1万円です。現有免許なし・原付のみの方が同じ月に入校する場合、2人で1人1万円、3人以上で1人1万5千円を割り引きます。他の割引や特典とは併用できません。"
    },
    semi_medium: {
      slug: "semi-medium",
      alt: "準中型車の卒業生割引と複数人入校割引",
      text: "卒業生割引は2万円です。現有免許なし・原付のみの方が同じ月に入校する場合、2人で1人1万円、3人以上で1人1万5千円を割り引きます。普通車または自動二輪免許をお持ちの方は、2人以上で1人5千円を割り引きます。車種が異なる場合も対象です。他の割引や特典とは併用できません。"
    },
    bike: {
      slug: "motorcycle",
      alt: "自動二輪車の卒業生割引と複数人入校割引",
      text: "卒業生割引は教習料金合計11万円以上で2万円、11万円未満で1万円です。同じ月に2人以上で入校する場合、1人5千円を割り引きます。車種が異なる場合も対象です。他の割引や特典とは併用できません。"
    },
    limited: {
      slug: "limited",
      alt: "各種限定解除の卒業生割引",
      text: "各種限定解除の卒業生割引は1万円です。他の割引や特典とは併用できません。"
    }
  };

  function discountGuide(id) {
    const guide = discountGuides[id];
    if (!guide) return "";
    const base = `images/detail-pages/discounts-20260724/${guide.slug}-discount`;
    return `<section class="r-section discount-guide-section" id="discount-guide"><div class="r-wrap">
      ${sectionHeader("DISCOUNT", "割引のご案内", "対象条件をご確認のうえ、お申し込み時に受付へお申し出ください。")}
      <picture class="discount-guide-picture">
        <source media="(max-width: 600px)" srcset="${base}-mobile.webp">
        <img src="${base}-desktop.webp" width="1600" height="900" loading="lazy" decoding="async" alt="${safeText(guide.alt)}">
      </picture>
      <p class="visually-hidden">${safeText(guide.text)}</p>
      ${taxNote()}
      <p class="r-note">割引の適用可否は受付で最終確認します。</p>
    </div></section>`;
  }

  function renderFeePage(id) {
    if (!master) return;
    const spec = feePageMap[id];
    const catalog = master.catalog[spec.key];
    setPage(`
      <section class="r-section" id="formal-fees"><div class="r-wrap">
        ${sectionHeader("FEES", spec.title, spec.lead)}
        <p class="r-note">学生料金は学生証の提示が必要です。</p>
        ${id === "bike" ? motorcycleFeeTables(catalog.mainFeeRows, spec.key) : feeTable(catalog.mainFeeRows)}
        ${separateFeeNotice(catalog)}
        ${id === "bike" ? "" : feeButtons(spec.key)}
      </div></section>
      ${discountGuide(id)}
      <section class="r-section is-soft"><div class="r-wrap">${sectionHeader("PLAN GUIDE", "教習プラン", "通える時間帯に合わせて、デイプランまたはフリープランを選べます。")}${planGuide()}</div></section>
      ${catalog.options?.length ? `<section class="r-section"><div class="r-wrap">${sectionHeader("OPTION", "通い方に合わせたオプション", "基本料金に追加して選べるプランです。")}${optionCards(catalog.options)}</div></section>` : ""}
      <section class="r-section is-soft"><div class="r-wrap"><h2 class="visually-hidden">注意事項</h2>
        <div class="r-notice">${(catalog.notices || []).map((notice) => `<div>・${safeText(notice)}</div>`).join("") || "割引の適用条件や入校時期による差は、受付で最終確認します。"}</div>
      </div></section>
      ${modalShell()}`);
    setupModal({ [spec.key]: catalog });
  }

  function renderLimitedFees() {
    if (!master) return;
    const groups = [
      ["standardCar", "普通車の限定解除", master.catalog.standardCar],
      ["semiMedium", "準中型車の限定解除", master.catalog.semiMedium],
      ["motorcycle", "自動二輪車の限定解除", master.catalog.motorcycle]
    ];
    setPage(`<section class="r-section"><div class="r-wrap">${sectionHeader("LICENSE CHANGE", "限定解除 料金表", "現在お持ちの免許の限定条件を解除する場合の料金です。")}</div></section>` + groups.map(([key, title, catalog], index) => `
      <section class="r-section ${index % 2 ? "is-soft" : ""}"><div class="r-wrap">
        ${sectionHeader("FEES", title, "現在お持ちの免許に合う行をご確認ください。")}
        ${feeTable(catalog.licenseChangeRows)}
        ${feeButtons(key, "license", title)}
      </div></section>`).join("") + discountGuide("limited") + modalShell());
    setupModal(Object.fromEntries(groups.map(([key, , catalog]) => [key, catalog])));
  }

  function renderPriceHub() {
    setPage(`<section class="r-section"><div class="r-wrap">
      ${sectionHeader("FEES", "免許ごとの料金", "普通車、準中型車、自動二輪車、限定解除の料金・内訳・追加費用を確認できます。")}
      <div class="simple-grid">
        <a class="simple-item" href="detail.html?page=standard#formal-fees"><h3>普通自動車</h3><p>AT、MT移行、普通車限定解除</p></a>
        <a class="simple-item" href="detail.html?page=semi_medium#formal-fees"><h3>準中型車</h3><p>現有免許5区分と限定解除</p></a>
        <a class="simple-item" href="detail.html?page=bike#formal-fees"><h3>自動二輪車</h3><p>大型・普通・小型、AT・MT</p></a>
        <a class="simple-item" href="detail.html?page=limited"><h3>限定解除</h3><p>普通車・準中型車・自動二輪車</p></a>
      </div>
      <div class="r-actions"><a class="r-button is-primary" href="detail.html?page=application&amp;purpose=資料請求">料金・入校日を相談する</a></div>
    </div></section>`);
  }

  function renderHighSpeedPlan() {
    if (!master) return;
    const catalog = master.catalog.standardCar;
    const highSpeed = catalog.options.find((option) => option.id === "camp-style-high-speed");
    setPage(`<section class="r-section"><div class="r-wrap">
      ${sectionHeader("HIGH SPEED PLAN", "合宿風ハイスピードプラン", "自宅から通いながら、当校が組んだ短期スケジュールでAT普通車の取得を目指す追加プランです。")}
      <div class="simple-grid">
        <article class="simple-item"><h3>対象</h3><p>AT普通車</p></article>
        <article class="simple-item"><h3>取得期間の目安</h3><p>最短17日</p></article>
        <article class="simple-item"><h3>受付人数</h3><p>各入校日 先着3名</p></article>
      </div>
      ${optionCards(highSpeed ? [highSpeed] : [])}
      <div class="r-notice"><div>・最短日数は目安で、教習の進み方や検定結果により延びる場合があります。</div><div>・基本教習料金に追加して利用するプランです。</div><div>・入校日と空き状況は受付でご確認ください。</div></div>
      <div class="r-actions"><a class="r-button is-primary" href="detail.html?page=standard#formal-fees">普通車の料金を見る</a><a class="r-button is-orange" href="detail.html?page=application&amp;purpose=資料請求">空き状況を相談する</a></div>
    </div></section>`);
  }

  function renderAdmission() {
    const admissionSteps = [
      ["必要書類を準備", ""],
      ["入校手続き来校", "必要書類を持参"],
      ["写真撮影・視力検査", "眼鏡・コンタクトが必要な方はご準備下さい"],
      ["入校日を決定", "木曜日・土曜日から選択"],
      ["入校受付完了", "入校日に来校"]
    ];
    const atSteps = ["入校式", "適性検査・学科1", "第1段階 技能教習（場内）・学科教習", "修了検定", "仮免学科試験", "第2段階 技能教習（路上）・学科教習", "卒業検定", "卒業証明書", "本免学科試験", "運転免許証交付"].map((title) => [title, ""]);
    const mtSteps = ["AT普通車課程", "AT卒業検定", "MT技能教習", "技能審査", "卒業証明書", "本免学科試験", "運転免許証交付"].map((title) => [title, ""]);
    const bikeSteps = ["入校式", "適性検査・学科1", "第1段階 技能教習・学科教習", "第2段階 技能教習・学科教習", "卒業検定", "卒業証明書", "本免学科試験", "運転免許証交付"].map((title) => [title, ""]);
    const hiddenFlow = (title, items) => `<div class="visually-hidden"><h3>${title}</h3><ol>${items.map(([stepTitle, text]) => `<li><strong>${safeText(stepTitle)}</strong> ${safeText(text)}</li>`).join("")}</ol></div>`;
    const flowPicture = (basename, alt) => {
      const directory = basename === "license-bike" ? "flows-20260724" : "flows-20260723";
      const mobileFile = basename === "license-bike" ? "license-bike-mobile-v3-20260730.webp" : `${basename}-mobile.webp`;
      const desktopFile = basename === "license-bike" ? "license-bike-desktop-v3-20260730.webp" : `${basename}-desktop.webp`;
      return `<picture class="flow-artwork"><source media="(max-width: 560px)" srcset="images/detail-pages/${directory}/${mobileFile}"><img src="images/detail-pages/${directory}/${desktopFile}" alt="${safeText(alt)}" loading="eager" decoding="async"></picture>`;
    };
    const lessonTimes = ["8:30〜9:20", "9:30〜10:20", "10:30〜11:20", "11:30〜12:20", "12:30〜13:20", "13:30〜14:20", "14:30〜15:20", "15:30〜16:20", "16:30〜17:20", "17:40〜18:30", "18:40〜19:30", "19:40〜20:30"];
    setPage(`
      <section class="r-section"><div class="r-wrap">
        ${sectionHeader("ENTRY GUIDE", "入校案内", "必要な手続き、入校資格、免許証交付までの流れを順番に確認できます。")}
        <nav class="flow-switch is-five" aria-label="入校案内のページ内メニュー"><a href="#entry-flow">入校まで</a><a href="#preparation">準備・資格</a><a href="#admission-day">入校日</a><a href="#license-flow">免許証交付まで</a><a href="#lesson-time">教習時間</a></nav>
      </div></section>
      <section class="r-section is-soft" id="entry-flow"><div class="r-wrap">
        ${sectionHeader("ENTRY FLOW", "入校までの流れ", "必要書類の準備から入校受付完了まで、5つの段階で進みます。")}
        ${flowPicture("admission", "筑紫野自動車学校の入校までの5ステップ")}
        ${hiddenFlow("入校までの5ステップ", admissionSteps)}
      </div></section>
      <section class="r-section" id="preparation"><div class="r-wrap">
        ${sectionHeader("PREPARATION", "入校前に準備するもの", "入校手続きは入校日前日までにお済ませください。")}
        <div class="admission-info-grid">
          <article class="info-panel">
            <h3>必要書類</h3>
            <ul class="info-list">
              <li><strong>入校申込書</strong></li>
              <li><strong>住民票 1通</strong><span>本籍地を記載し、個人番号は記載しない、発行から6か月以内のもの。運転免許証をお持ちの方は不要です。</span></li>
              <li><strong>運転免許証またはマイナ免許証</strong><span>マイナ免許証をお持ちの方は暗証番号をご準備ください。</span></li>
              <li><strong>外国籍の方</strong><span>国籍を記載した住民票と在留カードが必要です。</span></li>
              <li><strong>本人確認書類</strong><span>健康保険資格確認書、学生証、パスポート、マイナンバーカードなど。学生証の提示で学生料金が適用されます。</span></li>
              <li><strong>眼鏡・コンタクト</strong><span>必要な方はご持参ください。カラーコンタクト・サークルレンズは使用できません。</span></li>
              <li><strong>交通系ICカード</strong><span>nimoca・SUGOCAなど、お持ちの方はご持参ください。</span></li>
            </ul>
          </article>
          <article class="info-panel">
            <h3>お支払い方法</h3>
            <ul class="info-list">
              <li><strong>現金</strong><span>当校窓口でお支払いください。</span></li>
              <li><strong>銀行振込</strong><span>お申込手続き後、入校日前日までにお振込みください。振込先は受付からご案内し、振込手数料はお客様負担です。</span></li>
              <li><strong>教習ローン</strong><span>入校日前日までに審査を完了してください。</span></li>
              <li><strong>クレジットカード</strong><span>一括払いのみご利用いただけます。</span></li>
              <li><strong>QRコード決済</strong><span>一括払いのみご利用いただけます。</span></li>
            </ul>
            <p class="info-emphasis">教習料金は前払いです。入校手続き時までにお支払い方法をご確認ください。</p>
          </article>
        </div>
        <section class="qualification-panel">
          <h3>入校資格</h3>
          <p class="r-note">身体に障がいをお持ちの方は、事前にご相談ください。</p>
          <dl class="qualification-list">
            <div><dt>年齢</dt><dd>普通車・準中型車は17歳6か月以上、大型二輪は18歳以上、普通二輪・小型二輪は16歳以上。普通車免許の交付は18歳以降です。</dd></div>
            <div><dt>視力</dt><dd>普通車・二輪は両眼0.7以上かつ片眼それぞれ0.3以上。準中型車は両眼0.8以上かつ片眼それぞれ0.5以上。</dd></div>
            <div><dt>視野</dt><dd>片眼が0.3未満の場合は、他眼が0.7以上かつ視野150度以上。準中型車には適用できません。</dd></div>
            <div><dt>深視力</dt><dd>準中型車のみ、3回の検査の平均誤差が2cm以下（合計誤差6cm以下）。</dd></div>
            <div><dt>色彩識別</dt><dd>赤色・青色・黄色を識別できること。</dd></div>
            <div><dt>聴力</dt><dd>10mの距離で90dBの警音器の音が聞こえること。</dd></div>
            <div><dt>運動能力</dt><dd>自動車などの運転に支障を及ぼす身体障害がないこと。</dd></div>
          </dl>
        </section>
      </div></section>
      <section class="r-section admission-day-section" id="admission-day"><div class="r-wrap">
        ${sectionHeader("ADMISSION DAY", "入校日")}
        <div class="admission-day-grid">
          <article class="admission-day-card">
            <h3>普通車・準中型車・自動二輪車で<br>新規入校の方</h3>
            <p class="admission-day-intro"><strong>入校日は毎週木曜日と土曜日です。</strong><span>入校説明開始時間前にご来校ください。</span></p>
            <div class="admission-day-schedule">
              <section>
                <h4>木曜日</h4>
                <dl>
                  <div><dt>入校説明</dt><dd>17:40〜18:30</dd></div>
                  <div><dt>運転適性検査</dt><dd>18:40〜19:30</dd></div>
                  <div><dt>学科第1教程</dt><dd>19:40〜20:30</dd></div>
                </dl>
              </section>
              <section>
                <h4>土曜日</h4>
                <dl>
                  <div><dt>入校説明</dt><dd>14:30〜15:20</dd></div>
                  <div><dt>運転適性検査</dt><dd>15:30〜16:20</dd></div>
                  <div><dt>学科第1教程</dt><dd>16:30〜17:20</dd></div>
                </dl>
              </section>
            </div>
          </article>
          <article class="admission-day-card">
            <h3>準中型車・自動二輪車・各種限定解除で入校の方<br><small>追加で免許を取得される方</small></h3>
            <p class="admission-day-intro"><strong>入校日は毎週木曜日と土曜日です。</strong><span>運転適性検査開始時間前にご来校ください。</span></p>
            <div class="admission-day-schedule">
              <section>
                <h4>木曜日</h4>
                <dl><div><dt>運転適性検査</dt><dd>18:40〜19:30</dd></div></dl>
              </section>
              <section>
                <h4>土曜日</h4>
                <dl><div><dt>運転適性検査</dt><dd>15:30〜16:20</dd></div></dl>
              </section>
            </div>
          </article>
        </div>
      </div></section>
      <section class="r-section is-soft" id="license-flow"><div class="r-wrap">${sectionHeader("LICENSE FLOW", "免許証交付まで", "取得する免許に合わせて流れを確認できます。")}
        <div class="license-flow-list">
          <section><h3>AT普通車</h3>${flowPicture("license-at", "AT普通車の免許証交付までの10工程")}</section>
          <section><h3>MT普通車</h3>${flowPicture("license-mt", "MT普通車の免許証交付までの7工程")}</section>
          <section class="license-flow-bike"><h3>自動二輪</h3>${flowPicture("license-bike", "自動二輪の免許証交付までの8工程")}</section>
        </div>
        ${hiddenFlow("AT普通車の免許証交付まで", atSteps)}
        ${hiddenFlow("MT普通車の免許証交付まで", mtSteps)}
        ${hiddenFlow("自動二輪の免許証交付まで", bikeSteps)}
      </div></section>
      <section class="r-section" id="lesson-time"><div class="r-wrap">
        <h2 class="visually-hidden">教習時間</h2>
        <figure class="lesson-time-figure"><img src="images/detail-pages/admission/lesson-times-imagegen-v3.webp" alt="教習時間。1限目8時30分から9時20分、2限目9時30分から10時20分、3限目10時30分から11時20分、4限目11時30分から12時20分、5限目12時30分から13時20分、6限目13時30分から14時20分、7限目14時30分から15時20分、8限目15時30分から16時20分、9限目16時30分から17時20分、10限目17時40分から18時30分、11限目18時40分から19時30分、12限目19時40分から20時30分。平日は10時30分から20時30分、土日は9時30分から18時30分。時間割は時期によって変わる場合があります。" loading="eager" decoding="async"></figure>
        <ol class="visually-hidden lesson-time-text">${lessonTimes.map((time, index) => `<li><strong>${index + 1}時限</strong> ${time}</li>`).join("")}</ol>
      </div></section>`);
  }

  function renderPaperPage() {
    const courseTypes = [
      ["ペーパードライバー講習", "普通自動車の運転を、現在の技量と目的に合わせて練習します。"],
      ["ペーパーライダー講習", "二輪免許に合う学校車両で、基本操作から確認します。"],
      ["運転免許試験の受験講習", "受験する試験に合わせて、必要な運転操作を練習します。"],
      ["外国免許からの切替講習", "切替を申請する車両に合わせて練習します。"]
    ];
    const multiRates = [["2回コース", "13,500円"], ["3回コース", "20,000円"], ["4回コース", "26,500円"], ["5回コース", "33,000円"]];
    setPage(`
      <section class="r-section"><div class="r-wrap">
        ${sectionHeader("PAPER DRIVER", "ペーパードライバー講習等", "「運転をしない期間が長くて運転をするのが怖い」「免許を取ってからほとんど運転したことがないけど、大丈夫？」そんな不安解消やご要望にベテランスタッフがお応えします。運転技量をチェックし、技量に応じてプランを組み立てます。")}
        <div class="visual-split paper-intro"><img src="images/course-visuals-20260718/paper-driver.webp" alt="学校車両を使ったペーパードライバー講習" loading="eager" decoding="async"><div><div class="key-fact"><strong>まずは電話でご相談ください</strong><span>運転歴、苦手な場面、希望する練習内容を確認します。学校周辺の公道や、ご要望に応じた高速道路での講習にも対応します。</span></div><a class="r-button is-primary" href="tel:0927102188">092-710-2188へ電話</a></div></div>
      </div></section>
      <section class="r-section is-soft"><div class="r-wrap">
        ${sectionHeader("COURSE", "対応している講習")}
        <div class="paper-type-grid">${courseTypes.map(([title, text]) => `<article><h3>${safeText(title)}</h3><p>${safeText(text)}</p></article>`).join("")}</div>
      </div></section>
      <section class="r-section"><div class="r-wrap">
        ${sectionHeader("FEE", "講習料金")}
        <article class="paper-single-fee"><span>1回（50分）講習</span><strong>7,000円</strong><small>税込</small></article>
        <h3 class="paper-subheading">複数回コース</h3>
        <div class="paper-rate-grid">${multiRates.map(([label, amount]) => `<div><span>${label}</span><strong>${amount}</strong></div>`).join("")}</div>
        ${taxNote()}
        <p class="r-note">5回以上をご希望の方はお問い合わせください。途中で終了する場合、返金はありません。</p>
      </div></section>
      <section class="r-section is-soft"><div class="r-wrap">
        ${sectionHeader("NOTICE", "受講前にご確認ください")}
        <div class="r-notice"><div>・講習は当校の車両で行います。</div><div>・ペーパードライバー講習・ペーパーライダー講習は、お持ちの運転免許証で運転できる車両を使用します。</div><div>・外国免許からの切替講習は、切替を申請する車両を使用します。</div><div>・講習中のけがについては自己責任となります。ご了承ください。</div><div>・講習料の有効期限は初回講習日から6か月間です。</div><div>・高速道路を利用する場合、通行料金は別途必要です。</div></div>
        <div class="paper-booking-grid">
          <article><h3>予約</h3><p>事前予約制です。希望する講習と回数を電話でお伝えください。</p></article>
          <article><h3>持ち物</h3><p>運転免許証、必要な方は眼鏡・コンタクトをご持参ください。</p></article>
          <article><h3>講習時間</h3><p>1回50分です。実施日時は予約時にご案内します。</p></article>
        </div>
        <div class="r-actions"><a class="r-button is-primary" href="tel:0927102188">電話で予約する</a><a class="r-button" href="detail.html?page=application&amp;purpose=資料請求">Webで相談する</a></div>
      </div></section>`);
  }

  function renderConcisePage(type) {
    const pages = {
      paper: {
        eyebrow: "PAPER DRIVER",
        title: "運転の不安を、必要な場面から練習。",
        lead: "久しぶりの運転、駐車、狭い道、高速道路など、現在の技量と目的を確認して内容を組み立てます。",
        image: "images/course-visuals-20260718/paper-driver.webp",
        facts: [["まず電話で相談", "運転歴、苦手な場面、希望回数をお伝えください。"], ["1回50分", "初回に技量を確認し、その後の練習内容を調整します。"], ["学校車両で実施", "免許に合う車両で、校内から公道まで段階的に練習します。"]]
      },
      senior: {
        eyebrow: "SENIOR COURSE",
        title: "通知ハガキが届いたら、電話で予約。",
        lead: "年齢や違反状況によって必要な検査・講習が異なります。ハガキを手元にご準備ください。",
        image: "images/course-visuals-20260718/senior-course.webp",
        facts: [["1. ハガキを確認", "高齢者講習通知書に記載された内容を確認します。"], ["2. 電話で予約", "092-710-2188へお電話ください。必要な検査と持ち物をご案内します。"], ["3. 講習日に来校", "通知書、免許証、眼鏡等、講習手数料をお持ちください。"]]
      },
      motorcycle: {
        eyebrow: "MOPED COURSE",
        title: "原付講習は、事前予約制です。",
        lead: "基本操作・基本走行・応用走行と安全運転の知識を、3時間の講習で学びます。",
        image: "images/course-visuals-20260718/moped-course.webp",
        facts: [["予約", "092-710-2188へ電話し、実施日と開始時間を確認します。"], ["服装", "長袖・長ズボン・運動靴・手袋。雨天時は雨具も必要です。"], ["持ち物", "本人確認書類、住民票、印鑑、筆記用具などを準備します。"]]
      }
    };
    const page = pages[type];
    if (type === "senior") {
      const transcript = page.facts.map(([title, text]) => `<li><strong>${safeText(title)}</strong> ${safeText(text)}</li>`).join("");
      setPage(`<section class="r-section"><div class="r-wrap">${sectionHeader(page.eyebrow, page.title, page.lead)}<picture class="flow-artwork senior-artwork"><source media="(max-width: 560px)" srcset="images/detail-pages/flows-20260719/senior-mobile.webp"><img src="images/detail-pages/flows-20260719/senior-desktop.webp" alt="高齢者講習の予約から来校までの3ステップ" loading="eager" decoding="async"></picture><div class="visually-hidden"><ol>${transcript}</ol></div><div class="r-actions"><a class="r-button is-primary" href="tel:0927102188">092-710-2188へ電話</a></div></div></section>`);
      return;
    }
    setPage(`<section class="r-section"><div class="r-wrap">${sectionHeader(page.eyebrow, page.title, page.lead)}<div class="visual-split"><img src="${page.image}" alt="${safeText(page.title)}" loading="eager" decoding="async"><div>${page.facts.map(([title, text]) => `<div class="key-fact"><strong>${title}</strong><span>${text}</span></div>`).join("")}</div></div><div class="r-actions"><a class="r-button is-primary" href="tel:0927102188">092-710-2188へ電話</a>${type === "paper" ? '<a class="r-button" href="detail.html?page=application&amp;purpose=資料請求">Webで相談</a>' : ""}</div></div></section>`);
  }

  function renderSchedule() {
    setPage(`<section class="r-section"><div class="r-wrap">${sectionHeader("LESSON CALENDAR", "教習・検定日程", "教習日・検定日などの公開中の予定を、月・週・日ごとに確認できます。")}
      <div class="schedule-calendar">
        <div class="schedule-view-switch" role="group" aria-label="カレンダーの表示方法">
          <button type="button" class="is-active" data-calendar-view="month" aria-pressed="true">月</button>
          <button type="button" data-calendar-view="week" aria-pressed="false">週</button>
          <button type="button" data-calendar-view="day" aria-pressed="false">日</button>
        </div>
        <div class="schedule-calendar-nav" aria-label="表示する月">
          <button type="button" data-calendar-move="-1" aria-label="前月を表示">‹ <span data-calendar-prev-label>前月</span></button>
          <h3 id="schedule-month-label"></h3>
          <button type="button" data-calendar-move="1" aria-label="次月を表示"><span data-calendar-next-label>次月</span> ›</button>
        </div>
        <div id="schedule-calendar-panel" aria-live="polite"></div>
      </div>
      <p class="r-note" id="schedule-updated"></p>
      <dialog class="schedule-detail-dialog" id="schedule-detail-dialog" aria-labelledby="schedule-detail-title">
        <div class="schedule-detail-header">
          <div><span>予定の詳細</span><h3 id="schedule-detail-title"></h3></div>
          <button type="button" data-calendar-detail-close aria-label="詳細を閉じる">×</button>
        </div>
        <div class="schedule-detail-body" id="schedule-detail-body"></div>
      </dialog>
    </div></section>`);
    const panel = main.querySelector("#schedule-calendar-panel");
    const monthLabel = main.querySelector("#schedule-month-label");
    const updated = main.querySelector("#schedule-updated");
    const moveButtons = [...main.querySelectorAll("[data-calendar-move]")];
    const viewButtons = [...main.querySelectorAll("[data-calendar-view]")];
    const previousLabel = main.querySelector("[data-calendar-prev-label]");
    const nextLabel = main.querySelector("[data-calendar-next-label]");
    const detailDialog = main.querySelector("#schedule-detail-dialog");
    const detailTitle = main.querySelector("#schedule-detail-title");
    const detailBody = main.querySelector("#schedule-detail-body");
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthOffset = 3;
    const lastDate = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + lastMonthOffset + 1, 0, 12);
    const monthCache = new Map();
    let activeMonthOffset = 0;
    let activeDate = new Date(today);
    let activeView = "month";
    let activeLoadToken = 0;
    let eventLookup = new Map();
    let detailReturnFocus = null;

    function monthDate(offset = activeMonthOffset) {
      return new Date(firstMonth.getFullYear(), firstMonth.getMonth() + offset, 1);
    }

    function midday(date) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    }

    function dateKey(date) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function dateFromKey(value) {
      const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12) : null;
    }

    function monthKey(date) {
      return dateKey(date).slice(0, 7);
    }

    function clampDate(date) {
      const value = midday(date);
      if (value < firstMonth) return new Date(firstMonth);
      if (value > lastDate) return new Date(lastDate);
      return value;
    }

    function addDays(date, amount) {
      const result = midday(date);
      result.setDate(result.getDate() + amount);
      return result;
    }

    function startOfWeek(date) {
      return addDays(date, -date.getDay());
    }

    function datesBetween(start, end) {
      const dates = [];
      for (let date = midday(start); date <= end; date = addDays(date, 1)) {
        if (date >= firstMonth && date <= lastDate) dates.push(date);
      }
      return dates;
    }

    function formatLongDate(date) {
      return new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short"
      }).format(date);
    }

    function itemDateKey(item, targetMonth) {
      const rawDate = String(item?.date || item?.eventDate || item?.time || "");
      const isoMatch = rawDate.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      const japaneseMatch = rawDate.match(/(\d{1,2})月(\d{1,2})日/);
      if (!japaneseMatch || Number(japaneseMatch[1]) !== targetMonth.getMonth() + 1) return "";
      return `${targetMonth.getFullYear()}-${String(japaneseMatch[1]).padStart(2, "0")}-${String(japaneseMatch[2]).padStart(2, "0")}`;
    }

    function normalizeSchedule(schedule, targetMonth) {
      const seen = new Set();
      return ["month", "week", "today"].flatMap((period) => Array.isArray(schedule?.[period]) ? schedule[period] : [])
        .map((item) => ({ ...item, calendarDate: itemDateKey(item, targetMonth) }))
        .filter((item) => {
          if (!item.calendarDate || !item.calendarDate.startsWith(`${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, "0")}-`)) return false;
          const key = `${item.id || ""}|${item.calendarDate}|${item.title || ""}|${item.category || ""}|${item.note || item.details || ""}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    }

    function eventTime(item) {
      const explicitValues = [
        item?.startTime,
        item?.start_time,
        item?.eventTime,
        item?.event_time
      ].filter(Boolean);
      const searchableValues = [
        ...explicitValues,
        item?.title,
        item?.note,
        item?.details
      ].filter(Boolean);
      for (const value of searchableValues) {
        const text = String(value);
        const rangeMatch = text.match(/([01]?\d|2[0-3]):([0-5]\d)(?:\s*[〜～\-–]\s*([01]?\d|2[0-3]):([0-5]\d))?/);
        if (rangeMatch) {
          const start = `${Number(rangeMatch[1])}:${rangeMatch[2]}`;
          return rangeMatch[3] == null ? start : `${start}〜${Number(rangeMatch[3])}:${rangeMatch[4]}`;
        }
        const japaneseMatch = text.match(/([01]?\d|2[0-3])時(?:([0-5]?\d)分)?/);
        if (japaneseMatch) {
          return `${Number(japaneseMatch[1])}:${String(japaneseMatch[2] || "00").padStart(2, "0")}`;
        }
      }
      return "";
    }

    function eventNote(item) {
      return String(item?.note || item?.details || "").trim();
    }

    function eventSortTime(item) {
      const match = eventTime(item).match(/^(\d{1,2}):(\d{2})/);
      return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "99:99";
    }

    function eventSortRank(item) {
      if (item?.category === "検定") return "1";
      if (item?.category === "学科") return "2";
      if (item?.category === "休校") return "3";
      return "4";
    }

    function eventCategoryClass(item) {
      if (item?.category === "休校" || item?.title === "休校日") return "is-closed";
      if (item?.category === "検定") return "is-exam";
      if (item?.category === "学科" || item?.category === "教習") return "is-lesson";
      return "is-other";
    }

    function registerEvent(item) {
      const token = `event-${eventLookup.size}`;
      eventLookup.set(token, item);
      return token;
    }

    function calendarEvent(item, context = "month") {
      const time = context === "month" && item.category === "学科" ? "" : eventTime(item);
      const token = registerEvent(item);
      return `<li class="schedule-calendar-event">
        <button type="button" class="schedule-calendar-event-button is-${context} ${eventCategoryClass(item)}" data-calendar-event="${token}" aria-label="${safeText(`${item.title || "教習予定"}の詳細を表示`)}">
          <span class="schedule-event-category">${safeText(item.category || "予定")}</span>
          <strong>${safeText(item.title || "教習予定")}</strong>
          ${time ? `<small class="schedule-event-time">${safeText(time)}</small>` : ""}
        </button>
      </li>`;
    }

    function cacheKeysForRange(start, end) {
      const keys = [];
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      const finalMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      while (cursor <= finalMonth) {
        keys.push(monthKey(cursor));
        cursor.setMonth(cursor.getMonth() + 1);
      }
      return keys;
    }

    function viewRange() {
      if (activeView === "month") {
        const start = monthDate();
        return {
          start,
          end: new Date(start.getFullYear(), start.getMonth() + 1, 0, 12)
        };
      }
      if (activeView === "week") {
        const start = startOfWeek(activeDate);
        const end = addDays(start, 6);
        return {
          start: start < firstMonth ? new Date(firstMonth) : start,
          end: end > lastDate ? new Date(lastDate) : end
        };
      }
      return { start: midday(activeDate), end: midday(activeDate) };
    }

    function eventsForRange(start, end) {
      const seen = new Set();
      return cacheKeysForRange(start, end)
        .flatMap((key) => monthCache.get(key)?.events || [])
        .filter((item) => {
          if (item.calendarDate < dateKey(start) || item.calendarDate > dateKey(end)) return false;
          const identity = `${item.id || ""}|${item.calendarDate}|${item.title || ""}|${item.category || ""}|${item.note || item.details || ""}`;
          if (seen.has(identity)) return false;
          seen.add(identity);
          return true;
        })
        .sort((a, b) => `${a.calendarDate}|${eventSortRank(a)}|${eventSortTime(a)}|${a.title || ""}`.localeCompare(`${b.calendarDate}|${eventSortRank(b)}|${eventSortTime(b)}|${b.title || ""}`, "ja"));
    }

    function eventsForDate(key) {
      const date = dateFromKey(key);
      return date ? eventsForRange(date, date) : [];
    }

    function eventDetailCard(item) {
      const time = eventTime(item);
      const note = eventNote(item);
      return `<article class="schedule-detail-event">
        <span>${safeText(item.category || "予定")}</span>
        <h4>${safeText(item.title || "教習予定")}</h4>
        ${time ? `<dl><div><dt>時刻</dt><dd>${safeText(time)}</dd></div></dl>` : ""}
        ${note ? `<div class="schedule-detail-note"><strong>${item.category === "学科" ? "時間割" : "補足"}</strong><p>${safeText(note)}</p></div>` : ""}
      </article>`;
    }

    function closeDetails() {
      if (typeof detailDialog.close === "function" && detailDialog.open) {
        detailDialog.close();
      } else {
        detailDialog.removeAttribute("open");
      }
      document.body.classList.remove("is-schedule-dialog-open");
      detailReturnFocus?.focus?.();
      detailReturnFocus = null;
    }

    function openDetails(key, selectedEvent = null, trigger = null) {
      const date = dateFromKey(key);
      if (!date) return;
      detailReturnFocus = trigger;
      const items = selectedEvent ? [selectedEvent] : eventsForDate(key);
      detailTitle.textContent = formatLongDate(date);
      detailBody.innerHTML = items.length
        ? `<div class="schedule-detail-list">${items.map(eventDetailCard).join("")}</div>`
        : '<p class="schedule-detail-empty">この日に公開中の予定はありません。</p>';
      document.body.classList.add("is-schedule-dialog-open");
      if (typeof detailDialog.showModal === "function") {
        if (!detailDialog.open) detailDialog.showModal();
      } else {
        detailDialog.setAttribute("open", "");
      }
      detailDialog.querySelector("[data-calendar-detail-close]")?.focus();
    }

    function monthView(events, targetMonth) {
      const eventsByDate = events.reduce((groups, item) => {
        (groups[item.calendarDate] ||= []).push(item);
        return groups;
      }, {});
      const firstWeekday = targetMonth.getDay();
      const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
      const trailingCells = (7 - ((firstWeekday + daysInMonth) % 7)) % 7;
      const cells = [];
      for (let index = 0; index < firstWeekday; index += 1) {
        cells.push('<div class="schedule-calendar-day is-outside" aria-hidden="true"></div>');
      }
      for (let day = 1; day <= daysInMonth; day += 1) {
        const currentDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day, 12);
        const currentKey = dateKey(currentDate);
        const dayEvents = eventsByDate[currentKey] || [];
        const visibleEvents = dayEvents.slice(0, 2);
        const remaining = Math.max(0, dayEvents.length - visibleEvents.length);
        const isToday = currentKey === dateKey(today);
        cells.push(`<article class="schedule-calendar-day${isToday ? " is-today" : ""}" aria-label="${targetMonth.getMonth() + 1}月${day}日${dayEvents.length ? `、予定${dayEvents.length}件` : "、予定なし"}">
          <button type="button" class="schedule-calendar-date" data-calendar-date="${currentKey}" aria-label="${targetMonth.getMonth() + 1}月${day}日の詳細を表示"><time datetime="${currentKey}">${day}</time></button>
          ${visibleEvents.length ? `<ul>${visibleEvents.map((item) => calendarEvent(item, "month")).join("")}</ul>` : ""}
          ${remaining ? `<button type="button" class="schedule-calendar-more" data-calendar-date="${currentKey}" aria-label="${targetMonth.getMonth() + 1}月${day}日の残り${remaining}件を表示">ほか${remaining}件</button>` : ""}
        </article>`);
      }
      for (let index = 0; index < trailingCells; index += 1) {
        cells.push('<div class="schedule-calendar-day is-outside" aria-hidden="true"></div>');
      }
      return `<div class="schedule-calendar-weekdays" aria-hidden="true"><span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span></div>
        <div class="schedule-calendar-grid">${cells.join("")}</div>`;
    }

    function agendaDay(date, items, context) {
      const key = dateKey(date);
      const isToday = key === dateKey(today);
      return `<article class="schedule-agenda-day${isToday ? " is-today" : ""}">
        <button type="button" class="schedule-agenda-date" data-calendar-date="${key}" aria-label="${safeText(`${formatLongDate(date)}の詳細を表示`)}">
          <time datetime="${key}"><strong>${date.getDate()}</strong><span>${new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date)}</span></time>
        </button>
        ${items.length
          ? `<ul class="schedule-agenda-events">${items.map((item) => calendarEvent(item, context)).join("")}</ul>`
          : '<p>公開中の予定はありません。</p>'}
      </article>`;
    }

    function agendaView(events, range, context) {
      const groups = events.reduce((result, item) => {
        (result[item.calendarDate] ||= []).push(item);
        return result;
      }, {});
      const dates = datesBetween(range.start, range.end);
      return `<div class="schedule-${context}-view">${dates.map((date) => agendaDay(date, groups[dateKey(date)] || [], context)).join("")}</div>`;
    }

    function updateNavigation(range) {
      if (activeView === "month") {
        const targetMonth = monthDate();
        monthLabel.textContent = `${targetMonth.getFullYear()}年 ${targetMonth.getMonth() + 1}月`;
        previousLabel.textContent = "前月";
        nextLabel.textContent = "次月";
      } else if (activeView === "week") {
        const displayStart = range.start < firstMonth ? firstMonth : range.start;
        const displayEnd = range.end > lastDate ? lastDate : range.end;
        monthLabel.textContent = `${displayStart.getFullYear()}年 ${displayStart.getMonth() + 1}月${displayStart.getDate()}日〜${displayEnd.getMonth() + 1}月${displayEnd.getDate()}日`;
        previousLabel.textContent = "前週";
        nextLabel.textContent = "次週";
      } else {
        monthLabel.textContent = formatLongDate(activeDate);
        previousLabel.textContent = "前日";
        nextLabel.textContent = "翌日";
      }
      moveButtons.forEach((button) => {
        const direction = Number(button.dataset.calendarMove);
        if (activeView === "month") {
          const nextOffset = activeMonthOffset + direction;
          button.disabled = nextOffset < 0 || nextOffset > lastMonthOffset;
        } else {
          const step = activeView === "week" ? 7 : 1;
          const candidate = addDays(activeDate, direction * step);
          button.disabled = candidate < firstMonth || candidate > lastDate;
        }
        const period = activeView === "month" ? "月" : activeView === "week" ? "週" : "日";
        button.setAttribute("aria-label", `${direction < 0 ? "前" : activeView === "day" ? "翌" : "次"}${period}を表示`);
      });
    }

    function paint() {
      const range = viewRange();
      const keys = cacheKeysForRange(range.start, range.end);
      const events = eventsForRange(range.start, range.end);
      const loading = keys.some((key) => monthCache.get(key)?.loading);
      const updatedValues = keys.map((key) => monthCache.get(key)?.updatedAt).filter(Boolean);
      const updatedAt = updatedValues.sort().at(-1) || "";
      eventLookup = new Map();
      updateNavigation(range);
      const content = activeView === "month"
        ? monthView(events, monthDate())
        : agendaView(events, range, activeView);
      panel.innerHTML = `${loading ? '<p class="schedule-calendar-status">予定を読み込んでいます。</p>' : ""}
        ${content}
        ${activeView === "month" && !loading && !events.length ? '<p class="schedule-calendar-empty">公開中の予定はありません。予定は受付へご確認ください。</p>' : ""}`;
      const updatedDate = updatedAt ? new Date(updatedAt) : null;
      updated.textContent = updatedDate && !Number.isNaN(updatedDate.getTime())
        ? `最終更新：${new Intl.DateTimeFormat("ja-JP", { dateStyle: "long", timeStyle: "short" }).format(updatedDate)}`
        : "";
    }

    function fetchSchedule(url, targetMonth) {
      return fetch(url, { headers: { accept: "application/json" } })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("not configured")))
        .then((result) => {
          if (!result?.ok || !result.schedule) throw new Error("schedule is unavailable");
          return {
            events: normalizeSchedule(result.schedule, targetMonth),
            updatedAt: result.schedule.updatedAt || result.generatedAt || ""
          };
        });
    }

    function ensureMonth(key) {
      const cached = monthCache.get(key);
      if (cached && !cached.loading) return Promise.resolve(cached);
      if (cached?.promise) return cached.promise;
      const targetMonth = new Date(`${key}-01T12:00:00`);
      const entry = {
        events: cached?.events || [],
        updatedAt: cached?.updatedAt || "",
        loading: true,
        promise: null
      };
      monthCache.set(key, entry);
      const anchor = `${key}-01`;
      const publicSchedule = fetchSchedule(`/api/cms/events?today=${encodeURIComponent(anchor)}`, targetMonth)
        .catch(() => fetchSchedule(`/api/public-schedule?today=${encodeURIComponent(anchor)}`, targetMonth))
        .catch(() => ({ events: [], updatedAt: "" }));
      entry.promise = publicSchedule
        .then((result) => {
          Object.assign(entry, result, { loading: false });
          return entry;
        })
        .catch(() => {
          Object.assign(entry, { events: [], updatedAt: "", loading: false });
          return entry;
        })
        .finally(() => {
          entry.promise = null;
        });
      return entry.promise;
    }

    function loadView() {
      const token = ++activeLoadToken;
      const range = viewRange();
      const requests = cacheKeysForRange(range.start, range.end).map(ensureMonth);
      paint();
      Promise.all(requests).finally(() => {
        if (token === activeLoadToken) paint();
      });
    }

    moveButtons.forEach((button) => button.addEventListener("click", () => {
      const direction = Number(button.dataset.calendarMove);
      if (activeView === "month") {
        const nextOffset = activeMonthOffset + direction;
        if (nextOffset < 0 || nextOffset > lastMonthOffset) return;
        activeMonthOffset = nextOffset;
        const targetMonth = monthDate();
        activeDate = activeMonthOffset === 0 ? new Date(today) : new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1, 12);
      } else {
        const step = activeView === "week" ? 7 : 1;
        const candidate = addDays(activeDate, direction * step);
        if (candidate < firstMonth || candidate > lastDate) return;
        activeDate = clampDate(candidate);
        activeMonthOffset = Math.min(lastMonthOffset, Math.max(0,
          (activeDate.getFullYear() - firstMonth.getFullYear()) * 12 + activeDate.getMonth() - firstMonth.getMonth()
        ));
      }
      loadView();
    }));

    viewButtons.forEach((button) => button.addEventListener("click", () => {
      const nextView = button.dataset.calendarView;
      if (!["month", "week", "day"].includes(nextView) || nextView === activeView) return;
      if (activeView === "month" && nextView !== "month") {
        const targetMonth = monthDate();
        activeDate = activeMonthOffset === 0 ? new Date(today) : new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1, 12);
      }
      if (nextView === "month") {
        activeMonthOffset = Math.min(lastMonthOffset, Math.max(0,
          (activeDate.getFullYear() - firstMonth.getFullYear()) * 12 + activeDate.getMonth() - firstMonth.getMonth()
        ));
      }
      activeView = nextView;
      viewButtons.forEach((item) => {
        const isActive = item.dataset.calendarView === activeView;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });
      loadView();
    }));

    panel.addEventListener("click", (event) => {
      const eventButton = event.target.closest("[data-calendar-event]");
      if (eventButton) {
        const item = eventLookup.get(eventButton.dataset.calendarEvent);
        if (item) openDetails(item.calendarDate, item, eventButton);
        return;
      }
      const dateButton = event.target.closest("[data-calendar-date]");
      if (dateButton) openDetails(dateButton.dataset.calendarDate, null, dateButton);
    });

    detailDialog.querySelector("[data-calendar-detail-close]")?.addEventListener("click", closeDetails);
    detailDialog.addEventListener("click", (event) => {
      if (event.target === detailDialog) closeDetails();
    });
    detailDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeDetails();
    });
    detailDialog.addEventListener("close", () => {
      document.body.classList.remove("is-schedule-dialog-open");
    });

    loadView();
  }

  function renderTopics() {
    setPage(`<section class="r-section"><div class="r-wrap">${sectionHeader("NEWS", "お知らせ", "学校からのお知らせや大切なご案内を掲載しています。")}
      <div class="topic-filters" role="group" aria-label="お知らせの絞り込み">
        <button type="button" class="is-active" data-topic-filter="all">すべて</button>
        <button type="button" data-topic-filter="重要">重要</button>
        <button type="button" data-topic-filter="お知らせ">お知らせ</button>
      </div>
      <div id="cms-topic-grid" class="cms-topic-grid" aria-live="polite"><div class="r-notice">お知らせを読み込んでいます。</div></div>
    </div></section>`);
    const grid = main.querySelector("#cms-topic-grid");
    const filters = [...main.querySelectorAll("[data-topic-filter]")];
    let posts = [];
    let activeFilter = "all";
    function paint() {
      const filtered = activeFilter === "all" ? posts : posts.filter((post) => post.tag === activeFilter);
      if (!filtered.length) {
        grid.innerHTML = `<div class="r-notice">公開中のお知らせはありません。</div>`;
        return;
      }
      grid.innerHTML = filtered.map((post) => `<a class="cms-topic-card" href="${safeText(post.href)}"${post.isExternal ? ' target="_blank" rel="noopener"' : ""}>
        ${post.imageUrl ? `<img src="${safeText(post.imageUrl)}" alt="" loading="lazy" decoding="async">` : '<div class="cms-topic-placeholder" aria-hidden="true">CDS</div>'}
        <div class="cms-topic-body"><div class="cms-topic-meta"><span class="cms-topic-tag${post.tag === "重要" ? " is-important" : ""}">${safeText(post.tag || "お知らせ")}</span><time>${safeText(post.date || post.publishedAt || "")}</time></div><h3>${safeText(post.title)}</h3></div>
      </a>`).join("");
    }
    filters.forEach((button) => button.addEventListener("click", () => {
      activeFilter = button.dataset.topicFilter;
      filters.forEach((item) => item.classList.toggle("is-active", item === button));
      paint();
    }));
    fetch("/api/cms/posts?limit=30", { headers: { accept: "application/json" } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("not configured")))
      .then((result) => {
        posts = (Array.isArray(result.posts) ? result.posts : [])
          .filter((post) => post.title && post.slug)
          .map((post) => ({
            ...post,
            href: post.link || `article.html?slug=${encodeURIComponent(post.slug)}`,
            isExternal: false
          }));
        paint();
      })
      .catch(() => { grid.innerHTML = `<div class="r-notice">お知らせを取得できませんでした。時間をおいて再度お試しください。</div>`; });
  }

  function renderStudents() {
    setPage(`<section class="r-section"><div class="r-wrap">${sectionHeader("STUDENTS", "在校生メニュー", "予定確認、学科教習、効果測定、送迎予約へ迷わず進めます。")}
      <div class="simple-grid"><a class="simple-item" href="detail.html?page=teaching"><h3>教習カレンダー</h3><p>本日・今週・今月の教習・検定予定</p></a><a class="simple-item" href="https://dondora.online/chikushi/students/sign_in" target="_blank" rel="noopener"><h3>オンライン学科教習</h3><p>オンライン学科のログイン画面へ</p></a><a class="simple-item" href="https://www.musasi.jp/amagi/requirements" target="_blank" rel="noopener"><h3>効果測定MUSASI</h3><p>学科試験対策のログイン画面へ</p></a><a class="simple-item" href="https://buscatch.jp/pc/login.php?rosen_group_id=1926" target="_blank" rel="noopener"><h3>送迎バス予約</h3><p>BusCatchの予約画面へ</p></a><a class="simple-item" href="detail.html?page=syuryokentei"><h3>修了検定</h3><p>集合時間と必要条件を確認</p></a><a class="simple-item" href="detail.html?page=sotsugyoukentei"><h3>卒業検定</h3><p>卒業前の手続きを確認</p></a></div>
    </div></section>`);
  }

  const courseDefinitions = {
    ordinary_at: { vehicle: "AT普通車", label: "AT普通車", catalog: "standardCar", rows: (m) => m.catalog.standardCar.mainFeeRows.filter((row) => row.course === "普通車") },
    ordinary_mt: { vehicle: "MT普通車", label: "MT普通車（AT取得後に移行）", catalog: "standardCar", surcharge: 36300, rows: (m) => m.catalog.standardCar.mainFeeRows.filter((row) => row.course === "普通車") },
    semi_medium: { vehicle: "MT準中型車", label: "MT準中型車", catalog: "semiMedium", rows: (m) => m.catalog.semiMedium.mainFeeRows },
    motorcycle_large_mt: { vehicle: "MT大型二輪車", label: "MT大型二輪車", catalog: "motorcycle", rows: (m) => m.catalog.motorcycle.mainFeeRows.filter((row) => row.course === "大型二輪車") },
    motorcycle_mt: { vehicle: "MT普通二輪車", label: "MT普通二輪車", catalog: "motorcycle", rows: (m) => m.catalog.motorcycle.mainFeeRows.filter((row) => row.course === "普通二輪車" && row.transmission === "MT") },
    motorcycle_at: { vehicle: "AT普通二輪車", label: "AT普通二輪車", catalog: "motorcycle", rows: (m) => m.catalog.motorcycle.mainFeeRows.filter((row) => row.course === "普通二輪車" && row.transmission === "AT") },
    motorcycle_small_mt: { vehicle: "MT普通二輪車（小型限定）", label: "MT普通二輪車（小型限定）", catalog: "motorcycle", rows: (m) => m.catalog.motorcycle.mainFeeRows.filter((row) => row.course === "普通二輪車小型限定" && row.transmission === "MT") },
    motorcycle_small_at: { vehicle: "AT普通二輪車（小型限定）", label: "AT普通二輪車（小型限定）", catalog: "motorcycle", rows: (m) => m.catalog.motorcycle.mainFeeRows.filter((row) => row.course === "普通二輪車小型限定" && row.transmission === "AT") }
  };

  const applicationOptionEligibility = {
    "コミコミプラン": ["AT普通車", "MT準中型車"],
    "スケジュールプラン": ["AT普通車", "MT普通車", "MT準中型車"],
    "合宿風ハイスピードプラン": ["AT普通車"]
  };

  function applicationHtml() {
    const params = new URLSearchParams(location.search);
    const purpose = params.get("purpose")?.includes("資料") ? "資料請求" : "仮入校申し込み";
    const isMaterialRequest = purpose === "資料請求";
    const isReferralApplication = !isMaterialRequest && (params.get("referral") === "1" || params.get("purpose")?.includes("紹介"));
    const sectionEyebrow = isMaterialRequest ? "REQUEST / CONTACT" : "ONLINE ENTRY";
    const sectionTitle = isMaterialRequest ? "資料請求・お問い合わせ" : "仮入校申し込み";
    const sectionLead = isMaterialRequest
      ? "資料請求やご不明点を入力できます。入校をご検討中の日程があれば、任意でご記入ください。"
      : isReferralApplication
        ? "友人・知人紹介をご希望の方は、お客様情報の「紹介者名（姓・名）」を入力してください。割引条件は受付で最終確認します。"
        : "従来の公式申込書と同じ項目・順番で入力できます。複数選択の項目はチェックボックスでお選びください。";
    const desiredEntryDateLabel = isMaterialRequest ? "入校をご検討中の日程" : "入校希望日";
    const desiredEntryDateBadge = isMaterialRequest ? '<span class="optional">任意</span>' : '<span class="required">必須</span>';
    const desiredEntryDateRequired = isMaterialRequest ? "" : " required";
    const desiredEntryDateHelp = isMaterialRequest
      ? "入校をご検討中の日程があればご記入ください。未定の場合は空欄で構いません。"
      : "入校式が行われる木曜日、土曜日のいずれかを入力してください。";
    const entryDateMin = (() => {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    })();
    const choice = (type, name, value, label, index, required = false) => `<span class="choice-item"><input type="${type}" name="${name}" id="${name}-${index}" value="${safeText(value)}" ${required ? "required" : ""}><label for="${name}-${index}">${safeText(label)}</label></span>`;
    const choices = (type, name, values, required = false) => values.map((value, index) => choice(type, name, value, value, index, required && index === 0)).join("");
    const occupations = ["大学生", "短大生", "専門学生", "高校生", "予備校生", "会社員", "自営業", "主婦", "パート・アルバイト", "その他"];
    const desiredVehicles = ["AT普通車", "MT普通車", "MT準中型車", "MT大型二輪車", "AT普通二輪車", "MT普通二輪車", "AT普通二輪車（小型限定）", "MT普通二輪車（小型限定）", "限定解除", "ペーパードライバー"];
    const currentLicenses = ["持っていない", "MT普通車", "AT普通車", "MT準中型車", "AT大型二輪車", "MT大型二輪車", "AT普通二輪車", "MT普通二輪車", "AT普通二輪車（小型限定）", "MT普通二輪車（小型限定）", "原付", "MT5t限定準中型車", "AT5t限定準中型車", "中型車", "MT8t限定中型車", "AT8t限定中型車", "大型車", "けん引", "大型特殊", "大特農耕限定", "仮免許"];
    const optionPlans = Object.keys(applicationOptionEligibility);
    const optionPlanChoices = optionPlans.map((value, index) => `<span class="choice-item" data-option-plan="${safeText(value)}"><input type="checkbox" name="optionPlans" id="optionPlans-${index}" value="${safeText(value)}"><label for="optionPlans-${index}">${safeText(value)}</label></span>`).join("");
    const paymentMethods = ["現金", "ローン", "振込み", "未定"];
    const howKnown = ["DM・チラシ", "看板", "教習車・送迎バス", "インターネット", "ご家族・友人・知人", "学校設置のパンフレット", "その他"];
    const admissionMotives = ["交通の便がよい", "自宅から近い", "学校・会社から近い", "ご家族・友人・知人に勧められた", "当校職員に勧められた", "教習プランが魅力だから", "施設・サービスが魅力だから", "その他"];
    const otherInput = (source, name, label, placeholder) => `<label class="choice-other" data-other-source="${source}" hidden><span>${label}</span><input name="${name}" maxlength="100" placeholder="${placeholder}"></label>`;
    return `<section class="r-section"><div class="r-wrap">${sectionHeader(sectionEyebrow, sectionTitle, sectionLead)}
      ${isReferralApplication ? '<div class="notice-box referral-application-note" id="referral-application-note"><strong>友人・知人紹介をご希望の方へ</strong><p>下記のお客様情報にある「紹介者名（姓・名）」を入力してください。入力せず、電話または入校申し込み時にお伝えいただくこともできます。</p></div>' : ""}
      <form id="applicationForm" novalidate>
        <div class="form-honeypot" aria-hidden="true"><label>この欄は入力しないでください<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
        <input type="hidden" name="purpose" value="${purpose}">
        <input type="hidden" name="priceCourse" value="${safeText(params.get("priceCourse") || "")}">
        <input type="hidden" name="userType" value="${safeText(params.get("userType") || "")}">
        <input type="hidden" name="estimatedPrice" value="${safeText(params.get("estimatedPrice") || "")}">
        <section class="application-section"><span class="application-section-no">01</span><h2>お客様情報</h2><div class="form-grid">
          <label class="form-field"><span>姓（漢字）<span class="required">必須</span></span><input name="familyName" autocomplete="family-name" required placeholder="筑紫野"></label>
          <label class="form-field"><span>名（漢字）<span class="required">必須</span></span><input name="givenName" autocomplete="given-name" required placeholder="太郎"></label>
          <label class="form-field"><span>セイ（カタカナ）</span><input name="familyKana" inputmode="kana" placeholder="チクシノ"></label>
          <label class="form-field"><span>メイ（カタカナ）</span><input name="givenKana" inputmode="kana" placeholder="タロウ"></label>
          <fieldset class="form-field choice-field"><legend>性別<span class="required">必須</span></legend><div class="choice-grid">${choices("radio", "gender", ["男性", "女性"], true)}</div></fieldset>
          <label class="form-field"><span>生年月日<span class="required">必須</span></span><input type="date" name="birthdate" required></label>
          <label class="form-field"><span>郵便番号<span class="required">必須</span></span><input name="postalCode" autocomplete="postal-code" inputmode="numeric" placeholder="818-0025" required></label>
          <label class="form-field is-wide"><span>住所<span class="required">必須</span></span><input name="address" autocomplete="street-address" required></label>
          <label class="form-field"><span>メールアドレス<span class="required">必須</span></span><input type="email" name="email" autocomplete="email" required placeholder="example@example.com"></label>
          <label class="form-field"><span>電話番号<span class="required">必須</span></span><input type="tel" name="phone" autocomplete="tel" inputmode="tel" required placeholder="0927102188"></label>
          <fieldset class="form-field is-wide choice-field"><legend>職業<span class="required">必須</span></legend><div class="choice-grid is-two-columns">${choices("radio", "occupation", occupations, true)}</div>${otherInput("occupation", "occupationOther", "その他の職業", "職業をご入力ください")}</fieldset>
          <label class="form-field is-wide"><span>お勤め先（学校・会社）名</span><input name="organization" autocomplete="organization" placeholder="○○大学"></label>
          <label class="form-field" id="referral-name-field"><span>紹介者名（姓）${isReferralApplication ? '<span class="optional">割引利用時に入力</span>' : ""}</span><input name="introducerFamilyName" placeholder="筑紫野"></label>
          <label class="form-field"><span>紹介者名（名）${isReferralApplication ? '<span class="optional">割引利用時に入力</span>' : ""}</span><input name="introducerGivenName" placeholder="花子"></label>
          <label class="form-field is-wide"><span>${desiredEntryDateLabel}${desiredEntryDateBadge}</span><input type="date" name="desiredEntryDate"${desiredEntryDateRequired} min="${entryDateMin}" aria-describedby="desired-entry-date-help"><small id="desired-entry-date-help">${desiredEntryDateHelp}</small></label>
        </div></section>

        <section class="application-section"><span class="application-section-no">02</span><h2>希望する免許・教習プラン</h2><div class="form-grid">
          <fieldset class="form-field is-wide choice-field" data-required-group="desiredVehicles"><legend>入校車種（複数可）<span class="required">必須</span></legend><div class="choice-grid is-two-columns">${choices("checkbox", "desiredVehicles", desiredVehicles)}</div></fieldset>
          <fieldset class="form-field is-wide choice-field" data-required-group="currentLicenses"><legend>現在の免許証の有無（複数可）<span class="required">必須</span></legend><div class="choice-grid is-two-columns">${choices("checkbox", "currentLicenses", currentLicenses)}</div></fieldset>
          <fieldset class="form-field is-wide choice-field"><legend>技能教習プラン<span class="required">必須</span></legend><div class="choice-grid">${choices("radio", "lessonPlan", ["デイプラン", "フリープラン"], true)}</div></fieldset>
          <fieldset class="form-field is-wide choice-field" id="option-plan-field"><legend>オプションプラン（複数可）</legend><div class="choice-grid" id="option-plan-choices">${optionPlanChoices}</div><small id="option-plan-help" aria-live="polite">入校車種を選ぶと、利用できるオプションプランだけが表示されます。</small></fieldset>
        </div></section>

        <section class="application-section"><span class="application-section-no">03</span><h2>お支払い・当校を知ったきっかけ</h2><div class="form-grid">
          <fieldset class="form-field is-wide choice-field"><legend>お支払い方法<span class="required">必須</span></legend><div class="choice-grid">${choices("radio", "paymentMethod", paymentMethods, true)}</div></fieldset>
          <fieldset class="form-field is-wide choice-field"><legend>当校をどこでお知りになりましたか？（複数可）</legend><div class="choice-grid is-two-columns">${choices("checkbox", "howKnown", howKnown)}</div>${otherInput("howKnown", "howKnownOther", "その他のきっかけ", "どこで知ったかをご入力ください")}</fieldset>
          <fieldset class="form-field is-wide choice-field"><legend>入校の動機は？（複数可）</legend><div class="choice-grid is-two-columns">${choices("checkbox", "admissionMotives", admissionMotives)}</div>${otherInput("admissionMotives", "admissionMotiveOther", "その他の入校動機", "入校の動機をご入力ください")}</fieldset>
        </div></section>

        <section class="application-section"><span class="application-section-no">04</span><h2>質問・同意</h2><div class="form-grid">
          <label class="form-field is-wide"><span>質問・意見</span><textarea name="notes" placeholder="質問・意見を入力してください。"></textarea></label>
          <label class="form-field is-wide privacy-check"><span><input type="checkbox" name="privacyConsent" value="同意済み" required>個人情報保護方針に同意します<span class="required">必須</span></span></label>
        </div><div class="form-submit"><p>入校申込書などの必要書類は、ご入力いただいた住所へ郵送します。受取方法の選択は不要です。</p><button class="r-button is-orange" type="submit">上記内容で送信する</button></div><div class="form-status" id="application-status" hidden aria-live="polite"></div></section>
      </form>
    </div></section>`;
  }

  function renderApplication() {
    setPage(applicationHtml());
    const form = main.querySelector("#applicationForm");
    const status = form.querySelector("#application-status");
    form.querySelectorAll("[data-other-source]").forEach((otherField) => {
      const sourceName = otherField.dataset.otherSource;
      const sourceInputs = Array.from(form.querySelectorAll(`[name="${sourceName}"]`));
      const detailInput = otherField.querySelector("input");
      const updateOtherField = () => {
        const selected = sourceInputs.some((input) => input.checked && input.value === "その他");
        otherField.hidden = !selected;
        detailInput.required = selected;
        if (!selected) detailInput.value = "";
      };
      sourceInputs.forEach((input) => input.addEventListener("change", updateOtherField));
      updateOtherField();
    });
    function validateForm() {
      if (!form.checkValidity()) {
        form.querySelector(":invalid")?.focus();
        form.reportValidity();
        return false;
      }
      const emptyGroup = Array.from(form.querySelectorAll("[data-required-group]")).find((group) => !group.querySelector("input:checked"));
      if (emptyGroup) {
        status.hidden = false;
        status.className = "form-status is-error";
        status.textContent = `${emptyGroup.querySelector("legend")?.childNodes[0]?.textContent || "必須項目"}を1つ以上選択してください。`;
        emptyGroup.scrollIntoView({ behavior: "smooth", block: "center" });
        emptyGroup.querySelector("input")?.focus();
        return false;
      }
      return true;
    }

    const params = new URLSearchParams(location.search);
    const vehicleInputs = Array.from(form.querySelectorAll('[name="desiredVehicles"]'));
    const optionInputs = Array.from(form.querySelectorAll('[name="optionPlans"]'));
    const optionHelp = form.querySelector("#option-plan-help");
    const syncOptionPlanAvailability = () => {
      const selectedVehicles = vehicleInputs.filter((input) => input.checked).map((input) => input.value);
      const availablePlans = Object.entries(applicationOptionEligibility)
        .filter(([, eligibleVehicles]) => selectedVehicles.length && selectedVehicles.every((vehicle) => eligibleVehicles.includes(vehicle)))
        .map(([plan]) => plan);
      optionInputs.forEach((input) => {
        const available = availablePlans.includes(input.value);
        input.disabled = !available;
        if (!available) input.checked = false;
        input.closest("[data-option-plan]").hidden = !available;
      });
      if (!selectedVehicles.length) {
        optionHelp.textContent = "入校車種を選ぶと、利用できるオプションプランだけが表示されます。";
      } else if (!availablePlans.length) {
        optionHelp.textContent = "選択した車種で利用できるオプションプランはありません。";
      } else {
        const prefix = selectedVehicles.length > 1 ? "選択したすべての車種で共通して利用できるプラン：" : "利用できるプラン：";
        optionHelp.textContent = `${prefix}${availablePlans.join("・")}`;
      }
    };
    vehicleInputs.forEach((input) => input.addEventListener("change", syncOptionPlanAvailability));
    syncOptionPlanAvailability();

    // 仮入校申し込みでは入校式のない曜日（木・土以外）を選んだときに注意文を出す。
    // 送信自体は止めない（学校側で日程相談に乗れるようにするため）。
    const entryDateInput = form.querySelector('[name="desiredEntryDate"]');
    const entryDateHelpNote = form.querySelector("#desired-entry-date-help");
    const entryDateDefaultHelp = entryDateHelpNote ? entryDateHelpNote.textContent : "";
    const entryDateIsMaterialRequest = form.querySelector('[name="purpose"]')?.value === "資料請求";
    const syncEntryDateNotice = () => {
      if (!entryDateInput || !entryDateHelpNote) return;
      entryDateHelpNote.classList.remove("is-warning");
      entryDateHelpNote.textContent = entryDateDefaultHelp;
      if (entryDateIsMaterialRequest) return;
      const match = String(entryDateInput.value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return;
      const picked = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
      const day = picked.getDay();
      if (day === 4 || day === 6) return;
      const dayLabel = ["日", "月", "火", "水", "木", "金", "土"][day];
      entryDateHelpNote.classList.add("is-warning");
      entryDateHelpNote.textContent = `選択した日付は${dayLabel}曜日です。入校式は毎週木曜日・土曜日に行っています。このままでも送信できますが、日程は学校からのご連絡時にご相談ください。`;
    };
    entryDateInput?.addEventListener("change", syncEntryDateNotice);
    entryDateInput?.addEventListener("input", syncEntryDateNotice);

    const checkByValue = (name, value) => {
      if (!value) return;
      const normalized = value === "なし" ? "持っていない" : value;
      Array.from(form.querySelectorAll(`[name="${name}"]`)).find((input) => input.value === normalized)?.click();
    };
    checkByValue("desiredVehicles", params.get("vehicle"));
    checkByValue("currentLicenses", params.get("currentLicense"));
    checkByValue("lessonPlan", params.get("pricePlan") === "free" ? "フリープラン" : params.has("pricePlan") ? "デイプラン" : "");
    const optionLabels = { komikomi: "コミコミプラン", schedule: "スケジュールプラン", "camp-style-high-speed": "合宿風ハイスピードプラン" };
    checkByValue("optionPlans", params.get("optionPlan") || optionLabels[params.get("optionPlans")] || "");

    let submissionInProgress = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submissionInProgress) return;
      if (!validateForm()) return;
      submissionInProgress = true;
      const submit = form.querySelector('[type="submit"]');
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      data.desiredVehicles = formData.getAll("desiredVehicles");
      data.currentLicenses = formData.getAll("currentLicenses");
      data.optionPlans = formData.getAll("optionPlans");
      data.howKnown = formData.getAll("howKnown");
      data.admissionMotives = formData.getAll("admissionMotives");
      if (data.occupation === "その他" && data.occupationOther) data.occupation = `その他：${data.occupationOther}`;
      if (data.howKnownOther) data.howKnown = data.howKnown.map((value) => value === "その他" ? `その他：${data.howKnownOther}` : value);
      if (data.admissionMotiveOther) data.admissionMotives = data.admissionMotives.map((value) => value === "その他" ? `その他：${data.admissionMotiveOther}` : value);
      data.name = `${data.familyName || ""} ${data.givenName || ""}`.trim();
      data.kana = `${data.familyKana || ""} ${data.givenKana || ""}`.trim();
      data.introducer = `${data.introducerFamilyName || ""} ${data.introducerGivenName || ""}`.trim();
      data.vehicle = data.desiredVehicles[0] || "";
      data.currentLicense = data.currentLicenses[0] || "";
      data.currentLicenseLabel = data.currentLicenses.join("、");
      data.pricePlan = data.lessonPlan === "フリープラン" ? "free" : "day";
      data.userType = data.userType || (["大学生", "短大生", "専門学生", "高校生", "予備校生"].includes(data.occupation) ? "student" : "general");
      const quotedCourse = courseDefinitions[data.priceCourse];
      if (data.desiredVehicles.length !== 1 || !quotedCourse || quotedCourse.vehicle !== data.vehicle) {
        data.priceCourse = "";
        data.estimatedPrice = "";
      }
      data.privacyConsent = Boolean(form.elements.privacyConsent.checked);
      data.honeypot = data.website || "";
      data.estimatedPrice = Number(data.estimatedPrice) || null;
      data.formVersion = "2026-08-01.1";
      data.landingPage = location.href;
      data.referrer = document.referrer;
      const params = new URLSearchParams(location.search);
      data.utmSource = params.get("utm_source") || "";
      data.utmMedium = params.get("utm_medium") || "";
      data.utmCampaign = params.get("utm_campaign") || "";
      data.utmContent = params.get("utm_content") || "";
      status.hidden = false;
      status.className = "form-status";
      status.textContent = "送信しています。";
      submit.disabled = true;
      let responseSettled = false;
      const earlyReceiptTimer = window.setTimeout(() => {
        if (responseSettled) return;
        status.className = "form-status is-success";
        status.textContent = "送信を受け付けました。受付処理を進めています。";
      }, 3000);
      try {
        const response = await fetch("/api/application", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(data) });
        const result = await response.json().catch(() => ({}));
        responseSettled = true;
        window.clearTimeout(earlyReceiptTimer);
        if (!response.ok || !result.ok) throw new Error(result.message || result.error || "送信できませんでした。時間をおいて再度お試しください。");
        status.className = "form-status is-success";
        status.classList.add("is-success");
        status.textContent = `送信が完了しました。入力いただいたメールアドレス宛にメールが届きますので、ご確認お願いします。10秒ほどお時間かかる場合がございます\n受付ID：${result.applicationId || "発行済み"}`;
        form.reset();
      } catch (error) {
        responseSettled = true;
        window.clearTimeout(earlyReceiptTimer);
        status.className = "form-status is-error";
        status.classList.add("is-error");
        status.textContent = error instanceof Error ? error.message : "送信できませんでした。時間をおいて再度お試しください。";
      } finally {
        submissionInProgress = false;
        submit.disabled = false;
      }
    });
  }


  // 友人・知人紹介フォーム（detail.html?page=referral）
  // 紹介する側が友達を登録するための専用フォーム。仮入校申し込みフォームとは別物なので、
  // 共通関数には手を入れず、この関数の中だけで完結させている。
  function referralHtml() {
    const field = (label, name, options = {}) => {
      const { required = false, type = "text", placeholder = "", inputmode = "", autocomplete = "", wide = false } = options;
      const badge = required ? '<span class="required">必須</span>' : '<span class="optional">任意</span>';
      const attrs = [
        `name="${name}"`,
        type !== "text" ? `type="${type}"` : "",
        required ? "required" : "",
        placeholder ? `placeholder="${safeText(placeholder)}"` : "",
        inputmode ? `inputmode="${inputmode}"` : "",
        autocomplete ? `autocomplete="${autocomplete}"` : ""
      ].filter(Boolean).join(" ");
      return `<label class="form-field${wide ? " is-wide" : ""}"><span>${safeText(label)}${badge}</span><input ${attrs}></label>`;
    };
    const inputErrorNote = '<p class="form-note">※入力内容に誤りがあると返信をお送りできませんのでご注意ください。</p>';
    return `<section class="r-section"><div class="r-wrap">${sectionHeader("INTRODUCTION FORM", "友人・知人ご紹介", "友人、知人ご紹介フォームからご紹介して頂いた方には、謝礼をお渡しします。また、入校される方の入校費用も割引させて頂きます。")}
      <div class="notice-box referral-form-note">
        <p>入力の際、アルファベット・数字は半角文字、カタカナは全角文字をお使いください。また、外字等の特殊な文字は使用しないでください。</p>
      </div>
      <form id="referralForm" novalidate>
        <div class="form-honeypot" aria-hidden="true"><label>この欄は入力しないでください<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
        <input type="hidden" name="purpose" value="友人・知人紹介">
        <section class="application-section"><span class="application-section-no">01</span><h2>ご紹介者情報</h2><div class="form-grid">
          ${field("お名前（姓）", "familyName", { required: true, placeholder: "筑紫野", autocomplete: "family-name" })}
          ${field("お名前（名）", "givenName", { required: true, placeholder: "太郎", autocomplete: "given-name" })}
          ${field("ふりがな（姓）", "familyKana", { placeholder: "チクシノ", inputmode: "kana" })}
          ${field("ふりがな（名）", "givenKana", { placeholder: "タロウ", inputmode: "kana" })}
          ${field("電話番号", "phone", { required: true, type: "tel", placeholder: "09012345678", inputmode: "tel", autocomplete: "tel" })}
          ${field("メールアドレス", "email", { required: true, type: "email", placeholder: "example@example.com", autocomplete: "email" })}
        </div>${inputErrorNote}</section>

        <section class="application-section"><span class="application-section-no">02</span><h2>ご入校者情報</h2>
          <p class="form-lead">ご入校者ご本人の了承を得たうえでご入力ください。</p>
          <div class="form-grid">
          ${field("お名前（姓）", "friendFamilyName", { required: true, placeholder: "筑紫野" })}
          ${field("お名前（名）", "friendGivenName", { required: true, placeholder: "花子" })}
          ${field("ふりがな（姓）", "friendFamilyKana", { placeholder: "チクシノ", inputmode: "kana" })}
          ${field("ふりがな（名）", "friendGivenKana", { placeholder: "ハナコ", inputmode: "kana" })}
          ${field("電話番号", "friendPhone", { type: "tel", placeholder: "09012345678", inputmode: "tel" })}
          ${field("メールアドレス", "friendEmail", { type: "email", placeholder: "example@example.com" })}
        </div>${inputErrorNote}</section>

        <section class="application-section"><span class="application-section-no">03</span><h2>そのほか</h2><div class="form-grid">
          <label class="form-field is-wide"><span>質問・ご意見<span class="optional">任意</span></span><textarea name="notes" placeholder="質問・ご意見を入力してください。"></textarea></label>
          <label class="form-field is-wide privacy-check"><span><input type="checkbox" name="privacyConsent" value="同意済み" required>個人情報保護方針に同意します<span class="required">必須</span></span></label>
        </div>${inputErrorNote}<div class="form-submit"><button class="r-button is-orange" type="submit">上記内容で送信する</button></div><div class="form-status" id="referral-status" hidden aria-live="polite"></div></section>
      </form>
    </div></section>`;
  }

  function renderReferral() {
    setPage(referralHtml());
    const form = main.querySelector("#referralForm");
    if (!form) return;
    const status = form.querySelector("#referral-status");
    const joinName = (first, second) => `${first || ""} ${second || ""}`.trim();
    let submissionInProgress = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submissionInProgress) return;
      if (!form.checkValidity()) {
        form.querySelector(":invalid")?.focus();
        form.reportValidity();
        return;
      }
      submissionInProgress = true;
      const submit = form.querySelector('[type="submit"]');
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      data.name = joinName(data.familyName, data.givenName);
      data.kana = joinName(data.familyKana, data.givenKana);
      data.friendName = joinName(data.friendFamilyName, data.friendGivenName);
      data.friendKana = joinName(data.friendFamilyKana, data.friendGivenKana);
      data.privacyConsent = Boolean(form.elements.privacyConsent.checked);
      data.honeypot = data.website || "";
      data.formVersion = "referral-2026-09-04.1";
      data.landingPage = location.href;
      data.referrer = document.referrer;
      const params = new URLSearchParams(location.search);
      data.utmSource = params.get("utm_source") || "";
      data.utmMedium = params.get("utm_medium") || "";
      data.utmCampaign = params.get("utm_campaign") || "";
      data.utmContent = params.get("utm_content") || "";
      status.hidden = false;
      status.className = "form-status";
      status.textContent = "送信しています。";
      submit.disabled = true;
      let responseSettled = false;
      const earlyReceiptTimer = window.setTimeout(() => {
        if (responseSettled) return;
        status.className = "form-status is-success";
        status.textContent = "送信を受け付けました。受付処理を進めています。";
      }, 3000);
      try {
        const response = await fetch("/api/application", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(data) });
        const result = await response.json().catch(() => ({}));
        responseSettled = true;
        window.clearTimeout(earlyReceiptTimer);
        if (!response.ok || !result.ok) throw new Error(result.message || result.error || "送信できませんでした。時間をおいて再度お試しください。");
        status.className = "form-status is-success";
        status.textContent = `送信が完了しました。入力いただいたメールアドレス宛にメールが届きますので、ご確認お願いします。10秒ほどお時間かかる場合がございます\n受付ID：${result.applicationId || "発行済み"}`;
        form.reset();
      } catch (error) {
        responseSettled = true;
        window.clearTimeout(earlyReceiptTimer);
        status.className = "form-status is-error";
        status.textContent = error instanceof Error ? error.message : "送信できませんでした。時間をおいて再度お試しください。";
      } finally {
        submissionInProgress = false;
        submit.disabled = false;
      }
    });
  }

  const instructors = [
    { name: "澤水 信雄", nickname: "さわみん", hobby: "孤独の久留米散策", image: "images/instructors-anime-20260724-v2/sawamizu-nobuo.webp", assignments: ["car", "motorcycle"] },
    { name: "谷川 拓郎", nickname: "たっしゃん", hobby: "読書", image: "images/instructors-anime-20260724-v2/tanigawa-takuro.webp", assignments: ["car", "motorcycle"] },
    { name: "瀬戸 幸之助", nickname: "せとさん", hobby: "散歩", image: "images/instructors-anime-20260724-v2/seto-konosuke.webp", assignments: ["car"] },
    { name: "重藤 憲紀", nickname: "しげちゃん", hobby: "散歩", image: "images/instructors-anime-20260724-v2/shigeto-noriki.webp", assignments: ["car"] },
    { name: "佐々木 貴子", nickname: "きこ", hobby: "スポーツ観戦", image: "images/instructors-anime-20260718/sasaki-takako.webp", assignments: ["car"] },
    { name: "中村 正信", nickname: "マサやん", hobby: "スポーツ観戦", image: "images/instructors-anime-20260718/nakamura-masanobu.webp", assignments: ["car"] },
    { name: "内野 修平", nickname: "うちの先生", hobby: "ゲーセン", image: "images/instructors-anime-20260718/uchino-shuhei.webp", assignments: ["car", "motorcycle"] },
    { name: "下田 真一", nickname: "しっしい", hobby: "占い", image: "images/instructors-anime/shimoda-shinichi.webp", assignments: ["car", "motorcycle"] },
    { name: "山本 勝介", nickname: "山本1号", hobby: "クレーンゲーム", image: "images/instructors-anime-20260723/yamamoto-shosuke.webp", assignments: ["car"] },
    { name: "羽立 衣莉奈", nickname: "はたち", hobby: "映画鑑賞", image: "images/instructors-anime/hatachi-erina.webp", assignments: ["car"] },
    { name: "白地 貞昭", nickname: "しらっちゃん", hobby: "スポーツカー、バイク、スイーツ巡り", image: "images/instructors-anime-20260723/shirachi-sadaaki.webp", assignments: ["car"] },
    { name: "山本 一博", nickname: "山本2号", hobby: "旅行", image: "images/instructors-anime/yamamoto-kazuhiro.webp", assignments: ["car", "motorcycle"] },
    { name: "原口 美穂", nickname: "はらぐっちゃん☆", hobby: "ずーっと探してます", image: "images/instructors-anime-20260724/haraguchi-miho.webp", assignments: ["car", "motorcycle"] },
    { name: "宮本 淳一", nickname: "みやもっちゃん", hobby: "一人でドライブ", image: "images/instructors-anime-20260723/miyamoto-junichi.webp", assignments: ["car", "motorcycle"] },
    { name: "後藤 桂子", nickname: "けいこ", hobby: "料理、ミシン", image: "images/instructors-anime/goto-keiko.webp", assignments: ["car"] },
    { name: "春田 能孝", nickname: "はるしゃん", hobby: "スポーツ観戦・オートバイ・RC CAR", image: "images/instructors-anime-20260723/haruda-yoshitaka.webp", assignments: ["car"] },
    { name: "角 麻美", nickname: "すみちゃん", hobby: "音楽を聴く・料理のレシピを見る", image: "images/instructors-anime/sumi-asami.webp", assignments: ["car"] },
    { name: "後藤 良子", nickname: "りょうこ", hobby: "ガーデニング", image: "images/instructors-anime/goto-ryoko.webp", assignments: ["car"] },
    { name: "幸田 守生", nickname: "こうださん", hobby: "音楽", image: "images/instructors-anime-20260723/koda-morio.webp", assignments: ["car"] }
  ];

  const assignmentIcons = {
    car: '<span class="assignment-icon" role="img" aria-label="四輪担当" title="四輪担当">🚗</span>',
    motorcycle: '<span class="assignment-icon" role="img" aria-label="二輪担当" title="二輪担当">🏍️</span>'
  };

  function renderInstructors() {
    setPage(`<section class="r-section"><div class="r-wrap"><div class="instructor-intro">${sectionHeader("INSTRUCTOR PROFILE", "筑紫野の指導員紹介", "教習中の疑問や運転への不安は、いつでも気軽にご相談ください。それぞれの経験を生かし、一人ひとりのペースに合わせて丁寧にサポートします。")}</div><div class="instructor-grid">${instructors.map((instructor) => `<article class="instructor-card"><img src="${instructor.image}" alt="${safeText(instructor.name)}指導員のイラスト" loading="lazy" decoding="async"><div class="instructor-body"><h3>${safeText(instructor.nickname || "指導員")}</h3><p class="instructor-hobby"><strong>趣味</strong><br>${safeText(instructor.hobby)}</p><div class="assignment-list" aria-label="担当車種">${instructor.assignments.map((assignment) => assignmentIcons[assignment]).join("")}</div></div></article>`).join("")}</div></div></section>`);
  }

  switch (pageId) {
    case "standard":
    case "semi_medium":
    case "bike":
      renderFeePage(pageId);
      break;
    case "limited":
      renderLimitedFees();
      break;
    case "price":
      renderPriceHub();
      break;
    case "camp_price":
      renderHighSpeedPlan();
      break;
    case "admission":
    case "license":
      renderAdmission();
      break;
    case "paper":
      renderPaperPage();
      break;
    case "senior":
    case "motorcycle":
      renderConcisePage(pageId);
      break;
    case "teaching":
      renderSchedule();
      break;
    case "topics":
      renderTopics();
      break;
    case "students":
      renderStudents();
      break;
    case "application":
      renderApplication();
      break;
    case "referral":
      renderReferral();
      break;
    case "instructors":
      renderInstructors();
      break;
    default:
      break;
  }
})();
