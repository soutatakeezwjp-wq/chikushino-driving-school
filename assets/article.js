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

  function richBody(value) {
    const raw = String(value || "");
    try {
      const documentBody = JSON.parse(raw);
      if (documentBody?.format !== "rich-v1" || !Array.isArray(documentBody.blocks)) return paragraphs(raw);
      return documentBody.blocks.map((block) => {
        if (block?.type === "image") {
          const source = String(block.url || "");
          if (!/^\/cms-media\/[a-z0-9-]+$/i.test(source)) return "";
          return `<figure class="article-inline-image"><img src="${text(source)}" alt="${text(block.alt || "")}" loading="lazy" decoding="async"></figure>`;
        }
        if (block?.type !== "text" || !Array.isArray(block.runs)) return "";
        const contents = block.runs.map((run) => {
          const content = text(run?.text || "").replace(/\r?\n/g, "<br>");
          return run?.bold ? `<strong>${content}</strong>` : content;
        }).join("");
        return contents.trim() ? `<p>${contents}</p>` : "";
      }).join("");
    } catch {
      return paragraphs(raw);
    }
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
            <time>${text(post.publishedDate || post.date || "")}</time>
          </div>
          <h1>${text(post.title)}</h1>
          ${post.summary ? `<p class="article-summary">${text(post.summary)}</p>` : ""}
        </header>
        ${post.imageUrl ? `<img class="article-cover" src="${text(post.imageUrl)}" alt="" decoding="async">` : ""}
        <div class="article-body">${richBody(post.body)}</div>
      `;
    })
    .catch(() => showError("この記事は見つからないか、現在公開されていません。"));
})();
