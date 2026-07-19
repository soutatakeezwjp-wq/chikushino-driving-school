(function () {
  "use strict";

  const master = window.CDS_PRICE_MASTER;
  const root = document.querySelector("#price-simulator");
  if (!master || !root) return;

  const formatter = new Intl.NumberFormat("ja-JP");
  const standardRows = master.catalog.standardCar.mainFeeRows || [];
  const semiMediumRows = master.catalog.semiMedium.mainFeeRows || [];
  const motorcycleRows = master.catalog.motorcycle.mainFeeRows || [];
  const mtTransition = standardRows.find((row) => row.id === "standard-mt-transition-at-graduation-certificate");
  const mtTransitionAmount = Number(mtTransition?.prices?.day?.student || 0);

  const courseDefinitions = {
    ordinary_at: {
      label: "普通自動車AT",
      vehicle: "普通自動車（AT）",
      catalog: master.catalog.standardCar,
      transmission: "AT",
      rows: standardRows.filter((row) => row.course === "普通車" && row.transmission === "AT")
    },
    ordinary_mt: {
      label: "普通自動車MT（AT取得後に移行）",
      vehicle: "普通自動車（MT）",
      catalog: master.catalog.standardCar,
      transmission: "MT",
      rows: standardRows.filter((row) => row.course === "普通車" && row.transmission === "AT"),
      surchargeLabel: "MT移行教習",
      surcharge: mtTransitionAmount
    },
    semi_medium: {
      label: "準中型車MT",
      vehicle: "準中型車",
      catalog: master.catalog.semiMedium,
      transmission: "MT",
      rows: semiMediumRows.filter((row) => row.course === "準中型車")
    },
    motorcycle_large_mt: {
      label: "大型自動二輪MT",
      vehicle: "大型自動二輪車（MT）",
      catalog: master.catalog.motorcycle,
      transmission: "MT",
      rows: motorcycleRows.filter((row) => row.course === "大型二輪車" && row.transmission === "MT")
    },
    motorcycle_mt: {
      label: "普通自動二輪MT",
      vehicle: "普通自動二輪車（MT）",
      catalog: master.catalog.motorcycle,
      transmission: "MT",
      rows: motorcycleRows.filter((row) => row.course === "普通二輪車" && row.transmission === "MT")
    },
    motorcycle_at: {
      label: "普通自動二輪AT",
      vehicle: "普通自動二輪車（AT）",
      catalog: master.catalog.motorcycle,
      transmission: "AT",
      rows: motorcycleRows.filter((row) => row.course === "普通二輪車" && row.transmission === "AT")
    },
    motorcycle_small_mt: {
      label: "小型自動二輪MT",
      vehicle: "小型自動二輪車（MT）",
      catalog: master.catalog.motorcycle,
      transmission: "MT",
      rows: motorcycleRows.filter((row) => row.course === "普通二輪車小型限定" && row.transmission === "MT")
    },
    motorcycle_small_at: {
      label: "小型自動二輪AT",
      vehicle: "小型自動二輪車（AT）",
      catalog: master.catalog.motorcycle,
      transmission: "AT",
      rows: motorcycleRows.filter((row) => row.course === "普通二輪車小型限定" && row.transmission === "AT")
    }
  };

  const elements = {
    course: root.querySelector("#sim-course"),
    license: root.querySelector("#sim-license"),
    userType: root.querySelector("#sim-user-type"),
    plan: root.querySelector("#sim-plan"),
    season: root.querySelector("#sim-season"),
    option: root.querySelector("#sim-option"),
    base: root.querySelector("#sim-base-price"),
    surchargeRow: root.querySelector("#sim-surcharge-row"),
    surchargeLabel: root.querySelector("#sim-surcharge-label"),
    surcharge: root.querySelector("#sim-surcharge-price"),
    optionRow: root.querySelector("#sim-option-row"),
    optionPrice: root.querySelector("#sim-option-price"),
    total: root.querySelector("#sim-total-price"),
    apply: root.querySelector("#sim-apply"),
    note: root.querySelector("#sim-status-note")
  };

  function yen(value) {
    return `${formatter.format(Number(value || 0))}円`;
  }

  function selectedDefinition() {
    return courseDefinitions[elements.course.value];
  }

  function selectedRow() {
    return selectedDefinition()?.rows.find((row) => row.id === elements.license.value);
  }

  function availableOptions(definition) {
    return (definition?.catalog?.options || []).filter((option) => {
      const eligible = option.eligibleTransmissions;
      return !eligible?.length || eligible.includes(definition.transmission);
    });
  }

  function selectedOption() {
    return availableOptions(selectedDefinition()).find((option) => option.id === elements.option.value);
  }

  function syncLicenses() {
    const definition = selectedDefinition();
    elements.license.innerHTML = definition.rows
      .map((row) => `<option value="${row.id}">${row.currentLicenseLabel}</option>`)
      .join("");
    syncOptions();
  }

  function syncOptions() {
    const options = availableOptions(selectedDefinition());
    elements.option.innerHTML = `<option value="">追加しない</option>${options
      .map((option) => `<option value="${option.id}">${option.label}</option>`)
      .join("")}`;
    elements.option.disabled = options.length === 0;
    elements.season.disabled = options.every((option) => option.pricesBySeason?.aprToNov === option.pricesBySeason?.decToMar);
    update();
  }

  function update() {
    const definition = selectedDefinition();
    const row = selectedRow();
    if (!definition || !row) return;

    const base = Number(row.prices?.[elements.plan.value]?.[elements.userType.value] || 0);
    const surcharge = Number(definition.surcharge || 0);
    const option = selectedOption();
    const optionPrice = Number(option?.pricesBySeason?.[elements.season.value] || 0);
    const total = base + surcharge + optionPrice;

    elements.base.textContent = yen(base);
    elements.surchargeRow.hidden = surcharge === 0;
    elements.surchargeLabel.textContent = definition.surchargeLabel || "追加料金";
    elements.surcharge.textContent = yen(surcharge);
    elements.optionRow.hidden = optionPrice === 0;
    elements.optionPrice.textContent = yen(optionPrice);
    elements.total.textContent = formatter.format(total);
    elements.note.textContent = availableOptions(definition).length
      ? "表示額は税込の概算です。正式金額は学校で最終確認します。"
      : "この車種のオプション料金は正式資料に掲載がないため、必要な場合は学校へご相談ください。";

    const params = new URLSearchParams({
      page: "application",
      purpose: "仮申込",
      vehicle: definition.vehicle,
      priceCourse: elements.course.value,
      currentLicense: row.currentLicenseLabel,
      currentLicenseCode: row.currentLicenseCodes?.[0] || "",
      userType: elements.userType.value,
      pricePlan: elements.plan.value,
      season: elements.season.value,
      estimatedPrice: String(total)
    });
    if (option) {
      params.set("optionPlan", option.label);
      params.set("optionPlans", option.id);
    }
    elements.apply.href = `detail.html?${params.toString()}#applicationForm`;
  }

  elements.course.innerHTML = Object.entries(courseDefinitions)
    .map(([value, definition]) => `<option value="${value}">${definition.label}</option>`)
    .join("");
  elements.course.addEventListener("change", syncLicenses);
  elements.license.addEventListener("change", update);
  [elements.userType, elements.plan, elements.season, elements.option].forEach((element) => {
    element.addEventListener("change", update);
  });
  root.querySelector("#sim-calculate")?.addEventListener("click", () => {
    update();
    root.querySelector(".sim-result")?.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.025)" },
        { transform: "scale(1)" }
      ],
      { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" }
    );
  });

  const dialog = document.querySelector("#option-details-dialog");
  const openButton = root.querySelector("#open-option-details");
  const closeButton = dialog?.querySelector("[data-dialog-close]");
  const optionDetailsBody = dialog?.querySelector("#option-details-body");
  const optionGroups = [
    ["普通車", master.catalog.standardCar.options || []],
    ["準中型車", master.catalog.semiMedium.options || []]
  ];
  optionGroups.forEach(([target, options]) => {
    options.forEach((option) => {
      const row = document.createElement("tr");
      const values = [
        target,
        option.label,
        option.description,
        yen(option.pricesBySeason?.aprToNov),
        yen(option.pricesBySeason?.decToMar)
      ];
      ["対象", "オプション", "内容", "4〜11月", "12〜3月"].forEach((label, index) => {
        const cell = document.createElement("td");
        cell.dataset.label = label;
        cell.textContent = values[index];
        if (index === 1) {
          const strong = document.createElement("strong");
          strong.textContent = values[index];
          cell.textContent = "";
          cell.appendChild(strong);
        }
        row.appendChild(cell);
      });
      optionDetailsBody?.appendChild(row);
    });
  });
  openButton?.addEventListener("click", () => dialog?.showModal());
  closeButton?.addEventListener("click", () => dialog?.close());
  dialog?.addEventListener("click", (event) => {
    const rect = dialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });

  syncLicenses();
})();
