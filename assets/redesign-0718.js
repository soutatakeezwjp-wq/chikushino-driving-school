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

  function feeTable(rows) {
    if (!rows?.length) return "";
    const desktopRows = rows.map((row) => `
      <tr>
        <td>${safeText(row.course)} ${safeText(row.transmission || "")}</td>
        <td>${safeText(row.currentLicenseLabel)}</td>
        <td>${row.skillHours ?? "-"}時限</td>
        <td>${row.academicHours == null ? "-" : `${row.academicHours}時限`}</td>
        <td class="fee-amount">${yen(row.prices?.day?.student)}</td>
        <td class="fee-amount">${yen(row.prices?.day?.general)}</td>
        <td class="fee-amount">${yen(row.prices?.free?.student)}</td>
        <td class="fee-amount">${yen(row.prices?.free?.general)}</td>
      </tr>`).join("");
    const mobileRows = rows.map((row) => `
      <article class="fee-mobile-card">
        <h3>${safeText(row.course)} ${safeText(row.transmission || "")}</h3>
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

  function optionCards(options = []) {
    if (!options.length) return "";
    return `<div class="option-grid">${options.map((option) => {
      const spring = option.pricesBySeason?.aprToNov;
      const winter = option.pricesBySeason?.decToMar;
      const price = spring === winter ? yen(spring) : `4〜11月 ${yen(spring)} / 12〜3月 ${yen(winter)}`;
      return `<article class="option-item"><h3>${safeText(option.label)}</h3><p>${safeText(option.description)}</p><strong class="option-price">${price}</strong></article>`;
    }).join("")}</div>`;
  }

  function modalItems(items = []) {
    return items.map((item) => `<div class="r-modal-row"><span>${safeText(item.label)}</span><strong>${yen(item.amount)}${unitLabels[item.unit] || ""}${item.tax === "exempt" ? "（非課税）" : ""}</strong></div>`).join("");
  }

  function modalShell() {
    return `<div class="r-modal" id="fee-detail-modal" hidden aria-hidden="true"><div class="r-modal-backdrop" data-modal-close></div><section class="r-modal-panel" role="dialog" aria-modal="true" aria-labelledby="fee-modal-title"><button class="r-modal-close" type="button" data-modal-close aria-label="閉じる">×</button><h2 id="fee-modal-title"></h2><div id="fee-modal-content"></div></section></div>`;
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
        const items = isBreakdown
          ? [...(config.feeBreakdown || []), ...(config.licenseChangeFeeBreakdown || [])]
          : [...(config.otherFees || []), ...(config.separateFees || []), ...(config.licenseChangeOtherFees || [])];
        lastTrigger = button;
        title.textContent = `${config.label} ${isBreakdown ? "料金内訳" : "その他の費用"}`;
        content.innerHTML = `<div class="r-modal-list">${modalItems(items)}</div><p class="r-note">金額は正式料金資料（2026年8月1日適用）に基づく税込表示です。非課税項目は個別に記載しています。</p>`;
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
    standard: { key: "standardCar", title: "普通自動車 料金表", lead: "現在お持ちの免許と通える時間帯から、正式な教習料金を確認できます。", pdf: "downloads/fees-2026-08/standard-car-fees-2026-08-01.pdf" },
    semi_medium: { key: "semiMedium", title: "準中型車 料金表", lead: "現有免許によって必要時限と料金が変わります。スマホでは1条件ずつ縦に表示します。", pdf: "downloads/fees-2026-08/semi-medium-fees-2026-08-01.pdf" },
    bike: { key: "motorcycle", title: "自動二輪車 料金表", lead: "大型・普通・小型、AT・MTごとの料金を、現在お持ちの免許別に確認できます。", pdf: "downloads/fees-2026-08/motorcycle-fees-2026-08-01.pdf" }
  };

  function feeButtons(key, pdf) {
    return `<div class="r-actions"><button class="r-button is-primary" type="button" data-fee-view="breakdown" data-catalog="${key}">料金内訳を見る</button><button class="r-button" type="button" data-fee-view="other" data-catalog="${key}">その他の費用を見る</button><a class="r-button" href="${pdf}" target="_blank" rel="noopener">正式料金表PDF</a></div>`;
  }

  function renderFeePage(id) {
    if (!master) return;
    const spec = feePageMap[id];
    const catalog = master.catalog[spec.key];
    setPage(`
      <section class="r-section" id="formal-fees"><div class="r-wrap">
        ${sectionHeader("OFFICIAL FEES", spec.title, spec.lead)}
        <p class="r-note">適用日：${master.effectiveDate.replace(/-/g, "/")}　料金は税込です。学生料金は学生証の提示が必要です。</p>
        ${feeTable(catalog.mainFeeRows)}
        ${feeButtons(spec.key, spec.pdf)}
      </div></section>
      ${catalog.licenseChangeRows?.length ? `<section class="r-section is-soft"><div class="r-wrap">${sectionHeader("LICENSE CHANGE", "限定解除・移行", "すでにお持ちの免許から限定条件を解除する場合の料金です。")}${feeTable(catalog.licenseChangeRows)}</div></section>` : ""}
      ${catalog.options?.length ? `<section class="r-section"><div class="r-wrap">${sectionHeader("OPTION", "通い方に合わせたオプション", "基本料金に追加して選べるプランです。")}${optionCards(catalog.options)}</div></section>` : ""}
      <section class="r-section is-soft"><div class="r-wrap">${sectionHeader("NOTICE", "料金についてのご案内")}
        <div class="r-notice">${(catalog.notices || []).map((notice) => `<div>・${safeText(notice)}</div>`).join("") || "割引の適用条件や入校時期による差は、受付で最終確認します。"}</div>
      </div></section>
      ${modalShell()}`);
    setupModal({ [spec.key]: catalog });
  }

  function renderLimitedFees() {
    if (!master) return;
    const groups = [
      ["standardCar", "普通車の限定解除", master.catalog.standardCar, "downloads/fees-2026-08/standard-car-fees-2026-08-01.pdf"],
      ["semiMedium", "準中型車の限定解除", master.catalog.semiMedium, "downloads/fees-2026-08/semi-medium-fees-2026-08-01.pdf"],
      ["motorcycle", "自動二輪車の限定解除", master.catalog.motorcycle, "downloads/fees-2026-08/motorcycle-fees-2026-08-01.pdf"]
    ];
    setPage(groups.map(([key, title, catalog, pdf], index) => `
      <section class="r-section ${index % 2 ? "is-soft" : ""}"><div class="r-wrap">
        ${sectionHeader(index ? "LICENSE CHANGE" : "OFFICIAL FEES", title, "現在お持ちの免許に合う行をご確認ください。")}
        ${feeTable(catalog.licenseChangeRows)}
        ${feeButtons(key, pdf)}
      </div></section>`).join("") + modalShell());
    setupModal(Object.fromEntries(groups.map(([key, , catalog]) => [key, catalog])));
  }

  function renderPriceHub() {
    setPage(`<section class="r-section"><div class="r-wrap">
      ${sectionHeader("FEES", "免許ごとの正式料金", "各教習ページで、正式料金表・内訳・追加費用を確認できます。料金シミュレーターはトップページに集約しました。")}
      <div class="simple-grid">
        <a class="simple-item" href="detail.html?page=standard#formal-fees"><h3>普通自動車</h3><p>AT、MT移行、普通車限定解除</p></a>
        <a class="simple-item" href="detail.html?page=semi_medium#formal-fees"><h3>準中型車</h3><p>現有免許5区分と限定解除</p></a>
        <a class="simple-item" href="detail.html?page=bike#formal-fees"><h3>自動二輪車</h3><p>大型・普通・小型、AT・MT</p></a>
      </div>
      <div class="r-actions"><a class="r-button is-primary" href="index.html#price-simulator">トップの料金シミュレーターへ</a></div>
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
      <div class="r-actions"><a class="r-button is-primary" href="detail.html?page=standard#formal-fees">普通車の正式料金を見る</a><a class="r-button is-orange" href="detail.html?page=application">空き状況を相談する</a></div>
    </div></section>`);
  }

  function renderAdmission() {
    const admissionSteps = [
      ["コースと入校日を決める", "希望する免許、通える曜日、取得希望時期を確認します。迷っている場合は受付で相談できます。"],
      ["仮申込・資料請求", "Webフォームから希望免許と連絡先を送信します。入力後に概算料金も確認できます。"],
      ["学校から確認連絡", "料金、必要書類、送迎、入校日を学校側で確認し、不明点を事前に解消します。"],
      ["書類・支払いを準備", "住民票、本人確認書類、眼鏡等、交通系ICカードなど必要なものをそろえます。"]
    ];
    const licenseSteps = [
      ["入校説明・適性検査", "入校日の説明と適性検査を受け、教習の進め方を確認します。"],
      ["第一段階", "学科と技能を進め、修了検定・仮免学科試験を受けます。"],
      ["第二段階", "路上教習と学科を進め、卒業検定に備えます。"],
      ["卒業・免許交付", "卒業証明書を受け取り、運転免許試験場で本免学科試験と交付手続きを行います。"]
    ];
    const flow = (items) => `<div class="flow-line">${items.map(([title, text]) => `<article class="flow-step"><h3>${title}</h3><p>${text}</p></article>`).join("")}</div>`;
    setPage(`
      <section class="r-section"><div class="r-wrap">${sectionHeader("ENTRY FLOW", "入校までの流れ", "申し込み前の確認から入校手続きまで、4つの段階で進みます。")}${flow(admissionSteps)}</div></section>
      <section class="r-section is-soft" id="license-flow"><div class="r-wrap">${sectionHeader("LICENSE FLOW", "入校から免許交付まで", "普通車を例に、卒業後の免許交付までをまとめています。")}${flow(licenseSteps)}
        <div class="r-notice">車種や現在お持ちの免許により、技能・学科時限や検定の流れは異なります。各コースページの正式料金表とあわせてご確認ください。</div>
      </div></section>
      <section class="r-section"><div class="r-wrap">${sectionHeader("LESSON TIME", "教習時間の目安", "時期により変更する場合があります。入校時に最新時間をご案内します。")}
        <div class="time-grid">${["8:30〜9:20","9:30〜10:20","10:30〜11:20","11:30〜12:20","13:30〜14:20","14:30〜15:20","15:30〜16:20","16:30〜17:20","17:30〜18:20","18:30〜19:20","19:30〜20:20"].map((time, index) => `<div class="time-cell"><strong>${index + 1}時限</strong><span>${time}</span></div>`).join("")}</div>
      </div></section>
      <section class="r-section is-soft"><div class="r-wrap">${sectionHeader("PREPARATION", "入校前に準備するもの")}
        <div class="simple-grid"><article class="simple-item"><h3>本人確認・住民票</h3><p>免許証の有無や国籍によって必要書類が異なります。資料内の一覧をご確認ください。</p></article><article class="simple-item"><h3>視力補助・写真</h3><p>眼鏡やコンタクトが必要な方は必ず持参してください。証明写真は学校でも案内します。</p></article><article class="simple-item"><h3>支払い・交通系IC</h3><p>支払い方法を事前に確認し、教習原簿の認証に使用する交通系ICカード等をご準備ください。</p></article></div>
        <div class="r-actions"><a class="r-button is-primary" href="detail.html?page=application">仮申込・資料請求へ</a><a class="r-button" href="tel:0927102188">電話で確認する</a></div>
      </div></section>`);
  }

  function renderConcisePage(type) {
    const pages = {
      paper: {
        eyebrow: "PAPER DRIVER",
        title: "運転の不安を、必要な場面から練習。",
        lead: "久しぶりの運転、駐車、狭い道、高速道路など、現在の技量と目的を確認して内容を組み立てます。",
        image: "images/real/course-car-card-real.jpg",
        facts: [["まず電話で相談", "運転歴、苦手な場面、希望回数をお伝えください。"], ["1回50分", "初回に技量を確認し、その後の練習内容を調整します。"], ["学校車両で実施", "免許に合う車両で、校内から公道まで段階的に練習します。"]]
      },
      senior: {
        eyebrow: "SENIOR COURSE",
        title: "通知ハガキが届いたら、電話で予約。",
        lead: "年齢や違反状況によって必要な検査・講習が異なります。ハガキを手元にご準備ください。",
        image: "images/detail-pages/visuals/senior-desktop.webp",
        facts: [["1. ハガキを確認", "高齢者講習通知書に記載された内容を確認します。"], ["2. 電話で予約", "092-710-2188へお電話ください。必要な検査と持ち物をご案内します。"], ["3. 講習日に来校", "通知書、免許証、眼鏡等、講習手数料をお持ちください。"]]
      },
      motorcycle: {
        eyebrow: "MOPED COURSE",
        title: "原付講習は、事前予約制です。",
        lead: "基本操作・基本走行・応用走行と安全運転の知識を、3時間の講習で学びます。",
        image: "images/real/motorcycle-yard-real.jpg",
        facts: [["予約", "092-710-2188へ電話し、実施日と開始時間を確認します。"], ["服装", "長袖・長ズボン・運動靴・手袋。雨天時は雨具も必要です。"], ["持ち物", "本人確認書類、住民票、印鑑、筆記用具などを準備します。"]]
      }
    };
    const page = pages[type];
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
    setPage(`<section class="r-section"><div class="r-wrap">${sectionHeader("CURRENT SCHEDULE", "教習・検定日程", "古い月間画像ではなく、本日・今週・今月の順で最新予定を確認できます。")}
      <div class="schedule-tabs" role="tablist"><button class="schedule-tab" type="button" role="tab" aria-selected="true" data-schedule-tab="today">本日</button><button class="schedule-tab" type="button" role="tab" aria-selected="false" data-schedule-tab="week">今週</button><button class="schedule-tab" type="button" role="tab" aria-selected="false" data-schedule-tab="month">今月</button></div>
      <div id="schedule-panels" aria-live="polite"></div><p class="r-note" id="schedule-updated"></p>
    </div></section>`);
    const tabs = Array.from(main.querySelectorAll("[data-schedule-tab]"));
    const panels = main.querySelector("#schedule-panels");
    const updated = main.querySelector("#schedule-updated");
    let data = fallbackSchedule();
    let current = "today";
    function paint() {
      panels.innerHTML = `<section class="schedule-panel">${scheduleRows(data[current] || [])}</section>`;
      tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.scheduleTab === current)));
      updated.textContent = data.updatedAt ? `最終更新：${new Intl.DateTimeFormat("ja-JP", { dateStyle: "long", timeStyle: "short" }).format(new Date(data.updatedAt))}` : "";
    }
    tabs.forEach((tab) => tab.addEventListener("click", () => { current = tab.dataset.scheduleTab; paint(); }));
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
    const choice = (name, value, label, checked = false) => `<span class="choice-item"><input type="radio" name="${name}" id="${name}-${value}" value="${value}" ${checked ? "checked" : ""}><label for="${name}-${value}">${label}</label></span>`;
    return `<section class="r-section"><div class="r-wrap">${sectionHeader("ONLINE ENTRY", "仮申込・資料請求", "選択中心の3ステップです。最後に正式料金データを使った概算を確認して送信します。")}
      <ol class="application-progress" aria-label="入力状況"><li class="is-current">1. 希望内容</li><li>2. 本人情報</li><li>3. 確認・送信</li></ol>
      <form id="application-form-0718" novalidate>
        <div class="form-honeypot" aria-hidden="true"><label>この欄は入力しないでください<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
        <section class="application-step" data-step="1"><h2>希望内容を選択</h2><div class="form-grid">
          <div class="form-field is-wide"><span>ご用件<span class="required">必須</span></span><div class="choice-grid">${choice("purpose", "仮入校申し込み", "仮入校申し込み", true)}${choice("purpose", "資料請求", "資料請求")}${choice("purpose", "料金について相談", "料金相談")}</div></div>
          <label class="form-field"><span>希望する免許<span class="required">必須</span></span><select name="priceCourse" id="app-course" required>${Object.entries(courseDefinitions).map(([key, value]) => `<option value="${key}">${value.label}</option>`).join("")}</select></label>
          <label class="form-field"><span>現在お持ちの免許<span class="required">必須</span></span><select name="currentLicense" id="app-license" required></select></label>
          <div class="form-field"><span>区分<span class="required">必須</span></span><div class="choice-grid">${choice("userType", "student", "学生", true)}${choice("userType", "general", "一般")}</div></div>
          <div class="form-field"><span>通える時間帯<span class="required">必須</span></span><div class="choice-grid">${choice("pricePlan", "day", "デイ", true)}${choice("pricePlan", "free", "フリー")}</div></div>
          <label class="form-field is-wide"><span>追加プラン</span><select name="optionPlans" id="app-option"><option value="">追加しない</option></select></label>
        </div><div class="form-nav"><span></span><button class="r-button is-primary" type="button" data-next-step>本人情報へ</button></div></section>

        <section class="application-step" data-step="2" hidden><h2>本人情報を入力</h2><div class="form-grid">
          <label class="form-field"><span>お名前<span class="required">必須</span></span><input name="name" autocomplete="name" required></label>
          <label class="form-field"><span>フリガナ<span class="required">必須</span></span><input name="kana" inputmode="kana" required></label>
          <div class="form-field"><span>性別<span class="required">必須</span></span><div class="choice-grid">${choice("gender", "男性", "男性", true)}${choice("gender", "女性", "女性")}${choice("gender", "回答しない", "回答しない")}</div></div>
          <label class="form-field"><span>生年月日<span class="required">必須</span></span><input type="date" name="birthdate" required></label>
          <label class="form-field"><span>メールアドレス<span class="required">必須</span></span><input type="email" name="email" autocomplete="email" required></label>
          <label class="form-field"><span>電話番号<span class="required">必須</span></span><input type="tel" name="phone" autocomplete="tel" inputmode="tel" required></label>
          <label class="form-field"><span>郵便番号<span class="required">必須</span></span><input name="postalCode" autocomplete="postal-code" inputmode="numeric" placeholder="818-0025" required></label>
          <label class="form-field"><span>職業<span class="required">必須</span></span><select name="occupation" required><option value="学生">学生</option><option value="会社員">会社員</option><option value="自営業">自営業</option><option value="主婦・主夫">主婦・主夫</option><option value="その他">その他</option></select></label>
          <label class="form-field is-wide"><span>住所<span class="required">必須</span></span><input name="address" autocomplete="street-address" required></label>
          <label class="form-field"><span>学校・会社名</span><input name="organization" autocomplete="organization"></label>
          <label class="form-field"><span>希望入校日</span><input type="date" name="desiredEntryDate"></label>
        </div><div class="form-nav"><button class="r-button" type="button" data-prev-step>戻る</button><button class="r-button is-primary" type="button" data-next-step>確認へ</button></div></section>

        <section class="application-step" data-step="3" hidden><h2>受取方法と内容確認</h2><div class="quote-box"><small>概算料金（税込）</small><strong id="application-quote">計算中</strong><small id="application-quote-note"></small></div><div class="form-grid">
          <div class="form-field"><span>資料の受取方法<span class="required">必須</span></span><div class="choice-grid">${choice("materialDelivery", "デジタル送付を希望", "デジタル", true)}${choice("materialDelivery", "郵送を希望", "郵送")}</div></div>
          <label class="form-field"><span>支払方法<span class="required">必須</span></span><select name="paymentMethod" required><option value="現金・振込を相談">現金・振込を相談</option><option value="ローンを相談">ローンを相談</option><option value="学校で確認">学校で確認</option></select></label>
          <label class="form-field"><span>どこで知りましたか<span class="required">必須</span></span><select name="howKnown" required><option value="Web検索">Web検索</option><option value="家族・知人の紹介">家族・知人の紹介</option><option value="SNS">SNS</option><option value="学校・職場">学校・職場</option><option value="その他">その他</option></select></label>
          <label class="form-field"><span>連絡希望方法</span><select name="preferredContactMethod"><option value="電話">電話</option><option value="メール">メール</option><option value="LINE相談">LINE相談</option></select></label>
          <label class="form-field is-wide"><span>質問・備考</span><textarea name="notes" placeholder="送迎、入校時期、料金など、確認したいことをご記入ください。"></textarea></label>
          <label class="form-field is-wide"><span><input type="checkbox" name="privacyConsent" value="同意済み" required style="width:auto;min-height:0;margin-right:8px">個人情報保護方針に同意します<span class="required">必須</span></span></label>
          <div class="form-field is-wide" id="turnstile-container"></div>
        </div><div class="form-nav"><button class="r-button" type="button" data-prev-step>戻る</button><button class="r-button is-orange" type="submit">この内容で送信する</button></div><div class="form-status" id="application-status" hidden aria-live="polite"></div></section>
      </form>
    </div></section>`;
  }

  function renderApplication() {
    if (!master) return;
    setPage(applicationHtml());
    const form = main.querySelector("#application-form-0718");
    const steps = Array.from(form.querySelectorAll(".application-step"));
    const progress = Array.from(main.querySelectorAll(".application-progress li"));
    const course = form.querySelector("#app-course");
    const license = form.querySelector("#app-license");
    const option = form.querySelector("#app-option");
    const quote = form.querySelector("#application-quote");
    const quoteNote = form.querySelector("#application-quote-note");
    const status = form.querySelector("#application-status");
    let currentStep = 1;

    function rowsForCourse() {
      return courseDefinitions[course.value]?.rows(master) || [];
    }
    function licenseKey(row, index) {
      const keyMap = {
        none: "none", moped: "moped", motorcycle: "motorcycle", at_ordinary_car: "at_car", mt_ordinary_car: "mt_car",
        ordinary_car: "car", at_small_motorcycle: "small_at", mt_small_motorcycle: "small_mt", at_standard_motorcycle: "motorcycle_at", mt_standard_motorcycle: "motorcycle_mt"
      };
      return keyMap[row.currentLicenseCodes?.[0]] || row.currentLicenseCodes?.[0] || `row-${index}`;
    }
    function syncCourse() {
      const rows = rowsForCourse();
      license.innerHTML = rows.map((row, index) => `<option value="${licenseKey(row, index)}" data-row-index="${index}">${safeText(row.currentLicenseLabel)}</option>`).join("");
      const catalog = master.catalog[courseDefinitions[course.value].catalog];
      option.innerHTML = `<option value="">追加しない</option>${(catalog.options || []).map((item) => `<option value="${item.id}">${safeText(item.label)}</option>`).join("")}`;
      syncQuote();
    }
    function selectedRow() {
      const rows = rowsForCourse();
      return rows[license.selectedOptions[0]?.dataset.rowIndex || 0];
    }
    function quoteAmount() {
      const row = selectedRow();
      if (!row) return null;
      const user = form.elements.userType.value || "student";
      const plan = form.elements.pricePlan.value || "day";
      let amount = Number(row.prices?.[plan]?.[user]);
      amount += Number(courseDefinitions[course.value]?.surcharge || 0);
      if (option.value) {
        const item = master.catalog[courseDefinitions[course.value].catalog].options?.find((entry) => entry.id === option.value);
        if (item) {
          const desired = form.elements.desiredEntryDate.value ? new Date(form.elements.desiredEntryDate.value) : new Date();
          const month = desired.getMonth() + 1;
          amount += Number(month === 12 || month <= 3 ? item.pricesBySeason?.decToMar : item.pricesBySeason?.aprToNov) || 0;
        }
      }
      return amount;
    }
    function syncQuote() {
      const amount = quoteAmount();
      quote.textContent = Number.isFinite(amount) ? yen(amount) : "学校確認";
      quoteNote.textContent = "最終金額は送信後、学校側で正式料金を再計算して確認します。";
    }
    function showStep(step) {
      currentStep = Math.max(1, Math.min(3, step));
      steps.forEach((node, index) => { node.hidden = index + 1 !== currentStep; });
      progress.forEach((node, index) => node.classList.toggle("is-current", index + 1 === currentStep));
      if (currentStep === 3) syncQuote();
      main.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    function validateStep(step) {
      const fields = Array.from(steps[step - 1].querySelectorAll("input, select, textarea"));
      for (const field of fields) {
        if (!field.checkValidity()) { field.reportValidity(); return false; }
      }
      return true;
    }
    form.querySelectorAll("[data-next-step]").forEach((button) => button.addEventListener("click", () => { if (validateStep(currentStep)) showStep(currentStep + 1); }));
    form.querySelectorAll("[data-prev-step]").forEach((button) => button.addEventListener("click", () => showStep(currentStep - 1)));
    form.addEventListener("change", syncQuote);
    course.addEventListener("change", syncCourse);

    const turnstileContainer = main.querySelector("#turnstile-container");
    function mountTurnstile(siteKey) {
      if (!siteKey || !turnstileContainer || turnstileContainer.dataset.mounted === "true") return;
      turnstileContainer.dataset.mounted = "true";
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      turnstileContainer.innerHTML = `<div class="cf-turnstile" data-sitekey="${safeText(siteKey)}" data-action="application-submit"></div>`;
    }
    const inlineSiteKey = window.CDS_TURNSTILE_SITE_KEY || "";
    if (inlineSiteKey) {
      mountTurnstile(inlineSiteKey);
    } else {
      fetch("/api/application", { headers: { accept: "application/json" } })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("not configured")))
        .then((config) => mountTurnstile(config.turnstileSiteKey || ""))
        .catch(() => {});
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!validateStep(3)) return;
      const submit = form.querySelector('[type="submit"]');
      const data = Object.fromEntries(new FormData(form).entries());
      const definition = courseDefinitions[data.priceCourse];
      data.vehicle = definition.vehicle;
      data.currentLicenseLabel = license.selectedOptions[0]?.textContent || "";
      data.lessonPlan = data.pricePlan === "free" ? "フリープラン" : "デイプラン";
      data.optionPlans = data.optionPlans ? [data.optionPlans] : [];
      data.privacyConsent = Boolean(form.elements.privacyConsent.checked);
      data.honeypot = data.website || "";
      data.turnstileToken = data["cf-turnstile-response"] || "";
      data.estimatedPrice = quoteAmount();
      data.formVersion = "2026-07-18.1";
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
        syncCourse();
      } catch (error) {
        status.classList.add("is-error");
        status.textContent = error instanceof Error ? error.message : "送信できませんでした。時間をおいて再度お試しください。";
      } finally {
        submit.disabled = false;
      }
    });
    syncCourse();
  }

  const instructors = [
    ["さわみん", "孤独の久留米（市内散策）・釣り", "sawamizu-nobuo.webp"],
    ["せとさん", "散歩", "seto-konosuke.webp"],
    ["しげちゃん", "散歩", "shigeto-noriki.webp"],
    ["きこ", "スポーツ観戦", "sasaki-takako.webp"],
    ["マサやん", "スポーツ観戦", "nakamura-masanobu.webp"],
    ["うちの先生", "ゲーセン", "uchino-shuhei.webp"],
    ["はらぐっちゃん☆", "ずーっと探してます", "haraguchi-miho.webp"],
    ["みやもっちゃん", "一人でドライブ", "miyamoto-junichi.webp"],
    ["こうださん", "音楽", "koda-morio.webp"]
  ];

  function renderInstructors() {
    setPage(`<section class="r-section"><div class="r-wrap"><div class="instructor-intro">${sectionHeader("INSTRUCTOR PROFILE", "筑紫野の指導員紹介", "運転への不安や苦手なことも、遠慮なく相談してください。四輪・二輪の両方を担当する指導員が、一人ひとりの理解度に合わせて、安全に運転できるまで丁寧にサポートします。")}</div><div class="instructor-grid">${instructors.map(([nickname, hobby, image]) => `<article class="instructor-card"><img src="images/instructors-anime-20260718/${image}" alt="${safeText(nickname)}のイラスト" loading="eager" decoding="async"><div class="instructor-body"><h3>${safeText(nickname)}</h3><p class="instructor-hobby"><strong>趣味</strong><br>${safeText(hobby)}</p><div class="assignment-list"><span class="assignment">四輪担当</span><span class="assignment">二輪担当</span></div></div></article>`).join("")}</div></div></section>`);
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
