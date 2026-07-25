(() => {
  const data = window.CLIENT_REVIEW_DATA;
  if (!data) return;

  const comparisons = [
    {
      title: "入校までの流れ",
      note: "制作側の説明や重複要素を減らし、学校指定の5段階と必要書類・入校日を読みやすく整理しました。",
      href: "../../detail?page=admission",
      before: "../0723-before-after/screenshots/before-pc-admission.jpg",
      after: "../0723-before-after/screenshots/after-pc-admission.jpg",
      beforeCaption: "以前：情報の重複と、流れの見通しにくさがありました。",
      afterCaption: "現在：手続きの順序と確認事項を一続きで確認できます。",
      mobile: false,
    },
    {
      title: "自動二輪車の料金・内訳",
      note: "大型二輪・普通二輪・小型限定を分け、料金表と内訳が同じ車種単位で追える構成へ変更しました。",
      href: "../../detail?page=bike",
      before: "../0723-before-after/screenshots/before-pc-bike.jpg",
      after: "../0723-before-after/screenshots/after-pc-bike.jpg",
      beforeCaption: "以前：車種や内訳の区切りが分かりにくい状態でした。",
      afterCaption: "現在：車種別の料金、内訳、割引案内を順番に確認できます。",
      mobile: false,
    },
    {
      title: "各種限定解除",
      note: "通常教習と限定解除を分離し、必要な車種・料金だけを選んで確認できる画面へ整理しました。",
      href: "../../detail?page=limited",
      before: "../0723-before-after/screenshots/before-pc-limited.jpg",
      after: "../0723-before-after/screenshots/after-pc-limited.jpg",
      beforeCaption: "以前：通常料金と限定解除の情報が混在していました。",
      afterCaption: "現在：限定解除だけを車種単位で比較できます。",
      mobile: false,
    },
    {
      title: "料金表・スマホ表示",
      note: "横長の料金表をそのまま縮小せず、条件ごとの縦カードへ変換して横スクロールと数字の重なりをなくしました。",
      href: "../../detail?page=standard",
      before: "assets/before-mobile-price.jpg",
      after: "assets/after-mobile-price.jpg",
      beforeCaption: "以前：列がつぶれ、料金の数字が重なって読めない状態でした。",
      afterCaption: "現在：条件名・時限・金額を1カードずつ画面内で確認できます。",
      mobile: true,
    },
    {
      title: "会社概要・スマホ表示",
      note: "固定幅の表を可変2列へ変更し、項目名だけでなく住所や電話番号などの値も画面内で読めるようにしました。",
      href: "../../detail?page=company",
      before: "assets/before-mobile-company.jpg",
      after: "assets/after-mobile-company.jpg",
      beforeCaption: "以前：値が右側へはみ出し、横スクロールしないと内容を確認できませんでした。",
      afterCaption: "現在：項目名と値がスマホ幅の中に収まり、縦に読み進められます。",
      mobile: true,
    },
  ];

  const statusClass = {
    "実装済み": "",
    "要パートナー確認": "status-label--partner",
    "要送信テスト": "status-label--test",
    "要運用確認": "status-label--operation",
  };

  const comparisonList = document.querySelector("#comparisonList");
  const reviewItems = document.querySelector("#reviewItems");
  const categoryFilter = document.querySelector("#categoryFilter");
  const statusFilter = document.querySelector("#statusFilter");
  const priorityFilter = document.querySelector("#priorityFilter");
  const searchInput = document.querySelector("#searchInput");
  const resultCount = document.querySelector("#resultCount");
  const emptyState = document.querySelector("#emptyState");
  const sourceList = document.querySelector("#sourceList");
  const resetFilters = document.querySelector("#resetFilters");
  const imageDialog = document.querySelector("#imageDialog");
  const dialogImage = document.querySelector("#dialogImage");
  const dialogCaption = document.querySelector("#dialogCaption");

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const populateSummary = () => {
    document.querySelector('[data-count="total"]').textContent = data.counts.total;
    Object.entries(data.counts.statuses).forEach(([status, count]) => {
      const target = document.querySelector(`[data-count="${status}"]`);
      if (target) target.textContent = count;
    });
  };

  const renderComparisons = () => {
    comparisonList.innerHTML = comparisons
      .map(
        (item) => `
          <article class="comparison-item">
            <header class="comparison-item__head">
              <div>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.note)}</p>
              </div>
              <a class="comparison-item__link" href="${item.href}" target="_blank" rel="noopener">公開画面を確認</a>
            </header>
            <div class="comparison-item__images">
              <figure class="comparison-image ${item.mobile ? "comparison-image--mobile" : ""}">
                <button type="button" data-image="${item.before}" data-caption="${escapeHtml(item.title)}｜変更前">
                  <img src="${item.before}" alt="${escapeHtml(item.title)}の変更前" loading="lazy">
                </button>
                <figcaption><strong>Before</strong><span>${escapeHtml(item.beforeCaption)}</span></figcaption>
              </figure>
              <figure class="comparison-image comparison-image--after ${item.mobile ? "comparison-image--mobile" : ""}">
                <button type="button" data-image="${item.after}" data-caption="${escapeHtml(item.title)}｜変更後">
                  <img src="${item.after}" alt="${escapeHtml(item.title)}の変更後" loading="lazy">
                </button>
                <figcaption><strong>After</strong><span>${escapeHtml(item.afterCaption)}</span></figcaption>
              </figure>
            </div>
          </article>
        `,
      )
      .join("");
  };

  const populateFilters = () => {
    categoryFilter.insertAdjacentHTML(
      "beforeend",
      data.categories
        .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
        .join(""),
    );
    statusFilter.insertAdjacentHTML(
      "beforeend",
      data.statuses
        .map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`)
        .join(""),
    );
  };

  const renderItems = () => {
    const query = searchInput.value.trim().toLocaleLowerCase("ja");
    const category = categoryFilter.value;
    const status = statusFilter.value;
    const priority = priorityFilter.value;

    const filtered = data.items.filter((item) => {
      const haystack = [
        item.id,
        item.category,
        item.source,
        item.request,
        item.implementation,
        item.evidence,
      ]
        .join(" ")
        .toLocaleLowerCase("ja");
      return (
        (!query || haystack.includes(query)) &&
        (!category || item.category === category) &&
        (!status || item.status === status) &&
        (!priority || item.priority === priority)
      );
    });

    resultCount.textContent = `${filtered.length}件を表示中`;
    emptyState.hidden = filtered.length !== 0;
    reviewItems.innerHTML = filtered
      .map(
        (item) => `
          <article class="review-item">
            <div class="review-item__meta">
              <span class="review-item__id">No.${String(item.no).padStart(2, "0")} / ${escapeHtml(item.id)}</span>
              <span class="review-item__category">${escapeHtml(item.category)}</span>
              <span class="priority-label ${item.priority === "中" ? "priority-label--middle" : ""}">優先度 ${escapeHtml(item.priority)}</span>
            </div>
            <div class="review-item__column">
              <h3>先方のご要望</h3>
              <p>${escapeHtml(item.request)}</p>
              <span class="review-item__source">出典：${escapeHtml(item.source)}</span>
            </div>
            <div class="review-item__column">
              <h3>変更・対応内容</h3>
              <p>${escapeHtml(item.implementation)}</p>
              <span class="review-item__source">確認箇所：${escapeHtml(item.evidence)}</span>
            </div>
            <div class="review-item__result">
              <span class="status-label ${statusClass[item.status] ?? ""}">${escapeHtml(item.status)}</span>
              <a class="review-item__link" href="${escapeHtml(item.fullUrl)}" target="_blank" rel="noopener">公開画面</a>
            </div>
          </article>
        `,
      )
      .join("");
  };

  const renderSources = () => {
    sourceList.innerHTML = data.sources
      .map(
        (source) => `
          <div class="source-item">
            <strong>${escapeHtml(source.file)}</strong>
            <span>${escapeHtml(source.role)}</span>
          </div>
        `,
      )
      .join("");
  };

  const openImage = (button) => {
    dialogImage.src = button.dataset.image;
    dialogImage.alt = button.dataset.caption;
    dialogCaption.textContent = button.dataset.caption;
    imageDialog.showModal();
  };

  comparisonList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-image]");
    if (button) openImage(button);
  });

  imageDialog.querySelector(".image-dialog__close").addEventListener("click", () => {
    imageDialog.close();
  });
  imageDialog.addEventListener("click", (event) => {
    if (event.target === imageDialog) imageDialog.close();
  });

  [searchInput, categoryFilter, statusFilter, priorityFilter].forEach((control) => {
    control.addEventListener(control === searchInput ? "input" : "change", renderItems);
  });

  resetFilters.addEventListener("click", () => {
    searchInput.value = "";
    categoryFilter.value = "";
    statusFilter.value = "";
    priorityFilter.value = "";
    renderItems();
    searchInput.focus();
  });

  populateSummary();
  renderComparisons();
  populateFilters();
  renderItems();
  renderSources();
})();
