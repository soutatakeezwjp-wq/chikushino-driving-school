(() => {
  const tokenKey = "cdsCmsToken";
  const initialCalendarDate = new Date();
  initialCalendarDate.setHours(12, 0, 0, 0);
  const state = {
    token: sessionStorage.getItem(tokenKey) || "",
    events: [],
    posts: [],
    calendarView: "month",
    calendarCursor: initialCalendarDate
  };
  const loginPanel = document.querySelector("#login-panel");
  const app = document.querySelector("#admin-app");
  const toast = document.querySelector("#toast");
  const eventForm = document.querySelector("#event-form");
  const postForm = document.querySelector("#post-form");
  const imagePreview = document.querySelector("#image-preview");
  const bodyEditor = document.querySelector("#body-editor");
  const inlineImageInput = document.querySelector("#post-inline-image");
  const eventDeleteButton = document.querySelector("#event-delete-button");
  const calendar = document.querySelector("#event-calendar");
  const calendarTitle = document.querySelector("#admin-calendar-title");
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
  let savedRichRange = null;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  const twoDigits = (value) => String(value).padStart(2, "0");

  function dateKey(date) {
    return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
  }

  function dateFromKey(value) {
    const parts = String(value || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return new Date(initialCalendarDate);
    return new Date(parts[0], parts[1] - 1, parts[2], 12);
  }

  function addDays(date, amount) {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
  }

  function weekStart(date) {
    return addDays(date, -date.getDay());
  }

  function isToday(date) {
    return dateKey(date) === dateKey(initialCalendarDate);
  }

  function japaneseDate(date, includeYear = true) {
    return `${includeYear ? `${date.getFullYear()}年` : ""}${date.getMonth() + 1}月${date.getDate()}日（${weekDays[date.getDay()]}）`;
  }

  function calendarHeading() {
    const cursor = state.calendarCursor;
    if (state.calendarView === "month") return `${cursor.getFullYear()}年 ${cursor.getMonth() + 1}月`;
    if (state.calendarView === "day") return japaneseDate(cursor);
    const start = weekStart(cursor);
    const end = addDays(start, 6);
    const endText = start.getFullYear() === end.getFullYear()
      ? `${end.getMonth() + 1}月${end.getDate()}日`
      : `${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日`;
    return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 〜 ${endText}`;
  }

  function categoryClass(category) {
    return ({ "教習": "is-lesson", "学科": "is-lesson", "検定": "is-test", "休校": "is-closed" })[category] || "is-other";
  }

  function eventsOn(date) {
    const key = dateKey(date);
    return state.events
      .filter((item) => item.eventDate === key)
      .sort((left, right) => Number(left.id || 0) - Number(right.id || 0));
  }

  function calendarEventButton(item, view) {
    const category = item.category || "教習";
    const label = `${japaneseDate(dateFromKey(item.eventDate))} ${category} ${item.title}を編集`;
    return `
      <button class="calendar-event ${categoryClass(category)} ${view === "month" ? "is-compact" : ""}"
        type="button" data-edit-event="${escapeHtml(item.id)}" aria-label="${escapeHtml(label)}">
        ${view === "month" ? "" : '<span class="calendar-event-time">終日</span>'}
        <span class="calendar-event-category">${escapeHtml(category)}</span>
        <span class="calendar-event-title">${escapeHtml(item.title)}</span>
      </button>`;
  }

  function monthCalendar() {
    const first = new Date(state.calendarCursor.getFullYear(), state.calendarCursor.getMonth(), 1, 12);
    const start = weekStart(first);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12);
    const cellCount = Math.ceil((first.getDay() + last.getDate()) / 7) * 7;
    const cells = Array.from({ length: cellCount }, (_, index) => {
      const date = addDays(start, index);
      const items = eventsOn(date);
      const visibleItems = items.slice(0, 2);
      const outside = date.getMonth() !== first.getMonth();
      const key = dateKey(date);
      return `
        <div class="calendar-day${outside ? " is-outside" : ""}${isToday(date) ? " is-today" : ""}" role="gridcell">
          <button class="calendar-date-button" type="button" data-calendar-date="${key}"
            aria-label="${escapeHtml(`${japaneseDate(date)}の予定を追加`)}">
            <span>${date.getDate()}</span>
          </button>
          <div class="calendar-day-events">
            ${visibleItems.map((item) => calendarEventButton(item, "month")).join("")}
            ${items.length > visibleItems.length ? `
              <button class="calendar-more-button" type="button" data-calendar-open-day="${key}"
                aria-label="${escapeHtml(`${japaneseDate(date)}の予定をすべて表示`)}">ほか${items.length - visibleItems.length}件</button>` : ""}
          </div>
        </div>`;
    }).join("");

    return `
      <div class="calendar-weekdays" aria-hidden="true">
        ${weekDays.map((day, index) => `<span class="${index === 0 ? "is-sunday" : index === 6 ? "is-saturday" : ""}">${day}</span>`).join("")}
      </div>
      <div class="calendar-month-grid" role="grid" aria-label="${escapeHtml(calendarHeading())}">
        ${cells}
      </div>`;
  }

  function calendarDayColumn(date, view) {
    const items = eventsOn(date);
    const key = dateKey(date);
    return `
      <section class="calendar-period-day${isToday(date) ? " is-today" : ""}" aria-label="${escapeHtml(japaneseDate(date))}">
        <button class="calendar-period-heading" type="button" data-calendar-date="${key}"
          aria-label="${escapeHtml(`${japaneseDate(date)}の予定を追加`)}">
          <span class="calendar-period-weekday">${weekDays[date.getDay()]}</span>
          <span class="calendar-period-number">${date.getDate()}</span>
          <span class="calendar-period-month">${date.getMonth() + 1}月</span>
        </button>
        <div class="calendar-period-events">
          ${items.length ? items.map((item) => calendarEventButton(item, view)).join("") : '<p class="calendar-no-events">予定なし</p>'}
        </div>
      </section>`;
  }

  function weekCalendar() {
    const start = weekStart(state.calendarCursor);
    return `
      <div class="calendar-week-grid">
        ${Array.from({ length: 7 }, (_, index) => calendarDayColumn(addDays(start, index), "week")).join("")}
      </div>`;
  }

  function dayCalendar() {
    return `<div class="calendar-day-view">${calendarDayColumn(state.calendarCursor, "day")}</div>`;
  }

  function paintCalendar() {
    if (!calendar) return;
    calendarTitle.textContent = calendarHeading();
    document.querySelectorAll("[data-calendar-view]").forEach((button) => {
      const active = button.dataset.calendarView === state.calendarView;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    calendar.className = `admin-calendar is-${state.calendarView}-view`;
    if (state.calendarView === "week") calendar.innerHTML = weekCalendar();
    else if (state.calendarView === "day") calendar.innerHTML = dayCalendar();
    else calendar.innerHTML = monthCalendar();
  }

  function notify(message, error = false) {
    toast.textContent = message;
    toast.classList.toggle("is-error", error);
    toast.hidden = false;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => { toast.hidden = true; }, 3600);
  }

  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (state.token) headers.set("authorization", `Bearer ${state.token}`);
    if (options.body && typeof options.body === "string") headers.set("content-type", "application/json");
    const response = await fetch(path, { ...options, headers });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) {
      const error = new Error(result.error === "UNAUTHORIZED" ? "管理パスワードが違います。" : (result.error || "処理に失敗しました。"));
      error.status = response.status;
      throw error;
    }
    return result;
  }

  function showApp() {
    loginPanel.hidden = true;
    app.hidden = false;
    loadAll();
  }

  function showLogin() {
    app.hidden = true;
    loginPanel.hidden = false;
  }

  async function loadAll() {
    try {
      const [eventResult, postResult] = await Promise.all([
        api("/api/cms/admin/events"),
        api("/api/cms/admin/posts")
      ]);
      state.events = eventResult.events || [];
      state.posts = postResult.posts || [];
      paintCalendar();
      paintPosts();
    } catch (error) {
      if (error.status === 401) {
        state.token = "";
        sessionStorage.removeItem(tokenKey);
        showLogin();
      }
      notify(error.message, true);
    }
  }

  function paintPosts() {
    const list = document.querySelector("#post-list");
    if (!state.posts.length) {
      list.innerHTML = '<div class="empty-state">まだ記事は登録されていません。</div>';
      return;
    }
    list.innerHTML = state.posts.map((post) => `
      <article class="list-row">
        <div class="date">${escapeHtml((post.publishedAt || "").replace("T", " ").slice(0, 16))}</div>
        <div><h3><span class="status-chip ${post.tag === "重要" ? "is-important" : ""}">${escapeHtml(post.tag)}</span>${escapeHtml(post.title)}</h3><p>${post.isPublished ? (String(post.publishedAt || "") > jstDateTimeLocal() ? "公開予約" : "公開中") : "下書き（非公開）"}</p></div>
        <div class="list-actions">
          <button class="edit-button" type="button" data-edit-post="${post.id}">編集</button>
          <button class="delete-button" type="button" data-delete-post="${post.id}">削除</button>
        </div>
      </article>`).join("");
  }

  function resetEventForm() {
    eventForm.reset();
    eventForm.elements.id.value = "";
    eventForm.elements.eventDate.value = new Date().toISOString().slice(0, 10);
    eventDeleteButton.hidden = true;
    delete eventDeleteButton.dataset.deleteEvent;
    document.querySelector("#event-form-title").textContent = "予定を追加";
  }

  function resetPostForm() {
    postForm.reset();
    postForm.elements.id.value = "";
    postForm.elements.imageUrl.value = "";
    postForm.elements.body.value = "";
    postForm.elements.publishedAt.value = jstDateTimeLocal();
    postForm.elements.isPublished.checked = true;
    imagePreview.hidden = true;
    imagePreview.querySelector("img").removeAttribute("src");
    setRichBody("");
    document.querySelector("#post-form-title").textContent = "記事を追加";
  }

  function jstDateTimeLocal() {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16);
  }

  function showEditor(type, item, preset = {}) {
    const form = type === "event" ? eventForm : postForm;
    type === "event" ? resetEventForm() : resetPostForm();
    if (type === "event" && preset.eventDate) {
      eventForm.elements.eventDate.value = preset.eventDate;
    }
    if (item) {
      Object.entries(item).forEach(([key, value]) => {
        const field = form.elements[key];
        if (!field) return;
        if (field instanceof RadioNodeList) {
          [...field].forEach((input) => { input.checked = input.value === value; });
        } else if (field.type === "checkbox") {
          field.checked = Boolean(value);
        } else if (field.type === "datetime-local") {
          field.value = String(value || "").slice(0, 16);
        } else {
          field.value = value ?? "";
        }
      });
      if (type === "post" && item.imageUrl) {
        imagePreview.hidden = false;
        imagePreview.querySelector("img").src = item.imageUrl;
      }
      if (type === "post") setRichBody(item.body || "");
      if (type === "event") {
        eventDeleteButton.hidden = false;
        eventDeleteButton.dataset.deleteEvent = item.id;
      }
      document.querySelector(`#${type}-form-title`).textContent = type === "event" ? "予定を編集" : "記事を編集";
    }
    form.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function hideEditor(type) {
    (type === "event" ? eventForm : postForm).hidden = true;
  }

  function formObject(form) {
    const result = {};
    new FormData(form).forEach((value, key) => { result[key] = value; });
    return result;
  }

  async function resizeImage(file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = dataUrl;
    });
    const max = 1400;
    const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", .84);
  }

  function addRun(runs, text, bold = false) {
    if (!text) return;
    const previous = runs[runs.length - 1];
    if (previous && previous.bold === bold) previous.text += text;
    else runs.push({ text, bold });
  }

  function collectRuns(node, inheritedBold = false, runs = []) {
    if (node.nodeType === Node.TEXT_NODE) {
      addRun(runs, node.nodeValue || "", inheritedBold);
      return runs;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return runs;
    if (node.tagName === "BR") {
      addRun(runs, "\n", inheritedBold);
      return runs;
    }
    if (node.matches("figure, img, button")) return runs;
    const bold = inheritedBold || node.matches("strong, b") || Number.parseInt(getComputedStyle(node).fontWeight, 10) >= 700;
    [...node.childNodes].forEach((child) => collectRuns(child, bold, runs));
    return runs;
  }

  function normalizeRuns(runs) {
    const output = [];
    runs.forEach((run) => {
      const text = String(run?.text || "").replace(/\u0000/g, "");
      if (!text) return;
      addRun(output, text, Boolean(run?.bold));
    });
    return output;
  }

  function createTextBlock(runs = []) {
    const paragraph = document.createElement("p");
    const normalized = normalizeRuns(runs);
    if (!normalized.length) {
      paragraph.append(document.createElement("br"));
      return paragraph;
    }
    normalized.forEach((run) => {
      const textNode = document.createTextNode(run.text);
      if (run.bold) {
        const strong = document.createElement("strong");
        strong.append(textNode);
        paragraph.append(strong);
      } else {
        paragraph.append(textNode);
      }
    });
    return paragraph;
  }

  function createImageBlock(url, alt = "") {
    const figure = document.createElement("figure");
    figure.contentEditable = "false";
    figure.dataset.inlineImage = url;
    const image = document.createElement("img");
    image.src = url;
    image.alt = alt;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-inline-image";
    remove.dataset.removeInlineImage = "";
    remove.textContent = "本文から画像を外す";
    figure.append(image, remove);
    return figure;
  }

  function parsedRichBody(value) {
    const raw = String(value || "").trim();
    if (!raw) return { format: "rich-v1", blocks: [] };
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.format === "rich-v1" && Array.isArray(parsed.blocks)) return parsed;
    } catch {
      // Existing plain-text posts are converted into editable text blocks below.
    }
    return {
      format: "rich-v1",
      blocks: raw.split(/\n\s*\n/).filter(Boolean).map((text) => ({
        type: "text",
        runs: [{ text: text.trim(), bold: false }]
      }))
    };
  }

  function ensureEditableParagraph() {
    const last = bodyEditor.lastElementChild;
    if (!last || last.matches("figure")) bodyEditor.append(createTextBlock());
  }

  function setRichBody(value) {
    const documentBody = parsedRichBody(value);
    bodyEditor.replaceChildren();
    documentBody.blocks.forEach((block) => {
      if (block?.type === "image" && /^\/cms-media\/[a-z0-9-]+$/i.test(String(block.url || ""))) {
        bodyEditor.append(createImageBlock(block.url, block.alt || ""));
      } else if (block?.type === "text" && Array.isArray(block.runs)) {
        bodyEditor.append(createTextBlock(block.runs));
      }
    });
    ensureEditableParagraph();
    savedRichRange = null;
  }

  function serializeRichBody() {
    const blocks = [];
    [...bodyEditor.childNodes].forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE && node.matches("figure[data-inline-image]")) {
        const image = node.querySelector("img");
        const url = String(node.dataset.inlineImage || image?.getAttribute("src") || "");
        if (/^\/cms-media\/[a-z0-9-]+$/i.test(url)) {
          blocks.push({ type: "image", url, alt: String(image?.alt || "").slice(0, 160) });
        }
        return;
      }
      const runs = normalizeRuns(collectRuns(node));
      if (runs.some((run) => run.text.trim())) blocks.push({ type: "text", runs });
    });
    return JSON.stringify({ format: "rich-v1", blocks });
  }

  function richBodyHasContent(serialized) {
    try {
      return JSON.parse(serialized).blocks.some((block) =>
        block.type === "image" || block.runs?.some((run) => String(run.text || "").trim())
      );
    } catch {
      return false;
    }
  }

  function rememberRichSelection() {
    const selection = getSelection();
    if (!selection?.rangeCount || !bodyEditor.contains(selection.anchorNode)) return;
    savedRichRange = selection.getRangeAt(0).cloneRange();
  }

  function restoreRichSelection() {
    if (!savedRichRange || !bodyEditor.contains(savedRichRange.commonAncestorContainer)) {
      ensureEditableParagraph();
      const last = bodyEditor.lastElementChild;
      savedRichRange = document.createRange();
      savedRichRange.selectNodeContents(last);
      savedRichRange.collapse(false);
    }
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRichRange);
  }

  function selectionTopLevelBlock() {
    let node = savedRichRange?.startContainer || null;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
    while (node && node.parentElement !== bodyEditor) node = node.parentElement;
    return node && node.parentElement === bodyEditor ? node : bodyEditor.lastElementChild;
  }

  function insertInlineImage(url, alt = "") {
    const anchor = selectionTopLevelBlock();
    const figure = createImageBlock(url, alt);
    const nextParagraph = createTextBlock();
    if (anchor) anchor.after(figure, nextParagraph);
    else bodyEditor.append(figure, nextParagraph);
    const range = document.createRange();
    range.selectNodeContents(nextParagraph);
    range.collapse(true);
    savedRichRange = range;
    restoreRichSelection();
    bodyEditor.focus();
  }

  document.querySelector("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = document.querySelector("#admin-password").value;
    try {
      const result = await api("/api/cms/admin/session", { method: "POST", body: JSON.stringify({ password }) });
      state.token = result.token || password;
      sessionStorage.setItem(tokenKey, state.token);
      showApp();
    } catch (error) {
      notify(error.message, true);
    }
  });

  document.querySelector("#logout-button").addEventListener("click", () => {
    state.token = "";
    sessionStorage.removeItem(tokenKey);
    showLogin();
  });

  document.querySelectorAll(".admin-tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".admin-tabs button").forEach((item) => item.classList.toggle("is-active", item === button));
      document.querySelectorAll(".admin-view").forEach((view) => view.classList.toggle("is-active", view.id === `${button.dataset.view}-view`));
    });
  });

  document.querySelectorAll("[data-new]").forEach((button) => button.addEventListener("click", () => {
    const type = button.dataset.new;
    showEditor(type, null, type === "event" ? { eventDate: dateKey(state.calendarCursor) } : {});
  }));
  document.querySelectorAll("[data-cancel]").forEach((button) => button.addEventListener("click", () => hideEditor(button.dataset.cancel)));

  document.querySelectorAll("[data-calendar-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.calendarView = button.dataset.calendarView;
      paintCalendar();
    });
  });

  document.querySelectorAll("[data-calendar-move]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = Number(button.dataset.calendarMove);
      if (state.calendarView === "month") {
        state.calendarCursor = new Date(
          state.calendarCursor.getFullYear(),
          state.calendarCursor.getMonth() + direction,
          1,
          12
        );
      } else {
        state.calendarCursor = addDays(state.calendarCursor, direction * (state.calendarView === "week" ? 7 : 1));
      }
      paintCalendar();
    });
  });

  document.querySelector("[data-calendar-today]").addEventListener("click", () => {
    state.calendarCursor = new Date(initialCalendarDate);
    paintCalendar();
  });

  eventForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = formObject(eventForm);
    const id = values.id;
    delete values.id;
    try {
      await api(`/api/cms/admin/events${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(values) });
      hideEditor("event");
      notify("予定を保存しました。");
      loadAll();
    } catch (error) {
      notify(error.message, true);
    }
  });

  postForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = formObject(postForm);
    values.body = serializeRichBody();
    values.summary = "";
    if (!richBodyHasContent(values.body)) {
      notify("本文を入力してください。", true);
      bodyEditor.focus();
      return;
    }
    values.isPublished = postForm.elements.isPublished.checked;
    const id = values.id;
    delete values.id;
    try {
      await api(`/api/cms/admin/posts${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(values) });
      hideEditor("post");
      notify("記事を保存しました。");
      loadAll();
    } catch (error) {
      notify(error.message, true);
    }
  });

  document.querySelector("#post-image").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      notify("画像を軽量化しています。");
      const dataUrl = await resizeImage(file);
      const result = await api("/api/cms/admin/media", { method: "POST", body: JSON.stringify({ dataUrl, alt: postForm.elements.title.value }) });
      postForm.elements.imageUrl.value = result.url;
      imagePreview.hidden = false;
      imagePreview.querySelector("img").src = result.url;
      notify("画像を追加しました。");
    } catch (error) {
      notify(error.message, true);
    }
  });

  document.addEventListener("selectionchange", rememberRichSelection);
  bodyEditor.addEventListener("paste", (event) => {
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData?.getData("text/plain") || "");
  });
  document.querySelector("#rich-bold-button").addEventListener("mousedown", (event) => event.preventDefault());
  document.querySelector("#rich-bold-button").addEventListener("click", () => {
    restoreRichSelection();
    document.execCommand("bold", false);
    rememberRichSelection();
    bodyEditor.focus();
  });
  inlineImageInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      notify("本文画像を軽量化しています。");
      const dataUrl = await resizeImage(file);
      const result = await api("/api/cms/admin/media", {
        method: "POST",
        body: JSON.stringify({ dataUrl, alt: postForm.elements.title.value })
      });
      insertInlineImage(result.url, postForm.elements.title.value);
      notify("本文に画像を挿入しました。");
    } catch (error) {
      notify(error.message, true);
    } finally {
      inlineImageInput.value = "";
    }
  });

  document.querySelector("#remove-image").addEventListener("click", () => {
    postForm.elements.imageUrl.value = "";
    document.querySelector("#post-image").value = "";
    imagePreview.hidden = true;
  });

  document.addEventListener("click", async (event) => {
    const calendarDate = event.target.closest("[data-calendar-date]");
    const calendarDay = event.target.closest("[data-calendar-open-day]");
    const editEvent = event.target.closest("[data-edit-event]");
    const editPost = event.target.closest("[data-edit-post]");
    const deleteEvent = event.target.closest("[data-delete-event]");
    const deletePost = event.target.closest("[data-delete-post]");
    const removeInlineImage = event.target.closest("[data-remove-inline-image]");
    if (removeInlineImage) {
      const figure = removeInlineImage.closest("figure");
      const next = figure?.nextElementSibling;
      figure?.remove();
      ensureEditableParagraph();
      (next || bodyEditor.lastElementChild)?.focus?.();
    }
    if (calendarDate) {
      const key = calendarDate.dataset.calendarDate;
      state.calendarCursor = dateFromKey(key);
      paintCalendar();
      showEditor("event", null, { eventDate: key });
    }
    if (calendarDay) {
      state.calendarCursor = dateFromKey(calendarDay.dataset.calendarOpenDay);
      state.calendarView = "day";
      paintCalendar();
    }
    if (editEvent) {
      const item = state.events.find((candidate) => candidate.id === Number(editEvent.dataset.editEvent));
      if (item?.eventDate) state.calendarCursor = dateFromKey(item.eventDate);
      showEditor("event", item);
    }
    if (editPost) showEditor("post", state.posts.find((item) => item.id === Number(editPost.dataset.editPost)));
    if (deleteEvent && confirm("この予定を削除しますか？")) {
      try {
        await api(`/api/cms/admin/events/${deleteEvent.dataset.deleteEvent}`, { method: "DELETE" });
        hideEditor("event");
        notify("予定を削除しました。");
        loadAll();
      } catch (error) { notify(error.message, true); }
    }
    if (deletePost && confirm("この記事を削除しますか？")) {
      try {
        await api(`/api/cms/admin/posts/${deletePost.dataset.deletePost}`, { method: "DELETE" });
        notify("記事を削除しました。");
        loadAll();
      } catch (error) { notify(error.message, true); }
    }
  });

  if (state.token) {
    api("/api/cms/admin/session").then(showApp).catch(() => {
      sessionStorage.removeItem(tokenKey);
      showLogin();
    });
  } else {
    showLogin();
  }
})();
