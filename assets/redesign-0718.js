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

  function setPage(html) {
    main.innerHTML = `${mobileNav}<div class="redesign-0718">${html}</div>`;
    document.querySelectorAll(".subpage-side .subpage-actions").forEach((node) => node.remove());
  }

  function sectionHeader(eyebrow, title, lead = "") {
    return `<span class="r-eyebrow">${eyebrow}</span><h2 class="r-heading">${title}</h2>${lead ? `<p class="r-lead">${lead}</p>` : ""}`;
  }

  function courseLabel(row) {
    if (row.id?.startsWith("standard-at-")) return "普通車AT";
    if (row.id === "standard-mt-transition-at-graduation-certificate") return "MT移行（AT解除）";
    if (row.id === "standard-mt-license-change-from-at") return "MT普通車";
    if (row.id?.startsWith("semi-medium-from-")) return "準中型車（MT）";
    return `${safeText(row.course)}${row.transmission ? `（${safeText(row.transmission)}）` : ""}`;
  }

  function feeTable(rows) {
    if (!rows?.length) return "";
    const desktopRows = rows.map((row) => `
      <tr data-fee-row="${safeText(row.id)}">
        <td class="fee-course">${courseLabel(row)}</td>
        <td>${safeText(row.currentLicenseLabel)}</td>
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
          <div><dt>現在お持ちの免許</dt><dd>${safeText(row.currentLicenseLabel)}</dd></div>
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
      <div class="fee-mobile-list">${mobileRows}</div>`;
  }

  function motorcycleFeeTables(rows) {
    const groups = [
      {
        id: "large-motorcycle-fees",
        label: "大型二輪車",
        description: "大型二輪免許（MT）を取得する方"
      },
      {
        id: "standard-motorcycle-fees",
        label: "普通二輪車",
        description: "普通二輪免許（MT・AT）を取得する方"
      },
      {
        id: "small-motorcycle-fees",
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
      </section>`;
    }).join("");
    return `${navigation}<div class="fee-vehicle-groups">${tables}</div>`;
  }

  function optionCards(options = []) {
    if (!options.length) return "";
    return `<div class="option-grid">${options.map((option) => {
      const spring = option.pricesBySeason?.aprToNov;
      const winter = option.pricesBySeason?.decToMar;
      const price = spring === winter ? yen(spring) : `4〜11月 ${yen(spring)} / 12〜3月 ${yen(winter)}`;
      return `<article class="option-item"><h3>${safeText(option.label)}</h3><p>${safeText(option.description)}</p><strong class="option-price">${price}</strong></article>`;
    }).join("")}</div>`;
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
        detail: "夜間まで予約できるプランです。追加料金は料金表のフリー欄に含まれています。"
      }
    ];
    return `<div class="plan-guide-grid">${plans.map((plan) => `<article class="plan-guide-card"><h3>${safeText(plan.title)}</h3><strong>${safeText(plan.hours)}</strong><dl><div><dt>おすすめ</dt><dd>${safeText(plan.fit)}</dd></div><div><dt>内容</dt><dd>${safeText(plan.detail)}</dd></div></dl></article>`).join("")}</div>`;
  }

  function modalAmount(item) {
    if (!item) return "―";
    return `${yen(item.amount)}${unitLabels[item.unit] || ""}${item.tax === "exempt" ? "（非課税）" : ""}`;
  }

  function modalItemLabel(item) {
    if (item.id === "textbook-no-license-or-moped") return "教科書代（免許なし・原付）";
    if (item.id === "textbook-license-holder") return "教科書代（免許あり）";
    return item.label;
  }

  function modalItems(items = []) {
    return items.map((item) => `<div class="r-modal-row"><span>${safeText(modalItemLabel(item))}</span><strong>${modalAmount(item)}</strong></div>`).join("");
  }

  function modalShell() {
    return `<div class="r-modal" id="fee-detail-modal" hidden aria-hidden="true"><div class="r-modal-backdrop" data-modal-close></div><section class="r-modal-panel" role="dialog" aria-modal="true" aria-labelledby="fee-modal-title"><button class="r-modal-close" type="button" data-modal-close aria-label="閉じる">×</button><h2 id="fee-modal-title"></h2><div id="fee-modal-content"></div></section></div>`;
  }

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
    return [{
      title: "",
      items: isBreakdown
        ? (config.feeBreakdown || [])
        : [...(config.otherFees || []), ...(config.separateFees || [])]
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
        const isMotorcycleComparison = scope !== "license" && config.label === "自動二輪車";
        lastTrigger = button;
        title.textContent = `${button.dataset.feeLabel || config.label} ${isBreakdown ? "料金内訳" : "その他の費用"}`;
        content.innerHTML = `${isMotorcycleComparison
          ? motorcycleComparisonTable(config, isBreakdown)
          : sections.map((section) => `<section class="r-modal-group">${section.title ? `<h3>${safeText(section.title)}</h3>` : ""}<div class="r-modal-list">${modalItems(section.items)}</div></section>`).join("")
        }<p class="r-note">料金は税込表示です。非課税項目は個別に記載しています。</p>`;
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

  function renderFeePage(id) {
    if (!master) return;
    const spec = feePageMap[id];
    const catalog = master.catalog[spec.key];
    setPage(`
      <section class="r-section" id="formal-fees"><div class="r-wrap">
        ${sectionHeader("FEES", spec.title, spec.lead)}
        <p class="r-note">料金は税込です。学生料金は学生証の提示が必要です。</p>
        ${id === "bike" ? motorcycleFeeTables(catalog.mainFeeRows) : feeTable(catalog.mainFeeRows)}
        ${separateFeeNotice(catalog)}
        ${feeButtons(spec.key)}
      </div></section>
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
      </div></section>`).join("") + modalShell());
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
      <div class="r-actions"><a class="r-button is-primary" href="detail.html?page=application">料金・入校日を相談する</a></div>
    </div></section>`);
  }

  function renderHighSpeedPlan() {
    if (!master) return;
    const catalog = master.catalog.standardCar;
    const highSpeed = catalog.options.find((option) => option.id === "camp-style-high-speed");
    setPage(`<section class="r-section"><div class="r-wrap">
      ${sectionHeader("HIGH SPEED PLAN", "合宿風ハイスピードプラン", "自宅から通いながら、当校が組んだ短期スケジュールでAT普通車の取得を目指す追加プランです。")}
      <div class="simple-grid">
        <article class="simple-item"><h3>対象</h3><p>普通自動車AT</p></article>
        <article class="simple-item"><h3>取得期間の目安</h3><p>最短17日</p></article>
        <article class="simple-item"><h3>受付人数</h3><p>各入校日 先着1名</p></article>
      </div>
      ${optionCards(highSpeed ? [highSpeed] : [])}
      <div class="r-notice"><div>・最短日数は目安で、教習の進み方や検定結果により延びる場合があります。</div><div>・基本教習料金に追加して利用するプランです。</div><div>・入校日と空き状況は受付でご確認ください。</div></div>
      <div class="r-actions"><a class="r-button is-primary" href="detail.html?page=standard#formal-fees">普通車の料金を見る</a><a class="r-button is-orange" href="detail.html?page=application">空き状況を相談する</a></div>
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
    const bikeSteps = ["入校式", "適性検査", "第1段階 技能・学科教習", "第2段階 技能・学科教習", "卒業検定", "卒業証明書", "免許センター", "運転免許証交付"].map((title) => [title, ""]);
    const hiddenFlow = (title, items) => `<div class="visually-hidden"><h3>${title}</h3><ol>${items.map(([stepTitle, text]) => `<li><strong>${safeText(stepTitle)}</strong> ${safeText(text)}</li>`).join("")}</ol></div>`;
    const flowPicture = (basename, alt) => `<picture class="flow-artwork"><source media="(max-width: 560px)" srcset="images/detail-pages/flows-20260723/${basename}-mobile.webp"><img src="images/detail-pages/flows-20260723/${basename}-desktop.webp" alt="${safeText(alt)}" loading="eager" decoding="async"></picture>`;
    const lessonTimes = ["8:30〜9:20", "9:30〜10:20", "10:30〜11:20", "11:30〜12:20", "12:30〜13:20", "13:30〜14:20", "14:30〜15:20", "15:30〜16:20", "16:30〜17:20", "17:40〜18:30", "18:40〜19:30", "19:40〜20:30"];
    setPage(`
      <section class="r-section"><div class="r-wrap">
        ${sectionHeader("ENTRY GUIDE", "入校案内", "必要な手続き、入校資格、免許証交付までの流れを順番に確認できます。")}
        <nav class="flow-switch is-four" aria-label="入校案内のページ内メニュー"><a href="#entry-flow">入校まで</a><a href="#preparation">準備・資格</a><a href="#license-flow">免許証交付まで</a><a href="#lesson-time">教習時間</a></nav>
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
        <div class="r-actions"><a class="r-button is-primary" href="detail.html?page=application">仮申込・資料請求へ</a><a class="r-button" href="tel:0927102188">電話で確認する</a></div>
      </div></section>
      <section class="r-section is-soft" id="license-flow"><div class="r-wrap">${sectionHeader("LICENSE FLOW", "免許証交付まで", "取得する免許に合わせて流れを確認できます。")}
        <div class="license-flow-list">
          <section><h3>AT普通自動車</h3>${flowPicture("license-at", "AT普通自動車の免許証交付までの10工程")}</section>
          <section><h3>MT普通自動車</h3>${flowPicture("license-mt", "MT普通自動車の免許証交付までの7工程")}</section>
          <section class="license-flow-bike"><h3>自動二輪</h3>${flowPicture("license-bike", "自動二輪の免許証交付までの8工程")}<p class="license-flow-note">現有免許により学科教習時限が異なります。</p></section>
        </div>
        ${hiddenFlow("AT普通自動車の免許証交付まで", atSteps)}
        ${hiddenFlow("MT普通自動車の免許証交付まで", mtSteps)}
        ${hiddenFlow("自動二輪の免許証交付まで", bikeSteps)}
      </div></section>
      <section class="r-section" id="lesson-time"><div class="r-wrap">
        <h2 class="visually-hidden">教習時間</h2>
        <figure class="lesson-time-figure"><img src="images/detail-pages/admission/lesson-times-official.png" alt="教習時間。1限目8時30分から9時20分、2限目9時30分から10時20分、3限目10時30分から11時20分、4限目11時30分から12時20分、5限目12時30分から13時20分、6限目13時30分から14時20分、7限目14時30分から15時20分、8限目15時30分から16時20分、9限目16時30分から17時20分、10限目17時40分から18時30分、11限目18時40分から19時30分、12限目19時40分から20時30分。平日は10時30分から20時30分、土日は9時30分から18時30分。時間割は時期によって変わる場合があります。" loading="eager" decoding="async"></figure>
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
        <div class="r-actions"><a class="r-button is-primary" href="tel:0927102188">電話で予約する</a><a class="r-button" href="detail.html?page=application">Webで相談する</a></div>
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
    setPage(`<section class="r-section"><div class="r-wrap">${sectionHeader(page.eyebrow, page.title, page.lead)}<div class="visual-split"><img src="${page.image}" alt="${safeText(page.title)}" loading="eager" decoding="async"><div>${page.facts.map(([title, text]) => `<div class="key-fact"><strong>${title}</strong><span>${text}</span></div>`).join("")}</div></div><div class="r-actions"><a class="r-button is-primary" href="tel:0927102188">092-710-2188へ電話</a>${type === "paper" ? '<a class="r-button" href="detail.html?page=application">Webで相談</a>' : ""}</div></div></section>`);
  }

  function scheduleRows(items) {
    if (!items.length) return `<div class="r-notice">公開中の予定はありません。最新情報は受付へご確認ください。</div>`;
    return `<div class="schedule-list">${items.map((item) => `<article class="schedule-row"><time>${safeText(item.date || item.time || "")}</time><strong>${safeText(item.title || "教習予定")}</strong><span>${safeText(item.note || "")}</span></article>`).join("")}</div>`;
  }

  function fallbackSchedule() {
    const now = new Date();
    const label = new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(now);
    return {
      updatedAt: now.toISOString(),
      today: [{ date: label, title: "本日の予定", note: "公開予定は受付で更新されます。" }],
      week: [],
      month: []
    };
  }

  function renderSchedule() {
    setPage(`<section class="r-section"><div class="r-wrap">${sectionHeader("CURRENT SCHEDULE", "教習・検定日程", "本日、今週、今月の順に、公開中の予定をまとめています。")}
      <div id="schedule-panels" class="schedule-stack" aria-live="polite"></div><p class="r-note" id="schedule-updated"></p>
    </div></section>`);
    const panels = main.querySelector("#schedule-panels");
    const updated = main.querySelector("#schedule-updated");
    let data = fallbackSchedule();
    function paint() {
      panels.innerHTML = [["today", "本日"], ["week", "今週"], ["month", "今月"]].map(([key, label]) => `<section class="schedule-group"><h3>${label}</h3>${scheduleRows(data[key] || [])}</section>`).join("");
      updated.textContent = data.updatedAt ? `最終更新：${new Intl.DateTimeFormat("ja-JP", { dateStyle: "long", timeStyle: "short" }).format(new Date(data.updatedAt))}` : "";
    }
    paint();
    fetch("/api/public-schedule", { headers: { accept: "application/json" } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("not configured")))
      .then((result) => { if (result?.ok && result.schedule) { data = result.schedule; paint(); } })
      .catch(() => {});
  }

  function renderStudents() {
    setPage(`<section class="r-section"><div class="r-wrap">${sectionHeader("STUDENTS", "在校生メニュー", "予定確認、学科教習、効果測定、送迎予約へ迷わず進めます。")}
      <div class="simple-grid"><a class="simple-item" href="detail.html?page=teaching"><h3>本日・今週・今月の日程</h3><p>最新の教習・検定予定を確認</p></a><a class="simple-item" href="#online-class"><h3>オンライン学科教習</h3><p>受講方法と注意事項を確認</p></a><a class="simple-item" href="#musasi"><h3>効果測定MUSASI</h3><p>学科試験の学習入口</p></a><a class="simple-item" href="detail.html?page=access#buscatch"><h3>スクールバス予約</h3><p>BusCatchの予約画面へ</p></a><a class="simple-item" href="detail.html?page=syuryokentei"><h3>修了検定</h3><p>集合時間と必要条件を確認</p></a><a class="simple-item" href="detail.html?page=sotsugyoukentei"><h3>卒業検定</h3><p>卒業前の手続きを確認</p></a></div>
    </div></section>`);
  }

  const courseDefinitions = {
    ordinary_at: { vehicle: "普通自動車（AT）", label: "普通自動車AT", catalog: "standardCar", rows: (m) => m.catalog.standardCar.mainFeeRows.filter((row) => row.course === "普通車") },
    ordinary_mt: { vehicle: "普通自動車（MT）", label: "普通自動車MT（AT取得後に移行）", catalog: "standardCar", surcharge: 36300, rows: (m) => m.catalog.standardCar.mainFeeRows.filter((row) => row.course === "普通車") },
    semi_medium: { vehicle: "準中型車", label: "準中型MT", catalog: "semiMedium", rows: (m) => m.catalog.semiMedium.mainFeeRows },
    motorcycle_large_mt: { vehicle: "大型自動二輪車（MT）", label: "大型自動二輪MT", catalog: "motorcycle", rows: (m) => m.catalog.motorcycle.mainFeeRows.filter((row) => row.course === "大型二輪車") },
    motorcycle_mt: { vehicle: "普通自動二輪車（MT）", label: "普通自動二輪MT", catalog: "motorcycle", rows: (m) => m.catalog.motorcycle.mainFeeRows.filter((row) => row.course === "普通二輪車" && row.transmission === "MT") },
    motorcycle_at: { vehicle: "普通自動二輪車（AT）", label: "普通自動二輪AT", catalog: "motorcycle", rows: (m) => m.catalog.motorcycle.mainFeeRows.filter((row) => row.course === "普通二輪車" && row.transmission === "AT") },
    motorcycle_small_mt: { vehicle: "小型自動二輪車（MT）", label: "小型自動二輪MT", catalog: "motorcycle", rows: (m) => m.catalog.motorcycle.mainFeeRows.filter((row) => row.course === "普通二輪車小型限定" && row.transmission === "MT") },
    motorcycle_small_at: { vehicle: "小型自動二輪車（AT）", label: "小型自動二輪AT", catalog: "motorcycle", rows: (m) => m.catalog.motorcycle.mainFeeRows.filter((row) => row.course === "普通二輪車小型限定" && row.transmission === "AT") }
  };

  function applicationHtml() {
    const params = new URLSearchParams(location.search);
    const purpose = params.get("purpose")?.includes("資料") ? "資料請求" : "仮入校申し込み";
    const choice = (type, name, value, label, index, required = false) => `<span class="choice-item"><input type="${type}" name="${name}" id="${name}-${index}" value="${safeText(value)}" ${required ? "required" : ""}><label for="${name}-${index}">${safeText(label)}</label></span>`;
    const choices = (type, name, values, required = false) => values.map((value, index) => choice(type, name, value, value, index, required && index === 0)).join("");
    const occupations = ["大学生", "短大生", "専門学生", "高校生", "予備校生", "会社員", "自営業", "主婦", "パート・アルバイト", "その他"];
    const desiredVehicles = ["普通自動車（AT）", "普通自動車（MT）", "準中型車", "大型自動二輪車（MT）", "普通自動二輪車（AT）", "普通自動二輪車（MT）", "小型自動二輪車（AT）", "小型自動二輪車（MT）", "限定解除", "ペーパードライバー"];
    const currentLicenses = ["持っていない", "普通自動車（MT）", "普通自動車（AT）", "準中型車", "大型自動二輪車（AT）", "大型自動二輪車（MT）", "普通自動二輪車（AT）", "普通自動二輪車（MT）", "小型自動二輪車（AT）", "小型自動二輪車（MT）", "原付", "5t限定準中型車（MT）", "5t限定準中型車（AT）", "中型車", "8t限定中型車（MT）", "8t限定中型車（AT）", "大型車", "けん引", "大型特殊", "大特農耕限定", "仮免許"];
    const optionPlans = ["コミコミプラン", "スケジュールプラン", "合宿風ハイスピードプラン"];
    const paymentMethods = ["現金", "ローン", "振込み", "未定"];
    const howKnown = ["DM・チラシ", "看板", "教習車・スクールバス", "インターネット", "ご家族・友人・知人", "学校設置のパンフレット", "その他"];
    const admissionMotives = ["交通の便がよい", "自宅から近い", "学校・会社から近い", "ご家族・友人・知人に勧められた", "当校職員に勧められた", "教習プランが魅力だから", "施設・サービスが魅力だから", "その他"];
    const otherInput = (source, name, label, placeholder) => `<label class="choice-other" data-other-source="${source}" hidden><span>${label}</span><input name="${name}" maxlength="100" placeholder="${placeholder}"></label>`;
    return `<section class="r-section"><div class="r-wrap">${sectionHeader("ONLINE ENTRY", "仮申込・資料請求", "従来の公式申込書と同じ項目・順番で入力できます。複数選択の項目はチェックボックスでお選びください。")}
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
        </div></section>

        <section class="application-section"><span class="application-section-no">02</span><h2>所属・紹介・入校希望</h2><div class="form-grid">
          <label class="form-field is-wide"><span>お勤め先（学校・会社）名</span><input name="organization" autocomplete="organization" placeholder="○○大学"></label>
          <label class="form-field"><span>紹介者名（姓）</span><input name="introducerFamilyName" placeholder="筑紫野"></label>
          <label class="form-field"><span>紹介者名（名）</span><input name="introducerGivenName" placeholder="花子"></label>
          <label class="form-field is-wide"><span>入校希望日</span><input type="date" name="desiredEntryDate"><small>入校式が行われる木曜日、土曜日のいずれかを入力してください。</small></label>
        </div></section>

        <section class="application-section"><span class="application-section-no">03</span><h2>希望する免許・教習プラン</h2><div class="form-grid">
          <fieldset class="form-field is-wide choice-field" data-required-group="desiredVehicles"><legend>入校車種（複数可）<span class="required">必須</span></legend><div class="choice-grid is-two-columns">${choices("checkbox", "desiredVehicles", desiredVehicles)}</div></fieldset>
          <fieldset class="form-field is-wide choice-field" data-required-group="currentLicenses"><legend>現在の免許証の有無（複数可）<span class="required">必須</span></legend><div class="choice-grid is-two-columns">${choices("checkbox", "currentLicenses", currentLicenses)}</div></fieldset>
          <fieldset class="form-field is-wide choice-field"><legend>技能教習プラン<span class="required">必須</span></legend><div class="choice-grid">${choices("radio", "lessonPlan", ["デイプラン", "フリープラン"], true)}</div></fieldset>
          <fieldset class="form-field is-wide choice-field"><legend>オプションプラン（複数可）</legend><div class="choice-grid">${choices("checkbox", "optionPlans", optionPlans)}</div><small>スケジュールプラン・合宿風ハイスピードプランは、定員となり次第締め切ります。</small></fieldset>
        </div></section>

        <section class="application-section"><span class="application-section-no">04</span><h2>お支払い・当校を知ったきっかけ</h2><div class="form-grid">
          <fieldset class="form-field is-wide choice-field"><legend>お支払い方法<span class="required">必須</span></legend><div class="choice-grid">${choices("radio", "paymentMethod", paymentMethods, true)}</div></fieldset>
          <fieldset class="form-field is-wide choice-field"><legend>当校をどこでお知りになりましたか？（複数可）</legend><div class="choice-grid is-two-columns">${choices("checkbox", "howKnown", howKnown)}</div>${otherInput("howKnown", "howKnownOther", "その他のきっかけ", "どこで知ったかをご入力ください")}</fieldset>
          <fieldset class="form-field is-wide choice-field"><legend>入校の動機は？（複数可）</legend><div class="choice-grid is-two-columns">${choices("checkbox", "admissionMotives", admissionMotives)}</div>${otherInput("admissionMotives", "admissionMotiveOther", "その他の入校動機", "入校の動機をご入力ください")}</fieldset>
        </div></section>

        <section class="application-section"><span class="application-section-no">05</span><h2>質問・同意</h2><div class="form-grid">
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

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!validateForm()) return;
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
      data.introducerName = `${data.introducerFamilyName || ""} ${data.introducerGivenName || ""}`.trim();
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
      data.formVersion = "2026-07-20.2";
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
      try {
        const response = await fetch("/api/application", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(data) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.message || result.error || "送信できませんでした。時間をおいて再度お試しください。");
        status.classList.add("is-success");
        status.textContent = `送信が完了しました。受付ID：${result.applicationId || "発行済み"}`;
        form.reset();
      } catch (error) {
        status.classList.add("is-error");
        status.textContent = error instanceof Error ? error.message : "送信できませんでした。時間をおいて再度お試しください。";
      } finally {
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
    case "students":
      renderStudents();
      break;
    case "application":
      renderApplication();
      break;
    case "instructors":
      renderInstructors();
      break;
    default:
      break;
  }
})();
