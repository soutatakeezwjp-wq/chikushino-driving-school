(() => {
  const root = document.querySelector("#article-content");
  const slug = new URLSearchParams(location.search).get("slug") || "";

  function text(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[character]));
  }

  function paragraphs(value) {
    return String(value || "")
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => `<p>${text(paragraph)}</p>`)
      .join("");
  }

  function showError(message) {
    root.innerHTML = `<a class="article-back" href="detail.html?page=topics">← お知らせ一覧へ</a><div class="article-error">${text(message)}</div>`;
  }

  if (!slug) {
    showError("記事が指定されていません。");
    return;
  }

  fetch(`/api/cms/posts/${encodeURIComponent(slug)}`, { headers: { accept: "application/json" } })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("not found")))
    .then((result) => {
      const post = result.post;
      if (!post) throw new Error("not found");
      document.title = `${post.title} | 筑紫野自動車学校`;
      root.innerHTML = `
        <a class="article-back" href="detail.html?page=topics">← お知らせ一覧へ</a>
        <header>
          <div class="article-meta">
            <span class="article-tag${post.tag === "重要" ? " is-important" : ""}">${text(post.tag || "お知らせ")}</span>
            <time>${text(post.publishedDate || "")}</time>
          </div>
          <h1>${text(post.title)}</h1>
          ${post.summary ? `<p class="article-summary">${text(post.summary)}</p>` : ""}
        </header>
        ${post.imageUrl ? `<img class="article-cover" src="${text(post.imageUrl)}" alt="" decoding="async">` : ""}
        <div class="article-body">${paragraphs(post.body)}</div>
      `;
    })
    .catch(() => showError("この記事は見つからないか、現在公開されていません。"));
})();
