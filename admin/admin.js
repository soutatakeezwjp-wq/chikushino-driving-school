(() => {
  const tokenKey = "cdsCmsToken";
  const state = { token: sessionStorage.getItem(tokenKey) || "", events: [], posts: [] };
  const loginPanel = document.querySelector("#login-panel");
  const app = document.querySelector("#admin-app");
  const toast = document.querySelector("#toast");
  const eventForm = document.querySelector("#event-form");
  const postForm = document.querySelector("#post-form");
  const imagePreview = document.querySelector("#image-preview");

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

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
      paintEvents();
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

  function paintEvents() {
    const list = document.querySelector("#event-list");
    if (!state.events.length) {
      list.innerHTML = '<div class="empty-state">まだ予定は登録されていません。</div>';
      return;
    }
    list.innerHTML = state.events.map((event) => `
      <article class="list-row">
        <div class="date">${escapeHtml(event.eventDate)}</div>
        <div><h3><span class="status-chip">${escapeHtml(event.category)}</span>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.details || "")}</p></div>
        <div class="list-actions">
          <button class="edit-button" type="button" data-edit-event="${event.id}">編集</button>
          <button class="delete-button" type="button" data-delete-event="${event.id}">削除</button>
        </div>
      </article>`).join("");
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
        <div><h3><span class="status-chip ${post.tag === "重要" ? "is-important" : ""}">${escapeHtml(post.tag)}</span>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.summary || "")}${post.isPublished ? "" : "（非公開）"}</p></div>
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
    document.querySelector("#event-form-title").textContent = "予定を追加";
  }

  function resetPostForm() {
    postForm.reset();
    postForm.elements.id.value = "";
    postForm.elements.imageUrl.value = "";
    postForm.elements.publishedAt.value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    postForm.elements.isPublished.checked = true;
    imagePreview.hidden = true;
    imagePreview.querySelector("img").removeAttribute("src");
    document.querySelector("#post-form-title").textContent = "記事を追加";
  }

  function showEditor(type, item) {
    const form = type === "event" ? eventForm : postForm;
    type === "event" ? resetEventForm() : resetPostForm();
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

  document.querySelectorAll("[data-new]").forEach((button) => button.addEventListener("click", () => showEditor(button.dataset.new)));
  document.querySelectorAll("[data-cancel]").forEach((button) => button.addEventListener("click", () => hideEditor(button.dataset.cancel)));

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

  document.querySelector("#remove-image").addEventListener("click", () => {
    postForm.elements.imageUrl.value = "";
    document.querySelector("#post-image").value = "";
    imagePreview.hidden = true;
  });

  document.addEventListener("click", async (event) => {
    const editEvent = event.target.closest("[data-edit-event]");
    const editPost = event.target.closest("[data-edit-post]");
    const deleteEvent = event.target.closest("[data-delete-event]");
    const deletePost = event.target.closest("[data-delete-post]");
    if (editEvent) showEditor("event", state.events.find((item) => item.id === Number(editEvent.dataset.editEvent)));
    if (editPost) showEditor("post", state.posts.find((item) => item.id === Number(editPost.dataset.editPost)));
    if (deleteEvent && confirm("この予定を削除しますか？")) {
      try {
        await api(`/api/cms/admin/events/${deleteEvent.dataset.deleteEvent}`, { method: "DELETE" });
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
