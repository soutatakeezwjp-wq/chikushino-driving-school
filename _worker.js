const WORDPRESS_FEED_URL = "https://chikushi-ds.com/feed/";
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 12;

function decodeEntities(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(value = "") {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickTag(xml, tagName) {
  const escaped = tagName.replace(":", "\\:");
  const match = xml.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match ? decodeEntities(match[1]).trim() : "";
}

function pickImage(content = "") {
  const match = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  return match ? decodeEntities(match[1]) : "";
}

function normalizeTitle(title, fallbackDate) {
  const cleanTitle = stripTags(title);
  if (cleanTitle) return cleanTitle;
  return fallbackDate ? `筑紫野自動車学校からのお知らせ（${fallbackDate}）` : "筑紫野自動車学校からのお知らせ";
}

function normalizeCategory(category) {
  const cleanCategory = stripTags(category);
  return cleanCategory && cleanCategory !== "未分類" ? cleanCategory : "お知らせ";
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function parseFeed(xml, limit) {
  const itemMatches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)];
  return itemMatches.slice(0, limit).map((match) => {
    const item = match[0];
    const content = pickTag(item, "content:encoded");
    const pubDate = pickTag(item, "pubDate");
    const formattedDate = formatDate(pubDate);
    const categories = [...item.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)]
      .map((categoryMatch) => normalizeCategory(categoryMatch[1]))
      .filter(Boolean);
    const excerpt = stripTags(pickTag(item, "description") || content).slice(0, 90);
    const link = pickTag(item, "link");

    return {
      id: pickTag(item, "guid") || link,
      title: normalizeTitle(pickTag(item, "title"), formattedDate),
      link,
      date: formattedDate,
      publishedAt: pubDate,
      category: categories[0] || "お知らせ",
      categories,
      excerpt,
      image: pickImage(content),
      source: "wordpress-rss"
    };
  });
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? "public, max-age=300" : "no-store"
    }
  });
}

function normalizeApplicationPayload(payload, request) {
  const url = new URL(request.url);
  const headers = request.headers;
  return {
    ...payload,
    applicationId: payload.applicationId || `CDS-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    submittedAt: new Date().toISOString(),
    landingPage: payload.landingPage || headers.get("referer") || "",
    referrer: payload.referrer || headers.get("referer") || "",
    userAgent: payload.userAgent || headers.get("user-agent") || "",
    source: payload.source || url.hostname
  };
}

function validateApplicationPayload(payload) {
  const requiredFields = ["purpose", "vehicle", "name", "kana", "phone", "email", "howKnown", "privacyConsent"];
  const missing = requiredFields.filter((field) => !String(payload[field] || "").trim());
  if (missing.length) {
    return `Missing required fields: ${missing.join(", ")}`;
  }
  return "";
}

async function handleApplication(request, env) {
  const configured = Boolean(env.GAS_APPLICATION_WEBHOOK_URL);

  if (request.method === "GET") {
    return jsonResponse({
      ok: true,
      service: "application",
      configured,
      message: configured ? "受付フォームの送信先は設定済みです。" : "受付フォームの送信先は未設定です。"
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const enrichedPayload = normalizeApplicationPayload(payload, request);
  const validationError = validateApplicationPayload(enrichedPayload);
  if (validationError) {
    return jsonResponse({ ok: false, error: validationError }, 400);
  }

  if (!configured) {
    return jsonResponse({
      ok: false,
      configured: false,
      applicationId: enrichedPayload.applicationId,
      error: "受付フォームの送信先が未設定です。"
    }, 503);
  }

  try {
    const response = await fetch(env.GAS_APPLICATION_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(enrichedPayload)
    });
    const text = await response.text();
    let gasPayload;
    try {
      gasPayload = JSON.parse(text);
    } catch (error) {
      gasPayload = { raw: text };
    }

    if (!response.ok || gasPayload.ok === false) {
      return jsonResponse({
        ok: false,
        configured: true,
        applicationId: enrichedPayload.applicationId,
        error: gasPayload.error || `受付先でエラーが発生しました。status=${response.status}`,
        gas: gasPayload
      }, 502);
    }

    return jsonResponse({
      ok: true,
      configured: true,
      applicationId: gasPayload.applicationId || enrichedPayload.applicationId,
      gas: gasPayload
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      configured: true,
      applicationId: enrichedPayload.applicationId,
      error: error instanceof Error ? error.message : "Unknown application proxy error"
    }, 502);
  }
}

async function handleWordPressPosts(request) {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") || DEFAULT_LIMIT);
  const limit = Math.min(Math.max(requestedLimit || DEFAULT_LIMIT, 1), MAX_LIMIT);

  try {
    const response = await fetch(WORDPRESS_FEED_URL, {
      headers: {
        "user-agent": "chikushino-driving-school-site/1.0"
      },
      cf: { cacheTtl: 300, cacheEverything: true }
    });

    if (!response.ok) {
      return jsonResponse({
        ok: false,
        source: WORDPRESS_FEED_URL,
        error: `WordPress feed returned ${response.status}`
      }, 502);
    }

    const xml = await response.text();
    const posts = parseFeed(xml, limit);
    return jsonResponse({
      ok: true,
      source: WORDPRESS_FEED_URL,
      fetchedAt: new Date().toISOString(),
      count: posts.length,
      posts
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      source: WORDPRESS_FEED_URL,
      error: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/wordpress-posts") {
      return handleWordPressPosts(request);
    }
    if (url.pathname === "/api/application") {
      return handleApplication(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
